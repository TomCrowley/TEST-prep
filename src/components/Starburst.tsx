import { useState } from 'react'

const RAY_COUNT = 20
const SPARK_COUNT = 22
const SPARK_COLORS = ['gold', 'accent', 'white']

interface Spark {
  angle: number
  dist: number
  delay: number
  color: string
}

function makeSparks(): Spark[] {
  return Array.from({ length: SPARK_COUNT }, (_, i) => ({
    angle: Math.random() * 360,
    dist: 45 + Math.random() * 35,
    delay: Math.random() * 0.1,
    color: SPARK_COLORS[i % SPARK_COLORS.length],
  }))
}

// A one-shot burst, meant to be remounted (via a changing `key` on the
// caller's side) each time a correct answer should be celebrated. Rays
// travel out to the edge of the viewport; sparks scatter at randomized
// angles/distances/colors for a denser, less mechanical explosion. Spark
// layout is randomized once per mount (not on every render).
export default function Starburst() {
  const [sparks] = useState(makeSparks)

  return (
    <div className="starburst" aria-hidden="true">
      <div className="starburst-flash" />
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <span
          key={i}
          className="starburst-ray"
          style={{ '--angle': `${(360 / RAY_COUNT) * i}deg` } as React.CSSProperties}
        />
      ))}
      {sparks.map((spark, i) => (
        <span
          key={i}
          className={`starburst-spark starburst-spark--${spark.color}`}
          style={
            {
              '--angle': `${spark.angle}deg`,
              '--dist': `${spark.dist}vh`,
              animationDelay: `${spark.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
