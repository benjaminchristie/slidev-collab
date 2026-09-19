<template>
  <div class="collab-highlight" :class="`collab-highlight--${color}`">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  // 'orange' | 'green' | 'blue' | 'purple' | 'dgray'
  color: {
    type: String,
    default: 'orange',
  },
})
</script>

<style scoped>
.collab-highlight {
  border-left: 4px solid var(--c);
  background-color: color-mix(in srgb, var(--c) 8%, white);
  padding: 0.75rem 1.25rem;
  border-radius: 0 0.4rem 0.4rem 0;
  margin: 1rem 0;
}

.collab-highlight :deep(p),
.collab-highlight :deep(li) {
  margin: 0;
}

.collab-highlight--orange { --c: var(--color-emphasis); }
.collab-highlight--green  { --c: var(--color-green); }
.collab-highlight--blue   { --c: var(--color-blue); }
.collab-highlight--purple { --c: var(--color-purple); }
.collab-highlight--dgray  { --c: var(--color-dark-gray); }
</style>
