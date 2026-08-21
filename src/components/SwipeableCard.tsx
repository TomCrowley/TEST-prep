import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import type { ReactNode } from 'react'

const SWIPE_DISTANCE_THRESHOLD = 100
const SWIPE_VELOCITY_THRESHOLD = 500
const EXIT_DURATION_S = 0.25

interface Props {
  children: ReactNode
  className?: string
  enabled: boolean
  onSwipe: () => void
  /** Tilt while dragging, like a card being flicked away. Off for full-screen swipes. */
  rotate?: boolean
}

// Swipe-left-to-dismiss, built on framer-motion's own drag gesture engine
// instead of hand-rolled touch tracking -- it already handles axis
// disambiguation, velocity, and cross-browser touch quirks correctly.
export default function SwipeableCard({ children, className, enabled, onSwipe, rotate = false }: Props) {
  const x = useMotionValue(0)
  const rotateValue = useTransform(x, [-300, 300], rotate ? [-10, 10] : [0, 0])
  const opacity = useTransform(x, [-300, 0], [0.2, 1])

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (!enabled) return
    const shouldDismiss =
      info.offset.x < -SWIPE_DISTANCE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
    if (!shouldDismiss) return // drag+constraints+elastic below auto-springs back to 0

    animate(x, -(window.innerWidth + 150), {
      type: 'tween',
      duration: EXIT_DURATION_S,
      ease: 'easeOut',
      onComplete: () => {
        onSwipe()
        x.set(0)
      },
    })
  }

  return (
    <motion.div
      className={className}
      style={{ x, rotate: rotateValue, opacity }}
      drag={enabled ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 1, right: 0.15 }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  )
}
