<template>
  <ol class="collab-agenda">
    <li
      v-for="(item, i) in items"
      :key="i"
      class="collab-agenda__item"
      :class="{ 'collab-agenda__item--active': isActive(i, item) }"
    >
      {{ item }}
    </li>
  </ol>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  // Either the numeric index (0-based) or the exact string of the
  // active item. Leave unset to render all items as equal weight.
  current: {
    type: [Number, String],
    default: null,
  },
})

function isActive(i, item) {
  if (props.current === null) return false
  return typeof props.current === 'number'
    ? i === props.current
    : item === props.current
}
</script>

<style scoped>
.collab-agenda {
  list-style-type: decimal !important;
  padding-left: 2rem !important;
  margin: 1.5rem 0 !important;
}

.collab-agenda__item {
  margin-bottom: 0.9rem !important;
  color: var(--color-light-gray, rgb(179, 179, 179));
  transition: color 0.2s ease;
}

.collab-agenda__item--active {
  color: #000000;
  font-weight: 700;
}

.collab-agenda__item--active::marker {
  color: var(--color-emphasis);
  font-weight: 700;
}
</style>
