import { useState } from 'react'

const RAY_COUNT = 10
const SPARK_COUNT = 14
const SPARK_COLORS = ['gold', 'ember', 'white']
const SMOKE_COUNT = 5

interface Ray {
  angle: number
}

interface Spark {
  angle: number
  dist: number
  delay: number
  color: string
}

interface Smoke {
  drift: number
  scale: number
  delay: number
}

function makeRays(): Ray[] {
  // Jitter each ray off its even spacing so the impact reads as jagged
  // shrapnel rather than a perfectly symmetric starburst.
  return Array.from({ length: RAY_COUNT }, (_, i) => ({
    angle: (360 / RAY_COUNT) * i + (Math.random() * 14 - 7),
  }))
}

function makeSparks(): Spark[] {
  return Array.from({ length: SPARK_COUNT }, (_, i) => ({
    angle: Math.random() * 360,
    dist: 30 + Math.random() * 40,
    delay: Math.random() * 0.08,
    color: SPARK_COLORS[i % SPARK_COLORS.length],
  }))
}

function makeSmoke(): Smoke[] {
  return Array.from({ length: SMOKE_COUNT }, (_, i) => ({
    drift: (Math.random() - 0.5) * 20,
    scale: 0.7 + Math.random() * 0.6,
    delay: 0.15 + i * 0.09 + Math.random() * 0.05,
  }))
}

interface Props {
  /** Screen coordinates (e.g. from a click/tap event) to burst from. Falls back to viewport center if omitted. */
  origin?: { x: number; y: number }
}

// A one-shot "bullet impact" burst, meant to be remounted (via a changing
// `key` on the caller's side) each time a correct answer should be
// celebrated: a bright flash, a short scatter of shrapnel/sparks, a
// scorched hole that punches in and lingers at the impact point, and a
// wisp of smoke drifting up after. Layout is randomized once per mount
// (not on every render).
export default function Starburst({ origin }: Props) {
  const [rays] = useState(makeRays)
  const [sparks] = useState(makeSparks)
  const [smoke] = useState(makeSmoke)

  return (
    <div
      className="starburst"
      aria-hidden="true"
      style={origin ? { left: origin.x, top: origin.y } : undefined}
    >
      <div className="starburst-flash" />
      {rays.map((ray, i) => (
        <span
          key={i}
          className="starburst-ray"
          style={{ '--angle': `${ray.angle}deg` } as React.CSSProperties}
        />
      ))}
      {sparks.map((spark, i) => (
        <span
          key={i}
          className={`starburst-spark starburst-spark--${spark.color}`}
          style={
            {
              '--angle': `${spark.angle}deg`,
              '--dist': `${spark.dist}px`,
              animationDelay: `${spark.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="starburst-scorch" />
      <div className="starburst-hole" />
      {smoke.map((s, i) => (
        <span
          key={i}
          className="starburst-smoke-puff"
          style={
            {
              '--drift': `${s.drift}px`,
              '--scale': s.scale,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
