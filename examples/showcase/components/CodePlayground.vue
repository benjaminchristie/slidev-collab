<!--
  CodePlayground — an editable JavaScript box that runs in the slide.

    <CodePlayground :snippets="[{ name: 'sweep', code: '…' }]" />

  A slide is a web page, so it can evaluate the code it is showing. When
  someone asks "what if the schedule were cosine instead?", the answer is to
  change the line and press Run rather than to promise a plot by Friday.

  `new Function` compiles the box on every run, with a `console` of our own
  passed in so `console.log` lands in the panel instead of in devtools where
  nobody in the room can see it. Anything the snippet returns is printed too,
  and a returned array of numbers is drawn as a sparkline — which is usually
  what a returned array of numbers is for.

  Keyboard events are stopped at the textarea: Slidev listens on the document
  for the arrow keys, and without this, typing a comma would advance the slide.
-->
<template>
  <div class="sc-play">
    <div class="sc-play__head">
      <span class="sc-play__tab" v-for="s in list" :key="s.name">
        <button class="sc-btn" :class="{ 'sc-btn--on': s.name === current }" @click="load(s)">
          {{ s.name }}
        </button>
      </span>
      <span class="sc-play__spacer" />
      <button class="sc-btn sc-btn--primary" @click="run">Run ⌘↵</button>
    </div>

    <div class="sc-play__body">
      <div class="sc-play__editor">
        <div class="sc-play__gutter" aria-hidden="true">
          <span v-for="n in lineCount" :key="n">{{ n }}</span>
        </div>
        <textarea
          ref="area"
          v-model="source"
          class="sc-play__area"
          spellcheck="false"
          @keydown.stop="onKey"
          @keyup.stop
          @keypress.stop
        />
      </div>

      <div class="sc-play__out" :class="{ 'is-error': failed }">
        <div v-for="(line, i) in output" :key="i" class="sc-play__line" :class="`is-${line.kind}`">
          {{ line.text }}
        </div>
        <svg v-if="spark.length > 1" class="sc-play__spark" viewBox="0 0 200 48" preserveAspectRatio="none">
          <path :d="sparkPath" fill="none" stroke="var(--sc-orange)" stroke-width="1.6" />
        </svg>
        <div v-if="!output.length && !spark.length" class="sc-play__idle">press Run</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

/*
  The starting snippets. They live here rather than in the markdown because a
  template literal inside a Vue expression inside a markdown file is three
  levels of quoting to get wrong, and because these are the component's own
  demo content — a deck that wants different ones passes `snippets`.
*/
const DEFAULTS = [
  {
    name: 'cosine schedule',
    code: `// Returned arrays of numbers get drawn as a sparkline.
const total = 60
const warmup = 6
const peak = 1e-3

const lr = []
for (let step = 0; step < total; step++) {
  if (step < warmup) {
    lr.push((peak * step) / warmup)
  } else {
    const t = (step - warmup) / (total - warmup)
    lr.push(0.5 * peak * (1 + Math.cos(Math.PI * t)))
  }
}

console.log('peak at step', lr.indexOf(Math.max(...lr)))
return lr`,
  },
  {
    name: 'sweep',
    code: `// Every combination of a grid, as a flat list of configs.
function sweep(grid) {
  return Object.keys(grid).reduce(
    (configs, key) =>
      configs.flatMap((c) => grid[key].map((v) => ({ ...c, [key]: v }))),
    [{}],
  )
}

const configs = sweep({
  lr: [1e-4, 3e-4, 1e-3],
  seed: [0, 1, 2],
})

console.log(configs.length, 'runs')
return configs[4]`,
  },
  {
    name: 'budget',
    code: `// How long does the sweep take on eight GPUs?
const runs = 3 * 8       // rates x seeds
const hoursPerRun = 3.2
const gpus = 8

const wall = (runs * hoursPerRun) / gpus
console.log(runs, 'runs,', hoursPerRun, 'h each')
console.warn('wall-clock:', wall.toFixed(1), 'hours')
return Math.ceil(wall / 24) + ' days'`,
  },
]

const props = defineProps({
  // [{ name, code }] — the first one is loaded on arrival. Leave it out and
  // the three snippets above are used.
  //
  // Not `default: () => DEFAULTS`: the compiler hoists `defineProps` out of
  // setup(), so its options cannot reference anything declared in the setup
  // scope. The fallback happens in `list` below instead.
  snippets: { type: Array, default: () => [] },
  // Run the first snippet as soon as the component mounts, so the slide is
  // never sitting there empty when it arrives on the projector.
  auto: { type: Boolean, default: true },
})

