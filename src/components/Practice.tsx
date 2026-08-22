import { useEffect, useMemo, useState } from 'react'
import type { Question, Section, SessionAnswer } from '../types'
import { computeSessionSummary, getStreakTier, pointsForCorrectAnswer } from '../game'
import { shuffle } from '../shuffle'
import { useScrollToTop } from '../useScrollToTop'
import SwipeableCard from './SwipeableCard'
import Starburst from './Starburst'
import XpBar from './XpBar'

const HINT_DELAY_MS = 60_000

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
  const [hintAvailable, setHintAvailable] = useState(false)
  const [eliminated, setEliminated] = useState<Set<number>>(new Set())
  const [hintUsed, setHintUsed] = useState(false)
  // XP is applied the instant a correct answer is chosen, but the HUD bar
  // should only visibly update once the *next* question is on screen --
  // otherwise the fill/glow plays while still looking at the feedback for
  // the previous one, or gets scrolled past entirely.
  const [displayedXp, setDisplayedXp] = useState(xp)

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

  // Reveal whatever XP has been earned so far exactly when a new question
  // appears. Deliberately keyed on `index` alone -- `xp` changing on its
  // own (right when an answer is chosen) must NOT trigger this.
  useEffect(() => {
    setDisplayedXp(xp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // A hint (eliminate 2 wrong answers) unlocks after spending 45s stuck on
  // the same unanswered question. Reset on every new question.
  useEffect(() => {
    setHintAvailable(false)
    setEliminated(new Set())
    setHintUsed(false)
    if (hasAnswered) return
    const timeout = setTimeout(() => setHintAvailable(true), HINT_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [index, hasAnswered])

  // Keeps the progress bar and streak HUD visible on every new question.
  useScrollToTop(index)

  function choose(choiceIndex: number, event: React.MouseEvent) {
    if (hasAnswered) return
    const correct = choiceIndex === question.correctIndex
    setSelected(choiceIndex)
    onAnswer(question.id, question.section, correct)
    setAnswers((prev) => [...prev, { questionId: question.id, chosenIndex: choiceIndex, correct, hintUsed }])
    if (correct) {
      setBurstOrigin({ x: event.clientX, y: event.clientY })
      onXpEarned(pointsForCorrectAnswer(currentStreak + 1, question.difficulty, hintUsed))
    }
  }

  function revealHint() {
    if (hasAnswered || !hintAvailable) return
    const wrongIndexes = question.choices
      .map((_, i) => i)
      .filter((i) => i !== question.correctIndex)
    const toEliminate = shuffle(wrongIndexes).slice(0, 2)
    setEliminated(new Set(toEliminate))
    setHintAvailable(false)
    setHintUsed(true)
  }

  function next() {
    if (isLast) {
      onFinish(answers, questionsById)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
  }

  return (
    <div className="screen practice">
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
        <span className="hud-score">✨ {summary.score.toLocaleString()}</span>
        {currentStreak >= 2 && (
          <span className="hud-streak">
            {currentTier.icon} {currentStreak}
            {currentTier.label ? ` · ${currentTier.label}` : ''}
          </span>
        )}
        <div className="hud-xp">
          <XpBar xp={displayedXp} />
        </div>
      </div>

      <SwipeableCard className="question-card" enabled={hasAnswered} onSwipe={next} rotate>
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
            } else if (eliminated.has(i)) {
              state = 'eliminated'
            }
            return (
              <button
                key={i}
                className={`choice ${state}`}
                onClick={(e) => choose(i, e)}
                disabled={hasAnswered || eliminated.has(i)}
              >
                <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                <span className="choice-body" dangerouslySetInnerHTML={{ __html: choice }} />
              </button>
            )
          })}
        </div>

        {!hasAnswered && hintAvailable && (
          <button className="hint-button" onClick={revealHint}>
            💡 Use hint (removes 2 wrong answers, halves XP)
          </button>
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
      </SwipeableCard>

      {hasAnswered && selected === question.correctIndex && (
        <Starburst key={question.id} origin={burstOrigin ?? undefined} />
      )}

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
