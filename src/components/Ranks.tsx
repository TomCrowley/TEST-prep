import { RANKS, getRankProgress } from '../game'

interface Props {
  xp: number
  onBack: () => void
}

export default function Ranks({ xp, onBack }: Props) {
  const { index: currentIndex } = getRankProgress(xp)

  return (
    <div className="screen ranks">
      <div className="page-header">
        <button className="icon-button" onClick={onBack} aria-label="Back to home">
          ←
        </button>
        <h1 className="page-title">Ranks</h1>
      </div>

      <div className="rank-list">
        {RANKS.map((rank, i) => (
          <div key={rank.name} className={`rank-list-item${i === currentIndex ? ' current' : ''}`}>
            <div className="rank-list-top">
              <span className="rank-list-name">{rank.name}</span>
              {i === currentIndex && <span className="rank-list-badge">Current</span>}
              <span className="rank-list-xp">{rank.minXp.toLocaleString()} XP</span>
            </div>
            <p className="rank-list-desc">{rank.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
