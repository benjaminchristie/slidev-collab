<!--
  Landscape3D — the loss surface from the previous slide, in three dimensions,
  with an optimiser walking down it.

    <Landscape3D />

  Drag to orbit. `Drop` restarts the descent somewhere random, `Spin` lets go
  of the camera.

  This is the same Himmelblau function `OptimizerLab` draws as contours, so the
  two slides are one figure seen twice — and the question the 3D view answers
  is the one the contour plot cannot: *how steep is the wall between the
  basins?*

  There is no 3D library here, and that is the point worth reading the file
  for. Three dimensions on a canvas is four short steps:

    1. a mesh — a height sampled on a grid;
    2. a rotation — yaw and pitch, six multiplications a vertex;
    3. a projection — drop the depth coordinate;
    4. an order — draw far things before near ones.

  Step 4 is the one everybody forgets and the only one that is subtle. Every
  quad and every segment of the descent path goes into one list with the depth
  of its centre, the list is sorted once, and then it is drawn. That is the
  painter's algorithm, it is six lines, and it is why the trajectory disappears
  behind a ridge and comes back instead of floating over the top of it.

  Shading is one dot product against a fixed light. Colour is the height run
  through the deck's own orange, so the figure belongs to the talk rather than
  to whatever palette a plotting library happened to ship.
-->
<template>
  <div class="sc-surf">
    <div class="sc-surf__stage">
      <canvas
        ref="canvas"
        class="sc-surf__canvas"
        @pointerdown="grab"
        @pointermove="orbit"
        @pointerup="release"
        @pointerleave="release"
      />
      <div class="sc-surf__hud">
        <span><b>{{ step }}</b> steps</span>
        <span><b>{{ loss.toFixed(2) }}</b> loss</span>
        <span class="sc-surf__eye">yaw {{ Math.round(deg(yaw)) }}° · tilt {{ Math.round(deg(pitch)) }}°</span>
      </div>
    </div>

    <div class="sc-surf__side">
      <div class="sc-surf__row">
        <button class="sc-btn sc-btn--primary" @click="drop()">Drop</button>
        <button class="sc-btn" :class="{ 'sc-btn--on': spin }" @click="spin = !spin">Spin</button>
      </div>

      <div class="sc-ctl">
        <label for="tilt">tilt</label>
        <input id="tilt" v-model.number="pitchDeg" class="sc-range" type="range" min="12" max="80" step="1" />
        <output>{{ pitchDeg }}°</output>
      </div>

      <div class="sc-ctl">
        <label for="mesh">mesh</label>
        <input id="mesh" v-model.number="cells" class="sc-range" type="range" min="12" max="44" step="2" />
        <output>{{ cells * cells }}</output>
      </div>

      <p class="sc-surf__facts">
        <span><i class="is-quad" />{{ cells * cells }} quads</span>
        <span><i class="is-sort" />1 sort/frame</span>
        <span><i class="is-lib" />0 libraries</span>
      </p>

      <p class="sc-hint">
        Drag the surface to orbit it. The path is drawn <em>into</em> the mesh,
        not over it — send it behind a ridge and watch it go.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useCanvasSize, useRaf } from '../composables/useRaf.js'

/* ---- the surface -------------------------------------------------------
   Himmelblau's function, as on the contour slide. Its four minima are all
   exactly zero, so which one a run finds is decided by where it started.     */

const EXTENT = 5 // the surface covers [-5, 5] in both x and y

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

// Raw Himmelblau spans 0 to about 890 over this square, which as a height is
// one spike and a lot of floor. log1p compresses it into something with
// visible basins, and the walls stay walls.
const CEILING = Math.log1p(f(-EXTENT, -EXTENT))
const height = (x, y) => Math.log1p(f(x, y)) / CEILING

/* ---- camera ------------------------------------------------------------ */

const canvas = ref(null)
const { size } = useCanvasSize(canvas)

const yaw = ref(-0.9)
const pitchDeg = ref(42)
const pitch = computed(() => (pitchDeg.value * Math.PI) / 180)
const spin = ref(true)
const cells = ref(30)

const deg = (r) => (r * 180) / Math.PI

let dragging = false
let lastX = 0
let lastY = 0

