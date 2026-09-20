<!--
  LiveChart — a line chart with mean ± SEM clouds, drawn as SVG by the theme
  itself. No charting library: a Slidev deck runs in a browser, and a browser
  already knows how to draw.

    <div>
    <LiveChart
      :series="[
        { name: 'MEMO', color: 'var(--color-emphasis)',
          data: [28.5, 35.7, 37.3], lo: [21.9, 29.2, 30.6], hi: [34.6, 42.3, 44] },
        { name: 'TrajGen', color: 'var(--color-purple)', data: [28, 28, 28], dashed: true },
      ]"
      :x="[0, 1.5, 3]"
      :ticks="[0, 2, 4]"
      x-label="Hours of Interaction Data"
      y-label="Success Rate (%)"
      unit="%"
      :min="20" :max="80"
      :reveal="$clicks + 1"
      :animate="$renderContext !== 'print'" />
    </div>

  A series is `{ name, color, data }` plus, optionally, `lo`/`hi` arrays for the
  shaded cloud (or `sem`, from which lo/hi are derived as data ± sem), and
  `dashed: true` for a baseline that should not read as a measured curve.

  `reveal` is how many series to show, so `$clicks + 1` walks the curves onto
  the slide one at a time and the story can be told in the order the work
  happened. A series draws itself in by sweeping a clip from the left edge of
  the plot, so its cloud is revealed piece by piece alongside its mean rather
  than appearing whole, and a dashed baseline draws in like every other line.
  The sweep runs in x, which for a time series is the order the data arrived
  in, and it costs no measurement of the real geometry.

  Points sit at their real x value. `scale` overrides that with knots —
  `[[value, position], ...]` — which is how a broken axis (linear to 64, then
  doubling to 1024) is reproduced exactly as the original figure drew it.

  Hovering reads out x and every visible series at that x, with its cloud. That
  is the thing a PDF cannot do, and the reason to hand a committee the deck
  rather than the print. `sync` links the crosshair across charts that share an
  x axis, so a two-panel figure still reads as one figure.
