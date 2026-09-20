<!--
  MathMove — Magic Move, for KaTeX.

  Slidev ships `magic-move` for code: two fenced blocks, and the tokens common
  to both slide from where they were to where they are going. There is no such
  thing for maths, and a derivation is exactly the place that wants it — the
  audience's question at every line is "where did that term come from?", and an
  animation answers it without a word.

    <MathMove :step="$clicks" :animate="$renderContext !== 'print'" :min-height="180">

    <div>

    $$ I = H(d \mid b_0) - H(d \mid \mathcal{A}, b_0) $$

    </div>

    <div>

    $$ I = \log\bigl(1 + \alpha_d H(b_0)\bigr) $$

    </div>

    </MathMove>

  One direct child per step, each holding one or more `$$…$$` blocks. `step`
  says which child is showing; drive it from `$clicks` and declare `clicks:` in
  the slide's frontmatter. `animate` should be false in a print render, where
  there are no transitions to run and every step is rasterised on its own.

  The matching rule is: keep terms together, even when that costs travel.
  Atoms are matched in *runs* — maximal stretches of glyphs that read the same
  in both steps — longest run first, and every atom in a run flies with one
  shared offset, so the run arrives as one rigid block. Runs may cross each
  other; reading order is not preserved, because the thing worth watching is
  `1 + \alpha_d H(b_0)` leaving the inside of a \log and landing whole on top
  of a fraction bar, even though it overtakes its neighbour on the way.

  Only atoms that belong to no run fade.

  Props: `step`, `animate`, `duration` (620ms, the flight), `fade` (240ms),
  `minHeight` and `size` (1.5em) — and `gap`, the space between the equation
  lines of one step.

  The stage is as tall as its tallest step and stays that way, so the maths
  never changes size between steps and the text around it never moves.

  Three optional classes come with it, for the shape a derivation slide tends
  to want. `.mm-lead` is a framing sentence that starts centred in the slide
  and rises above the equations when the build begins — add `is-up` on the
  first click. `.mm-reveal` fades its contents in with `is-on`. `.mm-caption`
  is a fixed-height box under the stage holding one `.mm-cap` per step, of
  which the one with `is-on` is visible, so the caption can change without the
  layout moving. See `examples/showcase` for a slide using all three.
-->
<template>
  <div
    ref="root"
    class="mm-stage"
    :style="{
      height: stageHeight ? stageHeight + 'px' : null,
      minHeight: minHeight ? minHeight + 'px' : null,
      '--mm-gap': gap,
      '--mm-size': size,
    }"
  >
    <slot />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  step: { type: Number, default: 0 },
  animate: { type: Boolean, default: true },
  duration: { type: Number, default: 620 },
  fade: { type: Number, default: 240 },
  minHeight: { type: Number, default: 0 },
  gap: { type: String, default: '1rem' },
  size: { type: String, default: '1.5em' },
})

const root = ref(null)
const stageHeight = ref(0)

let steps = []
let current = 0
let timers = []
let frame = 0

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const idx = (i) => clamp(Number(i) || 0, 0, Math.max(0, steps.length - 1))

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

const later = (fn, ms) => timers.push(setTimeout(fn, ms))

const ZERO_WIDTH = /[​‌‍﻿]/g
const clean = (s) => (s || '').replace(ZERO_WIDTH, '').trim()

// A glyph carrying a sub/superscript is one atom: b_0 and b_c are different
// terms and must never trade their bases.
function scripted(el) {
  const kids = el.children
  return (
    kids.length === 2 &&
    kids[1].classList.contains('msupsub') &&
    kids[0].childElementCount === 0
  )
}

// Punctuation and operators are the glue between terms. On their own they are
// not worth a flight across the slide; inside a run they travel with it.
const TRIVIAL = /^[()[\]{}|+\-=,.<>/∣‖′·⋅−⪅⪆≤≥≪≫]+$/

/*
  One flat, ordered list of the smallest meaningful pieces of a step. `root`
  says which display block a piece belongs to, so a run is never allowed to
  straddle two equations — a run has to be rigid to move as one.
*/
function atomsOf(el) {
  const out = []
  if (!el) return out

  let root = 0
  const walk = (node) => {
    for (const child of node.children) {
      if (!child.classList) continue

      const text = clean(child.textContent)
      if (!text) continue

      let ownText = false
      for (const n of child.childNodes) {
        if (n.nodeType === 3 && clean(n.nodeValue)) {
          ownText = true
          break
        }
      }

      if (ownText || child.childElementCount === 0 || scripted(child)) {
        out.push({ el: child, key: text, root })
      } else {
        walk(child)
      }
    }
  }

  el.querySelectorAll('.katex-html').forEach((block) => {
    walk(block)
    root += 1
  })
  return out
}

const originals = new WeakMap()

function takeOver(el) {
  if (originals.has(el)) return
  originals.set(el, {
    position: el.style.position,
    top: el.style.top,
    left: el.style.left,
    opacity: el.style.opacity,
    transition: el.style.transition,
  })
}