const list = computed(() => (props.snippets.length ? props.snippets : DEFAULTS))

const source = ref(list.value[0]?.code ?? '')
const current = ref(list.value[0]?.name ?? '')
const output = ref([])
const spark = ref([])
const failed = ref(false)
const area = ref(null)

const lineCount = computed(() => source.value.split('\n').length)

function load(snippet) {
  current.value = snippet.name
  source.value = snippet.code
  run()
}

function stringify(value) {
  if (typeof value === 'string') return value
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(
      value,
      (_, v) => (typeof v === 'number' ? Number(v.toFixed(4)) : v),
    ) ?? String(value)
  } catch {
    return String(value)
  }
}

function run() {
  const lines = []
  const fakeConsole = {
    log: (...args) => lines.push({ kind: 'log', text: args.map(stringify).join(' ') }),
    warn: (...args) => lines.push({ kind: 'warn', text: args.map(stringify).join(' ') }),
    error: (...args) => lines.push({ kind: 'err', text: args.map(stringify).join(' ') }),
  }

  failed.value = false
  spark.value = []

  try {
    // The snippet body becomes a function body, so `return` at the end is how
    // it hands a value back. No async: a slide that has to await something is
    // a slide that can hang in front of an audience.
    const fn = new Function('console', source.value)
    const result = fn(fakeConsole)
    if (result !== undefined) {
      lines.push({ kind: 'ret', text: `→ ${stringify(result)}` })
      if (Array.isArray(result) && result.every((v) => typeof v === 'number')) {
        spark.value = result
      }
    }
  } catch (error) {
    failed.value = true
    lines.push({ kind: 'err', text: `${error.name}: ${error.message}` })
  }

  output.value = lines
}

function onKey(event) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    run()
    return
  }
  // Tab indents instead of leaving the box; a code editor that loses focus on
  // Tab is not a code editor.
  if (event.key === 'Tab') {
    event.preventDefault()
    const el = area.value
    const { selectionStart: a, selectionEnd: b } = el
    source.value = `${source.value.slice(0, a)}  ${source.value.slice(b)}`
    requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2))
  }
}

const sparkPath = computed(() => {
  const data = spark.value
  if (data.length < 2) return ''
  const lo = Math.min(...data)
  const hi = Math.max(...data)
  const span = hi - lo || 1
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 200
      const y = 44 - ((v - lo) / span) * 40
      return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
})

if (props.auto) run()
</script>

<style scoped>
.sc-play {
  border: 1px solid var(--sc-line);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.sc-play__head {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: #f5f6f8;
  border-bottom: 1px solid var(--sc-line);
}

.sc-play__spacer { flex: 1 1 auto; }

.sc-play__body {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  min-height: 0;
}

.sc-play__editor {
  display: flex;
  border-right: 1px solid var(--sc-line);
  background: #fbfbfc;
}

.sc-play__gutter {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.4rem 0.6rem 0.6rem;
  font-family: var(--sc-mono);
  font-size: 0.72rem;
  line-height: 1.6;
  color: var(--color-light-gray);
  text-align: right;
  user-select: none;
  min-width: 1.9rem;
}

.sc-play__area {
  flex: 1 1 auto;
  height: 11.5rem;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0.6rem 0.6rem 0.6rem 0.2rem;
  font-family: var(--sc-mono);
  font-size: 0.72rem;
  line-height: 1.6;
  color: var(--sc-ink);
  tab-size: 2;
}

.sc-play__out {
  padding: 0.6rem 0.7rem;
  font-family: var(--sc-mono);
  font-size: 0.7rem;
  line-height: 1.55;
  color: var(--sc-ink-2);
  overflow: auto;
  max-height: 11.5rem;
}
.sc-play__out.is-error { background: rgba(190, 60, 55, 0.04); }

.sc-play__line { white-space: pre-wrap; word-break: break-word; }
.is-ret { color: var(--sc-orange); font-weight: 700; }
.is-warn { color: #a16207; }
.is-err { color: var(--sc-red); }

.sc-play__spark {
  display: block;
  width: 100%;
  height: 48px;
  margin-top: 0.4rem;
}

.sc-play__idle {
  color: var(--color-light-gray);
  font-style: italic;
}
</style>
