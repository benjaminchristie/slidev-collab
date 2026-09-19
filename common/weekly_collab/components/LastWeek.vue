<!--
  LastWeek — what was promised last week, and what happened to it.

    <LastWeek by="Mon" state="done">Rerun seeds 4-8 on the new reward</LastWeek>
    <LastWeek by="Thu" state="missed" who="Alex">Decide on demo collection</LastWeek>
    <LastWeek by="Wed" state="partial">Draft the ablation table</LastWeek>

  Deliberately the same shape as `<Next>`: the workflow is to paste last week's
  `<Next>` lines into this week's deck and add a `state` to each. A promise that
  is easy to check is a promise that gets kept.
-->
<template>
  <div class="wc-lastweek">
    <span class="wc-lastweek-mark" :class="`is-${state}`">{{ MARKS[state] }}</span>
    <span class="wc-lastweek-by">{{ by }}</span>
    <div class="wc-lastweek-body" :class="`is-${state}`">
      <slot />
      <span v-if="who" class="wc-lastweek-who">— {{ who }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  by: { type: String, default: '' },
  // 'done' | 'partial' | 'missed'
  state: { type: String, default: 'done' },
  who: { type: String, default: '' },
})

const MARKS = {
  done: '✓',
  partial: '–',
  missed: '✗',
}
</script>

<style scoped>
.wc-lastweek {
  display: grid;
  grid-template-columns: 1rem 4.2rem 1fr;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.3rem 0;
}

.wc-lastweek-mark {
  font-weight: 700;
  text-align: center;
}
.wc-lastweek-mark.is-done    { color: var(--wc-green); }
.wc-lastweek-mark.is-partial { color: var(--wc-orange); }
.wc-lastweek-mark.is-missed  { color: var(--wc-red); }

.wc-lastweek-by {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wc-muted);
  text-align: right;
}

.wc-lastweek-body { color: var(--wc-body); }
/* A kept promise is settled; it should recede next to the two that are not. */
.wc-lastweek-body.is-done { color: var(--wc-muted); }
.wc-lastweek-body :deep(p) { margin: 0 !important; display: inline; }

.wc-lastweek-who {
  margin-left: 0.4rem;
  color: var(--wc-muted);
  white-space: nowrap;
}
</style>
