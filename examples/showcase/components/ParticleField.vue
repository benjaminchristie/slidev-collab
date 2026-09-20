<!--
  ParticleField — a drifting constellation, drawn on a canvas.

    <ParticleField :count="70" :link-distance="140" dark />

  This is the "there is a whole browser in here" slide, reduced to its
  smallest honest form: no library, one canvas, one animation loop, and the
  loop parks itself when the slide is not on screen (see composables/useRaf.js).

  Points near each other are joined, with the line fading out as they separate,
  which is what makes a field of dots read as a structure rather than as noise.
  The pointer pulls gently on whatever is near it, so the title slide does
  something when you wave the mouse at it while people are still sitting down.
-->
<template>
  <canvas
    ref="canvas"
    class="sc-field"
    @pointermove="onMove"
    @pointerleave="onLeave"
  />
</template>

<script setup>
import { ref } from 'vue'
import { useCanvasSize, useRaf } from '../composables/useRaf.js'

const props = defineProps({
  count: { type: Number, default: 60 },
  // Logical pixels. Two points closer than this get a line between them.
  linkDistance: { type: Number, default: 130 },
  // Logical pixels per second.
  speed: { type: Number, default: 14 },
  dark: { type: Boolean, default: false },
})

const canvas = ref(null)
const { size } = useCanvasSize(canvas)

// The Collab palette, as [r, g, b] so alpha can be varied per point without
// re-parsing a colour string every frame.
const LIGHT = [
  [204, 112, 0],   // orange   — the theme's emphasis
  [42, 143, 189],  // blue
  [141, 95, 211],  // purple
  [102, 102, 102], // dark grey, as filler
]
const DARK = [
  [240, 161, 46],
  [91, 184, 224],
  [180, 145, 240],
  [150, 165, 190],
]

// Positions are normalised to 0..1 and multiplied up at draw time, so a
// window resize moves the field with the frame instead of leaving half of it
// outside the slide.
const points = []

function seed() {
  points.length = 0
  for (let i = 0; i < props.count; i++) {
    points.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5),
      vy: (Math.random() - 0.5),
      r: 1 + Math.random() * 2.1,
      // Weighted so the field is mostly grey with coloured accents; three
      // equally bright hues at this density looks like a screensaver.
      c: Math.random() < 0.55 ? 3 : Math.floor(Math.random() * 3),
      phase: Math.random() * Math.PI * 2,
    })
  }
}
seed()

const pointer = { x: -1, y: -1, active: false }

function onMove(event) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
  pointer.active = true
}

function onLeave() {
  pointer.active = false
}

function draw(dt, t) {
  const el = canvas.value
  const { w, h, dpr } = size.value
  if (!el || !w || !h) return

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const palette = props.dark ? DARK : LIGHT
  const link = props.linkDistance
  const step = (props.speed * dt) || 0

  for (const p of points) {
    p.x += (p.vx * step) / w
    p.y += (p.vy * step) / h

    // Wrap rather than bounce: a bounce puts a visible wall at the slide edge,
    // and the field is meant to feel unbounded.
    if (p.x < -0.05) p.x = 1.05
    if (p.x > 1.05) p.x = -0.05
    if (p.y < -0.05) p.y = 1.05
    if (p.y > 1.05) p.y = -0.05

    p.px = p.x * w
    p.py = p.y * h

    if (pointer.active) {
      const dx = pointer.x - p.px
      const dy = pointer.y - p.py
      const d2 = dx * dx + dy * dy
      if (d2 < 26000 && d2 > 1) {
        const pull = (1 - d2 / 26000) * 26 * dt
        p.px += (dx / Math.sqrt(d2)) * pull
        p.py += (dy / Math.sqrt(d2)) * pull
      }
    }
  }

  // Links first, so the dots sit on top of them.
  ctx.lineWidth = 0.8
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]
      const b = points[j]
      const dx = a.px - b.px
      const dy = a.py - b.py
      const d = Math.hypot(dx, dy)
      if (d > link) continue
      const alpha = (1 - d / link) * (props.dark ? 0.22 : 0.16)
      ctx.strokeStyle = props.dark
        ? `rgba(160, 185, 220, ${alpha})`
        : `rgba(20, 22, 26, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.px, a.py)
      ctx.lineTo(b.px, b.py)
      ctx.stroke()
    }
  }

  for (const p of points) {
    const [r, g, b] = palette[p.c]
    // A slow breath, out of phase per point, so the field never looks frozen
    // even when the drift happens to be slow.
    const pulse = 0.6 + 0.4 * Math.sin(t * 1.1 + p.phase)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(props.dark ? 0.75 : 0.6) * pulse})`
    ctx.beginPath()
    ctx.arc(p.px, p.py, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

useRaf(canvas, draw)
</script>

<style scoped>
.sc-field {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
