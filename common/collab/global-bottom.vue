<!--
  global-bottom — the page number, on every slide that should carry one.

  Slidev renders a theme's root-level `global-bottom.vue` beneath every slide,
  so the rule lives here once instead of in each layout. A slide opts out with
  `hideNumber: true` in its frontmatter, and cover slides never get one.

  The check is a plain function taking `$slidev` rather than a computed over an
  imported context, because the name of that import has moved between Slidev
  versions while the `$slidev` template global has not.
-->
<template>
  <div v-if="showNumber($slidev)" class="collab-page-number">
    {{ $slidev.nav.currentPage }}
  </div>
</template>

<script setup>
// Title slides carry no number, whichever cover layout they use.
const COVERS = ['cover', 'branded-cover']

function showNumber(slidev) {
  const meta = slidev.nav.currentSlideRoute?.meta
  // Frontmatter has sat under two different keys across versions; read either.
  const frontmatter = meta?.slide?.frontmatter ?? meta?.frontmatter ?? {}
  // Slidev's own rule: an unset layout means `cover` on slide 1, `default`
  // everywhere else. Spelling it out keeps this working whether or not the
  // running version exposes `currentLayout`.
  const layout =
    frontmatter.layout ??
    slidev.nav.currentLayout ??
    (slidev.nav.currentPage === 1 ? 'cover' : 'default')
  return !COVERS.includes(layout) && !frontmatter.hideNumber
}
</script>

<style scoped>
.collab-page-number {
  position: absolute;
  bottom: 1rem;
  right: 1.5rem;
  z-index: 100;
  font-family: var(--font-collab);
  font-size: 0.875rem;
  color: var(--color-light-gray, rgb(179, 179, 179));
  pointer-events: none;
  user-select: none;
}
</style>