-->
<template>
  <div
    ref="root"
    class="collab-chart"
    :style="{
      '--collab-chart-fs': `${fontSize}px`,
      '--collab-chart-legend-fs': `${legendFs * legendFit.scale}px`,
      '--collab-chart-read-fs': `${fontSize * legendFit.scale}px`,
    }"
  >
    <svg
      ref="svg"
      class="collab-chart-svg"
      :height="H"
      :viewBox="`0 0 ${W} ${H}`"
      @pointermove="onMove"
      @pointerleave="setHover(null)"
    >
      <defs>
        <linearGradient :id="`${uid}-area`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :style="{ stopColor: visible[0]?.color }" stop-opacity="0.22" />
          <stop offset="100%" :style="{ stopColor: visible[0]?.color }" stop-opacity="0" />
        </linearGradient>

        <!-- The draw-in. One rectangle per series, scaled out from the left
             edge of the plot, clipping that series' line and cloud. Because
             both are clipped by the same sweep, the cloud arrives with the
             mean rather than all at once — and the cloud's own sweep is a
             few tens of milliseconds quicker, so it stays just ahead of the
             line it belongs to, the way it would if you drew it by hand. -->
        <template v-for="(s, i) in drawable" :key="`sweep-${s.name}`">
          <clipPath :id="`${uid}-line-${i}`">
            <rect :x="pad.l" y="0" :width="W - pad.l - pad.r" :height="H" :style="sweep(i)" />
          </clipPath>
          <clipPath :id="`${uid}-cloud-${i}`">
            <rect :x="pad.l" y="0" :width="W - pad.l - pad.r" :height="H" :style="sweep(i, LEAD_MS)" />
          </clipPath>
        </template>
      </defs>

      <!-- Horizontal grid, and the y scale it belongs to. -->
      <g class="collab-chart-grid">
        <template v-for="(tick, i) in yTicks" :key="i">
          <line :x1="pad.l" :x2="W - pad.r" :y1="tick.y" :y2="tick.y" />
          <text :x="pad.l - 7" :y="tick.y + fontSize * 0.35" text-anchor="end">{{ tick.label }}</text>
        </template>
      </g>

      <g class="collab-chart-axis">
        <text
          v-for="(tick, i) in xTicks"
          :key="i"
          :x="tick.x"
          :y="H - pad.b + fontSize * 1.15"
          text-anchor="middle"
        >{{ tick.label }}</text>
        <!-- The double slash that says an axis is broken. A `scale` that jumps
             from counting to doubling is a lie without it. -->
        <g v-if="axisBreak !== null" class="collab-chart-break">
          <line
            v-for="dx in [-3, 1]"
            :key="dx"
            :x1="xAt(axisBreak) + dx * fontSize * 0.26 - fontSize * 0.22"
            :x2="xAt(axisBreak) + dx * fontSize * 0.26 + fontSize * 0.22"
            :y1="H - pad.b + fontSize * 0.42"
            :y2="H - pad.b - fontSize * 0.42"
          />
        </g>
      </g>

      <text
        v-if="xLabel"
        class="collab-chart-title"
        :x="pad.l + (W - pad.l - pad.r) / 2"
        :y="H - 5"
        text-anchor="middle"
      >{{ xLabel }}</text>
      <text
        v-if="yLabel"
        class="collab-chart-title"
        :x="-(pad.t + (H - pad.t - pad.b) / 2)"
        :y="fontSize * 0.95"
        text-anchor="middle"
        transform="rotate(-90)"
      >{{ yLabel }}</text>

      <!-- The clouds first, so no line is ever buried under one. Nothing is
           in the DOM until `started`, because mounting is what starts the
           draw-in: render it early and the animation is spent behind a slide
           transition or a click the audience has not made yet. -->
      <path
        v-for="(s, i) in drawable"
        v-show="s.hasBand"
        :key="`band-${s.name}`"
        class="collab-chart-band"
        :d="s.bandPath"
        :clip-path="`url(#${uid}-cloud-${i})`"
        :style="{ fill: s.color }"
      />

      <!-- The gradient fill is for decks with a single unbanded curve; a chart
           that already shows clouds does not need a second kind of shading. -->
      <path
        v-if="showArea && drawable.length"
        class="collab-chart-area"
        :d="drawable[0].areaPath"
        :fill="`url(#${uid}-area)`"
        :clip-path="`url(#${uid}-cloud-0)`"
      />

      <path
        v-for="(s, i) in drawable"
        :key="`line-${s.name}`"
        class="collab-chart-line"
        :d="s.linePath"
        :stroke-dasharray="s.dashed ? '6 5' : null"
        :clip-path="`url(#${uid}-line-${i})`"
        :style="{ stroke: s.color }"
      />

      <!-- Crosshair. The x value is read out here rather than in the legend
           below, so that the legend's width never changes under the pointer. -->
      <g v-if="hover !== null && drawable.length" class="collab-chart-hover">
        <line :x1="xOf(hover)" :x2="xOf(hover)" :y1="pad.t" :y2="H - pad.b" />
        <circle
          v-for="s in drawable"
          :key="`h-${s.name}`"
          :cx="xOf(hover)"
          :cy="yOf(s.data[hover])"
          r="4.5"
          fill="#fff"
          :style="{ stroke: s.color }"
          stroke-width="2.4"
        />
        <text
          class="collab-chart-at-mark"
          :x="crosshairLabelX"
          :y="pad.t + fontSize * 0.95"
          text-anchor="middle"
        >{{ fmtX(xs[hover]) }}</text>
      </g>
    </svg>

    <!-- Every series gets a key, revealed or not, and the grid gives all of
         them one column width wide enough for the widest possible reading.
         Both are for the same reason: neither a click nor the pointer may
         change the size or the alignment of this box, because it sits
         directly under a chart that would shift with it. -->
    <div
      v-if="legend"
      class="collab-chart-legend"
      :style="{
        gridTemplateColumns: `repeat(${legendFit.cols}, minmax(0, 1fr))`,
        columnGap: `${legendBox.gap * legendFit.scale}px`,
      }"
    >
      <span
        v-for="k in keys"
        :key="k.name"
        class="collab-chart-key"
        :class="{ 'is-pending': !k.shown }"
      >
        <!-- The key is the line itself, same colour and same dash pattern,
             rather than a coloured block styled to look like one. -->
        <svg class="collab-chart-mark" viewBox="0 0 24 6" aria-hidden="true">
          <line
            x1="1.6"
            y1="3"
            x2="22.4"
            y2="3"
            :style="{ stroke: k.color }"
            :stroke-dasharray="k.dashed ? '6 5' : null"
          />
        </svg>
        <span
          class="collab-chart-name"
          :style="{ minWidth: `${legendBox.name * legendFit.scale}px` }"
        >{{ k.name }}</span>
        <b v-if="hover !== null && k.shown" :style="{ color: k.color }">{{ readout(k.series, hover) }}</b>
      </span>
    </div>
  </div>
