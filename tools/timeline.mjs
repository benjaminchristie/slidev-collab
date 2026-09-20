/*
  How long a deck will run, without recording it.

    node tools/timeline.mjs examples/showcase
    node tools/timeline.mjs talk --dwell 4

  `./record` plays a deck in real time, so asking it how long the video is
  costs exactly as long as the video. The answer is in slides.md though: the
  recorder holds each click step for that slide's `dwell:` (or the run's
  default), so the holds are just a sum, and this does the sum.

  `dwell:` may be one number for the whole slide or a list with one entry per
  click step — `dwell: [2, 6, 3, 8]` — whose last entry repeats if the build
  runs on past the end of the list.

  What it cannot know is *settle* — the recorder waits for each step's
  animations to drain before its clock starts, which is measured at run time.
  So the holds are a floor, and the figure that matters is the range printed at
  the end: holds, plus at least SETTLE per step, plus the tail.

  Step counting mirrors what Slidev does closely but not perfectly: `clicks:` in
  frontmatter, the highest explicit `v-click="n"`, and bare `v-click`/`v-after`
  directives. A slide that builds its clicks some other way will be counted
  wrong here and right by the recorder, which is the one to believe.
*/
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const DEFAULT_DWELL = 4 // tools/record-video.sh
const SETTLE = 0.6 // seconds, the floor per step
const TAIL = 3 // seconds held after the last step

function decks(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'build' || name === 'common') continue
    const path = join(dir, name)
    let st
    try { st = statSync(path) } catch { continue }
    if (st.isDirectory()) decks(path, found)
    else if (name === 'slides.md') found.push(relative('.', dir))
  }
  return found
}

function resolve(arg) {
  const all = decks('.')
  const want = arg.replace(/\/$/, '')
  if (all.includes(want)) return want
  const matches = all.filter((d) => d === want || d.endsWith(`/${want}`))
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    console.error(`no such deck: ${want}\navailable:\n  ${all.join('\n  ')}`)
  } else {
    console.error(`ambiguous: ${want} matches\n  ${matches.join('\n  ')}`)
  }
  process.exit(1)
}

// Slides are separated by a --- line; a block of `key: value` lines after one
// is that slide's frontmatter rather than a separator.
function parse(md) {
  const lines = md.split('\n')
  const fences = lines.map((l, i) => (l.trim() === '---' ? i : -1)).filter((i) => i >= 0)
  const out = []
  let k = 2
  let front = lines.slice(1, fences[1])
  let start = fences[1] + 1
  // A `- 3` line is a YAML block sequence, which a list-valued key such as
  // `dwell:` may be written as, and is still frontmatter.
  const isFrontmatter = (block) =>
    block.length > 0 &&
    block.every((l) => /^\s*[\w-]+\s*:/.test(l) || /^\s*-\s/.test(l) || !l.trim())
  while (k < fences.length) {
    const sep = fences[k]
    out.push({ front, body: lines.slice(start, sep) })
    const next = fences[k + 1]
    if (next !== undefined && isFrontmatter(lines.slice(sep + 1, next))) {
      front = lines.slice(sep + 1, next)
      start = next + 1
      k += 2
      continue
    }
    front = []
    start = sep + 1
    k += 1
  }
  out.push({ front, body: lines.slice(start) })
  return out
}

const key = (front, name) => {
  const line = front.find((l) => l.trim().startsWith(`${name}:`))
  return line ? line.split(':').slice(1).join(':').trim() : null
}

/*
  `dwell:` is either one number for the whole slide or a list with one entry
  per click step, written inline as `dwell: [2, 6, 3, 8]` or as a YAML block
  sequence. A list shorter than the build repeats its last entry, and an entry
  that is not a positive number falls back to the run default.
*/
const uncomment = (l) => l.replace(/\s+#.*$/, '')

function dwells(front) {
  const at = front.findIndex((l) => l.trim().startsWith('dwell:'))
  if (at < 0) return []
  const inline = uncomment(front[at]).split(':').slice(1).join(':').trim()
  if (inline.startsWith('[')) {
    return inline.replace(/^\[|\]$/g, '').split(',').map((v) => Number(v.trim()))
  }
  if (inline) return [Number(inline)]
  const out = []
  for (let i = at + 1; i < front.length; i++) {
    const item = /^\s*-\s*(.+?)\s*$/.exec(uncomment(front[i]))
    if (!item) break
    out.push(Number(item[1]))
  }
  return out
}

const holdOf = (list, click, fallback) => {
  const v = Number(list[Math.min(click, list.length - 1)])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function steps(front, body) {
  const text = body.join('\n')
  const declared = Number(key(front, 'clicks'))
  const explicit = [...text.matchAll(/v-click="(\d+)"/g)].map((m) => Number(m[1]))
  const bare = (text.match(/v-click(?![="])|v-after|v-clicks/g) || []).length
  return Math.max(
    Number.isFinite(declared) && declared > 0 ? declared + 1 : 1,
    explicit.length ? Math.max(...explicit) + 1 : 1,
    explicit.length ? 1 : 1 + bare,
  )
}

const args = process.argv.slice(2)
let dwellDefault = DEFAULT_DWELL
const positional = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dwell') dwellDefault = Number(args[++i])
  else positional.push(args[i])
}
if (!positional.length) {
  console.error('usage: node tools/timeline.mjs <deck> [--dwell 4]\n\navailable decks:')
  console.error(`  ${decks('.').join('\n  ')}`)
  process.exit(2)
}

const deck = resolve(positional[0])
const slides = parse(readFileSync(join(deck, 'slides.md'), 'utf8'))

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

let holds = 0
let total = 0
console.log(`${deck}\n`)
console.log('  #   steps   dwell    hold   running   slide')
for (const [i, slide] of slides.entries()) {
  const n = steps(slide.front, slide.body)
  const list = dwells(slide.front)
  const each = Array.from({ length: n }, (_, k) => holdOf(list, k, dwellDefault))
  const hold = each.reduce((a, b) => a + b, 0)
  holds += hold
  total += n

  const lo = Math.min(...each)
  const hi = Math.max(...each)
  const shown = lo === hi ? `${lo}` : `${lo}-${hi}`
  // A star means at least one step fell back to the run default rather than
  // being asked for by the slide.
  const mark = each.some((v, k) => holdOf(list, k, -1) < 0) ? '*' : ' '

  const head =
    slide.body.find((l) => l.trim() && !l.trim().startsWith('<!--'))?.slice(0, 40) ?? ''
  console.log(
    `${String(i + 1).padStart(3)}  ${String(n).padStart(5)}  ${shown.padStart(4)}s${mark}` +
    `  ${String(hold).padStart(4)}s   ${fmt(holds).padStart(6)}   ${head}`,
  )
}

const floor = holds + total * SETTLE + TAIL
console.log(`\n  ${slides.length} slides, ${total} steps`)
console.log(`  holds                 ${String(Math.round(holds)).padStart(5)}s  ${fmt(holds)}`)
console.log(`  + settle (${SETTLE}s min)     ${String(Math.round(total * SETTLE)).padStart(5)}s`)
console.log(`  + tail                ${String(TAIL).padStart(5)}s`)
console.log(`  ------------------------------------`)
console.log(`  video, at least       ${String(Math.round(floor)).padStart(5)}s  ${fmt(floor)}`)
console.log(
  `\n  Settle is a floor, not a figure: a step whose animations run longer than\n` +
  `  ${SETTLE}s waits for them, so slides with transitions and builds push the real\n` +
  `  length above this. A dwell marked * fell back to the run default for at\n` +
  `  least one step; a range means the slide gave its steps different dwells.`,
)
