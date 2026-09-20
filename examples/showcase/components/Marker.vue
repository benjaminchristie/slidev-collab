<!--
  Marker — a hand-drawn underline or highlighter stroke that draws itself over
  a phrase on a click.

    The answer is <Marker :show="$clicks > 0">a running application</Marker>.
    <Marker kind="highlight" :show="$clicks > 1" color="#8d5fd3">not a PDF</Marker>

  Emphasis a slide adds *while you are talking* is worth more than emphasis
  that was always there: the audience watches the stroke land and reads the
  words under it. Bold text on arrival gets skimmed with everything else.

  The stroke is one SVG path stretched to the width of whatever it wraps, so it
  fits a two-word phrase and a full line equally, and it is animated with
  `pathLength="1"` — the path is renormalised to unit length, so a single
  dash-offset animation works at any size without measuring anything.
-->
<template>
  <span class="sc-marker" :class="[`is-${kind}`, { 'is-on': show }]">
    <span class="sc-marker__text"><slot /></span>
    <svg
      class="sc-marker__ink"
      :viewBox="kind === 'highlight' ? '0 0 100 24' : '0 0 100 12'"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        :d="path"
        :stroke="color"
        :stroke-width="kind === 'highlight' ? 15 : 3.2"
        pathLength="1"
        stroke-dasharray="1"
        :stroke-dashoffset="show ? 0 : 1"
        fill="none"
        stroke-linecap="round"
      />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: true },
  // 'underline' — a stroke under the phrase.
  // 'highlight' — a fat translucent stroke through it.
  // 'strike'    — through the middle, for the thing you are ruling out.
  kind: { type: String, default: 'underline' },
  color: { type: String, default: 'var(--sc-orange)' },
})

// Deliberately not straight: the slight rise and fall is what separates this
// from a `border-bottom`, and it is what makes it read as annotation.
const path = computed(() => {
  if (props.kind === 'highlight') return 'M 1 13 C 26 9, 62 17, 99 11'
  if (props.kind === 'strike') return 'M 1 6 C 30 3, 68 9, 99 5'
  return 'M 1 8 C 24 3, 58 12, 99 5'
})
</script>

<style scoped>
.sc-marker {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}

.sc-marker__text {
  position: relative;
  z-index: 1;
}

.sc-marker__ink {
  position: absolute;
  left: -0.12em;
  right: -0.12em;
  width: calc(100% + 0.24em);
  overflow: visible;
  pointer-events: none;
}

.sc-marker__ink path {
  transition: stroke-dashoffset 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

/* Under the baseline, deep enough to clear descenders. */
.is-underline .sc-marker__ink,
.is-strike .sc-marker__ink {
  bottom: -0.34em;
  height: 0.5em;
}

/* Through the words, behind them, at reduced opacity — a highlighter. */
.is-highlight .sc-marker__ink {
  top: 50%;
  transform: translateY(-50%);
  height: 1.25em;
  z-index: 0;
  opacity: 0.28;
}

.is-strike .sc-marker__ink {
  bottom: auto;
  top: 45%;
}

.is-strike.is-on .sc-marker__text {
  color: var(--color-light-gray);
  transition: color 0.55s ease;
}

@media (prefers-reduced-motion: reduce) {
  .sc-marker__ink path { transition: none; }
}
</style>