</template>

<script>
// Module scope, so every chart on the slide reads the same object: this is
// what lets two panels of one figure share a crosshair. A setup block runs
// once per instance and could not hold it.
//
// Nothing in this file may spell a block tag literally, even inside a comment
// or a string: the SFC parser scans the raw text and would end the block here.
import { reactive } from 'vue'

const crosshairs = reactive({})
</script>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  // [{ name, color, data: number[], lo?, hi?, sem?, dashed? }]
  series: { type: Array, default: () => [] },
  // Real x values, one per point. Defaults to 0, 1, 2, …
  x: { type: Array, default: null },
  // x values to label. Numbers, or [value, 'text'] to set the text yourself.
  ticks: { type: Array, default: null },
  // Knots [[value, position], …] for a non-linear x axis. Positions are
  // relative; only their spacing matters.
  scale: { type: Array, default: null },
  xLabel: { type: String, default: '' },
  // Appended to every x reading, tick and crosshair alike ('k', 'h', 's').
  xUnit: { type: String, default: '' },
  yLabel: { type: String, default: '' },
  unit: { type: String, default: '' },
  // How many series to show. Null means all of them.
  reveal: { type: Number, default: null },
  animate: { type: Boolean, default: true },
  legend: { type: Boolean, default: true },
  curve: { type: String, default: 'linear' },   // or 'smooth'
  // Force the y range. Leave unset to fit the visible data and its clouds.
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  decimals: { type: Number, default: 1 },
  xDecimals: { type: Number, default: null },
  yTickCount: { type: Number, default: 5 },
  // Height of the plotting box, in CSS pixels. The width comes from the
  // column the chart is dropped into.
  height: { type: Number, default: 300 },
  // Tick and legend type size, in CSS pixels. Everything else — axis titles,
  // the margins that hold them — is derived from it. This is a talk: the
  // default is sized to be read from the back of a room, not from a laptop.
  fontSize: { type: Number, default: 15 },
  // Legend type size. Unset means 1.3x `font-size`: the series names are the
  // one thing on a figure that has to carry to the back of the room, so they
  // are set larger than the tick labels rather than the same.
  legendSize: { type: Number, default: null },
  // Milliseconds to wait, after the chart is genuinely on screen, before the
  // curves draw themselves in. Long enough to let a slide transition or a
  // click reveal finish first, so the drawing is not wasted behind it.
  delay: { type: Number, default: 450 },
  // Draw the gradient fill under the first series. Unset means "only when no
  // series carries a cloud of its own".
  area: { type: Boolean, default: null },
  // x value at which to draw the broken-axis mark. Only meaningful with
  // `scale`, and required by honesty whenever that scale changes footing.
  axisBreak: { type: Number, default: null },
  // Charts sharing a sync key share a crosshair.
  sync: { type: String, default: null },
})

