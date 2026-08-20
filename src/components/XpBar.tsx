import { useEffect, useRef, useState } from 'react'
import { getRankProgress } from '../game'

interface Props {
  xp: number
}

export default function XpBar({ xp }: Props) {
  const rankProgress = getRankProgress(xp)
  const pct = rankProgress.xpForNextRank
    ? Math.min(100, Math.round((rankProgress.xpIntoRank / rankProgress.xpForNextRank) * 100))
    : 100

  const [pulsing, setPulsing] = useState(false)
  const prevXp = useRef(xp)

  useEffect(() => {
    if (xp === prevXp.current) return
    prevXp.current = xp
    setPulsing(true)
    const timeout = setTimeout(() => setPulsing(false), 600)
    return () => clearTimeout(timeout)
  }, [xp])

  return (
    <div className="xp-bar">
      <div className={`xp-bar-fill${pulsing ? ' pulse' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
