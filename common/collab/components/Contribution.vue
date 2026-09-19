<!--
  Contribution — a numbered claim, for the contributions slide and again for the
  summary.

    <Contribution n="1" title="An unbiased estimator">
    Removes the correction step earlier work needed.
    </Contribution>

  Stacked rather than laid out as cards in a row: a committee hears these as a
  list, and the same three lines should appear verbatim on the closing slide.
  Repetition is the point, so keep the wording identical in both places.
-->
<template>
  <div class="collab-contribution">
    <span class="collab-contribution-n">{{ n }}</span>
    <div>
      <div v-if="title" class="collab-contribution-title">{{ title }}</div>
      <div class="collab-contribution-body"><slot /></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  n: { type: [String, Number], default: '' },
  title: { type: String, default: '' },
})
</script>

<style scoped>
.collab-contribution {
  display: grid;
  grid-template-columns: 3rem 1fr;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0 0 1.1rem;
}

.collab-contribution-n {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1;
  color: var(--color-emphasis);
}

.collab-contribution-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #000000;
}

.collab-contribution-body { color: var(--color-dark-gray); }
.collab-contribution-body :deep(p) { margin: 0 !important; }
</style>
