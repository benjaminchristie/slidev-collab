/*
  Watch a deck play itself, in your own browser, at the dwell times the
  recorder would use.

    ./present showcase
    # then paste this whole file into the browser console on the deck tab
    # (the deck, not /presenter). stopAutoplay() ends it.

  This is the recorder's walk without the recording: the same frontmatter
  `dwell:`, the same wait for animations to drain before the clock starts, the
  same stop condition of a keypress that changes nothing. It logs the real
  elapsed time at every step, so the total it prints includes settle — which
  `tools/timeline.mjs` can only put a floor under.

  It still runs in real time, because holding each step is the thing being
  measured. What it saves is the container, the encode and the file.
*/
;(() => {
  const DEFAULT_DWELL = 4
  const SETTLE = 600
  const MAX_SETTLE = 8000

  const unref = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
  const nav = () => window.__slidev__?.nav
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  if (!nav()) {
    console.error('no __slidev__ on this page — is this the deck tab?')
    return
  }

  let stopped = false
  window.stopAutoplay = () => {
    stopped = true
    console.log('autoplay: stopping after this step')
  }

  // Frontmatter has sat under two keys across Slidev versions; read either,
  // the way the theme's global-bottom and the recorder both do.
  // `dwell:` is either one number for the whole slide or a list with one
  // entry per click step — `dwell: [2, 6, 3, 8]` — the last entry repeating
  // if the build has more steps than the list has entries.
  const dwellOf = () => {
    const meta = unref(nav()?.currentSlideRoute)?.meta
    const front = meta?.slide?.frontmatter ?? meta?.frontmatter ?? {}
    const list = Array.isArray(front.dwell) ? front.dwell : [front.dwell]
    const click = unref(nav()?.clicks) ?? 0
    const own = Number(list[Math.min(click, list.length - 1)])
    return Number.isFinite(own) && own > 0 ? own : DEFAULT_DWELL
  }

  const where = () => `${unref(nav()?.currentPage)}:${unref(nav()?.clicks) ?? 0}`

  // Anything looping forever is ignored, and the whole wait is capped, exactly
  // as in tools/record-slides.mjs.
  const settle = async () => {
    const t0 = Date.now()
    await sleep(SETTLE)
    while (Date.now() - t0 < MAX_SETTLE) {
      const busy = document.getAnimations?.().some((a) => {
        if (a.playState !== 'running') return false
        const timing = a.effect?.getComputedTiming?.()
        return !timing || timing.iterations !== Infinity
      })
      if (!busy) break
      await sleep(120)
    }
    return Date.now() - t0
  }

  const advance = async () => {
    const n = nav()
    if (typeof n?.next === 'function') return n.next()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
    )
  }

  ;(async () => {
    const started = Date.now()
    let step = 0
    let settleTotal = 0
    console.log('autoplay: running — stopAutoplay() to end')
    for (;;) {
      settleTotal += await settle()
      const dwell = dwellOf()
      const at = ((Date.now() - started) / 1000).toFixed(1)
      console.log(`step ${String(step).padStart(3)}  slide ${where()}  hold ${dwell}s   ${at}s`)
      await sleep(dwell * 1000)
      if (stopped) break
      const before = where()
      await advance()
      await sleep(80)
      if (where() === before) break // a press that changed nothing: the end
      step++
    }
    const total = (Date.now() - started) / 1000
    console.log(
      `autoplay: ${step + 1} steps in ${total.toFixed(1)}s ` +
      `(${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}), ` +
      `${(settleTotal / 1000).toFixed(1)}s of it waiting for animations`,
    )
  })()
})()
