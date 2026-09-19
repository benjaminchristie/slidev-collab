<template>
  <div class="collab-citation" :style="{ textAlign: align }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  // 'left' | 'center' | 'right'
  align: {
    type: String,
    default: 'left',
  },
})
</script>

<style scoped>
.collab-citation {
  position: absolute;
  bottom: 0.85rem;
  left: 2rem;
  right: 2rem;
  margin: 0 !important; /* Prevents flex margin calculations */
  font-size: 0.7rem !important;
  font-style: italic;
  line-height: 1.3 !important;
  color: var(--color-light-gray, rgb(179, 179, 179));
  pointer-events: none;
}
</style>
