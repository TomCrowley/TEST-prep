import type { ProgressMap, Section } from '../types'
import { SECTION_TOTALS } from '../questionBank'

interface Props {
  progress: ProgressMap
  onStart: (section: Section | 'all') => void
  onReset: () => void
  error?: string | null
}

function sectionStats(progress: ProgressMap, section?: Section) {
  let attempts = 0
  let correct = 0
  let answered = 0
  const total = section ? SECTION_TOTALS[section] : SECTION_TOTALS.math + SECTION_TOTALS.reading

  for (const stat of Object.values(progress)) {
    if (section && stat.section !== section) continue
    answered += 1
    attempts += stat.attempts
    correct += stat.correct
  }

  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null
  return { answered, total, accuracy }
}

export default function Home({ progress, onStart, onReset, error }: Props) {
  const overall = sectionStats(progress)
  const math = sectionStats(progress, 'math')
  const reading = sectionStats(progress, 'reading')

  return (
    <div className="screen home">
      <header className="hero">
        <h1>SAT Prep</h1>
        <p className="subtitle">Bite-sized practice for Math and Reading &amp; Writing.</p>
      </header>

      {error && <p className="error-message">{error}</p>}

      <div className="stats-card">
        <div className="stats-row">
          <span>Questions seen</span>
          <strong>
            {overall.answered} / {overall.total}
          </strong>
        </div>
        <div className="stats-row">
          <span>Overall accuracy</span>
          <strong>{overall.accuracy === null ? '—' : `${overall.accuracy}%`}</strong>
        </div>
      </div>

      <div className="section-list">
        <button className="section-card" onClick={() => onStart('math')}>
          <div className="section-card-top">
            <span className="section-name">Math</span>
            <span className="section-badge">{math.accuracy === null ? '—' : `${math.accuracy}%`}</span>
          </div>
          <span className="section-meta">
            {math.answered}/{math.total} seen · algebra, geometry, data
          </span>
        </button>

        <button className="section-card" onClick={() => onStart('reading')}>
          <div className="section-card-top">
            <span className="section-name">Reading &amp; Writing</span>
            <span className="section-badge">{reading.accuracy === null ? '—' : `${reading.accuracy}%`}</span>
          </div>
          <span className="section-meta">
            {reading.answered}/{reading.total} seen · grammar, vocab, logic
          </span>
        </button>

        <button className="section-card mixed" onClick={() => onStart('all')}>
          <div className="section-card-top">
            <span className="section-name">Mixed practice</span>
            <span className="section-badge">{overall.accuracy === null ? '—' : `${overall.accuracy}%`}</span>
          </div>
          <span className="section-meta">A shuffled set from both sections</span>
        </button>
      </div>

      {overall.answered > 0 && (
        <button className="reset-link" onClick={onReset}>
          Reset progress
        </button>
      )}
    </div>
  )
}
