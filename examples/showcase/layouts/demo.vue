<!--
  demo — the workhorse layout of this deck: a heading at the top, the demo
  filling everything under it, and a badge naming the Slidev feature the slide
  is showing.

    ---
    layout: demo
    feature: "Magic Move"
    syntax: "```md magic-move"
    grid: true
    ---

    ## Code That Rewrites Itself

  The badge is the reason this layout exists rather than being a class on
  `default`. Every demo slide in the deck names its feature in the same place,
  so the deck can be read as a reference: find the slide that looks like what
  you want, read the badge, search the Slidev docs for that phrase.

  `grid: true` turns on the faint dot background from `styles/index.css`, for
  slides whose demo is a floating object rather than a full-width panel.
-->
<template>
  <div
    class="slidev-layout sc-demo"
    :class="[$frontmatter?.class, { 'sc-grid': grid, 'sc-dark': dark }]"
    :style="$frontmatter?.style"
  >
    <div v-if="feature" class="sc-demo__badge">
      <span class="sc-demo__badge-name">{{ feature }}</span>
      <span v-if="syntax" class="sc-demo__badge-syntax">{{ syntax }}</span>
    </div>

    <!--
      The slot is wrapped rather than dropped straight in. The theme centres a
      slide by handing its first and last child an `auto` margin (section 9 of
      the theme stylesheet), and those rules carry `!important` — so with the
      markdown's blocks as direct children, they would beat any `mt-*` utility
      written in the slide. One wrapper absorbs both rules, and everything
      inside it is free to use ordinary margins again.
    -->
    <div class="sc-demo__body"><slot /></div>
  </div>
</template>

<script setup>
defineProps({
  // The name of the Slidev feature, as the docs spell it.
  feature: { type: String, default: '' },
  // The one-liner that turns it on. Shown in the mono stack under the name.
  syntax: { type: String, default: '' },
  grid: { type: Boolean, default: false },
  dark: { type: Boolean, default: false },
})
</script>

<style scoped>
.sc-demo {
  position: relative;
  padding: 1.7rem 3.2rem 2.6rem !important;
  justify-content: flex-start !important;
}

/* Beats `.slidev-layout > :nth-last-child(...)` on specificity, which is what
   stops the theme from centring this wrapper vertically. */
.sc-demo > .sc-demo__body {
  width: 100%;
  margin: 0 !important;
}

.sc-demo__badge {
  position: absolute;
  top: 1.25rem;
  right: 1.6rem;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  max-width: 45%;
  pointer-events: none;
}

.sc-demo__badge-name {
  padding: 0.28em 0.6em 0.22em;
  border-radius: 999px;
  background: rgba(204, 112, 0, 0.13);
  color: var(--sc-orange);
  font-family: var(--sc-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.sc-demo__badge-syntax {
  font-family: var(--sc-mono);
  font-size: 0.58rem;
  letter-spacing: -0.01em;
  color: var(--color-light-gray);
  white-space: nowrap;
}

.sc-dark .sc-demo__badge-name {
  background: rgba(240, 161, 46, 0.16);
  color: var(--sc-orange-lit);
}
.sc-dark .sc-demo__badge-syntax { color: rgba(201, 209, 222, 0.55); }

/* A demo slide gives its heading less room than a prose slide: the thing worth
   looking at is underneath it. */
.sc-demo :deep(h2) {
  font-size: 1.85rem !important;
  margin-bottom: 0.9rem !important;
  max-width: 78%;
}

.sc-demo :deep(h3) {
  font-size: 1.05rem !important;
  margin-bottom: 0.45rem !important;
}

/*
  The slide's own prose, and only that.

  `:deep()` compiles to a plain descendant selector, so a bare `:deep(p)` here
  reaches every paragraph on the slide — including the ones inside components,
  whose own sizes are set by a single class and therefore lose to a layout rule
  at (0,2,1) carrying `!important`. That is how the footnote under a chart and
  the legend inside the optimiser panel both ended up set at body size and
  pushed their slides out of shape.

  Every paragraph this deck's components own is `sc-`-prefixed, so excluding
  that prefix draws the line exactly where it belongs: markdown prose gets the
  layout's scale, components keep their own.
*/
.sc-demo :deep(p:not([class*="sc-"])) {
  font-size: 1.02rem !important;
  margin-bottom: 0.8rem !important;
}

.sc-demo :deep(ul) {
  margin-top: 0.3rem !important;
  margin-bottom: 0.6rem !important;
  padding-left: 1.6rem !important;
}
.sc-demo :deep(ul li) {
  font-size: 1rem !important;
  line-height: 1.55 !important;
  margin-bottom: 0.3rem !important;
}
</style>
