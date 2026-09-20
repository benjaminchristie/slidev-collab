<!--
  Chaos — two double pendulums released from the same place, almost.

    <Chaos />

  The second pendulum starts with its lower arm displaced by the amount on the
  slider — a millionth of a radian by default, which is smaller than the width
  of the line drawing it. For a few seconds the two traces are one trace. Then
  they are not.

  This is the demo to keep in a talk that has to say "sensitive to initial
  conditions" out loud. A still figure of two diverged trajectories proves
  nothing, because the audience never saw them agree; the argument is entirely
  in the *watching*, and a slide is the only figure that can be watched.

  The physics is the textbook double pendulum, integrated with classical RK4 at
  a fixed step of 1/480s and stepped several times per frame. Fixed step, not
  frame-derived: a chaotic system integrated at whatever `dt` the browser
  happened to hand over would diverge because the *integrator* wobbled, which
  is a different phenomenon wearing the same costume, and the honest version is
  worth the four extra lines.

  The readout is the real quantity: the angular separation between the two
  states, on a log axis, which climbs in a straight line until it saturates at
  the size of the system. That straight line is the Lyapunov exponent, and it
  is the thing the slide is actually about.
-->
<template>
  <div class="sc-chaos">
    <div class="sc-chaos__stage">
      <canvas ref="canvas" class="sc-chaos__canvas" />
      <div class="sc-chaos__hud">
        <span><b>{{ elapsed.toFixed(1) }}</b>s</span>
        <span>separation <b>{{ gapText }}</b> rad</span>
        <span v-if="split" class="sc-chaos__split">visibly apart at {{ split.toFixed(1) }}s</span>
      </div>
    </div>

    <div class="sc-chaos__side">
      <div class="sc-chaos__row">
        <button class="sc-btn sc-btn--primary" @click="reset()">Release</button>
        <button class="sc-btn" :class="{ 'sc-btn--on': trails }" @click="trails = !trails">Trails</button>
      </div>

      <div class="sc-ctl">
        <label for="eps">nudge</label>
        <input id="eps" v-model.number="logEps" class="sc-range" type="range" min="-9" max="-2" step="0.5" />
        <output>1e{{ logEps }}</output>
      </div>

      <div class="sc-ctl">
        <label for="speed">speed</label>
        <input id="speed" v-model.number="speed" class="sc-range" type="range" min="0.25" max="2" step="0.05" />
        <output>{{ speed.toFixed(2) }}&times;</output>
      </div>

      <!-- The separation plot: 120 samples, log scale, drawn as an inline SVG
           because it is a sparkline and a sparkline is nine lines of path. -->
      <svg class="sc-chaos__plot" viewBox="0 0 120 46" preserveAspectRatio="none">
        <line x1="0" y1="45.5" x2="120" y2="45.5" class="sc-chaos__axis" />
        <path :d="sparkline" class="sc-chaos__spark" />
      </svg>
      <p class="sc-chaos__axis-label">log |Δθ|, last {{ SAMPLES }} frames</p>

      <p class="sc-hint">
        Two pendulums, one nudged by <b>1e{{ logEps }}</b> radians. Nothing else
        differs — same mass, same length, same integrator, same clock.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useCanvasSize, useRaf } from '../composables/useRaf.js'

const G = 9.81
const L1 = 1
const L2 = 1
const M1 = 1
const M2 = 1

const DT = 1 / 480 // fixed integrator step, independent of frame rate
const SAMPLES = 240 // points of separation history in the sparkline
const TRAIL = 900 // tip positions kept per pendulum

const canvas = ref(null)
const { size } = useCanvasSize(canvas)

const logEps = ref(-6)
const speed = ref(1)
const trails = ref(true)
const elapsed = ref(0)
const gap = ref(0)
const split = ref(0)

