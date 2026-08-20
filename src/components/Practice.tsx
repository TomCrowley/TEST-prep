import { useState } from 'react'
import type { Question, SessionAnswer } from '../types'

interface Props {
  questions: Question[]
  onAnswer: (questionId: string, correct: boolean) => void
  onFinish: (answers: SessionAnswer[]) => void
  onExit: () => void
}

export default function Practice({ questions, onAnswer, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<SessionAnswer[]>([])

  const question = questions[index]
  const isLast = index === questions.length - 1
  const hasAnswered = selected !== null

  function choose(choiceIndex: number) {
    if (hasAnswered) return
    const correct = choiceIndex === question.correctIndex
    setSelected(choiceIndex)
    onAnswer(question.id, correct)
    setAnswers((prev) => [...prev, { questionId: question.id, chosenIndex: choiceIndex, correct }])
  }

  function next() {
    if (isLast) {
      onFinish(answers)
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

      <div className="question-card">
        <span className="skill-tag">{question.skill}</span>
        {question.passage && <p className="passage">{question.passage}</p>}
        <p className="prompt">{question.prompt}</p>

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
                <span>{choice}</span>
              </button>
            )
          })}
        </div>

        {hasAnswered && (
          <div className={`feedback ${selected === question.correctIndex ? 'good' : 'bad'}`}>
            <p className="feedback-title">
              {selected === question.correctIndex ? 'Correct' : 'Not quite'}
            </p>
            <p className="feedback-explanation">{question.explanation}</p>
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
