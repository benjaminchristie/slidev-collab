<!--
  default — every ordinary update slide.

  The slot is rendered straight into the flex column, so anything the markdown
  emits is a direct child of `.slidev-layout`. That is what lets a
  `<div class="wc-figure">` or `<div class="wc-cols">` written inline in the
  markdown claim the leftover vertical space with `flex: 1`.

  All styling lives in styles/index.css rather than in a scoped block here:
  slot content is compiled in the parent's scope, so a layout's scoped styles
  would not reach the markdown it wraps.
-->
<template>
  <div class="slidev-layout default">
    <slot />
  </div>
</template>
