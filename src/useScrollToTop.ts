import { useLayoutEffect } from 'react'

// A swipe gesture can leave native momentum scrolling in flight, and on
// iOS that can keep drifting the page for several hundred ms after
// touchend -- long enough to outlast a fixed number of retries. Keep
// re-asserting the top position on every frame for a full window after
// mount (or after `dep` changes) instead, so the caller's header/HUD is
// always visible on arrival. Bails out immediately on a real touchstart
// so it never fights intentional scrolling.
export function useScrollToTop(dep?: unknown): void {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const deadline = performance.now() + 600
    let rafId = requestAnimationFrame(function tick() {
      window.scrollTo(0, 0)
      if (performance.now() < deadline) {
        rafId = requestAnimationFrame(tick)
      }
    })
    const stop = () => cancelAnimationFrame(rafId)
    window.addEventListener('touchstart', stop, { once: true, passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('touchstart', stop)
    }
  }, [dep])
}
