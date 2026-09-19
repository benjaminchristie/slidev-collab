<!--
  cover — the first slide of a weekly deck.

    ---
    layout: cover
    date: 30 March 2026
    with: Alex
    ---

    # Weekly Update
-->
<template>
  <div class="slidev-layout cover">
    <div class="wc-cover">
      <div v-if="date" class="wc-eyebrow">{{ date }}</div>
      <slot />
      <div v-if="attendee" class="wc-cover-with">with {{ attendee }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// `with` is a reserved word, so it is read off the props object by key rather
// than destructured or referenced bare in the template.
const props = defineProps({
  date: { type: String, default: '' },
  with: { type: String, default: '' },
})

const attendee = computed(() => props['with'])
</script>
