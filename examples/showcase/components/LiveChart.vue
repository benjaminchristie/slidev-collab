<!--
  LiveChart — a multi-series line chart, drawn as SVG by about a hundred lines
  of Vue. No charting library: Slidev decks run in a browser, and a browser
  already knows how to draw.

    <div>
    <LiveChart
      :series="[{ name: 'ours', color: '#cc7000', data: [...] }]"
      :labels="['0', '20k', '40k']"
      :reveal="$clicks + 1"
      :animate="$renderContext !== 'print'"
      unit="%" />
    </div>

  `reveal` is how many series to show, so `$clicks + 1` walks the curves onto
  the slide one at a time and the story can be told in the order the work
  happened. The lines draw themselves in with `pathLength="1"`, an SVG
  attribute that renormalises a path to unit length — which means the dash
  animation needs no measurement of the real geometry, and works the same on
  a curve of nine points and one of nine hundred.

  Hovering reads out every visible series at that x. That is a thing a PDF
  cannot do, and the reason to hand a reviewer the deck rather than the print.
-->
<template>
  <div class="sc-chart">
    <svg
      ref="svg"
      class="sc-chart__svg"
      :viewBox="`0 0 ${W} ${H}`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <defs>
        <linearGradient :id="`${uid}-area`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="series[0]?.color || '#cc7000'" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="series[0]?.color || '#cc7000'" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Horizontal grid and the y scale it belongs to. -->
      <g class="sc-chart__grid">
        <template v-for="(tick, i) in yTicks" :key="i">
          <line :x1="PAD.l" :x2="W - PAD.r" :y1="tick.y" :y2="tick.y" />
          <text :x="PAD.l - 8" :y="tick.y + 3.5" text-anchor="end">{{ tick.label }}</text>
        </template>
      </g>

      <g class="sc-chart__axis">
        <text
          v-for="(label, i) in xTicks"
          :key="i"
          :x="xOf(label.i)"
          :y="H - PAD.b + 16"
          text-anchor="middle"
        >{{ label.text }}</text>
      </g>

      <!-- The area under the first series only: shading every series turns a
           chart into a mess of overlapping translucency. -->
      <path
        v-if="visible.length"
        class="sc-chart__area"
        :d="areaPath(visible[0])"
        :fill="`url(#${uid}-area)`"
        :style="drawStyle(0, true)"
      />

      <path
        v-for="(s, i) in visible"
        :key="s.name"
        class="sc-chart__line"
        :d="linePath(s)"
        :stroke="s.color"
        :stroke-dasharray="s.dashed ? '5 4' : '1'"
        :pathLength="s.dashed ? null : 1"
        :style="drawStyle(i, s.dashed)"
      />

      <!-- The final value of each series, marked and labelled. -->
      <g v-for="(s, i) in visible" :key="`end-${s.name}`" :style="drawStyle(i, true)">
        <circle :cx="xOf(s.data.length - 1)" :cy="yOf(s.data.at(-1))" r="3.5" :fill="s.color" />
        <circle :cx="xOf(s.data.length - 1)" :cy="yOf(s.data.at(-1))" r="7" :fill="s.color" fill-opacity="0.18" />
      </g>

      <!-- Crosshair -->
      <g v-if="hover !== null" class="sc-chart__hover">
        <line :x1="xOf(hover)" :x2="xOf(hover)" :y1="PAD.t" :y2="H - PAD.b" />
        <circle
          v-for="s in visible"
          :key="`h-${s.name}`"
          :cx="xOf(hover)"
          :cy="yOf(s.data[hover])"
          r="4"
          fill="#fff"
          :stroke="s.color"
          stroke-width="2"
        />
      </g>
    </svg>

    <div class="sc-chart__legend">
      <span v-for="s in visible" :key="s.name" class="sc-chart__key">
        <i :style="{ background: s.color }" />{{ s.name }}
      </span>
      <span v-if="hover !== null" class="sc-chart__readout">
        <template v-for="s in visible" :key="`r-${s.name}`">
          <b :style="{ color: s.color }">{{ fmt(s.data[hover]) }}{{ unit }}</b>
        </template>
        <em v-if="labels[hover]">at {{ labels[hover] }}</em>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // [{ name, color, data: number[], dashed?: boolean }]
  series: { type: Array, default: () => [] },
  labels: { type: Array, default: () => [] },
  // How many series to show. Null means all of them.
  reveal: { type: Number, default: null },
  animate: { type: Boolean, default: true },
  unit: { type: String, default: '' },
  // Force the y range. Leave unset to fit the visible data.
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  decimals: { type: Number, default: 1 },
})

// The SVG is drawn in its own fixed coordinate space and scaled to the box by
// the viewBox, so nothing here has to know how wide the slide is.
const W = 640
const H = 268
const PAD = { t: 14, r: 18, b: 30, l: 42 }

