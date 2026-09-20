<!--
  OptimizerLab — a loss surface, three optimisers, and the controls to argue
  about them from the stage.

    <OptimizerLab />

  Click anywhere on the surface to move the starting point, then press Run.
  The surface is Himmelblau's function, which has four separate minima of
  equal depth — so where the run ends is decided entirely by where it started,
  which is the point worth making out loud and impossible to make with a still
  figure.

  Everything here is arithmetic in a canvas: the landscape is computed once per
  resize into an offscreen buffer and blitted each frame, and only the
  trajectory is redrawn. That is what keeps a live demo from turning the
  projector's fans on halfway through your talk.
-->
<template>
  <div class="sc-lab">
    <div class="sc-lab__stage">
      <canvas
        ref="canvas"
        class="sc-lab__canvas"
        @pointerdown="onPick"
        @pointermove="onDrag"
      />
      <div class="sc-lab__hud">
        <span><b>{{ step }}</b> steps</span>
        <span><b>{{ loss.toFixed(3) }}</b> loss</span>
        <span v-if="converged" class="sc-lab__done">converged</span>
        <span v-else-if="diverged" class="sc-lab__bad">diverged</span>
      </div>
    </div>

    <div class="sc-lab__side">
      <div class="sc-lab__row">
        <button
          v-for="opt in OPTIMIZERS"
          :key="opt.id"
          class="sc-btn"
          :class="{ 'sc-btn--on': method === opt.id }"
          @click="choose(opt.id)"
        >{{ opt.label }}</button>
      </div>

      <div class="sc-ctl">
        <label for="lr">rate</label>
        <input id="lr" v-model.number="logLr" class="sc-range" type="range" min="-3.6" max="-0.7" step="0.05" />
        <output>{{ lr.toFixed(4) }}</output>
      </div>

      <div class="sc-ctl" :style="{ opacity: method === 'sgd' ? 0.35 : 1 }">
        <label for="beta">mom.</label>
        <input id="beta" v-model.number="beta" class="sc-range" type="range" min="0" max="0.98" step="0.01" :disabled="method === 'sgd'" />
        <output>{{ beta.toFixed(2) }}</output>
      </div>

      <div class="sc-lab__row">
        <button class="sc-btn sc-btn--primary" @click="running = !running">
          {{ running ? 'Pause' : 'Run' }}
        </button>
        <button class="sc-btn" @click="reset()">Reset</button>
        <button class="sc-btn" @click="scatter()">Random</button>
      </div>

      <p class="sc-lab__legend">
        <span v-for="(m, i) in MINIMA" :key="i" class="sc-lab__min" :class="{ 'is-hit': nearest === i && converged }">
          <i />({{ m[0].toFixed(1) }}, {{ m[1].toFixed(1) }})
        </span>
      </p>

      <p class="sc-hint">
        Click the surface to move the start. Four minima, all the same depth —
        it only ever finds the one it began nearest to.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useCanvasSize, useRaf } from '../composables/useRaf.js'

/* ---- the surface -------------------------------------------------------
   Himmelblau's function and its exact gradient. Four minima at f = 0, one
   local maximum near the origin, and ridges steep enough that a rate chosen
   for one region is wrong for another — which is the whole demonstration.   */

function f(x, y) {
  const a = x * x + y - 11
  const b = x + y * y - 7
  return a * a + b * b
}

function grad(x, y) {
  const a = x * x + y - 11
  const b = x + y * y - 7
  return [4 * x * a + 2 * b, 2 * a + 4 * y * b]
}

const MINIMA = [
  [3, 2],
  [-2.805118, 3.131312],
  [-3.779310, -3.283186],
  [3.584428, -1.848126],
]

const OPTIMIZERS = [
  { id: 'sgd', label: 'SGD', lr: 0.004, beta: 0 },
  { id: 'momentum', label: 'Momentum', lr: 0.0025, beta: 0.86 },
  { id: 'adam', label: 'Adam', lr: 0.12, beta: 0.9 },
]

/* ---- state ------------------------------------------------------------- */