/*
  One SVG unit is one CSS pixel: the viewBox is set to the box the chart was
  actually given, rather than to a fixed design width that the browser then
  scales. Scaling a fixed viewBox is the usual trick and it is wrong here — it
  shrinks the tick labels along with the curves, so the same component is
  legible in a full-width figure and unreadable in a column beside it.
*/
const root = ref(null)
const W = ref(640)
const H = computed(() => props.height)
const legendFs = computed(() => props.legendSize ?? props.fontSize * 1.3)

let observer = null
onMounted(() => {
  if (!root.value) return
  if (typeof document !== 'undefined') {
    measurer = document.createElement('canvas').getContext('2d')
    fontFamily.value = getComputedStyle(root.value).fontFamily
    document.fonts?.ready?.then(() => { fontEpoch.value += 1 })
  }
  // Seed it synchronously: the observer's first callback lands after this
  // frame, and a chart that paints once at the fallback width flashes its
  // labels at the wrong size on the way in.
  if (root.value.clientWidth > 80) W.value = root.value.clientWidth
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const w = entry?.contentRect?.width
    if (w > 80) W.value = Math.round(w)
  })
  observer.observe(root.value)
})
/*
  When to start drawing. A curve that draws itself in while its wrapper is
  still at opacity 0 — behind a v-click, or mid slide transition — has spent
  its one animation on nobody. So the paths stay out of the DOM until the
  chart is genuinely on screen and has been for `delay` milliseconds; mounting
  them is what starts the CSS animation. Going back behind the click resets
  the gate, so stepping forward again plays it a second time.
*/
const started = ref(!props.animate)
let gate = null
let timer = null

function onScreen(el) {
  for (let n = el; n instanceof Element; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
      return false
    }
  }
  return !!el
}

onMounted(() => {
  if (!props.animate) return
  gate = setInterval(() => {
    if (onScreen(root.value)) {
      if (!started.value && timer === null) {
        timer = setTimeout(() => { started.value = true; timer = null }, props.delay)
      }
    } else if (started.value || timer !== null) {
      clearTimeout(timer)
      timer = null
      started.value = false
    }
  }, 60)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearInterval(gate)
  clearTimeout(timer)
})

/*
  Text is measured, not estimated. The layout has to decide how wide the y
  margin is and how many legend keys fit across, and both answers move with
  the font actually in use — Palatino on a laptop, URW Palladio in the export
  container, some other serif on a borrowed machine. A guess a few percent out
  is the difference between a legend two columns wide and one four rows deep.
  A canvas context gives the real number, in layout pixels, and layout pixels
  are what the grid is laid out in however the slide is scaled to the screen.

  The ratios below are only the fallback for the first render, before the
  canvas exists: digits and punctuation in a serif run a little over half the
  type size, words rather wider.
*/
const CH = 0.56
const CH_WORD = 0.66

const fontFamily = ref('')
const fontEpoch = ref(0)
let measurer = null

function textWidth(text, px, fallbackRatio) {
  // Both refs are read every time, so the measurements re-run once the family
  // is known and again if webfonts settle later.
  const family = fontFamily.value
  void fontEpoch.value
  if (measurer && family) {
    measurer.font = `${px}px ${family}`
    return measurer.measureText(String(text)).width
  }
  return String(text).length * px * fallbackRatio
}

// The left margin has to hold the widest y label, and the labels have to be
// known before the margin is, so the tick *values* are computed without any
// reference to the geometry and only placed once the margins exist.
const widestYLabel = computed(() =>
  Math.max(
    ...yTickValues.value.map((v) =>
      textWidth(fmt(v, niceDecimals.value), props.fontSize, CH),
    ),
    1,
  ),
)

