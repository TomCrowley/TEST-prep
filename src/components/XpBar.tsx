import { useEffect, useRef, useState } from 'react'
import { getRankProgress } from '../game'

// Held before the bar actually moves, so the fill/glow plays once the next
// question is on screen instead of getting lost behind the answer feedback.
const ANIMATION_DELAY_MS = 450
const PULSE_DURATION_MS = 600

interface Props {
  xp: number
}

export default function XpBar({ xp }: Props) {
  const [displayedXp, setDisplayedXp] = useState(xp)
  const [pulsing, setPulsing] = useState(false)
  const prevXp = useRef(xp)

  useEffect(() => {
    if (xp === prevXp.current) return
    prevXp.current = xp
    const startTimeout = setTimeout(() => {
      setDisplayedXp(xp)
      setPulsing(true)
    }, ANIMATION_DELAY_MS)
    return () => clearTimeout(startTimeout)
  }, [xp])

  useEffect(() => {
    if (!pulsing) return
    const endTimeout = setTimeout(() => setPulsing(false), PULSE_DURATION_MS)
    return () => clearTimeout(endTimeout)
  }, [pulsing])

  const rankProgress = getRankProgress(displayedXp)
  const pct = rankProgress.xpForNextRank
    ? Math.min(100, Math.round((rankProgress.xpIntoRank / rankProgress.xpForNextRank) * 100))
    : 100

  return (
    <div className="xp-bar">
      <div className={`xp-bar-fill${pulsing ? ' pulse' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