const canvas = ref(null)
const { size } = useCanvasSize(canvas)

const method = ref('momentum')
const logLr = ref(Math.log10(0.0025))
const beta = ref(0.86)
const lr = computed(() => 10 ** logLr.value)

const running = ref(false)
const step = ref(0)
const loss = ref(0)
const converged = ref(false)
const diverged = ref(false)

// Integrator state, deliberately outside Vue: it is touched every frame and
// nothing in the template reads it directly.
let pos = [-0.4, -0.6]
let vel = [0, 0]
let m = [0, 0]
let v = [0, 0]
let trail = []
let landscape = null
let landscapeKey = ''

const nearest = computed(() => {
  // `pos` is a plain variable, so it cannot invalidate a computed on its own.
  // Reading the step counter is what makes this recompute as the run moves.
  void step.value
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < MINIMA.length; i++) {
    const d = (pos[0] - MINIMA[i][0]) ** 2 + (pos[1] - MINIMA[i][1]) ** 2
    if (d < bestD) { bestD = d; best = i }
  }
  return best
})

function choose(id) {
  const preset = OPTIMIZERS.find((o) => o.id === id)
  method.value = id
  // Adam's useful rate is two orders of magnitude off plain SGD's. Snapping to
  // the preset on every switch is the difference between the demo showing a
  // comparison and the demo showing a divergence.
  logLr.value = Math.log10(preset.lr)
  beta.value = preset.beta
  reset()
}

function reset() {
  vel = [0, 0]
  m = [0, 0]
  v = [0, 0]
  trail = [[pos[0], pos[1]]]
  step.value = 0
  converged.value = false
  diverged.value = false
  loss.value = f(pos[0], pos[1])
}

function scatter() {
  pos = [(Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9]
  reset()
  running.value = true
}

watch([method, logLr, beta], () => {
  converged.value = false
  diverged.value = false
})

/* ---- one optimiser step ------------------------------------------------ */

function advance() {
  const [gx, gy] = grad(pos[0], pos[1])

  // Clipping. Without it a rate picked for the basin floor throws the point
  // off the slide the first time it lands on a ridge, and the demo is over.
  const norm = Math.hypot(gx, gy)
  const scale = norm > 60 ? 60 / norm : 1
  const g = [gx * scale, gy * scale]

  if (Math.hypot(...g) < 2e-3) {
    converged.value = true
    running.value = false
    return
  }

  const rate = lr.value
  if (method.value === 'sgd') {
    pos = [pos[0] - rate * g[0], pos[1] - rate * g[1]]
  } else if (method.value === 'momentum') {
    vel = [beta.value * vel[0] - rate * g[0], beta.value * vel[1] - rate * g[1]]
    pos = [pos[0] + vel[0], pos[1] + vel[1]]
  } else {
    const b1 = beta.value || 0.9
    const b2 = 0.999
    const t = step.value + 1
    m = [b1 * m[0] + (1 - b1) * g[0], b1 * m[1] + (1 - b1) * g[1]]
    v = [b2 * v[0] + (1 - b2) * g[0] ** 2, b2 * v[1] + (1 - b2) * g[1] ** 2]
    const mh = [m[0] / (1 - b1 ** t), m[1] / (1 - b1 ** t)]
    const vh = [v[0] / (1 - b2 ** t), v[1] / (1 - b2 ** t)]
    pos = [
      pos[0] - (rate * mh[0]) / (Math.sqrt(vh[0]) + 1e-8),
      pos[1] - (rate * mh[1]) / (Math.sqrt(vh[1]) + 1e-8),
    ]
  }

  step.value += 1
  loss.value = f(pos[0], pos[1])
  trail.push([pos[0], pos[1]])
  if (trail.length > 600) trail.shift()

  if (!Number.isFinite(loss.value) || Math.abs(pos[0]) > 40 || Math.abs(pos[1]) > 40) {
    diverged.value = true
    running.value = false
  }
}

/* ---- drawing ----------------------------------------------------------- */

// Half-height of the plotted domain, in function units. The half-width is
// derived from the canvas aspect so the surface is never stretched.
const HALF_Y = 4.6

function view() {
  const { w, h } = size.value
  const halfX = HALF_Y * (w / Math.max(h, 1))
  return { w, h, halfX, halfY: HALF_Y }
}

function toPx(x, y) {
  const { w, h, halfX, halfY } = view()
  return [((x + halfX) / (2 * halfX)) * w, ((halfY - y) / (2 * halfY)) * h]
}

function toWorld(px, py) {
  const { w, h, halfX, halfY } = view()
  return [(px / w) * 2 * halfX - halfX, halfY - (py / h) * 2 * halfY]
}

// A warm-to-cold ramp: the four basins come out bright, the ridges dark. Stops
// are in the Collab family so the figure belongs to the same deck as the text
// next to it.
const RAMP = [
  [0.00, [255, 253, 247]],
  [0.14, [251, 220, 174]],
  [0.32, [232, 166, 89]],
  [0.52, [192, 111, 122]],
  [0.74, [124, 90, 166]],
  [1.00, [30, 36, 52]],
]

function rampAt(t) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0] || i === RAMP.length - 1) {
      const [t0, c0] = RAMP[i - 1]
      const [t1, c1] = RAMP[i]
      const u = Math.min(Math.max((t - t0) / (t1 - t0), 0), 1)
      return [
        c0[0] + (c1[0] - c0[0]) * u,
        c0[1] + (c1[1] - c0[1]) * u,
        c0[2] + (c1[2] - c0[2]) * u,
      ]
    }
  }
  return RAMP.at(-1)[1]
}

