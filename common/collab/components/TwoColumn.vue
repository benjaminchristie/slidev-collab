<template>
  <div
    class="collab-two-col"
    :style="{ gridTemplateColumns: ratio, gap: gap, alignItems: align }"
  >
    <div class="collab-two-col__left">
      <slot />
    </div>
    <div class="collab-two-col__right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  ratio: {
    type: String,
    default: '1fr 1fr',
  },
  gap: {
    type: String,
    default: '2rem',
  },
  align: {
    type: String,
    default: 'center', // Options: 'center', 'start', 'end', 'stretch'
  },
})
</script>

<style scoped>
.collab-two-col {
  display: grid;
  width: 100%;
}
</style>