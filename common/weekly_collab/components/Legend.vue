<!--
  Legend — named swatches for the series in a figure.

    <Legend :items="[['blue', 'ours'], ['muted', 'baseline']]" />
    <Legend shape="dot" :items="[{ color: 'orange', label: 'ablation' }]" />

  A legend baked into the artwork sets its own type at whatever size the export
  happened to use, and a legend given its own figure column takes as much room
  as a plot. This is neither: it sits under the artwork at caption size, in the
  deck's own type.

  Inside a `figure` layout it goes at the end of the `::figure::` slot, which is
  a flex column, so it lands between the artwork and the caption.
-->
<template>
  <span class="wc-legend">
    <span v-for="(item, i) in series" :key="i" class="wc-legend-item">
      <span
        class="wc-legend-swatch"
        :class="`is-${shape}`"
        :style="{ background: item.color }"
      />
      <span class="wc-legend-label">{{ item.label }}</span>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Each item is ['blue', 'ours'] or { color: 'blue', label: 'ours' }.
  items: { type: Array, default: () => [] },
  // 'line' for anything plotted as a curve, 'dot' for scatter and points.
  shape: { type: String, default: 'line' },
})

// The theme's five colours by name; anything else is passed through, so a
// swatch can still match a hex the plotting script hard-coded.
const NAMED = ['orange', 'blue', 'green', 'red', 'purple', 'muted', 'ink']

const series = computed(() =>
  props.items.map((item) => {
    const [color, label] = Array.isArray(item)
      ? item
      : [item.color, item.label]
    return {
      label,
      color: NAMED.includes(color) ? `var(--wc-${color})` : color,
    }
  }),
)
</script>

<style scoped>
.wc-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.25rem 1.1rem;
  flex: none;
}

.wc-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.wc-legend-swatch {
  flex: none;
  display: inline-block;
}
.wc-legend-swatch.is-line {
  width: 0.95rem;
  height: 3px;
  border-radius: 2px;
}
.wc-legend-swatch.is-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.wc-legend-label {
  font-size: 0.85rem;
  color: var(--wc-muted);
}
</style>
