<!--
  branded-cover — a dark title slide.

    ---
    layout: branded-cover
    author: "Your Name"
    date: "1 January 2026"
    ---

    # Talk title

  The footer is rendered here rather than by a component: it is two lines of
  frontmatter and nothing else reuses it.
-->
<template>
  <div class="slidev-layout branded-cover h-full flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 to-indigo-950">
    <!-- Top accent bar -->
    <div class="h-2 w-24 bg-sky-400 rounded"></div>

    <!-- Main Slide Content (Markdown text renders here) -->
    <div class="my-auto">
      <slot />
    </div>

    <div v-if="footer" class="branded-cover__footer">{{ footer }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  author: { type: String, default: '' },
  date: { type: String, default: '' },
})

const footer = computed(() =>
  [props.author, props.date].filter(Boolean).join(' · '),
)
</script>

<style scoped>
.branded-cover__footer {
  font-family: var(--font-collab);
  font-size: 0.9rem;
  color: rgb(148, 163, 184);
}
</style>
