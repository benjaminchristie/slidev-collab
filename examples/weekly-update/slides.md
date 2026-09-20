---
theme: ./common/weekly_collab
title: "Weekly Update | 1 January 2026"
transition: fade
layout: cover
date: "1 January 2026"
with: "Alex"
---

# Weekly Update

<!--
Copy this whole folder to <your-deck-folder>/ and start editing.
Run it with:  ./present <your-deck-folder>

Every slide below shows one layout or component. Keep the ones you use and
delete the rest — this is a reference, not a required shape for the meeting.
The last two slides explain how to drive Slidev; they are deletable too.

New to Slidev: press `f` for fullscreen and `o` to see every slide at once. The
rest of the keys are on the second-to-last slide. What you are reading now is a
speaker note, which the audience never sees. ./present opens it for you in a
second tab: http://localhost:3030/presenter, with the current slide, the next
one, a timer, and these notes.
-->

---

## Since last week

<LastWeek by="Mon" state="done">Rerun seeds 4-8 on the new reward</LastWeek>
<LastWeek by="Wed" state="partial">Draft the ablation table for the paper</LastWeek>
<LastWeek by="Thu" state="missed" who="Alex">Decide whether demo collection continues</LastWeek>

<!--
Moving around: `space` or the right arrow goes forward one step, the left arrow
goes back one. The down and up arrows move a whole slide at a time, which
matters on slides that reveal their bullets one click at a time.
-->

---

## Topic A

- What actually got done <Status done />
- What is still running <Status wip />
  - A detail that only matters if asked
    - A third level, if you really need one
- What is stuck <Status blocked />
- What needs a call from someone else <Status ask />
- Anything whose state the four defaults do not name <Status wip label="rerunning" />

<Aside>The question you want answered in this meeting.</Aside>

<!--
`g` opens a box to type a slide number into — the fastest way to answer "can you
go back to the plot?" without arrowing through ten slides.
-->

---

## Topic A, what it means

<div class="wc-metrics">
  <Metric value="47%" label="success rate" delta="+16" />
  <Metric value="3.2 h" label="median run" delta="-0.8" good="down" />
  <Metric value="8" label="seeds" />
</div>

- The finding, in one line <Status done />
- The thing it rules out

<Aside kind="decision">What was settled, so that it does not get relitigated next week.</Aside>

<Aside kind="risk">What could eat the whole week if it goes the wrong way.</Aside>

<!--
`o` is the overview: every slide at once, click one to jump there. `d` toggles
dark mode, which is worth knowing about before you find it by accident on a
projector.
-->

---

## Runs in flight

<div>
<Runs :rows="[
  ['reward-v3', '8/8', 'done'],
  ['reward-v4', '3/8', 'wip'],
  ['baseline-b', '0/8', 'blocked', 'queued behind the cluster'],
]" />
</div>

<Blocker since="6 days" who="Priya">Eval cluster queue times</Blocker>

<!--
A component tag written across several lines is not a complete tag on its own
line, so markdown escapes it instead of passing it to Vue. Wrapping it in a
plain <div> makes the whole thing one HTML block and it renders. Tags that fit
on one line, like every other component in this deck, need no wrapper.

The server reloads as you save, so you can edit this file with the deck open
next to your editor and watch it change.
-->

---
layout: two-cols
ratio: "1fr 1fr"
---

## Topic B

::left::

### Last week

- What was promised <Status done />

::right::

### This week

- What is promised now <Status wip />

<!--
http://localhost:3030/presenter is presenter mode: current slide, next slide, a
timer, and these notes. Put it on your laptop and the plain deck on the
projector.
-->

---
layout: figure
---

## Topic B, results

::figure::

<img src="/assets/example.png" alt="Describe what the plot shows" />

<Legend :items="[['blue', 'ours'], ['muted', 'baseline'], ['orange', 'ablation']]" />

::caption::

What the reader should take away from this plot.

<!--
To hand someone a PDF:

    docker compose -f compose.slidev.yml run --rm export <your-deck-folder>

It lands in build/. With no deck named, every deck in the repo is rendered,
which is also how you find out that one of them stopped building.
-->

---
layout: figure
---

## Topic B, results side by side

::figure::

<div class="wc-figure-row">
  <div class="wc-figure-col" style="flex: 2 1 0">
    <img src="/assets/example.png" alt="Describe the left panel" />
  </div>
  <div class="wc-figure-col" style="flex: 1 1 0">
    <img src="/assets/example.png" alt="Describe the right panel" />
  </div>
</div>

::caption::

Grow each column in proportion to the width its artwork needs, so that a legend
does not get the same room as a plot.

<!--
CLICKS=1 in front of that export command gives one PDF page per click step
instead of one per slide, which is what you want when a slide reveals itself
piece by piece.
-->

---

## Next week

<Next by="Mon">Rerun seeds 4-8 on the new reward</Next>
<Next by="Wed">Draft the ablation table for the paper</Next>
<Next by="Thu" who="Alex">Decide whether demo collection continues</Next>

<Aside>Anything on this list that should be somebody else's.</Aside>

<!--
http://localhost:3030/notes-edit opens every speaker note in the deck in one
editable page, which beats hunting for HTML comments in the markdown.
-->

---
layout: section
---

## Discussion

Anything that needs a decision today.

---
layout: two-cols
ratio: "1fr 1fr"
---

## Driving Slidev

::left::

### Moving

- `space` or `→` — next step
- `←` — one step back
- `↓` / `↑` — next / previous whole slide
- `g` — go to a slide number
- `o` — every slide at once, click to jump

::right::

### While presenting

- `f` — fullscreen
- `d` — dark mode
- The arrows work in presenter mode too
- Nothing here needs the mouse

<!--
Left and right move by click step; up and down move by whole slide. On a deck
with no click animations the two behave the same, which is why the difference
only bites on the slide where it matters.
-->

---

## URLs and PDFs

Served by `./present <deck>` at `localhost:3030`, the first two opened for
you:

- `/` — the deck
- `/presenter` — notes, timer, next slide; keep this one on your laptop
- `/overview` — every slide on one scrollable page
- `/notes-edit` — edit every speaker note in one place
- `/export` — render a PDF from the browser

<Aside kind="risk">The server runs with `--remote` and no password, so anyone who can reach port 3030 can open `/presenter`. Fine on a laptop, worth knowing on shared wifi.</Aside>

<!--
From the command line instead of /export:

    docker compose -f compose.slidev.yml run --rm export <deck>
    CLICKS=1 docker compose -f compose.slidev.yml run --rm export <deck>

PDFs land in build/, one per deck plus build/all-decks.pdf with everything
concatenated. Running it with no deck named renders them all, which doubles as
a check that every deck in the repo still builds.
-->
