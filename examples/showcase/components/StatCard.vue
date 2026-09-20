<!--
  StatCard — a headline number that counts up when the slide arrives, with an
  optional sparkline and a delta against last time.

    <StatCard :value="47.2" unit="%" label="success rate" :delta="+16.4"
              :spark="[12, 18, 21, 30, 38, 47]" />

  The count-up is not decoration. A number that lands rather than appears gets
  looked at, which is the whole job of a metric on a slide. It runs once, when
  the card first becomes visible, and not at all under `prefers-reduced-motion`
  or during PDF export — a print has no arrival to animate.
-->
<template>
  <div ref="root" class="sc-stat">
    <div class="sc-stat__value">
      <span class="sc-stat__prefix" v-if="prefix">{{ prefix }}</span>{{ display }}<span
        class="sc-stat__unit"
        v-if="unit"
      >{{ unit }}</span>
    </div>

    <div class="sc-stat__label">{{ label }}</div>

    <svg v-if="spark.length > 1" class="sc-stat__spark" viewBox="0 0 100 26" preserveAspectRatio="none">
      <path :d="sparkArea" :fill="accent" fill-opacity="0.13" />
      <path :d="sparkLine" fill="none" :stroke="accent" stroke-width="1.6" stroke-linejoin="round" />
    </svg>

    <div v-if="delta !== null" class="sc-stat__delta" :class="deltaClass">
      <svg viewBox="0 0 10 10" class="sc-stat__arrow" :class="{ 'is-down': deltaValue < 0 }">
        <path d="M5 1 L9 7 L1 7 Z" fill="currentColor" />
      </svg>
      {{ deltaValue > 0 ? '+' : '' }}{{ deltaValue }}{{ deltaUnit }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { prefersReducedMotion, useRaf } from '../composables/useRaf.js'

const props = defineProps({
  value: { type: Number, required: true },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  prefix: { type: String, default: '' },
  decimals: { type: Number, default: 0 },
  // Change since last time. Null hides the row entirely.
  delta: { type: Number, default: null },
  deltaUnit: { type: String, default: '' },
  // Which direction is the good one, for colouring the delta. A median run
  // time that fell is good news; a success rate that fell is not.
  good: { type: String, default: 'up' },
  spark: { type: Array, default: () => [] },
  accent: { type: String, default: 'var(--sc-orange)' },
  seconds: { type: Number, default: 1.1 },
  animate: { type: Boolean, default: true },
})

const root = ref(null)
const still = computed(() => !props.animate || prefersReducedMotion())
const shown = ref(still.value ? props.value : 0)

let elapsed = 0
// Ease-out cubic: fast at first, then settling. A linear count-up reads like a
// loading bar; this reads like a number arriving.
const ease = (t) => 1 - Math.pow(1 - t, 3)

const { stop } = useRaf(
  root,
  (dt) => {
    if (still.value) {
      shown.value = props.value
      return
    }
    elapsed += dt
    const t = Math.min(elapsed / props.seconds, 1)
    shown.value = props.value * ease(t)
    if (t >= 1) stop()
  },
  { autoStart: !still.value },
)

const display = computed(() => shown.value.toFixed(props.decimals))
const deltaValue = computed(() => props.delta ?? 0)
const deltaClass = computed(() => {
  if (!props.delta) return 'is-flat'
  const rising = props.delta > 0
  return (rising === (props.good === 'up')) ? 'is-good' : 'is-bad'
})

// The sparkline lives in a 100x26 box and is stretched to fit, so the data
// never has to know how wide the card ended up.
const points = computed(() => {
  const data = props.spark
  const lo = Math.min(...data)
  const hi = Math.max(...data)
  const span = hi - lo || 1
  return data.map((v, i) => [
    (i / (data.length - 1)) * 100,
    24 - ((v - lo) / span) * 22,
  ])
})

const sparkLine = computed(() =>
  points.value.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' '),
)

const sparkArea = computed(() => `${sparkLine.value} L 100 26 L 0 26 Z`)
</script>

<style scoped>
.sc-stat {
  position: relative;
  border: 1px solid var(--sc-line);
  border-radius: 14px;
  background: #fff;
  padding: 0.75rem 0.9rem 0.6rem;
  box-shadow: 0 14px 34px -24px rgba(20, 22, 26, 0.5);
  overflow: hidden;
}

.sc-stat__value {
  font-size: 2.3rem;
  line-height: 1.05;
  font-weight: 300;
  color: var(--sc-ink);
  font-variant-numeric: tabular-nums;
}

.sc-stat__prefix,
.sc-stat__unit {
  font-size: 1.1rem;
  color: var(--color-dark-gray);
  margin-left: 0.08em;
}

.sc-stat__label {
  font-family: var(--sc-mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-dark-gray);
  margin-top: 0.15rem;
}

.sc-stat__spark {
  display: block;
  width: 100%;
  height: 26px;
  margin-top: 0.45rem;
}

.sc-stat__delta {
  position: absolute;
  top: 0.7rem;
  right: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-family: var(--sc-mono);
  font-size: 0.66rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sc-stat__arrow {
  width: 8px;
  height: 8px;
}
.sc-stat__arrow.is-down {
  transform: rotate(180deg);
}

.is-good { color: var(--sc-green); }
.is-bad { color: var(--sc-red); }
.is-flat { color: var(--color-light-gray); }
</style>
