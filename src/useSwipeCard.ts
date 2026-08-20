import { useEffect, useRef, useState } from 'react'

// How far (px) the finger has to move before we commit to an axis. Once
// committed, later movement on the other axis is ignored for the rest of
// this gesture -- wobble during a horizontal swipe no longer cancels it,
// and a horizontal wobble during a vertical scroll doesn't hijack it.
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
  axis: 'horizontal' | 'vertical' | null
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

      if (!state.axis) {
        if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) return
        state.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (state.axis === 'horizontal') {
        e.preventDefault()
        setTransitionMs(0)
        setDragX(dx)
      }
      // Locked vertical: let the browser scroll normally, ignore dx entirely.
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

      if (!state || state.axis !== 'horizontal') {
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
      touch.current = { startX: t.clientX, startY: t.clientY, startScrollY: window.scrollY, axis: null }
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
