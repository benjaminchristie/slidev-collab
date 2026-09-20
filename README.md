# slidev-collab

A ready-to-run [Slidev](https://sli.dev) setup for research talks and meetings.

```bash
git clone https://github.com/benjaminchristie/slidev-collab.git slides && cd slides
./present talk
```

That serves the example talk at <http://localhost:3030>, hot-reloading as you
edit `examples/talk/slides.md`. Once the server answers, two browser tabs open:
the deck, and the presenter view behind it. `./present my-talk --no-open` skips
them.

## Layout

```
examples/talk/              example deck using the formal theme
examples/weekly-update/     example deck using the meeting theme
examples/showcase/          everything Slidev can do, in one deck
common/collab/              formal-talk theme
common/weekly_collab/       weekly-update theme + starter template
compose.slidev.yml          dev server + batch renderer
present                     ./present <deck>
tools/export-all.sh         renders every deck to PDF
tools/open-when-ready.sh    waits for the server, then opens the browser
```

A "deck" is any directory containing a `slides.md`. Images live in that same
directory under `public/`, and are referenced from the deck root: a file at
`public/assets/plot.png` is `<img src="/assets/plot.png" />` in the markdown.

## Writing a deck

```bash
cp -r common/weekly_collab/template meetings/2026-10-06
./present 2026-10-06
```

Run `./present` with no arguments to list what it can see.

## Presenting

While the deck is open in a browser:

| Key             | What it does                                    |
|-----------------|-------------------------------------------------|
| `space` or `→`  | Next click step, or next slide                  |
| `←`             | One step back                                   |
| `↓` / `↑`       | Next / previous whole slide, skipping clicks    |
| `g`             | Go to a slide number                            |
| `o`             | Every slide at once; click one to jump there    |
| `f`             | Fullscreen                                      |
| `d`             | Dark mode                                       |

`./present <deck>` answers on more than one URL at `localhost:3030`, and opens
the first two for you:

| URL           | What it is                                            |
|---------------|-------------------------------------------------------|
| `/`           | The deck                                              |
| `/presenter`  | Notes, timer and next slide — keep this on your laptop |
| `/overview`   | Every slide on one scrollable page                    |
| `/notes-edit` | Every speaker note in the deck, editable in one place  |
| `/export`     | Render a PDF from the browser                         |

The presenter tab is opened second, so it is the one in front: that is the one
you drive from, and the deck tab is the one you drag onto the projector.

Speaker notes are HTML comments at the end of a slide; the audience never sees
them. Both example decks carry notes explaining the deck as you page through it
in presenter mode.

## Checking every deck builds

```bash
docker compose -f compose.slidev.yml run --rm export
docker compose -f compose.slidev.yml run --rm export meetings   # one folder
docker compose -f compose.slidev.yml run --rm export talk       # one deck
CLICKS=1 docker compose -f compose.slidev.yml run --rm export talk  # one page per click
```

## The two themes

**`common/collab`** — formal talks, job talks, defenses. Palatino, centred headings, layouts for section dividers (`split-bg`), full-bleed statements (`big-text`), and components for the claims slide (`Contribution`), the one-line argument of a slide (`Takeaway`), references (`Cite` / `Citation`), the plan (`Timeline`) and question-and-answer slides (`Backup`).

**`common/weekly_collab`** — weekly updates. Same typeface and palette so the two read as one group, but content is **top-aligned rather than centred**, so a three-bullet slide and a twenty-bullet slide start at the same y and headings do not jump as you page through. Three levels of bullet nesting stay legible. Layouts: `cover`, `two-cols`, `figure`, `section`. Components:

```
<Status done />  <Status wip />  <Status blocked />  <Status ask />
<Aside>The question you want answered in this meeting.</Aside>
<Aside kind="decision">Submitting to ICRA, not RSS.</Aside>
<Metric value="47%" label="success rate" delta="+16" />
<Blocker since="6 days" who="Priya">Eval cluster queue times</Blocker>
<Next by="Mon">Rerun seeds 4-8 on the new reward</Next>
<LastWeek by="Mon" state="done">Rerun seeds 4-8</LastWeek>
```

Plus `Legend` for the series in a figure and `Runs` for a sweep table.

See `common/weekly_collab/README.md` and `common/collab/README.md` for the full
reference. Each theme's example deck under `examples/` uses every layout and
component it ships.

## The showcase deck

```bash
./present showcase
```

`examples/showcase` is a third example, and a different kind of thing: thirty-four
slides of what Slidev can do when a slide is allowed to be a web page. Code that
morphs between versions and code you can edit and run, charts you can hover,
a results table you can re-sort from the stage, Mermaid, KaTeX, annotations you
drag into place, a two-link arm solving inverse kinematics, and three optimisers
arguing about a loss surface. Every slide names the feature it is demonstrating
in a badge at the top right.

Nothing was installed to build it — it runs on the same pinned Slidev in the
same container as the other two. It also shows how a deck extends `common/collab`
*locally*: ten components, four layouts and a stylesheet, all living next to its
own `slides.md` and none of them touching the shared theme.

Unlike the other two examples this one is not a template to copy wholesale.
Take the slide you want and the component under it. See
`examples/showcase/README.md`.

## Importing from Google Slides

`common/weekly_collab/tools/pptx_to_slidev.py` converts a folder of Google-Slides-exported `.pptx` files into Slidev markdown.