const pad = computed(() => {
  const fs = props.fontSize
  return {
    t: Math.round(fs * 0.7),
    r: Math.round(fs * 1.2),
    b: Math.round(fs * 1.45 + (props.xLabel ? fs * 1.5 : 0) + 6),
    l: Math.round(widestYLabel.value + 10 + (props.yLabel ? fs * 1.25 + 6 : 0)),
  }
})

// Unique per instance, because the gradient is referenced by id and two charts
// on one slide would otherwise share the first one's colour.
const uid = `collab-chart-${Math.random().toString(36).slice(2, 8)}`

// Crosshairs are shared by key, so the two panels of one figure move together.
const local = ref(null)
const hover = computed(() => {
  const i = props.sync ? crosshairs[props.sync] : local.value
  if (i === null || i === undefined) return null
  // Synced charts can disagree about how many samples they have; a crosshair
  // from the wider one must not index off the end of the narrower.
  return Math.max(0, Math.min(i, xs.value.length - 1))
})
function setHover(i) {
  if (props.sync) crosshairs[props.sync] = i
  else local.value = i
}

const xs = computed(() =>
  props.x && props.x.length
    ? props.x.map(Number)
    : Array.from({ length: length.value }, (_, i) => i),
)

const length = computed(() =>
  Math.max(...props.series.map((s) => s.data?.length || 0), 2),
)

const revealed = computed(() => {
  const n = props.reveal === null || props.reveal === undefined
    ? props.series.length
    : Math.max(0, Math.min(props.reveal, props.series.length))
  return props.series.slice(0, n)
})

function bandsOf(s) {
  if (Array.isArray(s.lo) && Array.isArray(s.hi)) return [s.lo, s.hi]
  if (Array.isArray(s.sem)) {
    return [s.data.map((v, i) => v - s.sem[i]), s.data.map((v, i) => v + s.sem[i])]
  }
  return null
}

const bounds = computed(() => {
  const values = []
  for (const s of revealed.value) {
    values.push(...s.data.filter((v) => Number.isFinite(v)))
    const band = bandsOf(s)
    if (band) values.push(...band[0], ...band[1])
  }
  if (!values.length) return { lo: 0, hi: 1 }
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi === lo) hi = lo + 1
  const gap = (hi - lo) * 0.08
  return { lo: props.min ?? lo - gap, hi: props.max ?? hi + gap }
})

// The x axis: linear in the data values, unless `scale` gives knots for a
// broken one. Either way it is one monotone piecewise-linear map.
const knots = computed(() => {
  if (props.scale && props.scale.length > 1) {
    return { v: props.scale.map((k) => k[0]), p: props.scale.map((k) => k[1]) }
  }
  const v = xs.value
  return { v: [Math.min(...v), Math.max(...v)], p: [0, 1] }
})

function interp(value, from, to) {
  if (value <= from[0]) {
    const span = from[1] - from[0] || 1
    return to[0] + ((value - from[0]) / span) * (to[1] - to[0])
  }
  for (let i = 1; i < from.length; i++) {
    if (value <= from[i]) {
      const span = from[i] - from[i - 1] || 1
      return to[i - 1] + ((value - from[i - 1]) / span) * (to[i] - to[i - 1])
    }
  }
  const n = from.length - 1
  const span = from[n] - from[n - 1] || 1
  return to[n - 1] + ((value - from[n - 1]) / span) * (to[n] - to[n - 1])
}

const posRange = computed(() => {
  const all = xs.value.map((v) => interp(v, knots.value.v, knots.value.p))
  return [Math.min(...all), Math.max(...all)]
})

function xAt(value) {
  const p = interp(value, knots.value.v, knots.value.p)
  const [p0, p1] = posRange.value
  const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0)
  return pad.value.l + t * (W.value - pad.value.l - pad.value.r)
}

function xOf(i) {
  return xAt(xs.value[i] ?? i)
}

function yOf(value) {
  const { lo, hi } = bounds.value
  const t = (value - lo) / (hi - lo)
  return H.value - pad.value.b - t * (H.value - pad.value.t - pad.value.b)
}

