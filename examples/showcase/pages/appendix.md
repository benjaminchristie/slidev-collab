<!--
  Slides in their own file, pulled into the deck by

      src: ./pages/appendix.md

  in slides.md. Everything in here is an ordinary slide: the same frontmatter,
  the same components, the same `---` separators. What changes is that it can
  be edited, reviewed and reused on its own — a shared appendix that three
  decks import beats three copies of it that have quietly diverged.

  The importing slide's frontmatter is merged into the first slide below, which
  is why that one does not repeat `layout`.
-->

<Backup q="How big does this get before it is slow?" />

## Size and Speed

<div class="sc-grid-2 mt-2">
  <div class="sc-card"><div class="sc-card__title">What is cheap</div><div class="sc-card__body">Text, KaTeX, SVG, Shiki blocks. A two-hundred-slide deck of these opens as fast as a ten-slide one — Slidev only mounts the slides around the current one.</div></div>
  <div class="sc-card"><div class="sc-card__title">What is not</div><div class="sc-card__body">Full-bleed images at camera resolution, and animation loops that keep running off screen. The first is fixed by resizing before committing; the second by the IntersectionObserver in <code>composables/useRaf.js</code>.</div></div>
</div>

<div class="sc-note mt-4">

Rule of thumb from this deck: everything here renders in well under a frame
except the loss surface, which is computed once per resize and then blitted.
If a slide ever feels heavy, it is almost always a loop that nobody stopped.

</div>

<!--
Backup slides sit after the last slide of the talk and stay reachable from the
slide picker — press `o`. Tag each one with the question it answers.
-->

---
layout: default
---

<Backup q="Can I use this deck's components in my own?" />

## Taking Pieces of This

Everything in `examples/showcase/` is deck-local: `components/`, `layouts/`,
`styles/` and `composables/` live next to `slides.md` and are loaded because
they are there, not because anything registers them.

<div class="sc-grid-2 mt-3">
  <div class="sc-card"><div class="sc-card__title">One component</div><div class="sc-card__body">Copy the <code>.vue</code> file into your own deck's <code>components/</code>. If it imports from <code>../composables/</code>, take that too. Nothing else is needed.</div></div>
  <div class="sc-card"><div class="sc-card__title">The whole look</div><div class="sc-card__body">Copy <code>styles/index.css</code> as well: the <code>sc-</code> classes the components reach for — buttons, ranges, cards — are defined there rather than in each component.</div></div>
</div>

<div class="sc-note mt-4">

If a component turns out to be useful in three decks, it has earned its way
into `common/collab/components/` — and then it belongs to every talk the lab
gives, which is a higher bar than belonging to this one.

</div>
