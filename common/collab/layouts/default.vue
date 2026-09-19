<template>
  <div class="relative h-full w-full" :style="$frontmatter?.style">
    <div 
      class="slidev-layout default h-full w-full"
      :class="$frontmatter?.class"
    >
      <slot />
    </div>

    <div 
      v-if="!$frontmatter?.hideNumber" 
      class="absolute bottom-4 right-6 text-sm text-slate-500 pointer-events-none select-none z-50"
      style="font-family: 'Palatino Linotype', 'Palatino', 'Book Antiqua', 'URW Palladio L', serif;"
    >
      {{ $slidev.nav.currentPage }}
    </div>
  </div>
</template>