<!--
  Next — one dated commitment for the coming week.

    <Next by="Mon">Rerun seeds 4-8 on the new reward</Next>
    <Next by="Thu" who="Alex">Decide whether demo collection continues</Next>

  The date sits in its own gutter so that a stack of these scans as a list of
  dates rather than as more prose, and so that next week's deck can be checked
  against this one line by line.
-->
<template>
  <div class="wc-next">
    <span class="wc-next-by">{{ by }}</span>
    <div class="wc-next-body">
      <slot />
      <span v-if="who" class="wc-next-who">— {{ who }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  by: { type: String, default: '' },
  // Leave unset when it is yours; name someone only when it is not.
  who: { type: String, default: '' },
})
</script>

<style scoped>
.wc-next {
  display: grid;
  grid-template-columns: 4.2rem 1fr;
  align-items: baseline;
  gap: 0.7rem;
  margin: 0.3rem 0;
}

.wc-next-by {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wc-blue);
  text-align: right;
}

.wc-next-body { color: var(--wc-body); }
/* Written on one line the slot content is bare inline text; written across
   blank lines markdown-it wraps it in a paragraph. Flatten that case so the
   date gutter stays on the same baseline either way. */
.wc-next-body :deep(p) { margin: 0 !important; display: inline; }

.wc-next-who {
  margin-left: 0.4rem;
  color: var(--wc-muted);
  white-space: nowrap;
}
</style>