/*
  State is [θ1, ω1, θ2, ω2]. The accelerations are the standard pair for a
  double pendulum with point masses; nothing here is linearised, which is the
  whole reason the thing is interesting.
*/
function derivative(s) {
  const [t1, w1, t2, w2] = s
  const d = t1 - t2
  const den = 2 * M1 + M2 - M2 * Math.cos(2 * d)

  const a1 =
    (-G * (2 * M1 + M2) * Math.sin(t1) -
      M2 * G * Math.sin(t1 - 2 * t2) -
      2 * Math.sin(d) * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) /
    (L1 * den)

  const a2 =
    (2 *
      Math.sin(d) *
      (w1 * w1 * L1 * (M1 + M2) +
        G * (M1 + M2) * Math.cos(t1) +
        w2 * w2 * L2 * M2 * Math.cos(d))) /
    (L2 * den)

  return [w1, a1, w2, a2]
}

// Classical RK4. A double pendulum conserves energy, and an Euler step does
// not — left running for a minute, forward Euler visibly pumps energy in and
// the arms end up whirling, which would make the demo a lie.
function rk4(s, h) {
  const add = (a, b, k) => a.map((v, i) => v + b[i] * k)
  const k1 = derivative(s)
  const k2 = derivative(add(s, k1, h / 2))
  const k3 = derivative(add(s, k2, h / 2))
  const k4 = derivative(add(s, k3, h))
  return s.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

let a = []
let b = []
let trailA = []
let trailB = []
// Reactive, because the sparkline is a computed over it. The trails are not:
// they are drawn imperatively into the canvas and nothing watches them.
const history = ref([])

function reset() {
  const eps = Math.pow(10, logEps.value)
  // Both arms high and to one side: plenty of potential energy, and far from
  // the small-angle regime where the two would stay together for a long time.
  a = [(2 * Math.PI) / 3, 0, (2 * Math.PI) / 3, 0]
  b = [a[0], 0, a[2] + eps, 0]
  trailA = []
  trailB = []
  history.value = []
  elapsed.value = 0
  gap.value = eps
  split.value = 0
}

reset()

const gapText = computed(() => {
  const g = gap.value
  if (!g) return '0'
  return g < 0.01 ? g.toExponential(1) : g.toFixed(3)
})

// The sparkline maps log10 of the separation, from 1e-10 up to about pi, onto
// the 46 units of the viewBox. A straight climb here is exponential growth of
// the separation, which is the claim the slide is making.
const sparkline = computed(() => {
  const h = history.value
  if (h.length < 2) return ''
  const y = (g) => {
    const l = Math.log10(Math.max(g, 1e-10))
    return 44 - ((l + 10) / 10.5) * 42
  }
  return h
    .map((g, i) => `${i === 0 ? 'M' : 'L'}${(i / (h.length - 1)) * 120} ${y(g)}`)
    .join(' ')
})

const tip = (s) => [
  L1 * Math.sin(s[0]) + L2 * Math.sin(s[2]),
  L1 * Math.cos(s[0]) + L2 * Math.cos(s[2]),
]

// Angle difference wrapped into (-pi, pi], so a separation that crosses the
// branch cut does not read as a jump to 2pi.
const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d))

function advance(dt) {
  const target = Math.min(dt, 1 / 20) * speed.value
  const steps = Math.min(Math.round(target / DT), 64)
  for (let i = 0; i < steps; i++) {
    a = rk4(a, DT)
    b = rk4(b, DT)
    elapsed.value += DT
  }

  gap.value = Math.hypot(wrap(a[0] - b[0]), wrap(a[2] - b[2]))
  if (!split.value && gap.value > 0.1) split.value = elapsed.value

  trailA.push(tip(a))
  trailB.push(tip(b))
  if (trailA.length > TRAIL) trailA.shift()
  if (trailB.length > TRAIL) trailB.shift()

  history.value.push(gap.value)
  if (history.value.length > SAMPLES) history.value.shift()
}

function drawArm(ctx, s, o, scale, colour, width) {
  const j = [o.x + L1 * Math.sin(s[0]) * scale, o.y + L1 * Math.cos(s[0]) * scale]
  const t = tip(s)
  const e = [o.x + t[0] * scale, o.y + t[1] * scale]

  ctx.beginPath()
  ctx.moveTo(o.x, o.y)
  ctx.lineTo(j[0], j[1])
  ctx.lineTo(e[0], e[1])
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  for (const [px, py, r] of [[j[0], j[1], 3.2], [e[0], e[1], 4.6]]) {
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fillStyle = colour
    ctx.fill()
  }
}

