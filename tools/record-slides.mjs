/*
  Drives a running deck through every step and records the screen.

  This is a real screen recording, not a slideshow assembled from stills, and
  that is the point: the decks animate. Curves draw themselves in, text arrives
  on a click, slides wipe into each other, and some slides play video. A
  frame-per-step export throws all of that away; a recording keeps it, at the
  cost of running in real time.

  Called by tools/record-video.sh, which starts the dev server and encodes the
  result. Everything here is configured by environment variable so the two
  halves have one interface.
*/
import { chromium } from 'playwright-chromium'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3050'
const OUT_DIR = process.env.RAW_DIR ?? '/tmp/record'
const WIDTH = Number(process.env.WIDTH ?? 1920)
const HEIGHT = Number(process.env.HEIGHT ?? 1080)
const DWELL = Number(process.env.DWELL ?? 2.5) * 1000
const FIRST = Number(process.env.FIRST_DWELL ?? process.env.DWELL ?? 2.5) * 1000
const TAIL = Number(process.env.TAIL_DWELL ?? 3) * 1000
const SETTLE = Number(process.env.SETTLE ?? 0.6) * 1000
const MAX_SETTLE = Number(process.env.MAX_SETTLE ?? 8) * 1000
const MAX_STEPS = Number(process.env.MAX_STEPS ?? 600)
const START = process.env.START_PAGE ?? '1'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/*
  Find the address the dev server actually came up on.

  `localhost` is not one address inside a container: it resolves to both
  127.0.0.1 and ::1, the server binds to whichever its runtime picked, and
  Node's fetch connects to whichever *its* resolver picked. When those differ
  the connection is refused even though the server is plainly running and has
  printed its banner. So try each spelling and use the one that answers.

  Any status under 500 counts as up: the dev server hands the SPA shell back
  for paths it does not know, and that is still proof it is listening.
*/
async function resolveBase(timeoutMs = 120000) {
  const port = new URL(BASE).port || '3050'
  const candidates = [...new Set([
    BASE,
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`,
  ])]
  const deadline = Date.now() + timeoutMs
  const errors = new Map()
  while (Date.now() < deadline) {
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/`, { redirect: 'follow' })
        if (res.status < 500) return base
        errors.set(base, `HTTP ${res.status}`)
      } catch (err) {
        errors.set(base, err?.cause?.code ?? err?.code ?? String(err?.message ?? err))
      }
    }
    await sleep(500)
  }
  const tried = [...errors].map(([b, e]) => `    ${b} -> ${e}`).join('\n')
  throw new Error(`deck never answered. Tried:\n${tried}`)
}

/*
  Where we are in the deck. Slidev keeps this on `window.__slidev__`, which is
  the honest answer, but it is an internal and has moved between versions — so
  the URL, which carries the page and the click index, is the fallback. Either
  way the recorder only needs to know when a keypress stopped changing
  anything, which is how it knows it has reached the end.
*/
async function position(page) {
  return page.evaluate(() => {
    const unref = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
    const nav = window.__slidev__?.nav
    if (nav) {
      const p = unref(nav.currentPage)
      const c = unref(nav.clicks)
      const t = unref(nav.total)
      // A slide may set its own hold in frontmatter. Read it the way the
      // theme's own global-bottom does, because the key it lives under has
      // moved between Slidev versions.
      const meta = unref(nav.currentSlideRoute)?.meta
      const front = meta?.slide?.frontmatter ?? meta?.frontmatter ?? {}
      const own = Number(front.dwell)
      if (p !== undefined) {
        return {
          key: `nav:${p}:${c ?? 0}`,
          page: p,
          clicks: c ?? 0,
          total: t ?? null,
          dwell: Number.isFinite(own) && own > 0 ? own : null,
        }
      }
    }
    return {
      key: `url:${location.pathname}${location.search}`,
      page: null, clicks: null, total: null, dwell: null,
    }
  })
}

/*
  Progress, on stderr, because stdout carries the result the shell parses.

  A recording runs in real time and can take ten minutes, which is long enough
  that silence looks like a hang. On a terminal this rewrites one line; piped
  to a file it prints every fifteen seconds instead, so a log does not fill up
  with carriage returns.
*/
/*
  Wait for the slide to stop moving.

  The dwell is meant to be time the audience spends looking at a finished
  slide, so it has to start when the motion stops, not when the key was
  pressed. Otherwise a chart that takes a second and a half to transition in
  and draw itself eats a quarter of its own six seconds.

  `document.getAnimations()` covers CSS animations and transitions across the
  whole document, including the outgoing slide. Two things it cannot see: an
  animation that has not started yet, which is why there is a minimum wait
  first — LiveChart holds its curves back for 450ms before mounting them —
  and video playback, which is not an animation and should not hold anything
  up. Anything looping forever is ignored, and the whole thing is capped.
*/
async function settleAnimations(page) {
  const t0 = Date.now()
  await sleep(SETTLE)
  while (Date.now() - t0 < MAX_SETTLE) {
    const busy = await page.evaluate(() => {
      if (!document.getAnimations) return false
      return document.getAnimations().some((a) => {
        if (a.playState !== 'running') return false
        const timing = a.effect?.getComputedTiming?.()
        return !timing || timing.iterations !== Infinity
      })
    }).catch(() => false)
    if (!busy) break
    await sleep(120)
  }
  return Date.now() - t0
}