function fmt(value, places = props.decimals) {
  return Number.isFinite(value) ? value.toFixed(places) : '—'
}

function fmtX(value) {
  const text = props.xDecimals !== null
    ? value.toFixed(props.xDecimals)
    : String(Number.isInteger(value) ? value : Math.round(value * 100) / 100)
  return text + props.xUnit
}

/*
  Gridlines land on round numbers rather than on equal slices of the range: a
  collision cost axis running 10-145 should be ruled at 20, 40, 60 and not at
  10, 44, 78. Candidate steps are 1, 2 and 5 times a power of ten, and the one
  whose tick count comes closest to `yTickCount` wins — ties to the finer step.
*/
const yStep = computed(() => {
  const { lo, hi } = bounds.value
  const target = Math.max(2, props.yTickCount)
  const mag = 10 ** Math.floor(Math.log10((hi - lo) / target || 1))
  let best = mag
  let bestScore = Infinity
  for (const step of [mag, 2 * mag, 5 * mag, 10 * mag]) {
    const count = Math.floor(hi / step) - Math.ceil(lo / step) + 1
    const score = Math.abs(count - target)
    if (count >= 2 && score < bestScore) { bestScore = score; best = step }
  }
  return best
})

const yTickValues = computed(() => {
  const { lo, hi } = bounds.value
  const step = yStep.value
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    // Floating point leaves 0.30000000000000004 lying around; round to the step.
    out.push(Math.round(v / step) * step)
  }
  return out
})

const yTicks = computed(() =>
  yTickValues.value.map((value) => ({
    y: yOf(value),
    label: fmt(value, niceDecimals.value),
  })),
)

// Axis labels get as many decimals as the step needs and no more: a cost axis
// stepping by 50 should not be labelled 550.0.
const niceDecimals = computed(() => {
  const step = yStep.value
  if (step >= 1) return 0
  return Math.min(props.decimals, Math.ceil(-Math.log10(step)))
})

const xTicks = computed(() => {
  if (props.ticks && props.ticks.length) {
    return props.ticks.map((t) => {
      const [value, text] = Array.isArray(t) ? t : [t, fmtX(t)]
      return { x: xAt(value), label: text }
    })
  }
  const stride = Math.max(1, Math.ceil(xs.value.length / 7))
  return xs.value
    .map((v, i) => ({ x: xOf(i), label: fmtX(v), i }))
    .filter((t) => t.i % stride === 0 || t.i === xs.value.length - 1)
})

