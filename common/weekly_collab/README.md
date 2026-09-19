# weekly_collab

A Slidev theme for weekly research-update meetings, plus a starter deck. It is
deliberately plainer than `common/collab` (the formal talk theme):
these are working documents, read fast, and dense nested bullets have to stay
legible.

## Starting a new week

```bash
cp -r common/weekly_collab/template meetings/2026-10-06
$EDITOR meetings/2026-10-06/slides.md
```

Then run it the same way as any other deck in this repo:

```bash
./present 2026-10-06
```

`compose.slidev.yml` mounts `./common` read-only at `/app/common`, which is why
every deck's frontmatter says `theme: ./common/weekly_collab`. Both themes live
under `common/`; the formal-talk theme is `./common/collab`.

## Layouts

| `layout:`   | What it is                                                        |
|-------------|-------------------------------------------------------------------|
| *(none)*    | Heading plus top-aligned body. The one you want almost every time. |
| `cover`     | First slide. Takes `date:` and an optional `with:`.                |
| `two-cols`  | Heading, then `::left::` / `::right::`. The "last week / this week" slide. Takes an optional `ratio:`. |
| `figure`    | Heading, then `::figure::` artwork that fills the leftover height, then an optional `::caption::`. |
| `section`   | Centred statement. For "Appendix", "Discussion", dividers.         |

## Components

```
<Status done />  <Status wip />  <Status blocked />  <Status ask />
<Status wip label="rerunning" />

<Aside>Should we put the demo collection on hold?</Aside>
<Aside kind="decision">Submitting to ICRA, not RSS.</Aside>
<Aside kind="risk">ARC queue times could eat the whole week.</Aside>

<div class="wc-metrics">
  <Metric value="47%" label="success rate" delta="+16" />
  <Metric value="3.2 h" label="median run" delta="-0.8" good="down" />
</div>

<Legend :items="[['blue', 'ours'], ['muted', 'baseline']]" />
<Legend shape="dot" :items="[['orange', 'ablation']]" />

<Next by="Mon">Rerun seeds 4-8 on the new reward</Next>
<Next by="Thu" who="Alex">Decide whether demo collection continues</Next>

<LastWeek by="Mon" state="done">Rerun seeds 4-8</LastWeek>
<LastWeek by="Thu" state="missed" who="Alex">Decide on demo collection</LastWeek>

<Blocker since="6 days" who="Priya">Eval cluster queue times</Blocker>

<div>
<Runs :rows="[
  ['reward-v3', '8/8', 'done'],
  ['reward-v4', '3/8', 'wip'],
]" />
</div>
```

A component tag written across several lines is not a complete tag on its own
line, so markdown escapes it rather than handing it to Vue. Wrap those in a
plain `<div>`, as above. Anything that fits on one line needs no wrapper.

`<Aside>` is for the thing you actually want a reaction to. Making it a callout
rather than one more bullet is the difference between it getting discussed and
it getting skipped.

`<Metric>` is the same argument applied to a number. `good="down"` says which
direction counts as good news — a runtime wants to fall, a success rate wants to
rise — and the colour of the delta follows from that rather than from its sign.
A run of them goes in a `<div class="wc-metrics">`, which keeps them on one
line; a single metric can sit inside a bullet on its own.

`<Legend>` names the series in a figure at the deck's own type size, which is
both cheaper than a legend baked into the artwork and cheaper than giving one a
whole `.wc-figure-col`. It goes at the end of the `::figure::` slot. Colours are
the theme's five by name; anything else is passed through as a CSS colour, so a
swatch can match a hex the plotting script hard-coded.

`<Next>` puts the date in its own gutter, so that next week's deck can be read
against this week's commitments line by line. `<LastWeek>` is the same row with
a mark in front of it: paste last week's `<Next>` lines into this week's deck,
add `state="done" | "partial" | "missed"`, and the slide writes itself. Kept
promises grey out, so the eye lands on the two that did not happen.

`<Blocker>` is not `<Aside kind="risk">`. A risk might go wrong; a blocker
already has, and `since` is what gets it cleared — "blocked" gets nodded at,
"blocked 6 days" gets someone assigned.

`<Runs>` is the sweep table: `[name, progress, state]` per row, plus an optional
fourth note. A progress written as `3/8` also draws a bar, since the question in
the room is never the count, it is how much is left.

The starter deck in `template/slides.md` uses every layout and every component
once, so the fastest way to see what something looks like is to run it and
delete the slides you do not want.

## Type and colour

The theme uses the same Palatino stack and the same blue as
`common/collab`, so a weekly deck and a conference talk read as the
same lab — what separates them is density and alignment, not identity.

The orange is `rgb(235, 140, 0)`: just below true Collab orange
(`rgb(255, 153, 0)`), warm enough to carry but dark enough to hold against
white at body-text size. The formal theme goes darker still; these decks want
the warmer end. Both live as custom properties on `:root`, so changing
`--wc-orange` once updates the eyebrow, the column headings, `<Status ask>` and
`<Aside>` together.

## Images

Anything under the deck's own `public/` is served from the deck root, so a file
at `public/assets/plot.png` is `/assets/plot.png` in the markdown:

```
---
layout: figure
---

## Preliminary results

::figure::

<img src="/assets/plot.png" alt="Describe what the plot shows" />

::caption::

What the reader should take away from this plot.
```

The path is absolute — `/assets/...`, not `./assets/...` — and `public/` itself
is not part of it. The starter template ships a placeholder
`public/assets/example.png`; overwrite it with your own figure. A missing file
does not degrade quietly: Vite fails the import and the slide never renders.

## Conventions worth keeping

- **Content is top-aligned, never vertically centred.** A three-bullet slide and
  a twenty-bullet slide start at the same y, so flipping through a deck does not
  make the headings jump.
- **Never size anything in `vh`.** The Slidev canvas is a fixed 980×551 that gets
  scaled to the display; `vh` measures the browser window instead, so a deck
  authored on a laptop renders differently on a projector. Use `rem`, `px`, `%`,
  or — best — let the `figure` layout's flexbox do it.
- **If a slide overflows, split it.** There are `class: dense` and
  `class: x-dense` escape hatches in the frontmatter for when you genuinely
  cannot, but reaching for them twice in a deck means the deck wants another
  slide.
- **Three levels of nesting is the floor of legibility.** The theme styles a
  fourth, but nobody reads it.

## Importing more Google Slides decks

`tools/pptx_to_slidev.py` converts a folder of Google-Slides-exported `.pptx`
decks into Slidev markdown. Edit its `DECKS` table to map each file to a date,
then:

```bash
python3 common/weekly_collab/tools/pptx_to_slidev.py <dir-of-pptx> .
python3 common/weekly_collab/tools/fit_density.py 'meetings/*/slides.md'
```

`fit_density.py` is the second pass: it estimates how tall each slide's bullets
will render and adds `class: dense` or `class: x-dense` only where they would
otherwise overflow. It exists because an imported deck's slide breaks are part
of the record, so the type gets fitted to the slide rather than the slide split.
