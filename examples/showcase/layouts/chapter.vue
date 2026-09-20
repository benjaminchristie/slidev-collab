<!--
  chapter — a dark section divider with a large ghost numeral behind it.

    ---
    layout: chapter
    n: "02"
    sub: "One sentence on what this section is for."
    hideNumber: true
    ---

    # Code on a Slide

  The theme already ships `split-bg` for section dividers. This is the other
  kind: a full-bleed dark card that resets the eye between sections. Having
  both in one deck is deliberate — the split divider marks a change of topic,
  this one marks a change of pace.
-->
<template>
  <div class="slidev-layout sc-chapter sc-dark">
    <div v-if="n" class="sc-chapter__ghost" aria-hidden="true">{{ n }}</div>

    <div class="sc-chapter__body">
      <div class="sc-chapter__rule" />
      <slot />
      <p v-if="sub" class="sc-chapter__sub">{{ sub }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  n: { type: [String, Number], default: '' },
  sub: { type: String, default: '' },
})
</script>

<style scoped>
.sc-chapter {
  position: relative;
  justify-content: center;
  padding: 3rem 4.5rem !important;
  overflow: hidden;
}

/* Big enough to be texture rather than information: it is cropped by the
   slide edge on purpose, so it reads as a watermark and not as a number the
   audience is meant to track. */
.sc-chapter__ghost {
  position: absolute;
  right: -1.5rem;
  bottom: -6.5rem;
  font-family: var(--sc-mono);
  font-size: 20rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.045);
  pointer-events: none;
  user-select: none;
}

/* The ghost numeral is this layout's first child, so the theme's centring pair
   only reaches the body with `margin-bottom: auto` — which top-aligns it
   instead of centring it. `auto` on both sides is the fix, and the child
   combinator is what outranks the theme's `!important`. */
.sc-chapter > .sc-chapter__body {
  position: relative;
  z-index: 1;
  max-width: 68%;
  margin: auto 0 !important;
}

.sc-chapter__rule {
  height: 3px;
  width: 4.5rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sc-orange-lit), #b491f0);
  margin-bottom: 1.4rem;
}

.sc-chapter :deep(h1) {
  font-size: 3.4rem !important;
  line-height: 1.08 !important;
  text-align: left !important;
  margin-bottom: 0 !important;
  color: #f7f9fc;
}

.sc-chapter__sub {
  margin: 1rem 0 0 !important;
  font-size: 1.05rem !important;
  font-style: italic;
  line-height: 1.5;
  color: #9fabbd;
}
</style>
