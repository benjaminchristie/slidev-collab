# `collab` — the formal-talk theme

For conference talks, job talks and defenses. Same Palatino stack and same blue
as `common/weekly_collab`, so the two read as one lab; what separates them is
that this theme is airier, centres its title slides, and numbers its pages.

Decks say `theme: ./common/collab` in their frontmatter — see
`examples/talk/slides.md`, which uses every layout and component below.

## Layouts

| `layout:`         | What it is                                                  |
|-------------------|-------------------------------------------------------------|
| *(none)*          | Heading plus body. Takes `class:` and `style:` frontmatter.  |
| `cover`           | Centred title slide. Page numbers skip it.                  |
| `branded-cover`   | Dark title slide. Takes `author:` and `date:`.              |
| `center-statement`| One line, set large and centred.                            |
| `split-bg`        | Two full-bleed halves, white and grey, via a `#right` slot. |
| `text-eq`         | Prose left, boxed equation right.                           |

Page numbers come from `global-bottom.vue`, which skips cover layouts and any
slide with `hideNumber: true` in its frontmatter.

## Components

```
<AgendaOutline :items="['Setup', 'Method', 'Results']" :current="1" />

<Contribution n="1" title="An unbiased estimator">
Removes the correction step that earlier work needed.
</Contribution>

<Takeaway>Bias vanishes once the sampling weights are known.</Takeaway>

The easy case was already solved <Cite n="1" />, the hard one was not <Cite n="2,3" />.

<Citation>
1. Author, A. (2026). The easy case.<br>
2. Author, B. (2025). Nearly the hard case.
</Citation>

<Status done />  <Status wip />  <Status blocked />  <Status ask />

<Highlight color="orange">A point worth boxing.</Highlight>

<FigureCaption src="/assets/plot.png" caption="What to take away." />

<TwoColumn ratio="2fr 1fr">Left<template #right>Right</template></TwoColumn>

<Backup q="Why not a Kalman filter?" />

<div>
<Timeline :items="[
  ['2025 Q3', 'Estimator and proofs', 'done'],
  ['2025 Q4', 'Robot experiments', 'now'],
  ['2026 Q1', 'Writing and defense', 'todo'],
]" />
</div>
```

A component tag written across several lines is not a complete tag on its own
line, so markdown escapes it rather than handing it to Vue. Wrap those in a
plain `<div>`, as above. Anything that fits on one line needs no wrapper.

`<Takeaway>` is the sentence the slide argues for, set under the heading. A
slide whose takeaway will not fit on one line is usually two slides, and under
questioning this is the line that gets quoted back at you.

`<Contribution>` is for the claims slide, and then again, word for word, for the
closing slide. A committee should hear each claim twice: once as a promise, once
as a receipt.

`<Cite>` marks a reference inline; `<Citation>` is the footer it points into.
`<Citation>` is absolutely positioned, so a slide gets one of them with every
reference inside it rather than one per reference.

`<Backup>` tags a slide as one you jump to when asked. Keep backup slides after
the last slide of the talk: they stay reachable from the slide picker (`o`),
which is how you find one mid-question. Frontmatter `hide: true` removes a slide
from navigation entirely, which is the opposite of what a backup slide is for.

`<Timeline>` is for proposals and defenses, where the question is where the work
sits against the plan. Three to five stops; past that it is a Gantt chart, and
nobody reads a Gantt chart on a slide.

`<Status>` is the weekly theme's pill, ported here for roadmap and future-work
slides. It uses this theme's palette, which needed two ink colours the talk
theme did not have: `--color-green-deep` and `--color-red`, both matching the
weekly theme so that a status means one colour across both decks.
