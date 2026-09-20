<!--
  DeckPlayer — press play on a deck.

  Mount it once, anywhere that renders on every slide, and Shift+P plays the
  deck through by itself: back to slide 1, then one step every `dwell:`
  seconds, with a clock in the corner. Shift+P again stops it.

  The theme's own `global-top.vue` mounts it, so a deck gets this for free. A
  deck that writes its *own* `global-top.vue` replaces the theme's rather than
  adding to it, and has to mount this itself:

    <template>
      <DeckPlayer />
      ...whatever else the deck wanted up there
    </template>

  Why it exists: `./record <deck>` answers "how long is this video?" only by
  taking that long and then encoding. This is the same walk with no container,
  no browser automation and no file — just the deck, playing, in the tab that
  is already open.

  It is deliberately *not* what the recorder does. `./record` waits for each
  step's animations to drain before its dwell clock starts, so a recording is
  always longer than the sum of the dwells. This holds each step for exactly
  its dwell and no more, which makes the wall clock here equal to the figure
  `node tools/timeline.mjs` prints — the number to check a time limit against.
  The recorded file runs longer by roughly the settle total, which
  `./record <deck> --preview` measures.

  Nothing here runs unless the key is pressed, so it cannot appear in a
  recording or an export by accident.
-->
<template>
  <div v-if="playing" class="dp-hud">
    <span class="dp-dot"></span>
    {{ clock }}
    <span class="dp-sep">·</span>
    slide {{ page }}<span v-if="total">/{{ total }}</span>
    <span class="dp-sep">·</span>
    step {{ step + 1 }}
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  // Seconds to hold a step whose slide says nothing. Matches the default in
  // tools/record-video.sh, so the two agree about a deck with no `dwell:`.
  dwell: { type: Number, default: 4 },
  // The key, without the shift. Shift is required either way, so that this
  // cannot collide with one of Slidev's single-letter shortcuts.
  hotkey: { type: String, default: 'P' },
})

const playing = ref(false)
const step = ref(0)
const page = ref(1)
const total = ref(0)
const elapsed = ref(0)

let timer = null
let ticker = null
let cancelled = false

const clock = computed(() => {
  const s = Math.round(elapsed.value)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

// Slidev's nav exposes refs on some versions and plain values on others.
const unref = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const nav = () => (typeof window === 'undefined' ? null : window.__slidev__?.nav)

/*
  How long to hold the step we are on.

  Frontmatter has sat under two keys across Slidev versions; read either, the
  way the theme's global-bottom and tools/record-slides.mjs both do.

  `dwell:` is either one number for the whole slide or a list with one entry
  per click step — `dwell: [2, 6, 3, 8]` — because a build often has a step
  that needs a beat and a step that needs a breath. A list shorter than the
  build repeats its last entry, and an entry that is not a positive number
  falls back to the default.
*/
function dwellOf() {
  const meta = unref(nav()?.currentSlideRoute)?.meta
  const front = meta?.slide?.frontmatter ?? meta?.frontmatter ?? {}
  const list = Array.isArray(front.dwell) ? front.dwell : [front.dwell]
  const click = unref(nav()?.clicks) ?? 0
  const own = Number(list[Math.min(click, list.length - 1)])
  return Number.isFinite(own) && own > 0 ? own : props.dwell
}

const where = () => `${unref(nav()?.currentPage)}:${unref(nav()?.clicks) ?? 0}`

function sync() {
  page.value = unref(nav()?.currentPage) ?? 1
  total.value = unref(nav()?.total) ?? 0
}

function stop() {
  cancelled = true
  playing.value = false
  clearTimeout(timer)
  clearInterval(ticker)
  timer = null
  ticker = null
}

async function advance() {
  const n = nav()
  if (typeof n?.next === 'function') return n.next()
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
  )
}

async function start() {
  const n = nav()
  if (!n) return

  cancelled = false
  playing.value = true
  step.value = 0
  elapsed.value = 0

  // Play means play from the top.
  if (typeof n.go === 'function' && unref(n.currentPage) !== 1) {
    await n.go(1)
    await new Promise((r) => setTimeout(r, 400))
  }
  sync()

  const started = Date.now()
  ticker = setInterval(() => {
    elapsed.value = (Date.now() - started) / 1000
  }, 200)

  const tick = async () => {
    if (cancelled) return
    // Exactly the dwell. No waiting for animations — that is the recorder's
    // job, and including it here would stop the clock agreeing with the deck.
    const hold = dwellOf() * 1000
    timer = setTimeout(async () => {
      if (cancelled) return
      const before = where()
      await advance()
      await new Promise((r) => setTimeout(r, 60))
      sync()
      if (where() === before) {
        // A press that changed nothing: the deck is over.
        const ran = (Date.now() - started) / 1000
        // eslint-disable-next-line no-console
        console.log(
          `DeckPlayer: ${step.value + 1} steps in ${ran.toFixed(1)}s ` +
          `(${Math.floor(ran / 60)}:${String(Math.round(ran % 60)).padStart(2, '0')})`,
        )
        stop()
        return
      }
      step.value += 1
      tick()
    }, hold)
  }
  tick()
}

function onKey(e) {
  if (e.key !== props.hotkey || e.ctrlKey || e.metaKey || e.altKey) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
  e.preventDefault()
  e.stopPropagation()
  playing.value ? stop() : start()
}

onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  stop()
})
</script>

<style scoped>
.dp-hud {
  position: fixed;
  top: 0.9rem;
  right: 1.1rem;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  color: #595959;
  pointer-events: none;
  user-select: none;
}

.dp-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-emphasis, #cc7000);
}

.dp-sep {
  opacity: 0.4;
}
</style>
