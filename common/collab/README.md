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

<div>
<LiveChart
  :series="[
    { name: 'ours', color: 'var(--color-emphasis)', data: [...], sem: [...] },
    { name: 'baseline', color: 'var(--color-blue)', data: [...], lo: [...], hi: [...] },
    { name: 'oracle', color: 'var(--color-green)', data: [...], dashed: true },
  ]"
  :x="[0, 1.5, 3]" :ticks="[0, 2, 4]"
  x-label="Hours of Interaction Data" y-label="Success Rate (%)" unit="%"
  :min="20" :max="80" :reveal="$clicks + 1"
  :animate="$renderContext !== 'print'" />
</div>

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

`<LiveChart>` is a plotted figure that stays a figure: hovering it reads out x
and every visible series at that x, mean and cloud together, which is the
question that actually gets asked in a defense. A series is `{ name, color,
data }` plus `sem`, or `lo`/`hi`, for the shaded band, and `dashed: true` for a
baseline — which the legend draws dashed too, because each key is the line
itself rather than a coloured block. `reveal` is how many series to draw, so `$clicks + 1` walks them onto
the slide in the order the work happened; pin `min` and `max` when you do that,
or the axis moves under the curves already on screen.

Curves draw themselves in by sweeping a clip from the left edge of the plot,
which is why a series' cloud arrives piece by piece alongside its mean rather
than appearing whole, and why a dashed baseline draws in like everything else.

Points sit at their real `x` value. `scale` replaces that with knots —
`[[value, position], ...]` — for a broken axis, and `axis-break` draws the mark
that says the axis is broken. `sync` gives two charts one crosshair, which is
what makes a two-panel figure read as one figure.

Every reading in the legend carries a spread, `41.2 ± 2.6%`, including the
baselines whose spread is zero — a ragged column of readings is what makes a
legend look broken, and a constant really is a value with no spread. The keys
are laid out on a grid of equal columns for the same reason.

Two props exist because a chart on a slide is not a chart on a page.
`font-size` (15px by default) sets the tick type and everything else scales
off it; `legend-size` sets the series names, 1.3x that by default, because the
names are the one thing on a figure that has to carry to the back of the room.
Both are sized for a room rather than a laptop, and worth raising further for
a small figure in a wide column.

The chart measures its own text rather than estimating it, so the y margin and
the number of legend columns come out right whichever serif the machine
actually has — and where a wider face would cost the legend an extra row, it
gives up to 15% of its type size instead, so a figure occupies the same height
on any machine. All of it is laid out in the slide's own coordinates, so none
of it changes with the screen it is projected onto. `delay` is how long the
chart waits, after it is genuinely on screen, before the curves draw
themselves in; the default 450ms lets a slide transition or a click reveal
finish first, so the drawing is not spent behind something the audience cannot
see yet. Step back behind the click and it will play again.

Keep the numbers out of the slide. A figure used more than once, or with more
than a handful of points, is worth a small wrapper in the deck's own
`components/` folder that holds the data and names the figure — the slide then
says only which figure it wants, and the same wrapper can serve a build and its
payoff through `reveal`.

`<Timeline>` is for proposals and defenses, where the question is where the work
sits against the plan. Three to five stops; past that it is a Gantt chart, and
nobody reads a Gantt chart on a slide.

`<Status>` is the weekly theme's pill, ported here for roadmap and future-work
slides. It uses this theme's palette, which needed two ink colours the talk
theme did not have: `--color-green-deep` and `--color-red`, both matching the
weekly theme so that a status means one colour across both decks.
