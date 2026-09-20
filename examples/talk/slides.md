---
theme: ./common/collab
title: "Example Talk"
transition: fade
---

# An Example Talk

<span class="text-lgray">Your Name</span>

<!--
This deck exists to show the `collab` theme's layouts. Run it with:

    ./present talk
-->

---
layout: split-bg
hideNumber: true
transition: slide-left
---

# Section<br>Divider

::right::

*One sentence saying what this section argues, with the <span class="text-[#2b81d5] font-bold">key idea</span> picked out.*

---
transition: slide-left
---

## A Two-Column Slide

<TwoColumn ratio="1fr 1fr">

Text on the left. The `TwoColumn` component takes a `ratio` matching
`grid-template-columns`.

- A point
- Another point

<template #right>

Content on the right goes in the `#right` template slot — a figure, a table, or
more prose.

</template>
</TwoColumn>

<Citation>Author, A. (2026). A paper this slide draws on.</Citation>

---
class: big-text
style: "--scale: 0.85"
transition: slide-left
---

_A single question, set large, to pivot the talk:<br>how should this actually work?_

---
transition: slide-up
---

## Staged Reveals

<v-clicks>

- Each bullet appears on its own click
- Because they are wrapped in `<v-clicks>`
- A hidden `v-click` parent reveals its whole subtree at once, so put the
  clicks on the children rather than on a wrapper

</v-clicks>
