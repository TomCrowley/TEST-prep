import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { Question, Section, SessionAnswer } from '../types'
import { computeSessionSummary, getStreakTier, pointsForCorrectAnswer } from '../game'
import { useSwipeLeft } from '../useSwipeLeft'
import Starburst from './Starburst'
import XpBar from './XpBar'

interface Props {
  questions: Question[]
  xp: number
  initialIndex?: number
  initialSelected?: number | null
  initialAnswers?: SessionAnswer[]
  onAnswer: (questionId: string, section: Section, correct: boolean) => void
  onXpEarned: (points: number) => void
  onProgressChange: (index: number, selected: number | null, answers: SessionAnswer[]) => void
  onFinish: (answers: SessionAnswer[], questionsById: Map<string, Question>) => void
  onExit: () => void
}

const DIFFICULTY_LABEL: Record<string, string> = { E: 'Easy', M: 'Medium', H: 'Hard' }

export default function Practice({
  questions,
  xp,
  initialIndex = 0,
  initialSelected = null,
  initialAnswers = [],
  onAnswer,
  onXpEarned,
  onProgressChange,
  onFinish,
  onExit,
}: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [selected, setSelected] = useState<number | null>(initialSelected)
  const [answers, setAnswers] = useState<SessionAnswer[]>(initialAnswers)
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(null)

  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const summary = useMemo(() => computeSessionSummary(answers, questionsById), [answers, questionsById])
  const lastPoint = summary.points[summary.points.length - 1] ?? null
  const currentStreak = lastPoint?.streakAfter ?? 0
  const currentTier = getStreakTier(currentStreak)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const hasAnswered = selected !== null

  // Let the parent persist this so an accidental refresh resumes here
  // instead of dropping back to the home screen.
  useEffect(() => {
    onProgressChange(index, selected, answers)
  }, [index, selected, answers, onProgressChange])

  // A swipe gesture can leave native momentum scrolling in flight, which
  // fights a single synchronous scrollTo. Re-assert the top position on
  // the next couple of frames (and once more after momentum should have
  // settled) so the progress bar and streak HUD are always visible.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const raf1 = requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      requestAnimationFrame(() => window.scrollTo(0, 0))
    })
    const timeout = setTimeout(() => window.scrollTo(0, 0), 300)
    return () => {
      cancelAnimationFrame(raf1)
      clearTimeout(timeout)
    }
  }, [index])

  function choose(choiceIndex: number, event: React.MouseEvent) {
    if (hasAnswered) return
    const correct = choiceIndex === question.correctIndex
    setSelected(choiceIndex)
    onAnswer(question.id, question.section, correct)
    setAnswers((prev) => [...prev, { questionId: question.id, chosenIndex: choiceIndex, correct }])
    if (correct) {
      setBurstOrigin({ x: event.clientX, y: event.clientY })
      onXpEarned(pointsForCorrectAnswer(currentStreak + 1, question.difficulty))
    }
  }

  function next() {
    if (isLast) {
      onFinish(answers, questionsById)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
  }

  const swipeHandlers = useSwipeLeft(hasAnswered, next)

  return (
    <div className="screen practice" {...swipeHandlers}>
      <div className="practice-header">
        <button className="icon-button" onClick={onExit} aria-label="Exit practice">
          ✕
        </button>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="progress-count">
          {index + 1}/{questions.length}
        </span>
      </div>

      <div className="hud-row">
        <span className="hud-score">⭐ {summary.score.toLocaleString()}</span>
        {currentStreak >= 2 && (
          <span className="hud-streak">
            🔥 {currentStreak}
            {currentTier.label ? ` · ${currentTier.label}` : ''}
          </span>
        )}
        <div className="hud-xp">
          <XpBar xp={xp} />
        </div>
      </div>

      <div className="question-card">
        <div className="tag-row">
          <span className="skill-tag">{question.skill}</span>
          {question.difficulty && (
            <span className={`difficulty-tag difficulty-${question.difficulty}`}>
              {DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
            </span>
          )}
        </div>

        {question.passageHtml && (
          <div className="passage" dangerouslySetInnerHTML={{ __html: question.passageHtml }} />
        )}
        <div className="prompt" dangerouslySetInnerHTML={{ __html: question.promptHtml }} />

        <div className="choices">
          {question.choices.map((choice, i) => {
            let state = ''
            if (hasAnswered) {
              if (i === question.correctIndex) state = 'correct'
              else if (i === selected) state = 'incorrect'
            }
            return (
              <button
                key={i}
                className={`choice ${state}`}
                onClick={(e) => choose(i, e)}
                disabled={hasAnswered}
              >
                <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                <span className="choice-body" dangerouslySetInnerHTML={{ __html: choice }} />
              </button>
            )
          })}
        </div>

        {hasAnswered && selected === question.correctIndex && (
          <Starburst key={question.id} origin={burstOrigin ?? undefined} />
        )}

        {hasAnswered && (
          <div className={`feedback ${selected === question.correctIndex ? 'good' : 'bad'}`}>
            <p className="feedback-title">
              {selected === question.correctIndex ? (
                <>
                  Correct — +{lastPoint?.points ?? 0}
                  {currentTier.label ? ` · ${currentTier.label}!` : ''}
                </>
              ) : (
                'Not quite'
              )}
            </p>
            <div
              className="feedback-explanation"
              dangerouslySetInnerHTML={{ __html: question.explanationHtml }}
            />
          </div>
        )}
      </div>

      {hasAnswered && (
        <>
          <button className="primary-button" onClick={next}>
            {isLast ? 'See results' : 'Next question'}
          </button>
          <p className="swipe-hint">or swipe left</p>
        </>
      )}
    </div>
  )
}
