import { useState } from 'react'
import { loadQuestions } from './questionBank'
import { shuffle } from './shuffle'
import { useProgress } from './useProgress'
import type { Question, Section, SessionAnswer } from './types'
import Home from './components/Home'
import Practice from './components/Practice'
import Results from './components/Results'

const SESSION_LENGTH = 10

type Screen = 'home' | 'loading' | 'practice' | 'results'

function pickSession(pool: Question[], progress: ReturnType<typeof useProgress>['progress']): Question[] {
  const unseen = pool.filter((q) => !progress[q.id])
  const seen = pool.filter((q) => progress[q.id])
  const ordered = [...shuffle(unseen), ...shuffle(seen)]
  return shuffle(ordered.slice(0, SESSION_LENGTH))
}

function App() {
  const { progress, recordAnswer, resetProgress } = useProgress()
  const [screen, setScreen] = useState<Screen>('home')
  const [section, setSection] = useState<Section | 'all'>('all')
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  async function startSession(chosenSection: Section | 'all') {
    setSection(chosenSection)
    setScreen('loading')
    setLoadError(null)
    try {
      const pool = await loadQuestions(chosenSection)
      setSessionQuestions(pickSession(pool, progress))
      setSessionAnswers([])
      setScreen('practice')
    } catch {
      setLoadError('Could not load questions. Check your connection and try again.')
      setScreen('home')
    }
  }

  function finishSession(answers: SessionAnswer[]) {
    setSessionAnswers(answers)
    setScreen('results')
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <Home progress={progress} onStart={startSession} onReset={resetProgress} error={loadError} />
      )}
      {screen === 'loading' && (
        <div className="screen loading">
          <div className="spinner" />
          <p>Loading questions…</p>
        </div>
      )}
      {screen === 'practice' && (
        <Practice
          questions={sessionQuestions}
          onAnswer={recordAnswer}
          onFinish={finishSession}
          onExit={() => setScreen('home')}
        />
      )}
      {screen === 'results' && (
        <Results
          questions={sessionQuestions}
          answers={sessionAnswers}
          onPracticeAgain={() => startSession(section)}
          onHome={() => setScreen('home')}
        />
      )}
    </div>
  )
}

export default App
