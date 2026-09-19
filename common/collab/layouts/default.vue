<!--
  default — every ordinary talk slide.

  The page number is not here: it comes from the theme's root-level
  `global-bottom.vue`, so that every layout numbers its slides the same way.
-->
<template>
  <div class="relative h-full w-full" :style="$frontmatter?.style">
    <div 
      class="slidev-layout default h-full w-full"
      :class="$frontmatter?.class"
    >
      <slot />
    </div>
  </div>
</template>