function resetAtoms(el) {
  atomsOf(el).forEach(({ el: atom }) => {
    const was = originals.get(atom)
    if (!was) return
    atom.style.position = was.position
    atom.style.top = was.top
    atom.style.left = was.left
    atom.style.opacity = was.opacity
    atom.style.transition = was.transition
    originals.delete(atom)
  })
}

// Slidev scales the whole canvas, so a delta read off getBoundingClientRect is
// in screen pixels and has to be divided back into layout pixels.
function scaleOf(el) {
  if (!el || !el.offsetWidth) return 1
  const ratio = el.getBoundingClientRect().width / el.offsetWidth
  return ratio > 0.01 ? ratio : 1
}

function show(el) {
  el.style.visibility = 'visible'
  el.style.opacity = '1'
}

function hide(el) {
  el.style.visibility = 'hidden'
  el.style.opacity = '0'
}

function collectSteps() {
  const el = root.value
  if (!el) return []
  return Array.from(el.children).filter((n) => n.nodeType === 1)
}

// The stage is as tall as its tallest step and stays that way, so the maths
// keeps one size across the whole slide and the text around it never moves.
function measure() {
  if (!steps.length) return
  let h = props.minHeight
  steps.forEach((step) => {
    h = Math.max(h, step.offsetHeight)
  })
  if (h && Math.abs(h - stageHeight.value) > 1) stageHeight.value = Math.ceil(h)
}

function snapTo(target) {
  steps.forEach((s, i) => {
    resetAtoms(s)
    if (i === target) show(s)
    else hide(s)
  })
}

/*
  Longest stretch of atoms that reads the same in both steps, among the atoms
  neither step has spent yet. Ties go to the candidate that has to travel
  least, which is what stops two identical `1 +`s swapping places.
*/
function longestRun(a, b, aFree, bFree, cost) {
  let best = null
  let prev = new Array(b.length + 1).fill(0)
  let cur = new Array(b.length + 1).fill(0)

  for (let i = 0; i < a.length; i++) {
    cur.fill(0)
    for (let j = 0; j < b.length; j++) {
      if (!aFree[i] || !bFree[j] || a[i].key !== b[j].key) continue

      const joins =
        i > 0 &&
        j > 0 &&
        prev[j] > 0 &&
        a[i].root === a[i - 1].root &&
        b[j].root === b[j - 1].root

      const len = joins ? prev[j] + 1 : 1
      cur[j + 1] = len

      const run = { len, i: i - len + 1, j: j - len + 1 }
      if (!best || len > best.len) best = run
      else if (len === best.len && cost(run) < cost(best)) best = run
    }
    const swap = prev
    prev = cur
    cur = swap
  }
  return best
}

function matchRuns(oldAtoms, newAtoms, cost) {
  const aFree = oldAtoms.map(() => true)
  const bFree = newAtoms.map(() => true)
  const runs = []
  for (;;) {
    const run = longestRun(oldAtoms, newAtoms, aFree, bFree, cost)
    if (!run) break
    for (let k = 0; k < run.len; k++) {
      aFree[run.i + k] = false
      bFree[run.j + k] = false
    }
    runs.push(run)
  }
  return { runs, aFree, bFree }
}

const WRAP = 20 // px of sudden disagreement that means the run wrapped a line
const DRIFT = 140 // px a run of pure punctuation is not worth flying

