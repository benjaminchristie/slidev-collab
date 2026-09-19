<!--
  Aside — a callout for a question to raise or a decision to make in the
  meeting. It is the thing you actually want a reaction to, so it gets a rule
  and a colour rather than becoming one more bullet.

    <Aside>Should we put the demo collection on hold?</Aside>
    <Aside kind="decision">Submitting to ICRA, not RSS.</Aside>
    <Aside kind="risk">ARC queue times could eat the whole week.</Aside>
-->
<template>
  <div class="wc-aside" :class="`is-${kind}`">
    <span class="wc-aside-tag">{{ kind }}</span>
    <div class="wc-aside-body"><slot /></div>
  </div>
</template>

<script setup>
defineProps({
  // 'question' | 'decision' | 'risk'
  kind: { type: String, default: 'question' },
})
</script>
