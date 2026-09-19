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
  vertical-align: 0;
  margin-left: 0.35rem;
  /* All-caps text sits between the baseline and the cap height, so the line box
     leaves empty descender space below it and almost none above. Pin the line
     box to the text, then pay the difference back as padding: Palatino's cap
     height clears the ascender by 0.03em and its descender drops 0.28em, so the
     top needs ~0.24em more than the bottom for the label to look centred. */
  line-height: 1;
  padding: 0.44em 0.6em 0.2em;
  border-radius: 999px;
  font-size: 0.68em;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Where the browser can trim the box down to the cap height and the baseline
   itself (Chromium 133+, which is what Slidev previews and exports in), let it
   and split the padding evenly — that stays centred in any font, not just this
   one. Same overall pill height either way. */
@supports (text-box: trim-both cap alphabetic) {
  .wc-status {
    text-box: trim-both cap alphabetic;
    padding: 0.48em 0.6em;
  }
}

/* Custom properties cascade through the DOM, so a scoped block can still read
   the theme's palette — one source of truth for the colours. */
.is-done    { background: rgba(46, 139, 87, 0.13);  color: var(--wc-green); }
.is-wip     { background: rgba(42, 143, 189, 0.13); color: var(--wc-blue); }
.is-blocked { background: rgba(190, 60, 55, 0.12);  color: var(--wc-red); }
.is-ask     { background: rgba(235, 140, 0, 0.16);  color: var(--wc-orange); }
</style>
