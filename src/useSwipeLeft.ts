import { useRef } from 'react'

const SWIPE_THRESHOLD = 40
// How far the page can scroll during a touch before we treat it as a
// deliberate scroll (reading a long explanation) instead of swipe drift.
const SCROLL_CANCEL_THRESHOLD = 120

export function useSwipeLeft(enabled: boolean, onSwipe: () => void) {
  const touchStart = useRef<{ x: number; y: number; scrollY: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    if (!enabled) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, scrollY: window.scrollY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!enabled || !start) return
    // A real horizontal swipe often nudges the page a little too (the
    // browser scrolls in parallel with our gesture tracking) — only bail
    // out for a scroll distance big enough to mean "reading a long
    // explanation," not incidental drift from an intentional swipe.
    if (Math.abs(window.scrollY - start.scrollY) > SCROLL_CANCEL_THRESHOLD) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (dx < -SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 2) {
      onSwipe()
    }
  }

  return { onTouchStart, onTouchEnd }
}
