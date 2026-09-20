<!--
  full — a slide with no padding at all, for a demo that should run to the
  edges of the frame.

    ---
    layout: full
    dark: true
    caption: "Move the pointer. The arm solves for it."
    ---

    <RobotArm />

  The theme's own layouts all keep a 4.5rem gutter, which is right for text
  and wrong for a canvas. This one keeps only the caption strip along the
  bottom, positioned over the content rather than beside it so the demo still
  gets the whole slide.
-->
<template>
  <div
    class="slidev-layout sc-full sc-bleed"
    :class="[$frontmatter?.class, { 'sc-dark': dark }]"
  >
    <slot />

    <div v-if="title || caption" class="sc-full__strip">
      <span v-if="title" class="sc-full__title">{{ title }}</span>
      <span v-if="caption" class="sc-full__caption">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  caption: { type: String, default: '' },
  dark: { type: Boolean, default: false },
})
</script>

<style scoped>
.sc-full {
  position: relative;
  display: block !important;
  width: 100%;
  height: 100%;
}

.sc-full__strip {
  position: absolute;
  left: 2rem;
  right: 4.5rem;
  bottom: 1.1rem;
  z-index: 30;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  pointer-events: none;
}

.sc-full__title {
  font-family: var(--sc-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sc-orange);
  white-space: nowrap;
}

.sc-full__caption {
  font-size: 0.82rem;
  font-style: italic;
  color: var(--color-dark-gray);
}

.sc-dark .sc-full__title { color: var(--sc-orange-lit); }
.sc-dark .sc-full__caption { color: rgba(201, 209, 222, 0.75); }
</style>
