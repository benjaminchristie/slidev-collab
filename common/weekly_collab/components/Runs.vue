<!--
  Runs — the sweep table: what is running, how far through it is, what state it
  is in.

    <Runs :rows="[
      ['reward-v3', '8/8', 'done'],
      ['reward-v4', '3/8', 'wip'],
      ['baseline-b', '0/8', 'blocked'],
    ]" />

  Each row is [name, progress, state] or { name, progress, state, note }, where
  state is any `<Status>` kind. A progress written as "3/8" also draws a bar,
  because the question in the room is never the number, it is how much is left.
-->
<template>
  <table class="wc-runs">
    <tbody>
      <tr v-for="(row, i) in parsed" :key="i">
        <td class="wc-runs-name">
          {{ row.name }}
          <span v-if="row.note" class="wc-runs-note">{{ row.note }}</span>
        </td>
        <td class="wc-runs-progress">
          <span class="wc-runs-count">{{ row.progress }}</span>
          <span v-if="row.fraction !== null" class="wc-runs-bar">
            <span
              class="wc-runs-bar-fill"
              :class="`is-${row.state}`"
              :style="{ width: `${row.fraction * 100}%` }"
            />
          </span>
        </td>
        <td class="wc-runs-state">
          <Status v-bind="{ [row.state]: true }" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { computed } from 'vue'
import Status from './Status.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
})

// "3/8" is the shape a sweep is reported in; anything else ("overnight",
// "n/a") is left as text and simply gets no bar.
function fractionOf(progress) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(progress ?? '')
  if (!m) return null
  const [, done, total] = m
  return Number(total) > 0 ? Math.min(Number(done) / Number(total), 1) : null
}

const parsed = computed(() =>
  props.rows.map((row) => {
    const [name, progress, state, note] = Array.isArray(row)
      ? row
      : [row.name, row.progress, row.state, row.note]
    return {
      name,
      progress,
      note,
      state: state || 'wip',
      fraction: fractionOf(progress),
    }
  }),
)
</script>

<style scoped>
.wc-runs {
  width: 100%;
  border-collapse: collapse;
  margin: 0.4rem 0 0.6rem;
  font-size: 0.95em;
}

.wc-runs td {
  padding: 0.28rem 0.5rem 0.28rem 0;
  border-bottom: 1px solid var(--wc-hairline);
  vertical-align: middle;
}
.wc-runs tr:last-child td { border-bottom: none; }

.wc-runs-name {
  color: var(--wc-ink);
  font-family: var(--wc-mono);
  font-size: 0.88em;
}

.wc-runs-note {
  margin-left: 0.5rem;
  font-family: var(--wc-font);
  font-size: 1em;
  color: var(--wc-muted);
}

.wc-runs-progress {
  width: 11rem;
  white-space: nowrap;
}

.wc-runs-count {
  display: inline-block;
  width: 3rem;
  font-family: var(--wc-mono);
  font-size: 0.85em;
  color: var(--wc-muted);
}

.wc-runs-bar {
  display: inline-block;
  width: 7rem;
  height: 5px;
  border-radius: 3px;
  background: var(--wc-hairline);
  overflow: hidden;
  vertical-align: 0.05em;
}

.wc-runs-bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.wc-runs-bar-fill.is-done    { background: var(--wc-green); }
.wc-runs-bar-fill.is-wip     { background: var(--wc-blue); }
.wc-runs-bar-fill.is-blocked { background: var(--wc-red); }
.wc-runs-bar-fill.is-ask     { background: var(--wc-orange); }

.wc-runs-state {
  width: 7rem;
  text-align: right;
}
</style>
