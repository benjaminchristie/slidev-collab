<!--
  Blocker — what is stuck, how long it has been stuck, and who can unstick it.

    <Blocker since="6 days" who="Priya">Eval cluster queue times</Blocker>
    <Blocker since="since Tuesday">Waiting on the licence renewal</Blocker>

  This is not `<Aside kind="risk">`: a risk is something that might go wrong,
  a blocker already has. The age is the part that moves things — "blocked"
  gets nodded at, "blocked six days" gets someone assigned to it.
-->
<template>
  <div class="wc-blocker">
    <span class="wc-blocker-tag">blocked</span>
    <div class="wc-blocker-body">
      <slot />
    </div>
    <span v-if="meta" class="wc-blocker-meta">{{ meta }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // How long it has been stuck: "6 days", "since Tuesday".
  since: { type: String, default: '' },
  // Who can clear it. Leave unset when that is the open question.
  who: { type: String, default: '' },
})

const meta = computed(() =>
  [props.since, props.who && `needs ${props.who}`].filter(Boolean).join(' · '),
)
</script>

<style scoped>
.wc-blocker {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0.55rem 0;
  padding: 0.45rem 0.7rem;
  border-left: 3px solid currentColor;
  border-radius: 0 4px 4px 0;
  font-size: 0.95em;
  color: var(--wc-red);
  background: rgba(190, 60, 55, 0.06);
}

.wc-blocker-tag {
  flex: none;
  font-size: 0.7em;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wc-blocker-body {
  flex: 1 1 auto;
  color: var(--wc-body);
}
.wc-blocker-body :deep(p) { margin: 0 !important; }

/* Pushed to the far end rather than run into the sentence, so that a column of
   blockers can be read for its ages alone. */
.wc-blocker-meta {
  flex: none;
  font-size: 0.8em;
  font-weight: 700;
  color: var(--wc-red);
  white-space: nowrap;
}
</style>
