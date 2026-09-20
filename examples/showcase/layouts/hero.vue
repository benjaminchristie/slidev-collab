<!--
  hero — the showcase deck's title slide.

    ---
    layout: hero
    kicker: "Slidev, all the way up"
    author: "Your Name"
    date: "1 January 2026"
    hideNumber: true
    ---

    # The Deep End

  A layout in a deck folder works exactly like a layout in a theme: Slidev
  looks in `<deck>/layouts/` first and falls back to the theme, so this file
  adds a sixth layout to `common/collab` for this deck only. Nothing in the
  shared theme had to change to get a dark animated title slide.

  Frontmatter keys arrive as props, which is why `kicker`, `author` and `date`
  can be declared below and used directly.
-->
<template>
  <div class="slidev-layout sc-hero sc-dark">
    <!-- The canvas is a sibling of the content, not a background-image, so it
         can be paused when the slide is off screen. -->
    <ParticleField class="sc-hero__field" :count="70" :link-distance="140" dark />

    <div class="sc-hero__vignette" />

    <div class="sc-hero__body">
      <div v-if="kicker" class="sc-hero__kicker">{{ kicker }}</div>
      <slot />
      <div class="sc-hero__rule" />
    </div>

    <div v-if="footer" class="sc-hero__footer">{{ footer }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ParticleField from '../components/ParticleField.vue'

const props = defineProps({
  kicker: { type: String, default: '' },
  author: { type: String, default: '' },
  date: { type: String, default: '' },
})

const footer = computed(() =>
  [props.author, props.date].filter(Boolean).join('  ·  '),
)
</script>

<style scoped>
.sc-hero {
  position: relative;
  padding: 3.5rem 4.5rem !important;
  justify-content: center;
  overflow: hidden;
}

.sc-hero__field {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Keeps the type legible wherever the particles happen to bunch up. */
.sc-hero__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(75% 65% at 22% 45%, rgba(18, 21, 27, 0.92) 0%, rgba(18, 21, 27, 0.55) 45%, rgba(18, 21, 27, 0) 100%);
  pointer-events: none;
}

.sc-hero__body {
  position: relative;
  z-index: 2;
  max-width: 78%;
}

.sc-hero__kicker {
  font-family: var(--sc-mono);
  font-size: 0.68rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--sc-orange-lit);
  margin-bottom: 1rem;
}

.sc-hero__rule {
  margin-top: 1.5rem;
  height: 3px;
  width: 7rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sc-orange-lit), #ef7fae 55%, #b491f0);
}

.sc-hero__footer {
  position: absolute;
  left: 4.5rem;
  bottom: 2.2rem;
  z-index: 2;
  font-family: var(--sc-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: rgba(201, 209, 222, 0.7);
}

/* The theme centres h1 and sizes it for a white slide; a title slide that
   fills the frame needs its own scale, and left-aligned so the rule under it
   has an edge to start from. */
.sc-hero :deep(h1) {
  font-size: 4.6rem !important;
  line-height: 1.02 !important;
  text-align: left !important;
  margin-bottom: 0.6rem !important;
  color: #f7f9fc;
}

.sc-hero :deep(p) {
  font-size: 1.15rem !important;
  line-height: 1.55;
  color: #aeb9c9;
  margin: 0 !important;
  max-width: 34rem;
}
</style>
