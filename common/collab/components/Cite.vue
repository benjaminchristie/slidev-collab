<!--
  Cite — an inline marker pointing into the slide's `<Citation>` footer.

    Prior work solves the easy case <Cite n="1" />, but not the hard one
    <Cite n="2,3" />.

    <Citation>
    1. Author, A. (2026). The easy case.<br>
    2. Author, B. (2025). Nearly the hard case.
    </Citation>

  `<Citation>` is absolutely positioned, so a slide gets one of them with every
  reference inside it, not one per reference. The slot overrides the number when
  a talk cites by author and year instead: <Cite>Smith 2024</Cite>.
-->
<template>
  <sup class="collab-cite"><slot>{{ n }}</slot></sup>
</template>

<script setup>
defineProps({
  n: { type: [String, Number], default: '' },
})
</script>

<style scoped>
.collab-cite {
  margin-left: 0.1em;
  font-size: 0.62em;
  font-weight: 700;
  color: var(--color-emphasis);
  /* `vertical-align: super` compounds when a browser also shrinks the text;
     a fixed rise keeps every marker on the same line across a slide. */
  vertical-align: baseline;
  position: relative;
  top: -0.5em;
}
</style>
