<!--
  SortableTable — a results table you can re-sort from the stage.

    <div>
    <SortableTable
      :columns="[
        { key: 'method', label: 'method' },
        { key: 'success', label: 'success', unit: '%', bar: true },
        { key: 'wall', label: 'wall-clock', unit: ' h', decimals: 1 },
      ]"
      :rows="[...]"
      sort="success"
      highlight="ours" />
    </div>

  Worth a slide of its own in a showcase because of what it implies: the deck
  is a running application, so the answer to "can you sort that by wall-clock?"
  is a click rather than a promise to send a spreadsheet afterwards. Rows
  animate between orders, which is what makes the re-sort legible instead of
  the table simply being different.
-->
<template>
  <table class="sc-table">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          :class="[`is-${col.align || (col.bar || col.unit !== undefined ? 'right' : 'left')}`, { 'is-sorted': sortKey === col.key }]"
          @click="toggle(col.key)"
        >
          {{ col.label }}
          <span class="sc-table__caret" :class="{ 'is-up': ascending }">{{ sortKey === col.key ? '▾' : '' }}</span>
        </th>
      </tr>
    </thead>

    <TransitionGroup tag="tbody" name="sc-row">
      <tr
        v-for="row in sorted"
        :key="row[keyField]"
        :class="{ 'is-highlight': highlight && row[keyField] === highlight }"
      >
        <td
          v-for="col in columns"
          :key="col.key"
          :class="`is-${col.align || (col.bar || col.unit !== undefined ? 'right' : 'left')}`"
        >
          <span
            v-if="col.bar"
            class="sc-table__bar"
            :style="{ width: barWidth(col, row[col.key]), background: col.color || 'var(--sc-orange)' }"
          />
          <span class="sc-table__cell">{{ format(col, row[col.key]) }}</span>
        </td>
      </tr>
    </TransitionGroup>
  </table>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  // Initial sort column; defaults to the first one.
  sort: { type: String, default: '' },
  desc: { type: Boolean, default: true },
  // Which row to pick out in the deck's accent colour.
  highlight: { type: String, default: '' },
  // The field that identifies a row, used both as the Vue key and for
  // `highlight`. The first column, unless told otherwise.
  keyField: { type: String, default: '' },
})

const keyField = computed(() => props.keyField || props.columns[0].key)

const sortKey = ref(props.sort || props.columns[0].key)
const ascending = ref(!props.desc)

function toggle(key) {
  if (sortKey.value === key) {
    ascending.value = !ascending.value
  } else {
    sortKey.value = key
    // A fresh column sorts descending first: on a results table the question
    // is almost always "what is best", not "what is worst".
    ascending.value = false
  }
}

const sorted = computed(() => {
  const key = sortKey.value
  const dir = ascending.value ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
    return String(x).localeCompare(String(y)) * dir
  })
})

function format(col, value) {
  if (value === null || value === undefined) return '—'
  if (typeof value !== 'number') return value
  return `${value.toFixed(col.decimals ?? 0)}${col.unit ?? ''}`
}

// Bars are scaled against the largest value in their own column, so a column
// of percentages and a column of hours can sit side by side.
function barWidth(col, value) {
  if (typeof value !== 'number') return '0%'
  const max = Math.max(...props.rows.map((r) => Number(r[col.key]) || 0))
  return `${max ? (value / max) * 100 : 0}%`
}
</script>

<style scoped>
.sc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
}

.sc-table th {
  font-family: var(--sc-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-dark-gray);
  padding: 0 0.6rem 0.4rem;
  border-bottom: 1px solid var(--sc-line-strong);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.sc-table th:hover { color: var(--sc-orange); }
.sc-table th.is-sorted { color: var(--sc-orange); }

.sc-table__caret {
  display: inline-block;
  width: 0.7em;
  transition: transform 0.2s ease;
}
.sc-table__caret.is-up { transform: rotate(180deg); }

/* `!important` because the theme sizes every `td` on a slide at 1.25rem, at a
   specificity a scoped component rule cannot beat on its own. */
.sc-table td {
  position: relative;
  padding: 0.38rem 0.6rem;
  border-bottom: 1px solid var(--sc-line);
  color: var(--sc-ink-2);
  font-size: 0.86rem !important;
  line-height: 1.5 !important;
}

.is-left { text-align: left; }
.is-right { text-align: right; }
.is-center { text-align: center; }

/* The bar sits behind the number rather than beside it, so the column stays
   as narrow as the number and the table keeps its shape when re-sorted. */
.sc-table__bar {
  position: absolute;
  left: 0.3rem;
  top: 50%;
  transform: translateY(-50%);
  height: 60%;
  border-radius: 3px;
  opacity: 0.16;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.sc-table__cell { position: relative; }

.sc-table tr.is-highlight td {
  color: var(--sc-ink);
  font-weight: 700;
  background: rgba(204, 112, 0, 0.055);
}
.sc-table tr.is-highlight td:first-child {
  box-shadow: inset 3px 0 0 var(--sc-orange);
}

/* Re-sorting moves rows; without this the table just becomes a different
   table and nobody can tell what happened. */
.sc-row-move { transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1); }

@media (prefers-reduced-motion: reduce) {
  .sc-row-move,
  .sc-table__bar { transition: none; }
}
</style>