function move(fromIndex, toIndex) {
  const from = steps[fromIndex]
  const to = steps[toIndex]
  if (!from || !to) return snapTo(toIndex)

  const oldAtoms = atomsOf(from)
  const oldRects = oldAtoms.map((a) => a.el.getBoundingClientRect())

  show(to)
  const newAtoms = atomsOf(to)
  const newRects = newAtoms.map((a) => a.el.getBoundingClientRect())

  const cost = (run) => {
    const o = oldRects[run.i]
    const n = newRects[run.j]
    if (!o || !n) return Infinity
    return Math.abs(o.left - n.left) + Math.abs(o.top - n.top)
  }

  const { runs, aFree, bFree } = matchRuns(oldAtoms, newAtoms, cost)
  const scale = scaleOf(root.value)

  const travelling = []
  const entering = []

  // A run moves rigidly: every atom in it is offset by the run's own average
  // delta, so the block leaves and lands as one shape. A jump in the middle of
  // a run means it wrapped a line over there, and the run is cut in two.
  const place = (seg) => {
    if (!seg.length) return
    let dx = 0
    let dy = 0
    seg.forEach((s) => {
      dx += s.dx
      dy += s.dy
    })
    dx /= seg.length
    dy /= seg.length

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

    const glue = seg.every((s) => TRIVIAL.test(s.key))
    if (glue && Math.abs(dx) + Math.abs(dy) > DRIFT) {
      seg.forEach((s) => entering.push(s.el))
      return
    }

    seg.forEach((s) => {
      takeOver(s.el)
      s.el.style.position = 'relative'
      s.el.style.transition = 'none'
      s.el.style.left = `${dx}px`
      s.el.style.top = `${dy}px`
      travelling.push(s.el)
    })
  }

  runs.forEach((run) => {
    let seg = []
    for (let k = 0; k < run.len; k++) {
      const o = oldRects[run.i + k]
      const n = newRects[run.j + k]
      if (!o || !n || (!n.width && !n.height)) continue
      const dx = (o.left - n.left) / scale
      const dy = (o.top - n.top) / scale
      const last = seg[seg.length - 1]
      if (last && (Math.abs(dx - last.dx) > WRAP || Math.abs(dy - last.dy) > WRAP)) {
        place(seg)
        seg = []
      }
      seg.push({ el: newAtoms[run.j + k].el, key: newAtoms[run.j + k].key, dx, dy })
    }
    place(seg)
  })

  newAtoms.forEach((a, j) => {
    if (bFree[j]) entering.push(a.el)
  })

  oldAtoms.forEach((a, i) => {
    takeOver(a.el)
    a.el.style.transition = aFree[i] ? `opacity ${props.fade}ms ease-out` : 'none'
    a.el.style.opacity = '0'
  })

  entering.forEach((el) => {
    takeOver(el)
    el.style.transition = 'none'
    el.style.opacity = '0'
  })

  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      frame = 0
      const ease = `${props.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      travelling.forEach((el) => {
        el.style.transition = `left ${ease}, top ${ease}`
        el.style.left = '0px'
        el.style.top = '0px'
      })
      entering.forEach((el) => {
        const wait = Math.round(props.duration * 0.55)
        el.style.transition = `opacity ${props.fade}ms ease-in ${wait}ms`
        el.style.opacity = '1'
      })
    })
  })

  later(() => {
    hide(from)
    resetAtoms(from)
    resetAtoms(to)
  }, props.duration + props.fade + 80)
}

function go(target) {
  const to = idx(target)
  if (to === current) return
  clearTimers()

  if (!props.animate || reducedMotion() || !steps.length) {
    snapTo(to)
    current = to
    return
  }

  steps.forEach((s, i) => {
    if (i !== current && i !== to) {
      resetAtoms(s)
      hide(s)
    }
  })
  resetAtoms(steps[to])

  try {
    move(current, to)
  } catch (err) {
    clearTimers()
    snapTo(to)
  }
  current = to
}

let onResize = null

onMounted(() => {
  steps = collectSteps()
  current = idx(props.step)
  snapTo(current)
  measure()

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure).catch(() => {})
  }
  later(measure, 400)

  onResize = () => measure()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  clearTimers()
  if (onResize) window.removeEventListener('resize', onResize)
  onResize = null
})

watch(() => props.step, go)
watch(
  () => props.animate,
  (on) => {
    if (!on) {
      clearTimers()
      snapTo(current)
    }
  },
)
</script>

<style>
.mm-stage {
  position: relative;
  width: 100%;
  overflow: visible;
}

.mm-stage > * {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  margin: 0 !important;
}

.mm-stage p {
  margin: 0 !important;
}

.mm-stage .katex-display {
  margin: var(--mm-gap, 1rem) 0 !important;
}

.mm-stage .katex {
  font-size: var(--mm-size, 1.5em);
}

.mm-lead {
  transform: translateY(var(--mm-lead-drop, 9.5rem));
  transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 1.5rem;
}

.mm-lead.is-up {
  transform: translateY(0);
}

.slidev-layout .mm-lead p {
  margin: 0 !important;
  text-align: center;
  font-size: 1.6rem;
  line-height: 1.5;
  text-wrap: balance;
  transition: font-size 700ms cubic-bezier(0.4, 0, 0.2, 1);
}

.slidev-layout .mm-lead.is-up p {
  font-size: 1.2rem;
}

/*
  Once the lead has risen it is supporting text, and the heading above it has
  already been read. Both give their margins to the equations, which are the
  only thing on this slide that cannot be made smaller.
*/
.slidev-layout:has(.mm-stage) h2 {
  margin-bottom: 1rem !important;
}

.mm-reveal {
  opacity: 0;
  transition: opacity 500ms ease-in 250ms;
}

.mm-reveal.is-on {
  opacity: 1;
}

.mm-caption {
  position: relative;
  width: 90%;
  margin-left: auto;
  margin-right: auto;
}

/*
  The caption box is a fixed reservation, sized for the longest caption. A
  short caption is centred in it rather than pinned to its top, so it does not
  crowd the equations above it on the steps where the maths is tallest.
*/
.slidev-layout .mm-caption .mm-cap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 !important;
  text-align: center;
  font-size: 1.12rem;
  line-height: 1.55;
  opacity: 0;
  transition: opacity 300ms ease-in-out;
}

.slidev-layout .mm-caption .mm-cap p {
  margin: 0 !important;
  font-size: 1.12rem;
  line-height: 1.55;
  text-align: center;
}

.slidev-layout .mm-caption .mm-cap.is-on {
  opacity: 1;
}
</style>
