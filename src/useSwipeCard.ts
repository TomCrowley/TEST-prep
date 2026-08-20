import { useEffect, useRef, useState } from 'react'

// How far (px) a single move needs to be, and how much more horizontal
// than vertical, before we commit to treating this gesture as a swipe.
const AXIS_LOCK_THRESHOLD = 8
// Deliberately short: a small, quick flick should register.
const SWIPE_THRESHOLD = 60
// A real vertical scroll (not wobble) that happened during the gesture
// still cancels a horizontal swipe outright.
const SCROLL_CANCEL_THRESHOLD = 120
const WIPE_OUT_MS = 260
const SNAP_BACK_MS = 220

interface TouchState {
  startX: number
  startY: number
  startScrollY: number
  // Once true, stays true for the rest of the gesture (wobble afterward
  // doesn't cancel it). Unlike locking to 'vertical', staying false is
  // never a permanent decision -- a tall, scrollable card means the
  // opening movement is more likely to be vertical-ish by chance, so we
  // keep re-checking every move rather than giving up on the swipe after
  // the first ambiguous one.
  horizontal: boolean
}

export function useSwipeCard<T extends HTMLElement>(enabled: boolean, onSwipe: () => void) {
  const ref = useRef<T>(null)
  const [dragX, setDragX] = useState(0)
  const [transitionMs, setTransitionMs] = useState(0)
  const touch = useRef<TouchState | null>(null)
  const onSwipeRef = useRef(onSwipe)
  const enabledRef = useRef(enabled)

  useEffect(() => {
    onSwipeRef.current = onSwipe
    enabledRef.current = enabled
  }, [onSwipe, enabled])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleMove(e: TouchEvent) {
      const state = touch.current
      if (!state) return
      const t = e.touches[0]
      const dx = t.clientX - state.startX
      const dy = t.clientY - state.startY

      if (!state.horizontal) {
        if (Math.abs(dx) > AXIS_LOCK_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          state.horizontal = true
        } else {
          return // still ambiguous (or currently more vertical) -- let the page scroll, keep watching
        }
      }

      e.preventDefault()
      setTransitionMs(0)
      setDragX(dx)
    }

    function stopTracking() {
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }

    function handleEnd(e: TouchEvent) {
      const state = touch.current
      touch.current = null
      stopTracking()

      if (!state || !state.horizontal) {
        setDragX(0)
        return
      }

      const t = e.changedTouches[0]
      const dx = t.clientX - state.startX
      const scrolled = Math.abs(window.scrollY - state.startScrollY) > SCROLL_CANCEL_THRESHOLD

      if (!scrolled && dx < -SWIPE_THRESHOLD) {
        setTransitionMs(WIPE_OUT_MS)
        setDragX(-(window.innerWidth + 120))
        setTimeout(() => {
          onSwipeRef.current()
          setTransitionMs(0)
          setDragX(0)
        }, WIPE_OUT_MS)
      } else {
        setTransitionMs(SNAP_BACK_MS)
        setDragX(0)
        setTimeout(() => setTransitionMs(0), SNAP_BACK_MS)
      }
    }

    function handleStart(e: TouchEvent) {
      if (!enabledRef.current) return
      const t = e.touches[0]
      touch.current = { startX: t.clientX, startY: t.clientY, startScrollY: window.scrollY, horizontal: false }
      setTransitionMs(0)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      window.addEventListener('touchcancel', handleEnd)
    }

    el.addEventListener('touchstart', handleStart, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleStart)
      stopTracking()
    }
  }, [])

  return { ref, dragX, transitionMs }
}
