---
theme: ./common/collab
title: "Example Talk"
transition: fade
---

# An Example Talk

<span class="text-lgray">Your Name</span>

<!--
This deck exists to show the `collab` theme's layouts and components. Run it
with:

    ./present talk

New to Slidev: `f` is fullscreen, `o` shows every slide at once, `g` jumps to a
slide number. The two slides at the end list the rest, along with the URLs this
server answers on. What you are reading is a speaker note — the audience never
sees it. Open http://localhost:3030/presenter to read notes while you talk.
-->

---
layout: branded-cover
author: "Your Name"
date: "1 January 2026"
---

# The Same Talk,<br>Dark Title Slide

<!--
`branded-cover` is the alternative to the plain `cover` above: it takes
`author:` and `date:` and renders them as its footer. Keep one of the two.
-->

---
transition: slide-left
---

## Agenda

<AgendaOutline :items="['Setup', 'Method', 'Results', 'What is next']" :current="1" />

<!--
Bump `:current` on each copy of this slide to walk the agenda through the talk.
Presenter mode (http://localhost:3030/presenter) shows the next slide beside the
current one, so you can see what you are walking into.
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

## Contributions

<Contribution n="1" title="An unbiased estimator">
Removes the correction step that earlier work needed.
</Contribution>

<Contribution n="2" title="A tractable bound">
Holds without assuming the sampling weights are known.
</Contribution>

<Contribution n="3" title="Evidence on hardware">
Six tasks, three of them outside the training distribution.
</Contribution>

<!--
Say these three in the same words on the closing slide. A committee should hear
each claim twice: once as a promise, once as a receipt.

`o` opens the overview: a grid of every slide, click one to go there. Under
questioning that is usually faster than remembering a slide number.
-->

---
transition: slide-left
---

## What the Bound Buys You

<Takeaway>Bias vanishes once the sampling weights are known.</Takeaway>

- The easy case was already solved <Cite n="1" />
- The hard case was not, for reasons that turn out to be fixable <Cite n="2,3" />
- What changes if you are wrong about the weights

<Citation>
1. Author, A. (2026). The easy case.<br>
2. Author, B. (2025). Nearly the hard case.<br>
3. Author, C. (2024). Why the weights matter.
</Citation>

<!--
The deck reloads as you save the markdown, so a reference you fix five minutes
before the talk is live without restarting anything.
-->

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

<!--
`d` toggles dark mode. Check what your figures look like in it before a room
forces the question on you.
-->

---
transition: slide-left
---

## A Figure With a Caption

<FigureCaption src="/assets/example.png" caption="What the plot shows." />

---
layout: text-eq
---

## The Estimator

- What the estimator does, in one line
- Why the correction term earlier work needed vanishes here

::right::

$$
\hat{\theta} = \frac{1}{n} \sum_{i=1}^{n} w_i \, f(x_i)
$$

---
layout: center-statement
---

The result holds without knowing the weights.

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

<!--
This is the slide where the arrow keys differ: `→` and `←` step through the
clicks one bullet at a time, while `↓` and `↑` jump over the whole slide. Both
are useful — stepping to present, jumping to get somewhere.
-->

---
transition: slide-up
---

## Where This Goes Next

- Real-robot transfer <Status wip />
- Ablation on the reward shaping <Status done />
- A third baseline, once the queue clears <Status blocked />

<Highlight color="orange">

`Status` is the weekly theme's pill, ported here for roadmap and future-work
slides so that the two decks say the same thing the same way.

</Highlight>

---
transition: slide-up
---

## Plan to Defense

<div>
<Timeline :items="[
  ['2025 Q3', 'Estimator and proofs', 'done'],
  ['2025 Q4', 'Robot experiments', 'now'],
  ['2026 Q1', 'Writing and defense', 'todo'],
]" />
</div>

Three to five stops. A component tag written across several lines needs the
plain `<div>` around it, or markdown escapes the tag instead of rendering it.

<!--
To hand a committee a PDF:

    docker compose -f compose.slidev.yml run --rm export talk

It lands in build/talk.pdf. CLICKS=1 in front of the command gives one page per
click step instead of one per slide.
-->

---
transition: slide-up
---

## Driving Slidev

<TwoColumn ratio="1fr 1fr">

### Moving

- `space` or `→` — next click or slide
- `←` — one step back
- `↓` / `↑` — whole slide, skipping clicks
- `g` — go to a slide number
- `o` — every slide at once

<template #right>

### While presenting

- `f` — fullscreen
- `d` — dark mode
- The same keys work in presenter mode
- None of it needs the mouse

</template>
</TwoColumn>

<!--
Left and right move by click step, up and down by whole slide. On a deck with no
click animations they behave identically, which is why the difference only shows
up on a slide like the staged-reveal one earlier.
-->

---
transition: slide-up
---

## URLs and PDFs

`./present talk` serves the deck at `localhost:3030`:

- `/` — the deck
- `/presenter` — notes, timer and next slide; keep this on your laptop
- `/overview` — every slide on one scrollable page
- `/notes-edit` — edit every speaker note in one place
- `/export` — render a PDF from the browser

<Highlight color="orange">

The server runs with `--remote` and no password, so anyone who can reach port
3030 can open `/presenter`. Fine on your own laptop, worth knowing on conference
wifi.

</Highlight>

<!--
From the command line instead of /export:

    docker compose -f compose.slidev.yml run --rm export talk
    CLICKS=1 docker compose -f compose.slidev.yml run --rm export talk

PDFs land in build/, one per deck plus build/all-decks.pdf with every deck
concatenated. Naming no deck renders all of them, which doubles as a check that
nothing in the repo has stopped building.
-->

---
layout: default
---

<Backup q="Why not a Kalman filter?" />

## Filter Comparison

Backup slides live after the last slide of the talk and stay reachable from the
slide picker — press `o`. Tag each one with the question it answers, so that
finding the right slide under questioning is a matter of reading, not memory.

<!--
`g` then a number is the other way to get here. Writing the backup slide numbers
on your notes before a defense costs a minute and saves a fumble.
-->
