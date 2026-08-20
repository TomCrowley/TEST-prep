import { useEffect, useRef, useState } from 'react'
import { getRankProgress } from '../game'

const PULSE_DURATION_MS = 600

interface Props {
  xp: number
}

// Purely reactive to whatever `xp` it's given -- callers that want to hold
// off revealing a change (e.g. Practice waiting for the next question to be
// on screen) should delay updating the `xp` they pass in, not this component.
export default function XpBar({ xp }: Props) {
  const [pulsing, setPulsing] = useState(false)
  const prevXp = useRef(xp)

  useEffect(() => {
    if (xp === prevXp.current) return
    prevXp.current = xp
    setPulsing(true)
  }, [xp])

  useEffect(() => {
    if (!pulsing) return
    const timeout = setTimeout(() => setPulsing(false), PULSE_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [pulsing])

  const rankProgress = getRankProgress(xp)
  const pct = rankProgress.xpForNextRank
    ? Math.min(100, Math.round((rankProgress.xpIntoRank / rankProgress.xpForNextRank) * 100))
    : 100

  return (
    <div className="xp-bar">
      <div className={`xp-bar-fill${pulsing ? ' pulse' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