/*
  Straight segments are the honest default here: these curves are sampled data,
  and a spline through them invents wiggles between the samples that nobody
  measured. `curve="smooth"` opts into a Catmull-Rom spline for the cases where
  the samples are dense enough that the corners are only rendering noise.
*/
function pathOf(points) {
  if (points.length < 2) return ''
  if (props.curve !== 'smooth') {
    return points.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ')
  }
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6},` +
         ` ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6},` +
         ` ${p2[0]} ${p2[1]}`
  }
  return d
}

const visible = computed(() =>
  revealed.value.map((s) => {
    const band = bandsOf(s)
    const line = s.data.map((v, i) => [xOf(i), yOf(v)])
    const up = band ? band[1].map((v, i) => [xOf(i), yOf(v)]) : []
    const down = band ? band[0].map((v, i) => [xOf(i), yOf(v)]).reverse() : []
    return {
      ...s,
      hasBand: !!band,
      band,
      linePath: pathOf(line),
      bandPath: band ? `${pathOf(up)} ${pathOf(down).replace(/^M/, 'L')} Z` : '',
      areaPath: line.length
        ? `${pathOf(line)} L ${line[line.length - 1][0]} ${H.value - pad.value.b}` +
          ` L ${line[0][0]} ${H.value - pad.value.b} Z`
        : '',
    }
  }),
)

const drawable = computed(() => (started.value ? visible.value : []))

const showArea = computed(() =>
  props.area === null ? !visible.value.some((s) => s.hasBand) : props.area,
)

/*
  Legend keys. Every series gets one whether or not it has been revealed, and
  each reserves room for its own widest reading, so neither a click nor the
  pointer can change the size of this box.
*/
const keys = computed(() => {
  const shown = new Set(visible.value.map((s) => s.name))
  return props.series.map((raw) => {
    // A series still behind a click has no entry in `visible`, but its key
    // must already reserve the room its readings will need, so build the same
    // shape `readout` expects from the raw series.
    const band = bandsOf(raw)
    const s = visible.value.find((v) => v.name === raw.name) || { ...raw, band, hasBand: !!band }
    let widest = ''
    for (let i = 0; i < (s.data?.length || 0); i++) {
      const text = readout(s, i)
      if (text.length > widest.length) widest = text
    }
    return {
      name: raw.name,
      color: raw.color,
      dashed: !!raw.dashed,
      shown: shown.has(raw.name),
      series: s,
      widest,
    }
  })
})

/*
  One column width for every key, and one name width inside it. Ragged keys
  are what make a legend look broken: the eye reads the second key of each row
  as a column, and it is only a column if every cell starts in the same place.
*/
const legendBox = computed(() => {
  const lf = legendFs.value
  const gap = lf * 0.4
  const name = Math.max(...keys.value.map((k) => textWidth(k.name, lf, CH_WORD)), 1)
  const value = Math.max(
    ...keys.value.map((k) => textWidth(k.widest, props.fontSize, CH)),
    1,
  )
  return { name: Math.ceil(name), gap, cell: lf * 1.35 + gap + name + gap + value }
})

/*
  How the legend is laid out: how many keys across, and at what size.

  Row count is what matters, because the chart above is sized to leave room
  for a legend of a known height, and a slide that fits on one machine has to
  fit on the next. So the fewest rows wins, and where that needs a little more
  room than the box has, the legend gives up to 15% of its type size rather
  than growing a row. Everything in a key scales together, so the width needed
  is exactly proportional and the scale can be solved for directly.

  This is what makes the figures survive a machine without Palatino: a serif
  12% wider changes the type size by a couple of percent and nothing else.
*/
const legendFit = computed(() => {
  const n = keys.value.length
  const { cell, gap } = legendBox.value
  let best = { cols: 1, rows: n, scale: 1 }
  for (let cols = 1; cols <= n; cols++) {
    const scale = Math.min(1, W.value / (cols * cell + (cols - 1) * gap))
    if (scale < 0.85 && cols > 1) continue
    const rows = Math.ceil(n / cols)
    if (rows < best.rows || (rows === best.rows && scale > best.scale)) {
      best = { cols, rows, scale }
    }
  }
  return best
})

// Keep the crosshair's x reading inside the plot even at either end of it.
const crosshairLabelX = computed(() => {
  if (hover.value === null) return 0
  const half = (fmtX(xs.value[hover.value]).length * props.fontSize * CH) / 2 + 4
  const x = xOf(hover.value)
  return Math.min(Math.max(x, pad.value.l + half), W.value - pad.value.r - half)
})

/*
  The draw-in, as a clipping rectangle scaled out from the left edge of the
  plot. Sweeping geometry rather than animating each mark has three things
  going for it: a series' cloud and its mean are revealed by the same motion
  so they cannot drift apart, a dashed baseline draws itself in like every
  other line instead of having to fade (a dash pattern and an animated one
  cannot share the same dasharray), and the reveal runs in x, which for a
  time series is the order the data actually arrived in.

  Series are staggered so that a click revealing two of them still reads as
  two things.
*/
const DRAW_MS = 900
const STAGGER_MS = 140
const LEAD_MS = 70

function sweep(i, lead = 0) {
  if (!props.animate) return {}
  return {
    transformOrigin: `${pad.value.l}px 0`,
    animation: `collab-chart-sweep ${DRAW_MS - lead}ms` +
      ` cubic-bezier(0.22, 1, 0.36, 1) ${i * STAGGER_MS}ms both`,
  }
}

function readout(s, i) {
  const half = s.hasBand ? (s.band[1][i] - s.band[0][i]) / 2 : 0
  return `${fmt(s.data[i])} ± ${fmt(half)}${props.unit}`
}

const svg = ref(null)

function onMove(event) {
  const rect = svg.value?.getBoundingClientRect()
  if (!rect || !rect.width) return
  const x = ((event.clientX - rect.left) / rect.width) * W.value
  // Snap to the nearest sample rather than interpolating: the readout should
  // only ever show a number that was actually measured.
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < xs.value.length; i++) {
    const d = Math.abs(xOf(i) - x)
    if (d < bestDist) { bestDist = d; best = i }
  }
  setHover(best)
}
</script>

<style scoped>
.collab-chart {
  width: 100%;
}

/* The chart is as wide as its column and exactly `height` pixels tall; the
   viewBox follows, so nothing inside is ever scaled out of shape. */
.collab-chart-svg {
  display: block;
  width: 100%;
  overflow: visible;
}

.collab-chart-grid line {
  stroke: rgba(20, 22, 26, 0.09);
  stroke-width: 1;
}

.collab-chart-grid text,
.collab-chart-axis text {
  font-family: var(--font-collab);
  font-size: var(--collab-chart-fs);
  fill: var(--color-dark-gray);
}

.collab-chart-title {
  font-family: var(--font-collab);
  font-size: calc(var(--collab-chart-fs) * 1.25);
  fill: #000;
}

.collab-chart-band {
  stroke: none;
  fill-opacity: 0.22;
}

.collab-chart-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.collab-chart-break line {
  stroke: #000;
  stroke-width: 1.2;
}

.collab-chart-hover line {
  stroke: var(--color-dark-gray);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}

/* The reading sits over the gridlines and sometimes over a curve, so it is
   drawn with a white outline behind the glyphs rather than a boxed label. */
.collab-chart-at-mark {
  font-family: var(--font-collab);
  font-size: var(--collab-chart-fs);
  font-weight: 700;
  fill: #000;
  stroke: #fff;
  stroke-width: 4px;
  paint-order: stroke;
  stroke-linejoin: round;
}

.collab-chart-legend {
  display: grid;
  align-items: baseline;
  row-gap: calc(var(--collab-chart-legend-fs) * 0.25);
  margin-top: calc(var(--collab-chart-fs) * 0.3);
  font-family: var(--font-collab);
  font-size: var(--collab-chart-legend-fs);
  line-height: 1.35;
  color: #000;
}

.collab-chart-key {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  white-space: nowrap;
}

/* A series the clicks have not reached yet still holds its place. */
.collab-chart-key.is-pending {
  visibility: hidden;
}

.collab-chart-mark {
  width: 1.35em;
  height: 0.5em;
  flex: none;
}

.collab-chart-mark line {
  stroke-width: 3;
  stroke-linecap: round;
}

.collab-chart-name {
  flex: none;
}

/* The reading is set at the tick size rather than the legend size. It is for
   the front of the room and for questions; the name is what has to carry. */
.collab-chart-key b {
  font-size: var(--collab-chart-read-fs);
}

.collab-chart-key b {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>

<style>
/* Keyframes cannot live in a scoped block and still be referenced from an
   inline style binding, so this one is global — and prefixed accordingly.
   It scales a clipping rectangle, and the rectangle's transform-origin is
   set inline, because only the component knows where the plot starts. */
@keyframes collab-chart-sweep {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* No animation means no clip: the rectangle keeps its untransformed size and
   every series is simply there. */
@media (prefers-reduced-motion: reduce) {
  .collab-chart clipPath rect { animation: none !important; }
}
</style>
