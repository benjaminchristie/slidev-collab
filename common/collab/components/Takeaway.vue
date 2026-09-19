<!--
  Takeaway — the one sentence the slide is arguing for, set under the heading.

    ## Why the Estimator Is Unbiased

    <Takeaway>Bias vanishes once the sampling weights are known.</Takeaway>

  A slide whose takeaway cannot be written in one line is usually two slides.
  Under questioning this is also the line a committee will quote back, so it is
  worth writing before the bullets rather than after them.
-->
<template>
  <div class="collab-takeaway">
    <slot />
  </div>
</template>

<style scoped>
.collab-takeaway {
  margin: 0 0 1.25rem;
  padding: 0.65rem 0;
  border-top: 1px solid var(--color-light-gray);
  border-bottom: 1px solid var(--color-light-gray);
  font-size: 1.35rem;
  font-style: italic;
  line-height: 1.45;
  color: var(--color-emphasis);
}
.collab-takeaway :deep(p) { margin: 0 !important; }
</style>
