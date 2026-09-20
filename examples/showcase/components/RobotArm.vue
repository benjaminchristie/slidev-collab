<!--
  RobotArm — a two-link planar arm that solves inverse kinematics for wherever
  the pointer is, sixty times a second, in SVG.

    <RobotArm />

  Leave it alone for a couple of seconds and it drives itself along a Lissajous
  figure, so the slide is never a static picture of a robot; touch the pointer
  and you take over. That matters for a demo on a projector: it has to look
  alive from the back of the room before anybody asks you to prove it is live.

  The maths is the closed-form two-link solution — law of cosines for the elbow,
  one atan2 for the shoulder — with the target clamped into the annulus the arm
  can actually reach, and the joint angles eased towards the solution rather
  than snapped to it so the motion reads as a machine rather than a cursor.
-->
<template>
  <div ref="root" class="sc-arm">
    <svg
      ref="svg"
      class="sc-arm__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="xMidYMid slice"
      @pointermove="onPointer"
      @pointerleave="handOver"
    >
      <defs>
        <linearGradient id="sc-arm-link" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#f0a12e" />
          <stop offset="100%" stop-color="#d2568c" />
        </linearGradient>
        <radialGradient id="sc-arm-glow">
          <stop offset="0%" stop-color="#f0a12e" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#f0a12e" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- The workspace: everything the arm can reach, and the hole in the
           middle it cannot fold far enough to touch. -->
      <circle :cx="BASE.x" :cy="BASE.y" :r="l1 + l2" class="sc-arm__reach" />
      <circle :cx="BASE.x" :cy="BASE.y" :r="Math.abs(l1 - l2)" class="sc-arm__reach" />

      <path v-if="trailPath" :d="trailPath" class="sc-arm__trail" />

      <!-- Target -->
      <g class="sc-arm__target" :style="{ transform: `translate(${target.x}px, ${target.y}px)` }">
        <circle r="26" fill="url(#sc-arm-glow)" />
        <circle r="9" class="sc-arm__ring" />
        <line x1="-16" x2="-11" y1="0" y2="0" />
        <line x1="11" x2="16" y1="0" y2="0" />
        <line y1="-16" y2="-11" x1="0" x2="0" />
        <line y1="11" y2="16" x1="0" x2="0" />
      </g>

      <!-- Links -->
      <line :x1="BASE.x" :y1="BASE.y" :x2="joint.x" :y2="joint.y" class="sc-arm__link" />
      <line :x1="joint.x" :y1="joint.y" :x2="tip.x" :y2="tip.y" class="sc-arm__link" />

      <!-- Joints, drawn after the links so the links appear to enter them -->
      <circle :cx="BASE.x" :cy="BASE.y" r="15" class="sc-arm__joint is-base" />
      <circle :cx="joint.x" :cy="joint.y" r="11" class="sc-arm__joint" />
      <circle :cx="tip.x" :cy="tip.y" r="7" class="sc-arm__tip" />

      <!-- Base plinth -->
      <path
        :d="`M ${BASE.x - 44} ${BASE.y + 46} L ${BASE.x - 22} ${BASE.y} L ${BASE.x + 22} ${BASE.y} L ${BASE.x + 44} ${BASE.y + 46} Z`"
        class="sc-arm__plinth"
      />
    </svg>

    <div class="sc-arm__panel">
      <div class="sc-ctl">
        <label for="l1">upper</label>
        <input id="l1" v-model.number="l1" class="sc-range" type="range" min="70" max="230" step="1" />
        <output>{{ l1 }}</output>
      </div>
      <div class="sc-ctl">
        <label for="l2">fore</label>
        <input id="l2" v-model.number="l2" class="sc-range" type="range" min="50" max="210" step="1" />
        <output>{{ l2 }}</output>
      </div>
      <div class="sc-arm__row">
        <button class="sc-btn" :class="{ 'sc-btn--on': elbowUp }" @click="elbowUp = !elbowUp">
          elbow {{ elbowUp ? 'up' : 'down' }}
        </button>
        <button class="sc-btn" :class="{ 'sc-btn--on': showTrail }" @click="showTrail = !showTrail">
          trail
        </button>
      </div>
      <div class="sc-arm__readout">
        θ₁ {{ deg(theta1) }}°&nbsp;&nbsp;θ₂ {{ deg(theta2) }}°
        <span v-if="clamped" class="sc-arm__clamped">out of reach</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRaf } from '../composables/useRaf.js'

// The arm is drawn in its own coordinate space and scaled to whatever the
// slide is; `slice` means it fills the frame and crops rather than letterboxes.
const W = 1000
const H = 562
const BASE = { x: 320, y: 430 }

const root = ref(null)
const svg = ref(null)

const l1 = ref(175)
const l2 = ref(135)
const elbowUp = ref(true)
const showTrail = ref(true)

const target = ref({ x: 620, y: 240 })
const joint = ref({ x: BASE.x + 175, y: BASE.y })
const tip = ref({ x: BASE.x + 310, y: BASE.y })
const theta1 = ref(0)
const theta2 = ref(0)
const clamped = ref(false)

// Eased angles. Solving straight onto the pointer looks like a rubber band;
// easing at a fixed rate per second looks like something with motors in it.
let a1 = 0
let a2 = 0
let idleAt = performance.now()
let trail = []

const deg = (r) => ((r * 180) / Math.PI).toFixed(0).replace('-0', '0')

