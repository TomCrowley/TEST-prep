import type { Question } from '../types'
import type { SessionResult } from '../game'
import { MEDALS, getRankProgress } from '../game'
import SwipeableCard from './SwipeableCard'
import { useCountUp } from '../useCountUp'

interface Props {
  questions: Question[]
  result: SessionResult
  onPracticeAgain: () => void
  onHome: () => void
}

export default function Results({ questions, result, onPracticeAgain, onHome }: Props) {
  const { summary, xpBefore, xpEarned, completionBonus, newMedalIds } = result
  const byId = new Map(questions.map((q) => [q.id, q]))
  const pct = summary.total > 0 ? Math.round((summary.correctCount / summary.total) * 100) : 0
  const missed = summary.points.filter((p) => !p.answer.correct)
  const earnedMedals = MEDALS.filter((m) => newMedalIds.includes(m.id))

  const rankBefore = getRankProgress(xpBefore)
  const rankAfter = getRankProgress(xpBefore + xpEarned)
  const rankedUp = rankAfter.index > rankBefore.index

  const { value: animatedScore, done: scoreSettled } = useCountUp(summary.score)

  return (
    <SwipeableCard className="screen results" enabled onSwipe={onHome}>
      <div className="score-card">
        <span className="score-label">Battle Score</span>
        <span className={`score-pct${scoreSettled ? ' settled' : ''}`}>{animatedScore.toLocaleString()}</span>
        <span className="score-detail">
          {summary.correctCount} of {summary.total} correct ({pct}%)
          {summary.maxStreak >= 2 ? ` · best streak ${summary.maxStreak}` : ''}
        </span>
      </div>

      <div className="xp-gain-card">
        <div className="xp-gain-top">
          <span className="xp-gain-amount">+{xpEarned.toLocaleString()} XP</span>
          {rankedUp ? (
            <span className="rank-up">RANK UP! Now {rankAfter.rank.name}</span>
          ) : (
            <span className="xp-gain-rank">{rankAfter.rank.name}</span>
          )}
        </div>
        {completionBonus > 0 && (
          <span className="xp-gain-bonus">includes +{completionBonus} session complete bonus</span>
        )}
      </div>

      {earnedMedals.length > 0 && (
        <div className="medals-earned">
          <h2>Medals earned</h2>
          <div className="medals-earned-list">
            {earnedMedals.map((medal) => (
              <div className="medal-earned-item" key={medal.id}>
                <span className="medal-icon">{medal.icon}</span>
                <div>
                  <div className="medal-earned-name">{medal.name}</div>
                  <div className="medal-earned-desc">{medal.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {missed.length > 0 && (
        <div className="review-list">
          <h2>Review missed questions</h2>
          {missed.map((p) => {
            const q = byId.get(p.answer.questionId)
            if (!q) return null
            return (
              <div className="review-item" key={p.answer.questionId}>
                <span className="skill-tag">{q.skill}</span>
                {q.passageHtml && (
                  <div className="passage" dangerouslySetInnerHTML={{ __html: q.passageHtml }} />
                )}
                <div className="prompt" dangerouslySetInnerHTML={{ __html: q.promptHtml }} />
                <p className="review-answer wrong">Your answer:</p>
                <div className="choice-body" dangerouslySetInnerHTML={{ __html: q.choices[p.answer.chosenIndex] }} />
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

      {missed.length === 0 && summary.total > 0 && (
        <p className="perfect-message">Perfect set — nice work.</p>
      )}

      <div className="results-actions">
        <button className="primary-button" onClick={onHome}>
          Back home
        </button>
        <button className="secondary-button" onClick={onPracticeAgain}>
          Practice another 10
        </button>
        <p className="swipe-hint">or swipe left for home</p>
      </div>
    </SwipeableCard>
  )
}
