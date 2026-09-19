<!--
  Backup — marks a slide as one you jump to when asked, not one you present.

    ---
    layout: default
    ---

    <Backup q="Why not a Kalman filter?" />

    ## Filter Comparison

  Put backup slides after the last slide of the talk and tag them: they stay
  reachable from the slide picker (press `o`), which is how you get to one when
  the question actually comes. Frontmatter `hide: true` removes a slide from
  navigation altogether, so use that only for slides you never want to reach.
-->
<template>
  <div class="collab-backup">
    <span class="collab-backup-tag">backup</span>
    <span v-if="q" class="collab-backup-q">{{ q }}</span>
  </div>
</template>

<script setup>
defineProps({
  // The question this slide exists to answer.
  q: { type: String, default: '' },
})
</script>

<style scoped>
.collab-backup {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 50;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  max-width: 60%;
  pointer-events: none;
}

.collab-backup-tag {
  flex: none;
  padding: 0.3em 0.6em 0.22em;
  border-radius: 999px;
  background: rgba(204, 112, 0, 0.14);
  color: var(--color-emphasis);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.collab-backup-q {
  font-size: 0.85rem;
  font-style: italic;
  color: var(--color-light-gray);
}
</style>
