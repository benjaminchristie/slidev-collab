# `showcase` — the deep-end example deck

```bash
./present showcase
```

Thirty-nine slides of what Slidev can do when a slide is allowed to be a web
page: click-driven animation, code that morphs and code that runs, live charts,
a sortable results table, Mermaid, KaTeX, draggable annotations, a two-link arm
solving inverse kinematics, and three optimisers arguing about a loss surface.

The deep end of the deep end is the last four: a derivation whose terms fly from
one line to the next, that same loss surface standing up in three dimensions
with no 3D library under it, two double pendulums coming apart from a millionth
of a radian, and a chart that reads your results file instead of a pasted
array.

Every slide names the feature it is demonstrating in the badge at the top
right, so the deck doubles as an index: find the slide that looks like what you
want, read the badge, then read the file it points at.

Unlike the other two examples, **this one is not a template to copy wholesale**.
Copy the slide you want and the component under it.

## What makes it work

Nothing was installed. Everything here runs on the same pinned Slidev
(`52.19.0`) in the same container as `examples/talk` and
`examples/weekly-update`, and the export container renders all of it unchanged.

The deck uses `theme: ./common/collab` and then extends it **locally**, without
touching the shared theme. Slidev looks in the deck folder first and falls back
to the theme, so a folder next to `slides.md` is the whole mechanism:

```
examples/showcase/
├── slides.md
├── global-top.vue        progress rail, drawn above every slide
├── components/           13 components, auto-imported by filename
├── layouts/              4 layouts, usable as `layout:` in frontmatter
├── styles/               index.ts, which loads index.css
├── composables/          the shared animation-loop helper
├── snippets/             code pulled onto a slide by `<<<`
├── pages/appendix.md     slides pulled in by `src:`
├── public/assets/        images, served from the deck root as `/assets/...`
└── public/runs.csv       results, fetched by a slide at render time
```

Two notes on that:

- The theme ships `global-bottom.vue` for page numbers. A file of the same name
  here would **replace** it rather than add to it, which is why the progress
  rail uses `global-top.vue`.
- The theme also ships a `global-top.vue`, holding `<DeckPlayer />` — so this
  deck's own `global-top.vue` took the play button away the day it was written,
  and has to mount the component itself to get it back. "Replaces rather than
  adds" cuts both ways: before taking a global layer, check what the theme had
  in it.
- The deck's own styles are `styles/index.ts`, a one-line module that imports
  `styles/index.css`. The rules are kept as plain CSS so another deck can copy
  that one file; `index.ts` is the filename Slidev's directory layout names for
  a project's styles. If the deck ever renders unstyled, that pair is the first
  thing to check.

## Layouts

| `layout:`  | What it is                                                          |
|------------|---------------------------------------------------------------------|
| `hero`     | Dark title slide with an animated particle field. Takes `kicker:`, `author:`, `date:`. |
| `chapter`  | Dark section divider with a large ghost numeral. Takes `n:` and `sub:`. |
| `demo`     | The workhorse: heading at the top, demo below, feature badge at the top right. Takes `feature:`, `syntax:`, `grid:`, `dark:`. |
| `full`     | No padding at all, for a demo that fills the frame. Takes `title:`, `caption:`, `dark:`. |

`demo` wraps its slot in one element on purpose. The theme centres a slide by
giving its first and last child an `!important` auto margin, and with the
markdown's blocks as direct children those rules beat any `mt-*` utility
written in the slide. The wrapper absorbs them, and the slide gets its margins
back.

## Components

```
<ParticleField :count="70" :link-distance="140" dark />

<Terminal :step="$clicks" :typing="$renderContext !== 'print'"
          :rows="9" :lines="[['cmd', './present showcase'], ['ok', 'ready']]" />

<!-- LiveChart lives in the theme, not this deck: common/collab/components -->
<LiveChart :series="[{ name: 'ours', color: '#cc7000', data: [...], sem: [...] }]"
           :x="[...]" :reveal="$clicks + 1" unit="%" x-unit="k" />

<StatCard :value="75.6" unit="%" :decimals="1" label="success rate"
          :delta="18.8" :spark="[34, 44, 52, 59, 64, 71, 76]" />

<SortableTable :columns="[...]" :rows="[...]" sort="success" highlight="ours" />

<OptimizerLab />
<RobotArm />
<CodePlayground />

<Landscape3D />
<Chaos />

<RunsFromFile src="/runs.csv" :dashed="['oracle']" :reveal="$clicks + 1"
              x-label="Hours of Interaction Data" unit="%" />

<!-- MathMove and DeckPlayer live in the theme: common/collab/components -->
<MathMove :step="$clicks" :animate="$renderContext !== 'print'">...</MathMove>

<TiltCard eyebrow="01" title="Hot reload" accent="var(--sc-blue)">Body text.</TiltCard>

<Marker :show="$clicks > 0">a phrase</Marker>
<Marker kind="highlight" :show="$clicks > 1">or this one</Marker>
<Marker kind="strike" :show="$clicks > 2">not this one</Marker>
```

