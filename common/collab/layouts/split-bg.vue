<template>
  <div class="slidev-layout split-bg grid grid-cols-2 absolute inset-0 h-full w-full">
    <div class="flex flex-col justify-center items-center text-center p-12 bg-white h-full">
      <slot />
    </div>
    <div class="flex flex-col justify-center items-center text-center p-12 bg-[#f4f4f5] h-full">
      <slot name="right" />
    </div>
  </div>
</template>

<style>
.slidev-layout.split-bg {
  position: absolute !important;
  inset: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

.slidev-layout.split-bg h1 {
  font-weight: 400 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  line-height: 1.2 !important;
}

/* Strip default margins from elements inside the slots */
.slidev-layout.split-bg p,
.slidev-layout.split-bg ul,
.slidev-layout.split-bg ol {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
</style>