function grab(e) {
  dragging = true
  spin.value = false
  lastX = e.clientX
  lastY = e.clientY
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function orbit(e) {
  if (!dragging) return
  yaw.value += (e.clientX - lastX) * 0.008
  pitchDeg.value = clamp(pitchDeg.value - (e.clientY - lastY) * 0.25, 12, 80)
  lastX = e.clientX
  lastY = e.clientY
}

function release(e) {
  dragging = false
  e.currentTarget?.releasePointerCapture?.(e.pointerId)
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/*
  World to screen. Yaw spins the world about the vertical axis, pitch is the
  camera's elevation, and the projection is orthographic — a perspective divide
  would be two more lines, but a loss surface is a figure, and a figure that
  changes scale with depth is harder to read, not easier.

  `depth` is what the painter's ordering sorts on: larger is nearer the eye.
*/
function project(x, y, z, cam) {
  const rx = x * cam.cos - y * cam.sin
  const ry = x * cam.sin + y * cam.cos
  return {
    x: cam.ox + rx * cam.scale,
    y: cam.oy - (ry * cam.sp + z * cam.cp) * cam.scale,
    depth: ry * cam.cp - z * cam.sp,
  }
}

/* ---- the descent ------------------------------------------------------- */

const LR = 0.0022
const BETA = 0.82
const TRAIL = 220

const step = ref(0)
const loss = ref(0)
let walker = { x: 0, y: 0, vx: 0, vy: 0 }
let trail = []

function drop(x, y) {
  // Start on the rim, where the surface is steep and the run has somewhere to
  // fall from. A start near a minimum is a boring animation.
  const a = Math.random() * Math.PI * 2
  const r = 3.6 + Math.random() * 1.1
  walker = {
    x: x ?? Math.cos(a) * r,
    y: y ?? Math.sin(a) * r,
    vx: 0,
    vy: 0,
  }
  trail = []
  step.value = 0
  loss.value = f(walker.x, walker.y)
}

function integrate() {
  const [gx, gy] = grad(walker.x, walker.y)
  walker.vx = BETA * walker.vx - LR * gx
  walker.vy = BETA * walker.vy - LR * gy
  walker.x = clamp(walker.x + walker.vx, -EXTENT, EXTENT)
  walker.y = clamp(walker.y + walker.vy, -EXTENT, EXTENT)

  step.value += 1
  loss.value = f(walker.x, walker.y)

  trail.push([walker.x, walker.y])
  if (trail.length > TRAIL) trail.shift()

  // Settled in a basin, and it has been there a while: go again, so the slide
  // is never a still picture of a finished run.
  if (loss.value < 0.004 && step.value > 90) drop()
}

drop()

/* ---- drawing ----------------------------------------------------------- */

const LIGHT = normalise([-0.45, -0.7, 0.9])

function normalise(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

// The deck's orange at the peaks, its blue in the basins, mixed in plain RGB.
// Two stops is enough: any more and a surface starts looking like a weather
// map, which invites the audience to read colour as a category.
function ramp(h, shade) {
  const lo = [86, 132, 170]
  const hi = [214, 132, 44]
  const k = clamp(h, 0, 1) ** 0.85
  const s = 0.42 + 0.58 * clamp(shade, 0, 1)
  const c = lo.map((v, i) => Math.round((v + (hi[i] - v) * k) * s))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const AMPLITUDE = 2.7 // how tall the surface stands, in world units

function draw() {
  const el = canvas.value
  const { w, h, dpr } = size.value
  if (!el || !w || !h) return

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const n = cells.value
  const cam = {
    cos: Math.cos(yaw.value),
    sin: Math.sin(yaw.value),
    sp: Math.sin(pitch.value),
    cp: Math.cos(pitch.value),
    scale: Math.min(w / (EXTENT * 2.9), h / (EXTENT * 2.15)),
    ox: w / 2,
    oy: h / 2 + h * 0.13,
  }

  // One pass to sample the grid, so a vertex shared by four quads is projected
  // once rather than four times.
  const gx = (i) => -EXTENT + (2 * EXTENT * i) / n
  const grid = []
  for (let i = 0; i <= n; i++) {
    const row = []
    for (let j = 0; j <= n; j++) {
      const x = gx(i)
      const y = gx(j)
      const z = height(x, y) * AMPLITUDE
      row.push({ x, y, z, p: project(x, y, z, cam) })
    }
    grid.push(row)
  }

  /*
    Everything drawable goes into one list with the depth of its centre: the
    mesh quads, and each segment of the descent path. One sort, then draw. The
    path is not an overlay — it takes its turn among the quads, so a ridge in
    front of it hides it.
  */
  const items = []

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = grid[i][j]
      const b = grid[i + 1][j]
      const c = grid[i + 1][j + 1]
      const d = grid[i][j + 1]

      // Face normal from two edges of the quad, for the one dot product that
      // is all the shading this needs.
      const u = [b.x - a.x, b.y - a.y, b.z - a.z]
      const v = [d.x - a.x, d.y - a.y, d.z - a.z]
      const nx = u[1] * v[2] - u[2] * v[1]
      const ny = u[2] * v[0] - u[0] * v[2]
      const nz = u[0] * v[1] - u[1] * v[0]
      const nl = normalise([nx, ny, nz])
      const lam = Math.abs(nl[0] * LIGHT[0] + nl[1] * LIGHT[1] + nl[2] * LIGHT[2])

      const zc = (a.z + b.z + c.z + d.z) / 4
      items.push({
        depth: (a.p.depth + b.p.depth + c.p.depth + d.p.depth) / 4,
        paint: () => {
          ctx.beginPath()
          ctx.moveTo(a.p.x, a.p.y)
          ctx.lineTo(b.p.x, b.p.y)
          ctx.lineTo(c.p.x, c.p.y)
          ctx.lineTo(d.p.x, d.p.y)
          ctx.closePath()
          ctx.fillStyle = ramp(zc / AMPLITUDE, lam)
          ctx.fill()
          // The mesh lines are the fill colour darkened, not black: a black
          // wireframe over a coloured surface reads as a grid drawn on top of
          // the figure rather than as the shape of it.
          ctx.strokeStyle = 'rgba(255,255,255,0.13)'
          ctx.lineWidth = 0.5
          ctx.stroke()
        },
      })
    }
  }

  const lift = 0.035 * AMPLITUDE // keeps the path off the surface it lies on
  for (let k = 1; k < trail.length; k++) {
    const [x0, y0] = trail[k - 1]
    const [x1, y1] = trail[k]
    const p0 = project(x0, y0, height(x0, y0) * AMPLITUDE + lift, cam)
    const p1 = project(x1, y1, height(x1, y1) * AMPLITUDE + lift, cam)
    const age = k / trail.length
    items.push({
      depth: Math.max(p0.depth, p1.depth),
      paint: () => {
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.strokeStyle = `rgba(20,22,26,${0.15 + 0.75 * age})`
        ctx.lineWidth = 1.2 + 1.6 * age
        ctx.lineCap = 'round'
        ctx.stroke()
      },
    })
  }

  const head = project(
    walker.x,
    walker.y,
    height(walker.x, walker.y) * AMPLITUDE + lift,
    cam,
  )
  items.push({
    depth: head.depth,
    paint: () => {
      ctx.beginPath()
      ctx.arc(head.x, head.y, 4.2, 0, Math.PI * 2)
      ctx.fillStyle = '#14161a'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.4
      ctx.stroke()
    },
  })

  items.sort((p, q) => p.depth - q.depth)
  for (const it of items) it.paint()
}

/*
  Four optimiser steps a frame rather than one: the integrator's step size is
  chosen for the shape of the surface, not for 60Hz, and a run that takes
  fifteen seconds to reach a basin is a run nobody watches to the end.
*/
useRaf(canvas, (dt) => {
  if (dt) {
    for (let i = 0; i < 4; i++) integrate()
    if (spin.value && !dragging) yaw.value += dt * 0.22
  }
  draw()
})
</script>

<style scoped>
.sc-surf {
  display: grid;
  grid-template-columns: 1fr 12.5rem;
  gap: 1rem;
  align-items: stretch;
}

.sc-surf__stage {
  position: relative;
  border: 1px solid var(--sc-line);
  border-radius: 0.6rem;
  background: linear-gradient(180deg, #fdfdfe 0%, #f3f4f7 100%);
  overflow: hidden;
}

.sc-surf__canvas {
  display: block;
  width: 100%;
  height: 20.5rem;
  cursor: grab;
  touch-action: none;
}

.sc-surf__canvas:active {
  cursor: grabbing;
}

.sc-surf__hud {
  position: absolute;
  left: 0.6rem;
  bottom: 0.5rem;
  display: flex;
  gap: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 0.35rem;
  background: rgba(255, 255, 255, 0.82);
  font-family: var(--sc-mono);
  font-size: 0.6rem;
  color: var(--color-dark-gray);
  pointer-events: none;
}

.sc-surf__hud b { color: var(--sc-ink); }
.sc-surf__eye { color: var(--color-light-gray); }

.sc-surf__side {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  justify-content: center;
}

.sc-surf__row {
  display: flex;
  gap: 0.35rem;
}

.sc-surf__side :deep(.sc-btn) { font-size: 0.62rem; padding: 0.3em 0.7em; }
.sc-surf__side :deep(.sc-ctl) { font-size: 0.6rem; gap: 0.4rem; }
.sc-surf__side :deep(.sc-ctl label) { min-width: 2.2rem; font-size: 0.55rem; }
.sc-surf__side :deep(.sc-ctl output) { min-width: 2.3rem; font-size: 0.6rem; }
.sc-surf__side :deep(.sc-hint) { font-size: 0.64rem !important; line-height: 1.35 !important; }

.sc-surf__facts {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.1rem 0 0 !important;
  font-family: var(--sc-mono);
  font-size: 0.58rem;
  color: var(--color-dark-gray);
}

.sc-surf__facts span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.sc-surf__facts i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 1px;
  background: var(--sc-orange);
}

.sc-surf__facts i.is-sort { background: var(--sc-blue); }
.sc-surf__facts i.is-lib { background: var(--sc-green); }
</style>
