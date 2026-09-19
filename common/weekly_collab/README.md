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
```

`<Aside>` is for the thing you actually want a reaction to. Making it a callout
rather than one more bullet is the difference between it getting discussed and
it getting skipped.

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
