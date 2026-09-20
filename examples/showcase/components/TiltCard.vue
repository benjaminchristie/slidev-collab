<!--
  TiltCard — a card that leans towards the pointer, with a sheen that tracks it.

    <TiltCard title="Hot reload" accent="#2a8fbd">
    Save the markdown, the slide changes. No rebuild.
    </TiltCard>

  Pure CSS transforms driven by two custom properties, which is what keeps it
  cheap: the pointer handler writes `--rx`, `--ry` and the sheen position, and
  the compositor does the rest without Vue re-rendering anything.

  `perspective` has to sit on the parent of the transformed element, not on the
  element itself, or the rotation is flat — which is why there is a wrapper
  around the card rather than a single div.
-->
<template>
  <div
    class="sc-tilt"
    @pointermove="onMove"
    @pointerleave="reset"
  >
    <div ref="card" class="sc-tilt__card" :style="{ '--accent': accent }">
      <div class="sc-tilt__sheen" />
      <div class="sc-tilt__content">
        <div v-if="eyebrow" class="sc-tilt__eyebrow">{{ eyebrow }}</div>
        <div v-if="title" class="sc-tilt__title">{{ title }}</div>
        <div class="sc-tilt__body"><slot /></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  accent: { type: String, default: 'var(--sc-orange)' },
})

const card = ref(null)
// Degrees of lean at the corners. Past about 12 the card starts to look like a
// trick rather than like paper.
const MAX = 9

function onMove(event) {
  const el = card.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  el.style.setProperty('--rx', `${(0.5 - py) * 2 * MAX}deg`)
  el.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX}deg`)
  el.style.setProperty('--mx', `${px * 100}%`)
  el.style.setProperty('--my', `${py * 100}%`)
  el.style.setProperty('--lift', '1')
}

function reset() {
  const el = card.value
  if (!el) return
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
  el.style.setProperty('--lift', '0')
}
</script>

<style scoped>
.sc-tilt {
  perspective: 900px;
  height: 100%;
}

.sc-tilt__card {
  --rx: 0deg;
  --ry: 0deg;
  --mx: 50%;
  --my: 50%;
  --lift: 0;

  position: relative;
  height: 100%;
  border-radius: 16px;
  border: 1px solid var(--sc-line);
  background: #fff;
  padding: 1rem 1.1rem;
  overflow: hidden;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx)) rotateY(var(--ry)) translateZ(calc(var(--lift) * 10px));
  box-shadow:
    0 16px 36px -26px rgba(20, 22, 26, calc(0.5 + var(--lift) * 0.35)),
    0 2px 0 0 color-mix(in srgb, var(--accent) 55%, transparent) inset;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.35s ease;
}

/* While the pointer is inside, the lean should track it rather than lag by a
   third of a second; the transition above is there for the snap back. */
.sc-tilt:hover .sc-tilt__card {
  transition: box-shadow 0.35s ease;
}

.sc-tilt__sheen {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    22rem 22rem at var(--mx) var(--my),
    color-mix(in srgb, var(--accent) 16%, transparent) 0%,
    transparent 60%
  );
  opacity: var(--lift);
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.sc-tilt__content {
  position: relative;
  transform: translateZ(18px);
}

.sc-tilt__eyebrow {
  font-family: var(--sc-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 0.3rem;
}

.sc-tilt__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--sc-ink);
  line-height: 1.25;
  margin-bottom: 0.25rem;
}

.sc-tilt__body {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--sc-ink-2);
}
.sc-tilt__body :deep(p) { margin: 0 !important; font-size: inherit !important; }
.sc-tilt__body :deep(code) { font-size: 0.75rem !important; }

@media (prefers-reduced-motion: reduce) {
  .sc-tilt__card { transform: none !important; transition: none; }
}
</style>
