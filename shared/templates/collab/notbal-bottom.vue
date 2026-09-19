<template>
  <div 
    v-if="
      ($slidev.nav.currentSlideRoute?.meta?.layout || $slidev.nav.currentLayout) !== 'cover' && 
      !$slidev.nav.currentSlideRoute?.meta?.slide?.frontmatter?.hideNumber &&
      !$slidev.nav.currentSlideRoute?.meta?.frontmatter?.hideNumber
    " 
    class="absolute bottom-4 right-6 text-sm text-slate-500 pointer-events-none select-none"
    style="font-family: 'Palatino Linotype', 'Palatino', 'Book Antiqua', 'URW Palladio L', serif; z-index: 100 !important;"
  >
    {{ $slidev.nav.currentPage }}
  </div>
</template>
