<!--
  RunsFromFile — the figure is the results file.

    <RunsFromFile src="/runs.csv" :reveal="$clicks + 1" />

  A slide fetches. That sentence is the whole demo: this component asks the dev
  server for a CSV out of `public/`, parses it, and hands the columns to the
  theme's `<LiveChart>`. Nothing is pasted into `slides.md`, so re-running the
  experiment and copying one file over another is the entire process for
  updating the figure in the talk.

  Why it matters more than it looks: the usual path is *run → plot → export PNG
  → drag into slides → discover the axis was wrong → repeat*, and every loop
  through it is a chance for the number on the slide to stop matching the
  number in the paper. Here there is one file, and the slide reads it.

  The CSV is a plain wide table — a header row, then one row per x with a
  column per series, and an optional `name_sem` column beside any `name` to
  give it a band:

      steps,ours,ours_sem,baseline,baseline_sem,oracle
      0,21.4,3.1,19.8,2.9,74.0

  For a real talk, point `src` at whatever your training script already writes.
  The parser here is deliberately small and strict — twenty lines, no quoting,
  no type inference beyond `Number()` — because a CSV parser that guesses is a
  CSV parser that will one day silently drop a column of results.

  In a PDF export the fetch still happens: the exporter runs a real browser
  against the dev server, so the printed figure is drawn from the same file.
-->
<template>
  <div class="sc-runs">
    <div v-if="error" class="sc-runs__error">
      <b>{{ src }}</b> did not load — {{ error }}
    </div>

    <div v-else-if="!series.length" class="sc-runs__wait">reading {{ src }}…</div>

    <div v-else>
      <LiveChart
        :series="series"
        :x="x"
        :x-label="xLabel"
        :y-label="yLabel"
        :unit="unit"
        :min="min"
        :max="max"
        :reveal="reveal"
        :animate="animate"
      />
      <p class="sc-runs__note">
        <code>{{ src }}</code> · {{ x.length }} rows × {{ series.length }} series,
        read at render time
      </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  // The column to use as x. Defaults to the first column in the file.
  xColumn: { type: String, default: '' },
  xLabel: { type: String, default: '' },
  yLabel: { type: String, default: '' },
  unit: { type: String, default: '' },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  reveal: { type: Number, default: 99 },
  animate: { type: Boolean, default: true },
  // Series colours, in file order, cycling if the file has more columns than
  // this list has entries.
  colors: {
    type: Array,
    default: () => [
      'var(--color-emphasis)',
      'var(--color-blue)',
      'var(--color-green-deep)',
      'var(--color-purple)',
    ],
  },
  // Columns whose series should be drawn dashed — baselines and oracles.
  dashed: { type: Array, default: () => [] },
})

const x = ref([])
const series = ref([])
const error = ref('')

/*
  A header row and numbers. Blank lines are skipped, `#` starts a comment, and
  a short row is padded with NaN rather than shifting every later column left —
  which is the failure mode that makes a wrong figure instead of no figure.
*/
function parse(text) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
  if (rows.length < 2) throw new Error('needs a header row and at least one row of data')

  const head = rows[0].split(',').map((h) => h.trim())
  const cols = Object.fromEntries(head.map((h) => [h, []]))

  for (const row of rows.slice(1)) {
    const cells = row.split(',')
    head.forEach((h, i) => cols[h].push(i < cells.length ? Number(cells[i]) : NaN))
  }
  return { head, cols }
}

onMounted(async () => {
  try {
    const res = await fetch(props.src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { head, cols } = parse(await res.text())

    const xName = props.xColumn || head[0]
    if (!(xName in cols)) throw new Error(`no column named ${xName}`)
    x.value = cols[xName]

    // Everything that is not x and not somebody's `_sem` column is a series.
    const names = head.filter(
      (h) => h !== xName && !h.endsWith('_sem') && !h.endsWith('_lo') && !h.endsWith('_hi'),
    )

    series.value = names.map((name, i) => {
      const s = {
        name,
        color: props.colors[i % props.colors.length],
        data: cols[name],
      }
      if (cols[`${name}_sem`]) s.sem = cols[`${name}_sem`]
      if (cols[`${name}_lo`]) s.lo = cols[`${name}_lo`]
      if (cols[`${name}_hi`]) s.hi = cols[`${name}_hi`]
      if (props.dashed.includes(name)) s.dashed = true
      return s
    })
  } catch (err) {
    error.value = String(err?.message ?? err)
  }
})
</script>

<style scoped>
.sc-runs__wait,
.sc-runs__error {
  padding: 2rem 0;
  font-family: var(--sc-mono);
  font-size: 0.75rem;
  color: var(--color-light-gray);
  text-align: center;
}

.sc-runs__error { color: var(--sc-red); }

.sc-runs__note {
  margin: 0.2rem 0 0 !important;
  font-family: var(--sc-mono);
  font-size: 0.58rem !important;
  color: var(--color-light-gray);
  text-align: right;
}
</style>
