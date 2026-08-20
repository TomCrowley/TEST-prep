import type { Question, SessionAnswer } from '../types'

interface Props {
  questions: Question[]
  answers: SessionAnswer[]
  onPracticeAgain: () => void
  onHome: () => void
}

export default function Results({ questions, answers, onPracticeAgain, onHome }: Props) {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const correctCount = answers.filter((a) => a.correct).length
  const total = answers.length
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const missed = answers.filter((a) => !a.correct)

  return (
    <div className="screen results">
      <div className="score-card">
        <span className="score-pct">{pct}%</span>
        <span className="score-detail">
          {correctCount} of {total} correct
        </span>
      </div>

      {missed.length > 0 && (
        <div className="review-list">
          <h2>Review missed questions</h2>
          {missed.map((a) => {
            const q = byId.get(a.questionId)
            if (!q) return null
            return (
              <div className="review-item" key={a.questionId}>
                <span className="skill-tag">{q.skill}</span>
                {q.passageHtml && (
                  <div className="passage" dangerouslySetInnerHTML={{ __html: q.passageHtml }} />
                )}
                <div className="prompt" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />
                <p className="review-answer wrong">Your answer:</p>
                <div className="choice-body" dangerouslySetInnerHTML={{ __html: q.choices[a.chosenIndex] }} />
                <p className="review-answer right">Correct answer:</p>
                <div className="choice-body" dangerouslySetInnerHTML={{ __html: q.choices[q.correctIndex] }} />
                <div
                  className="feedback-explanation"
                  dangerouslySetInnerHTML={{ __html: q.explanationHtml }}
                />
              </div>
            )
          })}
        </div>
      )}

      {missed.length === 0 && total > 0 && (
        <p className="perfect-message">Perfect set — nice work.</p>
      )}

      <div className="results-actions">
        <button className="primary-button" onClick={onPracticeAgain}>
          Practice again
        </button>
        <button className="secondary-button" onClick={onHome}>
          Back home
        </button>
      </div>
    </div>
  )
}
