<template>
  <div class="text-eq h-full grid grid-cols-2 gap-8 items-center px-12 py-8">
    <div class="left-col space-y-4 my-auto">
      <slot />
    </div>
    <div class="right-col flex justify-center items-center text-xl bg-gray-50 p-6 rounded-lg border border-gray-200 my-auto shadow-sm">
      <slot name="right" />
    </div>
  </div>
</template>