A component tag written across several lines is not a complete tag on its own
line, so markdown escapes it rather than handing it to Vue. Wrap those in a
plain `<div>`, the same as in the other decks.

### How they are driven

None of the components import anything from Slidev. The markdown passes the
state in as props, using Slidev's template globals:

- `:step="$clicks"`, `:reveal="$clicks + 1"` — the click counter on this slide.
  A slide whose animation comes from `$clicks` rather than from a `v-click`
  directive also needs `clicks: N` in its frontmatter, or Slidev does not know
  how far it goes.
- `:animate="$renderContext !== 'print'"`, `:typing="..."` — off while the PDF
  exporter is rendering, because Playwright screenshots a slide whenever it is
  ready and would otherwise catch a half-typed command or a half-drawn curve.

That split is what makes the components reusable: the markdown decides *when*,
the component only knows *how*.

### `composables/useRaf.js`

Every animated component gets its loop from here, and the loop only runs while
its element is on screen.

Slidev keeps more than one slide mounted at a time — the current one and the
neighbours it preloads — so a `requestAnimationFrame` loop started in
`onMounted` keeps painting long after its slide has gone, and a deck with five
animated slides ends up running five loops on the projector at once. An
`IntersectionObserver` on the component's own element fixes it without needing
anything from Slidev, and covers the cases Slidev knows nothing about: a
background tab, or the deck scrolled out of view in `/overview`.

It also paints one frame before the loop starts, so a component still looks
right under `prefers-reduced-motion` and in the PDF, where the loop never runs.

## Things worth knowing before you copy from here

- **Keyboard events in an editable component must be stopped at the element.**
  Slidev listens on the document for the arrow keys; without `@keydown.stop`,
  typing a comma in `CodePlayground` would advance the slide.
- **The drag directive writes back to disk.** Drag a callout on the annotations
  slide in the browser and its coordinates in `slides.md` change as you drag.
  That only happens on the dev server — an export renders whatever the file
  says. The plugin behind it scans a slide's rendered text for the directive's
  name and needs the token's source line to write back to, so writing the name
  as running text inside a markdown table crashes the build: inline tokens in a
  table cell carry no source map. Name it outside a table.
- **A layout's `:deep(p)` reaches inside every component on the slide.**
  `:deep()` compiles to a plain descendant selector, and a layout rule at
  (0,2,1) with `!important` outranks the single class a component uses to size
  its own text. The `demo` layout writes `:deep(p:not([class*="sc-"]))` so
  markdown prose gets the layout's scale and components keep theirs.
- **Draggable elements need a double-click, not a click.** A single click
  leaves them alone so they can hold links and buttons; double-clicking puts
  one into edit mode and shows the handles. Click away or press Escape to
  leave.
- **`defineProps()` is hoisted out of `setup()`.** Its defaults cannot reference
  anything declared in the setup scope, so a component with built-in fallback
  data (`CodePlayground`) resolves it in a `computed` rather than in
  `default: () => ...`.
- **A `---` inside a fenced code block is best avoided.** Slides in this deck
  show frontmatter as YAML fragments without the delimiter lines for that
  reason.
- **Do not add packages.** Icon components (`<carbon-x />`), Monaco editors and
  web fonts all want something the offline container does not have. Everything
  in this deck is inline SVG, the bundled KaTeX/Mermaid/Shiki, and CSS.

## Promoting something out of here

If a component turns out to be useful in a third deck, it has earned a place in
`common/collab/components/`, and then it belongs to every talk the lab gives.
Two decks is a coincidence.

`MathMove` and `DeckPlayer` went that way. Both were written for one video
deck, both turned out to be about presenting rather than about that talk, and
both now live in the theme — which is why the slides here that demonstrate them
point at `common/collab/components/` rather than at this folder. The three
heaviest components in this deck have not earned it: `Landscape3D`, `Chaos` and
`OptimizerLab` are arguments about one specific thing, and a shared theme is
not where an argument belongs.