const startedWall = Date.now()
let lastPrinted = 0

function clock(ms) {
  const s = Math.round(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function report(step, pos, holdMs, force = false) {
  const where = pos.page !== null
    ? `slide ${pos.page}${pos.total ? `/${pos.total}` : ''}${pos.clicks ? ` +${pos.clicks}` : ''}`
    : pos.key.replace(/^url:/, '')
  const hold = `${Math.round(holdMs / 100) / 10}s${pos.dwell ? '*' : ''}`
  const line = `  step ${String(step).padStart(3)}  ${where}  hold ${hold}  ${clock(Date.now() - startedWall)}`
  if (process.stderr.isTTY) {
    process.stderr.write(`\r${line.padEnd(58)}`)
  } else if (force || Date.now() - lastPrinted > 15000) {
    lastPrinted = Date.now()
    process.stderr.write(`${line}\n`)
  }
}

async function main() {
  const base = await resolveBase()

  const runner = await launch()
  const context = await runner.browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: WIDTH, height: HEIGHT } },
  })
  const startedAt = Date.now()
  const page = await context.newPage()

  await page.goto(`${base}/${START}`, { waitUntil: 'domcontentloaded' })
  // The dev server compiles the first slide on demand, so "loaded" is not the
  // same as "drawn". Wait for the slide itself, then for it to settle.
  await page.waitForSelector('#slide-content, .slidev-page, .slidev-layout', { timeout: 120000 })
  await page.waitForLoadState('load').catch(() => {})
  await sleep(2500)

  // Everything before this point is compilation, and nobody wants to watch a
  // blank page compile. The offset is handed to ffmpeg to trim.
  const readyOffset = (Date.now() - startedAt) / 1000

  let steps = 0
  let last = await position(page)
  process.stderr.write(
    `  ready in ${readyOffset.toFixed(1)}s` +
    `${last.total ? `, ${last.total} slides` : ''}; walking the deck\n`,
  )
  const holdFor = (pos, fallback) => (pos.dwell ? pos.dwell * 1000 : fallback)

  report(0, last, holdFor(last, FIRST), true)
  await settleAnimations(page)
  await sleep(holdFor(last, FIRST))

  for (; steps < MAX_STEPS; steps++) {
    await page.keyboard.press('Space')
    await settleAnimations(page)
    let now = await position(page)
    if (now.key === last.key) {
      // One keypress changed nothing: the deck is over. Try once more in case
      // the press landed while the page was mid-navigation.
      await page.keyboard.press('Space')
      await settleAnimations(page)
      now = await position(page)
      if (now.key === last.key) break
    }
    last = now
    const hold = holdFor(last, DWELL)
    report(steps + 1, last, hold)
    await sleep(hold)
  }

  if (process.stderr.isTTY) process.stderr.write('\n')
  await sleep(TAIL)

  const video = page.video()
  await context.close()
  await runner.browser.close()

  const raw = video ? await video.path() : null
  process.stdout.write(
    `${JSON.stringify({ raw, steps, readyOffset, engine: runner.engine })}\n`,
  )
}

/*
  Google Chrome if it is there, Playwright's own Chromium otherwise.

  This matters more than it looks: Playwright's bundled Chromium is the
  open-source build, and the open-source build ships no H.264 decoder. A deck
  with .mp4 assets records those slides as a black rectangle. Chrome has the
  codec, so the image installs it and we prefer it.
*/
async function launch() {
  const args = ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  try {
    return { browser: await chromium.launch({ channel: 'chrome', args }), engine: 'chrome' }
  } catch (err) {
    // The shell already refuses up front when Chrome is missing and the deck
    // has video, so reaching here means Chrome is installed but would not
    // start. Same consequence, so same rule: refuse unless told otherwise.
    const videos = Number(process.env.DECK_VIDEOS ?? 0)
    const why = String(err?.message ?? err).split(String.fromCharCode(10))[0]
    if (videos > 0 && process.env.ALLOW_CHROMIUM !== '1') {
      throw new Error(
        `Chrome is installed but would not launch, and this deck references ${videos} ` +
        'video file(s) that need its H.264 decoder. Re-run with --allow-chromium ' +
        `to record them as black rectangles anyway.\n  launch error: ${why}`,
      )
    }
    process.stderr.write(
      `  warning: using Chromium, which has no H.264 decoder (${why})\n` +
      (videos > 0
        ? `           ${videos} video file(s) in this deck will record black\n`
        : '           this deck references no video, so it makes no difference\n'),
    )
    return { browser: await chromium.launch({ args }), engine: 'chromium' }
  }
}

main().catch((err) => {
  process.stderr.write(`${err?.stack ?? err}\n`)
  process.exit(1)
})
