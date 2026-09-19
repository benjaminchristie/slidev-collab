<!--
  Metric — the number you are actually reporting, lifted out of the bullet it
  would otherwise be buried in.

    <Metric value="47%" label="success rate" delta="+16" />
    <Metric value="3.2 h" label="median run" delta="-0.8" good="down" />
    <Metric value="8" label="seeds" />

  Whether a change is good news depends on the quantity, not on the sign: a
  success rate wants to go up, a runtime wants to go down. `good` names the
  happy direction, the sign on `delta` says which way it actually went, and the
  colour falls out of the two. `good="either"` when the answer is "it depends".

  Written from spans rather than divs so that several metrics on consecutive
  markdown lines land in one paragraph and flow into a row.
-->
<template>
  <span class="wc-metric">
    <span class="wc-metric-value">
      {{ value }}<span
        v-if="delta"
        class="wc-metric-delta"
        :class="`is-${tone}`"
      >{{ delta }}</span>
    </span>
    <span v-if="label" class="wc-metric-label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  // Keep the sign: "+16", "-0.8". Anything unsigned reads as a plain note.
  delta: { type: String, default: '' },
  // 'up' | 'down' | 'either'
  good: { type: String, default: 'up' },
})

// A minus may arrive as a hyphen from a keyboard or as U+2212 from a paste.
const direction = computed(() => {
  const d = props.delta.trim()
  if (d.startsWith('+')) return 'up'
  if (d.startsWith('-') || d.startsWith('−')) return 'down'
  return ''
})

const tone = computed(() => {
  if (props.good === 'either' || !direction.value) return 'flat'
  return direction.value === props.good ? 'good' : 'bad'
})
</script>

<style scoped>
.wc-metric {
  display: inline-block;
  vertical-align: top;
  margin: 0.15rem 2.4rem 0.35rem 0;
}

.wc-metric-value {
  display: block;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--wc-ink);
  white-space: nowrap;
}

.wc-metric-delta {
  margin-left: 0.3em;
  font-size: 0.42em;
  font-weight: 700;
  letter-spacing: 0.02em;
  vertical-align: 0.45em;
}
.wc-metric-delta.is-good { color: var(--wc-green); }
.wc-metric-delta.is-bad  { color: var(--wc-red); }
.wc-metric-delta.is-flat { color: var(--wc-muted); }

/* Same small-caps treatment as the eyebrow and the Aside tag, so a metric reads
   as part of the same family rather than as a chart that wandered in. */
.wc-metric-label {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wc-muted);
}
</style>
