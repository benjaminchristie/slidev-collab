/**
 * useRaf — an animation loop that only runs while its element is on screen.
 *
 *   const canvas = ref(null)
 *   useRaf(canvas, (dt, t) => draw(dt, t))
 *
 * Slidev keeps more than one slide mounted at a time: the current slide, and
 * the neighbours it preloads so that a transition has something to move. A
 * component that starts a requestAnimationFrame loop in `onMounted` therefore
 * keeps painting long after its slide has left the screen, and a deck with
 * five animated slides ends up running five loops at once on the projector.
 *
 * An IntersectionObserver on the component's own element is the cheapest fix
 * that needs nothing from Slidev: a slide that is not being shown is not
 * intersecting, so its loop parks itself. It also covers the cases Slidev
 * knows nothing about — the browser tab in the background, the deck scrolled
 * out of view in `/overview`.
 *
 * `tick` is called once before the loop starts, so a component still paints a
 * correct first frame when the loop never runs at all: reduced-motion, or PDF
 * export, where Playwright may screenshot the slide before any frame lands.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useRaf(elRef, tick, options = {}) {
  const { autoStart = true, maxStep = 1 / 20 } = options

  const running = ref(false)
  let handle = 0
  let observer = null
  let last = 0

  function frame(now) {
    handle = requestAnimationFrame(frame)
    // Clamped, because a tab that was in the background hands back a `dt` of
    // several seconds on its first frame and every integrator in this deck
    // would take one enormous step and fly off the slide.
    const dt = last ? Math.min((now - last) / 1000, maxStep) : 0
    last = now
    tick(dt, now / 1000)
  }

  function start() {
    if (handle) return
    last = 0
    running.value = true
    handle = requestAnimationFrame(frame)
  }

  function stop() {
    if (!handle) return
    cancelAnimationFrame(handle)
    handle = 0
    running.value = false
  }

  onMounted(() => {
    tick(0, 0)
    if (!autoStart) return
    if (prefersReducedMotion()) return
    if (typeof IntersectionObserver === 'undefined') return start()

    observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.01 },
    )
    if (elRef.value) observer.observe(elRef.value)
  })

  onBeforeUnmount(() => {
    stop()
    observer?.disconnect()
    observer = null
  })

  return { running, start, stop }
}

/**
 * Sizes a canvas to its own box at the display's pixel density and keeps it
 * that way, returning the logical (CSS-pixel) size to draw against. Without
 * the devicePixelRatio scale every line in this deck is soft on a retina
 * laptop and crunchy on a projector.
 */
export function useCanvasSize(canvasRef) {
  const size = ref({ w: 0, h: 0, dpr: 1 })
  let observer = null

  function measure() {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    size.value = { w, h, dpr }
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(measure)
    if (canvasRef.value) observer.observe(canvasRef.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { size, measure }
}