/*
  Screen pixels to viewBox units. `getScreenCTM()` is the only way that stays
  correct under `preserveAspectRatio="slice"`, which crops rather than fits and
  so has no simple ratio to divide by — and under Slidev's own scaling of the
  whole slide, which is a transform this inverts for free.
*/
function toLocal(event) {
  const el = svg.value
  if (!el || !el.getScreenCTM) return null
  const point = el.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const ctm = el.getScreenCTM()
  if (!ctm) return null
  const local = point.matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

// Leaving the arm alone hands control back to the idle path, but only after
// the same two-second grace period, so the arm does not lurch the instant the
// pointer crosses the slide edge.
function handOver() {
  idleAt = performance.now()
}

function onPointer(event) {
  const local = toLocal(event)
  if (!local) return
  target.value = local
  idleAt = performance.now()
}

// Where the arm sends itself when nobody is driving. Two incommensurate
// frequencies, so the path never quite repeats.
function idleTarget(t) {
  return {
    x: BASE.x + 210 + Math.sin(t * 0.47) * 200,
    y: BASE.y - 150 + Math.sin(t * 0.71 + 1.1) * 115,
  }
}

function shortestDelta(from, to) {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function solve(tx, ty) {
  const dx = tx - BASE.x
  const dy = ty - BASE.y
  let d = Math.hypot(dx, dy)

  const outer = l1.value + l2.value
  const inner = Math.abs(l1.value - l2.value)
  clamped.value = d > outer - 0.5 || d < inner + 0.5
  d = Math.min(Math.max(d, inner + 0.5), outer - 0.5)

  // Law of cosines for the elbow, then subtract the elbow's contribution from
  // the bearing to the target to get the shoulder.
  const cos2 = (d * d - l1.value * l1.value - l2.value * l2.value) / (2 * l1.value * l2.value)
  const t2 = Math.acos(Math.min(Math.max(cos2, -1), 1)) * (elbowUp.value ? -1 : 1)
  const t1 =
    Math.atan2(dy, dx) -
    Math.atan2(l2.value * Math.sin(t2), l1.value + l2.value * Math.cos(t2))
  return [t1, t2]
}

useRaf(root, (dt, t) => {
  const now = performance.now()
  // Two seconds of no pointer and the arm takes itself for a walk.
  if (now - idleAt > 2000) target.value = idleTarget(t)

  const [t1, t2] = solve(target.value.x, target.value.y)

  // Critically-damped-ish: a fixed fraction of the remaining angle per second,
  // frame-rate independent via the exponential.
  const k = 1 - Math.exp(-9 * (dt || 1 / 60))
  a1 += shortestDelta(a1, t1) * k
  a2 += shortestDelta(a2, t2) * k

  theta1.value = a1
  theta2.value = a2

  const jx = BASE.x + Math.cos(a1) * l1.value
  const jy = BASE.y + Math.sin(a1) * l1.value
  const ex = jx + Math.cos(a1 + a2) * l2.value
  const ey = jy + Math.sin(a1 + a2) * l2.value

  joint.value = { x: jx, y: jy }
  tip.value = { x: ex, y: ey }

  if (showTrail.value) {
    trail.push([ex, ey])
    if (trail.length > 150) trail.shift()
  } else if (trail.length) {
    trail = []
  }
  trailVersion.value++
})

// The trail lives in a plain array for the sake of the loop; this counter is
// what tells the template that the array has moved on.
const trailVersion = ref(0)

const trailPath = computed(() => {
  void trailVersion.value
  if (!showTrail.value || trail.length < 2) return ''
  return trail.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
})
</script>

<style scoped>
.sc-arm {
  position: relative;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(120% 120% at 25% 15%, #1c2230 0%, #12151b 60%),
    #12151b;
}

.sc-arm__svg {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.sc-arm__reach {
  fill: none;
  stroke: rgba(160, 185, 220, 0.14);
  stroke-width: 1;
  stroke-dasharray: 6 8;
}

.sc-arm__trail {
  fill: none;
  stroke: #b491f0;
  stroke-opacity: 0.55;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sc-arm__link {
  stroke: url(#sc-arm-link);
  stroke-width: 13;
  stroke-linecap: round;
}

.sc-arm__joint {
  fill: #12151b;
  stroke: #f2f5fa;
  stroke-width: 3;
}
.sc-arm__joint.is-base {
  fill: #1c2230;
  stroke: #f0a12e;
}

.sc-arm__tip {
  fill: #ffffff;
  stroke: #d2568c;
  stroke-width: 3;
}

.sc-arm__plinth {
  fill: rgba(160, 185, 220, 0.12);
  stroke: rgba(160, 185, 220, 0.25);
  stroke-width: 1.5;
}

.sc-arm__target circle.sc-arm__ring {
  fill: none;
  stroke: #5bb8e0;
  stroke-width: 2;
}
.sc-arm__target line {
  stroke: #5bb8e0;
  stroke-width: 2;
  stroke-linecap: round;
}

.sc-arm__panel {
  position: absolute;
  left: 2rem;
  bottom: 3.2rem;
  width: 15rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  background: rgba(18, 21, 27, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.sc-arm__panel :deep(.sc-ctl) { color: #c9d1de; }
.sc-arm__panel :deep(.sc-ctl label) { color: rgba(201, 209, 222, 0.6); }
.sc-arm__panel :deep(.sc-ctl output) { color: var(--sc-orange-lit); }
.sc-arm__panel :deep(.sc-btn) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
  color: #c9d1de;
}
.sc-arm__panel :deep(.sc-btn--on) {
  border-color: var(--sc-blue-lit);
  background: rgba(91, 184, 224, 0.16);
  color: var(--sc-blue-lit);
}

.sc-arm__row {
  display: flex;
  gap: 0.35rem;
}

.sc-arm__readout {
  font-family: var(--sc-mono);
  font-size: 0.62rem;
  color: rgba(201, 209, 222, 0.75);
  font-variant-numeric: tabular-nums;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.sc-arm__clamped { color: var(--sc-red); }
</style>