// Unique per instance, because the gradient is referenced by id and two charts
// on one slide would otherwise share the first one's colour.
const uid = `chart-${Math.random().toString(36).slice(2, 8)}`

const visible = computed(() => {
  const n = props.reveal === null || props.reveal === undefined
    ? props.series.length
    : Math.max(0, Math.min(props.reveal, props.series.length))
  return props.series.slice(0, n)
})

const length = computed(() =>
  Math.max(...props.series.map((s) => s.data.length), 2),
)

const bounds = computed(() => {
  const values = visible.value.flatMap((s) => s.data)
  if (!values.length) return { lo: 0, hi: 1 }
  let lo = props.min ?? Math.min(...values)
  let hi = props.max ?? Math.max(...values)
  if (hi === lo) hi = lo + 1
  const pad = (hi - lo) * 0.12
  return { lo: props.min ?? lo - pad, hi: props.max ?? hi + pad }
})

function xOf(i) {
  return PAD.l + (i / (length.value - 1)) * (W - PAD.l - PAD.r)
}

function yOf(value) {
  const { lo, hi } = bounds.value
  const t = (value - lo) / (hi - lo)
  return H - PAD.b - t * (H - PAD.t - PAD.b)
}

function fmt(value) {
  return value === undefined ? '—' : value.toFixed(props.decimals)
}

const yTicks = computed(() => {
  const { lo, hi } = bounds.value
  return Array.from({ length: 5 }, (_, i) => {
    const value = lo + ((hi - lo) * i) / 4
    return { y: yOf(value), label: fmt(value) }
  })
})

const xTicks = computed(() => {
  if (!props.labels.length) return []
  const stride = Math.max(1, Math.ceil(props.labels.length / 7))
  return props.labels
    .map((text, i) => ({ text, i }))
    .filter((_, i) => i % stride === 0 || i === props.labels.length - 1)
})

/*
  A Catmull-Rom spline converted to cubic Béziers. Straight segments between
  sampled points make a training curve look like a stock ticker; this smooths
  it without the component needing to know anything about the data.
*/
function linePath(s) {
  const pts = s.data.map((v, i) => [xOf(i), yOf(v)])
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return d
}

function areaPath(s) {
  const line = linePath(s)
  if (!line) return ''
  return `${line} L ${xOf(s.data.length - 1)} ${H - PAD.b} L ${xOf(0)} ${H - PAD.b} Z`
}

/*
  The draw-in. A solid line renormalised with pathLength="1" can be revealed by
  animating stroke-dashoffset from 1 to 0; anything that already carries a dash
  pattern (the baselines) fades in instead, because the two cannot share the
  dasharray. Series are staggered so a click that reveals two of them still
  reads as two things.
*/
function drawStyle(i, fadeOnly) {
  if (!props.animate) return {}
  const delay = `${i * 140}ms`
  if (fadeOnly) {
    return { animation: `sc-chart-fade 500ms ease ${delay} both` }
  }
  return {
    strokeDashoffset: 0,
    animation: `sc-chart-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay} both`,
  }
}

const svg = ref(null)
const hover = ref(null)

function onMove(event) {
  const rect = svg.value?.getBoundingClientRect()
  if (!rect || !rect.width) return
  const x = ((event.clientX - rect.left) / rect.width) * W
  const t = (x - PAD.l) / (W - PAD.l - PAD.r)
  const i = Math.round(t * (length.value - 1))
  hover.value = Math.max(0, Math.min(i, length.value - 1))
}
</script>

<style scoped>
.sc-chart {
  width: 100%;
}

/* Width-driven, height derived from the viewBox: the chart grows with the
   column it is put in and nothing inside it is ever stretched out of shape. */
.sc-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.sc-chart__grid line {
  stroke: rgba(20, 22, 26, 0.09);
  stroke-width: 1;
}

.sc-chart__grid text,
.sc-chart__axis text {
  font-family: var(--sc-mono);
  font-size: 9px;
  fill: var(--color-light-gray);
}

.sc-chart__line {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sc-chart__hover line {
  stroke: var(--color-light-gray);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.sc-chart__legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.4rem;
  font-family: var(--sc-mono);
  font-size: 0.68rem;
  color: var(--color-dark-gray);
  min-height: 1.3rem;
}

.sc-chart__key {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sc-chart__key i {
  width: 12px;
  height: 3px;
  border-radius: 999px;
  display: inline-block;
}

.sc-chart__readout {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  font-variant-numeric: tabular-nums;
}
.sc-chart__readout em {
  font-style: normal;
  color: var(--color-light-gray);
}
</style>

<style>
/* Keyframes cannot live in a scoped block and still be referenced from an
   inline style binding, so these two are global — and prefixed accordingly. */
@keyframes sc-chart-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}

@keyframes sc-chart-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .sc-chart__line,
  .sc-chart__area { animation: none !important; }
}
</style>
