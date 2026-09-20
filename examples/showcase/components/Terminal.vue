<!--
  Terminal — a terminal window that fills in as you click through the slide.

    <div>
    <Terminal
      title="~/slides"
      :step="$clicks"
      :typing="$renderContext !== 'print'"
      :lines="[
        ['cmd', './present showcase'],
        ['out', 'serving examples/showcase'],
        ['ok',  'ready in 1.2s'],
      ]" />
    </div>

  Two Slidev globals do the work, and neither needs an import:

  * `$clicks` is the current click index on this slide. Passing it in as a prop
    means the component does not have to know anything about Slidev — it just
    renders the first N lines — and the markdown stays the place where the
    timing is decided.
  * `$renderContext` is 'print' while the PDF exporter is rendering. The
    typewriter is off in that pass, because Playwright screenshots the slide
    whenever it is ready and would otherwise catch the command half typed.

  A tag written across several lines like this one needs the plain `<div>`
  around it, or markdown escapes the tag instead of handing it to Vue.
-->
<template>
  <div class="sc-term">
    <div class="sc-term__bar">
      <span class="sc-term__dot" style="background: #ff5f57" />
      <span class="sc-term__dot" style="background: #febc2e" />
      <span class="sc-term__dot" style="background: #28c840" />
      <span class="sc-term__title">{{ title }}</span>
    </div>

    <div class="sc-term__body" :style="{ minHeight: rows ? `${rows * 1.55}em` : null }">
      <div v-for="(line, i) in shown" :key="i" class="sc-term__line" :class="`is-${line.kind}`">
        <span v-if="line.kind === 'cmd'" class="sc-term__prompt">$</span>
        <span class="sc-term__text">{{ line.text }}</span>
        <span v-if="i === shown.length - 1 && cursor" class="sc-term__cursor" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  // [kind, text] pairs. kind is one of cmd | out | ok | warn | err | dim.
  lines: { type: Array, default: () => [] },
  title: { type: String, default: 'bash' },
  // How many lines to show. Leave unset (or pass a number past the end) to
  // show the whole transcript at once.
  step: { type: Number, default: null },
  typing: { type: Boolean, default: true },
  // Characters per second for the typewriter.
  rate: { type: Number, default: 55 },
  // Reserve this many rows of height, so the panel does not grow as lines
  // arrive and shove the rest of the slide down.
  rows: { type: Number, default: 0 },
})

const parsed = computed(() =>
  props.lines.map((line) =>
    Array.isArray(line)
      ? { kind: line[0] || 'out', text: line[1] ?? '' }
      : { kind: line.kind || 'out', text: line.text ?? '' },
  ),
)

// A null step means "all of it". Otherwise the first line is visible from the
// start, so slide-arrival already shows the command that is about to run.
const count = computed(() => {
  if (props.step === null || props.step === undefined) return parsed.value.length
  return Math.max(0, Math.min(props.step + 1, parsed.value.length))
})

const typed = ref(Infinity)
let timer = 0

function stopTyping() {
  if (timer) {
    clearInterval(timer)
    timer = 0
  }
}

watch(
  count,
  (n, previous) => {
    stopTyping()
    const last = parsed.value[n - 1]
    // Only type forwards, and only commands: nobody types their own program's
    // output, and a backwards click should snap rather than replay.
    if (!props.typing || !last || last.kind !== 'cmd' || n < (previous ?? 0)) {
      typed.value = Infinity
      return
    }
    typed.value = 0
    timer = setInterval(() => {
      typed.value += 1
      if (typed.value >= last.text.length) stopTyping()
    }, 1000 / props.rate)
  },
  { immediate: true },
)

onBeforeUnmount(stopTyping)

const shown = computed(() =>
  parsed.value.slice(0, count.value).map((line, i, all) =>
    i === all.length - 1 && typed.value < line.text.length
      ? { ...line, text: line.text.slice(0, typed.value) }
      : line,
  ),
)

const cursor = computed(() => shown.value.at(-1)?.kind === 'cmd')
</script>

<style scoped>
.sc-term {
  border-radius: 12px;
  overflow: hidden;
  background: #14181f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 22px 44px -28px rgba(20, 22, 26, 0.85);
  font-family: var(--sc-mono);
}

.sc-term__bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  background: #1d232d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sc-term__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.sc-term__title {
  margin-left: 0.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: rgba(201, 209, 222, 0.5);
}

.sc-term__body {
  padding: 0.7rem 0.9rem 0.85rem;
  font-size: 0.75rem;
  line-height: 1.55;
}

.sc-term__line {
  white-space: pre-wrap;
  word-break: break-word;
  color: #9fb0c6;
}

.sc-term__prompt {
  color: var(--sc-orange-lit);
  margin-right: 0.5rem;
  font-weight: 700;
}

.is-cmd .sc-term__text { color: #eef2f8; }
.is-ok .sc-term__text { color: #61c391; }
.is-warn .sc-term__text { color: #e9c46a; }
.is-err .sc-term__text { color: #e8776f; }
.is-dim .sc-term__text { color: rgba(159, 176, 198, 0.55); }

.sc-term__cursor {
  display: inline-block;
  width: 0.5em;
  height: 1em;
  margin-left: 0.12em;
  vertical-align: text-bottom;
  background: var(--sc-orange-lit);
  animation: sc-blink 1.05s steps(1) infinite;
}

@keyframes sc-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sc-term__cursor { animation: none; }
}
</style>
