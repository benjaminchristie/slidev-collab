/*
 * A real file, pulled onto a slide by
 *
 *     <<< @/snippets/schedule.js#cosine {2-5}
 *
 * `@` is the deck folder, `#cosine` is the region below, and `{2-5}` highlights
 * lines within it. The point of importing rather than pasting: the slide and
 * the repository cannot drift apart, because there is only one copy.
 */

// #region cosine
/** Cosine schedule with linear warmup, as used everywhere since 2019. */
export function cosineSchedule(step, { total, warmup = 0, peak = 1e-3, floor = 0 }) {
  if (step < warmup) return (peak * step) / warmup
  const t = (step - warmup) / (total - warmup)
  return floor + 0.5 * (peak - floor) * (1 + Math.cos(Math.PI * Math.min(t, 1)))
}
// #endregion cosine

// #region sweep
/** Every combination of the values given, as a flat list of configs. */
export function sweep(grid) {
  const keys = Object.keys(grid)
  return keys.reduce(
    (configs, key) =>
      configs.flatMap((config) => grid[key].map((value) => ({ ...config, [key]: value }))),
    [{}],
  )
}
// #endregion sweep
