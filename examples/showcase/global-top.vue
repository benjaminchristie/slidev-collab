<!--
  global-top — a progress rail across the top of every slide.

  Slidev renders four optional files from the deck folder on every slide:
  `global-top.vue` and `global-bottom.vue` above and below the whole deck, and
  `slide-top.vue` / `slide-bottom.vue` inside each slide's own transition. They
  are the place for anything that belongs to the deck rather than to a slide —
  a watermark, a conference logo, a progress bar.

  This deck deliberately uses `global-top`: the theme already ships a
  `global-bottom.vue` for the page number, and a file with the same name in the
  deck folder would replace it rather than add to it. Picking the other layer
  gets a progress rail without losing the page numbers.

  `$slidev` is a template global, available here without importing anything.
  Reading it through a plain function rather than a computed over an imported
  context is the same choice the theme makes in its own `global-bottom.vue`:
  the import path has moved between Slidev versions, the template global has
  not.
-->
<template>
  <div class="sc-rail">
    <div class="sc-rail__fill" :style="{ width: fraction($slidev) }" />
    <div class="sc-rail__ticks">
      <div v-for="i in ticks($slidev)" :key="i" class="sc-rail__tick" />
    </div>
  </div>
</template>

<script setup>
function total(slidev) {
  // `nav.total` counts the slides the deck navigates through, which is what a
  // progress bar should measure. Falls back to 1 so the first render of an
  // empty deck cannot divide by zero.
  return Math.max(slidev?.nav?.total || 1, 1)
}

function fraction(slidev) {
  const page = slidev?.nav?.currentPage || 1
  return `${(page / total(slidev)) * 100}%`
}

// One tick per slide, drawn over the fill, so the rail reads as "four of
// thirty" and not just "some of the way through".
function ticks(slidev) {
  const n = total(slidev)
  return n > 60 ? 0 : n
}
</script>
