import { useMemo, useState } from 'react'
import type { Question, Section, SessionAnswer } from '../types'
import { computeSessionSummary, getStreakTier } from '../game'

interface Props {
  questions: Question[]
  onAnswer: (questionId: string, section: Section, correct: boolean) => void
  onFinish: (answers: SessionAnswer[], questionsById: Map<string, Question>) => void
  onExit: () => void
}

const DIFFICULTY_LABEL: Record<string, string> = { E: 'Easy', M: 'Medium', H: 'Hard' }

export default function Practice({ questions, onAnswer, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<SessionAnswer[]>([])

  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const summary = useMemo(() => computeSessionSummary(answers, questionsById), [answers, questionsById])
  const lastPoint = summary.points[summary.points.length - 1] ?? null
  const currentStreak = lastPoint?.streakAfter ?? 0
  const currentTier = getStreakTier(currentStreak)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const hasAnswered = selected !== null

  function choose(choiceIndex: number) {
    if (hasAnswered) return
    const correct = choiceIndex === question.correctIndex
    setSelected(choiceIndex)
    onAnswer(question.id, question.section, correct)
    setAnswers((prev) => [...prev, { questionId: question.id, chosenIndex: choiceIndex, correct }])
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
        <span className="hud-score">⭐ {summary.score.toLocaleString()}</span>
        {currentStreak >= 2 && (
          <span className="hud-streak">
            🔥 {currentStreak}
            {currentTier.label ? ` · ${currentTier.label}` : ''}
          </span>
        )}
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
                onClick={() => choose(i)}
                disabled={hasAnswered}
              >
                <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                <span className="choice-body" dangerouslySetInnerHTML={{ __html: choice }} />
              </button>
            )
          })}
        </div>

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
        <button className="primary-button" onClick={next}>
          {isLast ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  )
}