function drawTrail(ctx, points, o, scale, colour) {
  if (points.length < 2) return
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  for (let i = 1; i < points.length; i++) {
    const age = i / points.length
    ctx.beginPath()
    ctx.moveTo(o.x + points[i - 1][0] * scale, o.y + points[i - 1][1] * scale)
    ctx.lineTo(o.x + points[i][0] * scale, o.y + points[i][1] * scale)
    ctx.strokeStyle = colour.replace('ALPHA', (age * 0.5).toFixed(3))
    ctx.stroke()
  }
}

function draw() {
  const el = canvas.value
  const { w, h, dpr } = size.value
  if (!el || !w || !h) return

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  // The pivot sits at 45% of the height and the arms reach 40% of it, so the
  // pendulum can go fully vertical either way without leaving the box.
  const scale = Math.min(w, h) / (2 * (L1 + L2) * 1.25)
  const o = { x: w / 2, y: h * 0.45 }

  // The pivot, and a faint circle at the reach of the arms, so the audience
  // can see that neither pendulum is leaving the space it started in — the
  // divergence is in *where in it* they are, not in how far they go.
  ctx.beginPath()
  ctx.arc(o.x, o.y, (L1 + L2) * scale, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(20,22,26,0.07)'
  ctx.lineWidth = 1
  ctx.stroke()

  if (trails.value) {
    drawTrail(ctx, trailA, o, scale, 'rgba(42,143,189,ALPHA)')
    drawTrail(ctx, trailB, o, scale, 'rgba(204,112,0,ALPHA)')
  }

  drawArm(ctx, a, o, scale, 'rgba(42,143,189,0.95)', 2.6)
  drawArm(ctx, b, o, scale, 'rgba(204,112,0,0.95)', 2.6)

  ctx.beginPath()
  ctx.arc(o.x, o.y, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#14161a'
  ctx.fill()
}

useRaf(canvas, (dt) => {
  if (dt) advance(dt)
  draw()
})
</script>

<style scoped>
.sc-chaos {
  display: grid;
  grid-template-columns: 1fr 12.5rem;
  gap: 1rem;
  align-items: stretch;
}

.sc-chaos__stage {
  position: relative;
  border: 1px solid var(--sc-line);
  border-radius: 0.6rem;
  background: var(--sc-paper);
  overflow: hidden;
}

.sc-chaos__canvas {
  display: block;
  width: 100%;
  height: 20.5rem;
}

.sc-chaos__hud {
  position: absolute;
  left: 0.6rem;
  bottom: 0.5rem;
  display: flex;
  gap: 0.75rem;
  font-family: var(--sc-mono);
  font-size: 0.6rem;
  color: var(--color-dark-gray);
  pointer-events: none;
}

.sc-chaos__hud b { color: var(--sc-ink); }
.sc-chaos__split { color: var(--sc-red); font-weight: 700; }

.sc-chaos__side {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  justify-content: center;
}

.sc-chaos__row { display: flex; gap: 0.35rem; }

.sc-chaos__side :deep(.sc-btn) { font-size: 0.62rem; padding: 0.3em 0.7em; }
.sc-chaos__side :deep(.sc-ctl) { font-size: 0.6rem; gap: 0.4rem; }
.sc-chaos__side :deep(.sc-ctl label) { min-width: 2.4rem; font-size: 0.55rem; }
.sc-chaos__side :deep(.sc-ctl output) { min-width: 2.6rem; font-size: 0.6rem; }
.sc-chaos__side :deep(.sc-hint) { font-size: 0.64rem !important; line-height: 1.35 !important; }

.sc-chaos__plot {
  width: 100%;
  height: 3rem;
  border: 1px solid var(--sc-line);
  border-radius: 0.3rem;
  background: #fff;
}

.sc-chaos__axis { stroke: var(--sc-line-strong); stroke-width: 0.5; }

.sc-chaos__spark {
  fill: none;
  stroke: var(--sc-red);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
}

.sc-chaos__axis-label {
  margin: -0.35rem 0 0 !important;
  font-family: var(--sc-mono);
  font-size: 0.52rem !important;
  color: var(--color-light-gray);
}
</style>
