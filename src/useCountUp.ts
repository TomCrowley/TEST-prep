import { useEffect, useState } from 'react'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(target: number, durationMs = 1100): { value: number; done: boolean } {
  const [willAnimate] = useState(() => target !== 0 && !prefersReducedMotion())
  const [value, setValue] = useState(() => (willAnimate ? 0 : target))
  const [done, setDone] = useState(() => !willAnimate)

  useEffect(() => {
    if (!willAnimate) return

    let raf = 0
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(target * eased))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDone(true)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [willAnimate, target, durationMs])

  return { value, done }
}
