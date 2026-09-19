<!--
  two-cols — heading, then two columns: the canonical "last week / this week".

    ---
    layout: two-cols
    ratio: "1fr 1fr"          # optional; any grid-template-columns value
    ---

    ## Distances
    ::left::
    ### Last week
    - ...
    ::right::
    ### This week
    - ...

  The heading goes in the default slot, before the first `::marker::`.
-->
<template>
  <div class="slidev-layout two-cols">
    <slot />
    <div class="wc-cols" :style="{ gridTemplateColumns: ratio }">
      <div class="wc-col"><slot name="left" /></div>
      <div class="wc-col"><slot name="right" /></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ratio: { type: String, default: '1fr 1fr' },
})
</script>
