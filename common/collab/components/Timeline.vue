<!--
  Timeline — where the work sits against the plan. Proposal and defense slides
  live on this; a conference talk usually does not need one.

    <Timeline :items="[
      ['2025 Q3', 'Estimator and proofs', 'done'],
      ['2025 Q4', 'Robot experiments', 'now'],
      ['2026 Q1', 'Writing', 'todo'],
    ]" />

  Each item is [when, what, state] or { when, what, state }, where state is
  'done', 'now' or 'todo'. Three to five items: past that it is a Gantt chart,
  and a Gantt chart on a slide is a chart nobody reads.
-->
<template>
  <div class="collab-timeline">
    <div
      v-for="(item, i) in stops"
      :key="i"
      class="collab-timeline-stop"
      :class="`is-${item.state}`"
    >
      <span class="collab-timeline-dot" />
      <span class="collab-timeline-when">{{ item.when }}</span>
      <span class="collab-timeline-what">{{ item.what }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const stops = computed(() =>
  props.items.map((item) => {
    const [when, what, state] = Array.isArray(item)
      ? item
      : [item.when, item.what, item.state]
    return { when, what, state: state || 'todo' }
  }),
)
</script>

<style scoped>
.collab-timeline {
  display: flex;
  align-items: flex-start;
  margin: 1.5rem 0;
}

.collab-timeline-stop {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  padding: 1.6rem 0.6rem 0 0;
  text-align: left;
}

/* The track is drawn per stop and trimmed at the two ends, so the line never
   runs off past the first dot or the last one. */
.collab-timeline-stop::before {
  content: "";
  position: absolute;
  top: 0.45rem;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-light-gray);
}
.collab-timeline-stop:first-child::before { left: 0.45rem; }
.collab-timeline-stop:last-child::before { right: calc(100% - 0.45rem); }

.collab-timeline-dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  box-sizing: border-box;
  background: #ffffff;
  border: 2px solid var(--color-light-gray);
}
.is-done .collab-timeline-dot {
  background: var(--color-light-gray);
  border-color: var(--color-light-gray);
}
.is-now .collab-timeline-dot {
  background: var(--color-emphasis);
  border-color: var(--color-emphasis);
  box-shadow: 0 0 0 3px rgba(204, 112, 0, 0.2);
}

.collab-timeline-when {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-light-gray);
}
.is-now .collab-timeline-when { color: var(--color-emphasis); }

.collab-timeline-what {
  display: block;
  margin-top: 0.15rem;
  font-size: 1rem;
  line-height: 1.35;
  color: var(--color-dark-gray);
}
.is-now .collab-timeline-what { color: #000000; }
</style>
