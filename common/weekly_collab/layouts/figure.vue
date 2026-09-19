<!--
  figure — heading, then artwork that expands to fill whatever vertical space
  the heading leaves over, plus an optional caption.

    ---
    layout: figure
    ---

    ## Preliminary results
    ::figure::
    <img src="/assets/image1.png" alt="..." />
    ::caption::
    Point-mass play environment, three seeds.

  The artwork is sized by flexbox against the fixed 980x551 canvas rather than
  by a hard pixel height, so it renders identically on a laptop and a projector.
-->
<template>
  <div class="slidev-layout figure">
    <slot />
    <div class="wc-figure"><slot name="figure" /></div>
    <div class="wc-figure-caption"><slot name="caption" /></div>
  </div>
</template>
