<!--
  Status — a small inline pill for the state of a work item.

    <Status done />  <Status wip />  <Status blocked />  <Status ask />
    <Status wip label="rerunning" />
-->
<template>
  <span class="wc-status" :class="`is-${kind}`">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  done: { type: Boolean, default: false },
  wip: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  ask: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

const kind = computed(() =>
  props.done ? 'done' : props.blocked ? 'blocked' : props.ask ? 'ask' : 'wip',
)

const DEFAULTS = {
  done: 'done',
  wip: 'in progress',
  blocked: 'blocked',
  ask: 'need input',
}

const text = computed(() => props.label || DEFAULTS[kind.value])
</script>

<style scoped>
.wc-status {
  display: inline-block;
  vertical-align: 0.06em;
  margin-left: 0.35rem;
  padding: 0.05em 0.5em 0.1em;
  border-radius: 999px;
  font-size: 0.68em;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}
/* Custom properties cascade through the DOM, so a scoped block can still read
   the theme's palette — one source of truth for the colours. */
.is-done    { background: rgba(46, 139, 87, 0.13);  color: var(--wc-green); }
.is-wip     { background: rgba(42, 143, 189, 0.13); color: var(--wc-blue); }
.is-blocked { background: rgba(190, 60, 55, 0.12);  color: var(--wc-red); }
.is-ask     { background: rgba(235, 140, 0, 0.16);  color: var(--wc-orange); }
</style>
