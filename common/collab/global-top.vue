<!--
  global-top — the layer above every slide.

  Slidev renders four optional files on every slide: `global-top.vue` and
  `global-bottom.vue` outside the slide's own transition, and `slide-top.vue` /
  `slide-bottom.vue` inside it. The theme uses `global-bottom` for page numbers
  and this one for the deck player.

  A file of the same name in a *deck* folder replaces the theme's rather than
  adding to it. So a deck that wants its own global-top — a progress rail, a
  conference logo — should mount `<DeckPlayer />` in it as well, or it loses
  the play button. `examples/showcase/global-top.vue` does exactly that.

  DeckPlayer renders nothing at all until Shift+P is pressed.
-->
<template>
  <DeckPlayer />
</template>

<script setup>
// Imported by path rather than left to auto-import: components resolve by
// convention inside slides, and this file is not a slide.
import DeckPlayer from './components/DeckPlayer.vue'
</script>