const BANDS = 15

/*
  Builds the surface once per size change. Two passes: value to colour band,
  then a second look at the pixel to the right and below so that a change of
  band draws a darker line — cheap marching squares for people in a hurry, and
  it is what turns a smooth gradient into a readable contour map.
*/
function buildLandscape() {
  const { w, h, dpr } = size.value
  if (!w || !h) return
  const key = `${w}x${h}x${dpr}`
  if (key === landscapeKey && landscape) return
  landscapeKey = key

  const off = document.createElement('canvas')
  off.width = Math.round(w * dpr)
  off.height = Math.round(h * dpr)
  const ctx = off.getContext('2d')
  const image = ctx.createImageData(off.width, off.height)
  const { halfX, halfY } = view()

  const bandOf = new Float32Array(off.width * off.height)
  for (let py = 0; py < off.height; py++) {
    const y = halfY - (py / off.height) * 2 * halfY
    for (let px = 0; px < off.width; px++) {
      const x = (px / off.width) * 2 * halfX - halfX
      // log1p, because Himmelblau spans four orders of magnitude and a linear
      // ramp would paint everything except the basins the same colour.
      const t = Math.min(Math.log1p(f(x, y)) / Math.log1p(2000), 1)
      bandOf[py * off.width + px] = Math.min(Math.floor(t * BANDS), BANDS - 1)
    }
  }

  // One colour per band, worked out once. Calling rampAt per pixel would run
  // the ramp search the better part of a million times for a frame that is
  // only ever computed to be cached.
  const colours = Array.from({ length: BANDS }, (_, i) => rampAt((i + 0.5) / BANDS))

  for (let py = 0; py < off.height; py++) {
    for (let px = 0; px < off.width; px++) {
      const i = py * off.width + px
      const band = bandOf[i]
      const [r, g, b] = colours[band]
      const right = px + 1 < off.width ? bandOf[i + 1] : band
      const down = py + 1 < off.height ? bandOf[i + off.width] : band
      const edge = right !== band || down !== band ? 0.72 : 1
      image.data[i * 4] = r * edge
      image.data[i * 4 + 1] = g * edge
      image.data[i * 4 + 2] = b * edge
      image.data[i * 4 + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  landscape = off
}

function draw() {
  const el = canvas.value
  const { w, h, dpr } = size.value
  if (!el || !w || !h) return

  buildLandscape()

  const ctx = el.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, el.width, el.height)
  if (landscape) ctx.drawImage(landscape, 0, 0)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // The four minima, as rings.
  for (let i = 0; i < MINIMA.length; i++) {
    const [mx, my] = toPx(MINIMA[i][0], MINIMA[i][1])
    ctx.beginPath()
    ctx.arc(mx, my, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(20, 22, 26, 0.45)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // The trajectory, brightening towards the current point so the direction of
  // travel is visible in a still frame as well as in motion.
  if (trail.length > 1) {
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (let i = 1; i < trail.length; i++) {
      const a = toPx(trail[i - 1][0], trail[i - 1][1])
      const b = toPx(trail[i][0], trail[i][1])
      const alpha = 0.15 + 0.85 * (i / trail.length)
      ctx.strokeStyle = `rgba(20, 22, 26, ${alpha * 0.85})`
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
    }
  }

  const [cx, cy] = toPx(pos[0], pos[1])
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(204, 112, 0, 0.22)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = '#cc7000'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.6
  ctx.stroke()
}

useRaf(canvas, () => {
  if (running.value) {
    // Two steps a frame: one is hypnotically slow for SGD, and anything more
    // makes Adam finish before anyone has looked up.
    advance()
    if (running.value) advance()
  }
  draw()
}, { autoStart: true })

/* ---- picking ----------------------------------------------------------- */

function place(event) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  const px = ((event.clientX - rect.left) / rect.width) * size.value.w
  const py = ((event.clientY - rect.top) / rect.height) * size.value.h
  pos = toWorld(px, py)
  reset()
}

function onPick(event) {
  running.value = false
  place(event)
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onDrag(event) {
  if (event.buttons !== 1) return
  place(event)
}

reset()
</script>

<style scoped>
/* `minmax(0, 1fr)` rather than `1fr` on the panel: a bare `1fr` track cannot
   shrink below its content's automatic minimum, so a slider row or a button
   label wide enough to resist wrapping pushes the track out and the panel
   spills back over the canvas beside it. */
.sc-lab {
  display: grid;
  grid-template-columns: 1.7fr minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
}

.sc-lab__stage {
  position: relative;
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--sc-line);
  aspect-ratio: 8 / 5;
}

.sc-lab__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.sc-lab__hud {
  position: absolute;
  left: 0.5rem;
  bottom: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  max-width: calc(100% - 1rem);
  gap: 0.5rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(6px);
  font-family: var(--sc-mono);
  font-size: 0.62rem;
  color: var(--sc-ink-2);
  font-variant-numeric: tabular-nums;
}
.sc-lab__hud b { color: var(--sc-ink); }
.sc-lab__done { color: var(--sc-green); font-weight: 700; }
.sc-lab__bad { color: var(--sc-red); font-weight: 700; }

.sc-lab__side {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* The shared control sizes are set for a half-slide panel; this one is a
   third of a slide, so it takes a notch off everything. */
.sc-lab__side :deep(.sc-btn) {
  font-size: 0.6rem;
  padding: 0.26rem 0.5rem;
}
.sc-lab__side :deep(.sc-ctl) { font-size: 0.6rem; gap: 0.4rem; }
.sc-lab__side :deep(.sc-ctl label) { min-width: 2.6rem; font-size: 0.55rem; }
.sc-lab__side :deep(.sc-ctl output) { min-width: 2.3rem; font-size: 0.6rem; }
.sc-lab__side :deep(.sc-hint) { font-size: 0.64rem !important; line-height: 1.35 !important; }

.sc-lab__row {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

/* Two up rather than a wrapping row, so the four coordinate pairs line up
   instead of reflowing into a ragged block every time one of them is hit. */
.sc-lab__legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem 0.4rem;
  margin: 0.1rem 0 0 !important;
  font-family: var(--sc-mono);
  font-size: 0.55rem !important;
  color: var(--color-dark-gray);
}

.sc-lab__min {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.sc-lab__min i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.2px solid var(--color-dark-gray);
}
.sc-lab__min.is-hit {
  color: var(--sc-green);
  font-weight: 700;
}
.sc-lab__min.is-hit i {
  border-color: var(--sc-green);
  background: var(--sc-green);
}
</style>
