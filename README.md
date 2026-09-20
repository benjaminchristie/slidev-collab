# slidev-collab

A ready-to-run [Slidev](https://sli.dev) setup for research talks and meetings.

```bash
git clone <this-repo> slides && cd slides
./present talk
```

That serves the example talk at <http://localhost:3030>, hot-reloading as you
edit `examples/talk/slides.md`.

## Layout

```
examples/talk/              example deck using the formal theme
examples/weekly-update/     example deck using the meeting theme
examples/showcase/          the deep end: what a slide can do as a web page
common/collab/              formal-talk theme
common/weekly_collab/       weekly-update theme + starter template
compose.slidev.yml          dev server + batch renderer
present                     ./present <deck>
record                      ./record <deck>  -> build/<deck>.mp4
tools/export-all.sh         renders every deck to PDF
tools/record-video.sh       plays a deck and records it as video
tools/timeline.mjs          how long a deck runs, without recording it
```

A "deck" is any directory containing a `slides.md`.

## Writing a deck

```bash
cp -r common/weekly_collab/template meetings/2026-10-06
./present 2026-10-06
```

Run `./present` with no arguments to list what it can see.

## Checking every deck builds

```bash
docker compose -f compose.slidev.yml run --rm export
docker compose -f compose.slidev.yml run --rm export meetings   # one folder
docker compose -f compose.slidev.yml run --rm export talk       # one deck
CLICKS=1 docker compose -f compose.slidev.yml run --rm export talk  # one page per click
```

## Rendering a deck as a video

```bash
./record talk                          # -> build/talk.mp4
./record talk --dwell 6                # six seconds on each click step
./record talk --width 2560 --height 1440
```

The deck is played in a headless browser and the screen is recorded, so click
animations, slide transitions and embedded video all survive into the file —
which a slideshow assembled from stills would not. It runs in real time,
waits for each step's animations to finish and then holds `--dwell` seconds on
the settled slide, stopping when a keypress no longer changes anything. A
slide can set its own hold in frontmatter with `dwell: 14`, or give its click
steps different holds with a list — `dwell: [3, 7, 5, 4]`, entry 0 being the
slide before any click, the last entry repeating if the build runs on past the
end of the list.

Three cheaper ways to answer "how long is it?", since a recording costs exactly
as long as the video plus an encode:

```bash
node tools/timeline.mjs talk      # instant: sums the dwells, no browser
./record talk --preview           # real time, no capture and no encode
```

and **`Shift+P` on the deck itself**, which plays it through at its own dwell
times with a clock in the corner. That last one is `<DeckPlayer />`, mounted by
the theme's `global-top.vue`; a deck that writes its own `global-top.vue`
replaces the theme's and has to mount the component itself.

Fonts come from your machine: `./record` mounts `~/.fonts` and
`~/.local/share/fonts` read-only and reports any family the deck asks for that
fontconfig had to substitute.

The export image gains ffmpeg and Google Chrome for this (`Dockerfile.export`);
Chrome because Playwright's bundled Chromium has no H.264 decoder, so a slide
playing an `.mp4` would otherwise record as a black rectangle. The build fails
if Chrome did not install, rather than leaving you to find out in the video.
Ask an image you already have with `./record --check`. A recording of a deck
that has `.mp4` in it also refuses to start without Chrome, rather than
spending ten minutes producing black rectangles — `--allow-chromium` if you
want it anyway. If it predates this,
rebuild: `docker compose -f compose.slidev.yml build export`.

There is no audio track. Record narration separately and mux it in with ffmpeg.

## The two themes

**`common/collab`** — formal talks. Palatino, centred headings, layouts for section dividers (`split-bg`), full-bleed statements (`big-text`), and a `TwoColumn` component. Also `<LiveChart>` for figures that stay figures, `<MathMove>` for a derivation whose terms fly from one line to the next, and `<DeckPlayer>` for the play button above.

**`common/weekly_collab`** — weekly updates. Same typeface and palette so the two read as one group, but content is **top-aligned rather than centred**, so a three-bullet slide and a twenty-bullet slide start at the same y and headings do not jump as you page through. Three levels of bullet nesting stay legible. Layouts: `cover`, `two-cols`, `figure`, `section`. Components:

```
<Status done />  <Status wip />  <Status blocked />  <Status ask />
<Aside>The question you want answered in this meeting.</Aside>
<Aside kind="decision">Submitting to ICRA, not RSS.</Aside>
```

See `common/weekly_collab/README.md` for the full reference.

## Importing from Google Slides

`common/weekly_collab/tools/pptx_to_slidev.py` converts a folder of Google-Slides-exported `.pptx` files into Slidev markdown.
