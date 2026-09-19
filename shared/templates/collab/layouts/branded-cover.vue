<template>
  <div class="slidev-layout branded-cover h-full flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 to-indigo-950">
    <!-- Top accent bar -->
    <div class="h-2 w-24 bg-sky-400 rounded"></div>

    <!-- Main Slide Content (Markdown text renders here) -->
    <div class="my-auto">
      <slot />
    </div>

    <!-- Reusable Footer -->
    <BrandFooter author="School Presentation" />
  </div>
</template>
