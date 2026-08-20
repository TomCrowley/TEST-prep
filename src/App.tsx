import { useState } from 'react'
import { questions } from './data/questions'
import { shuffle } from './shuffle'
import { useProgress } from './useProgress'
import type { Question, Section, SessionAnswer } from './types'
import Home from './components/Home'
import Practice from './components/Practice'
import Results from './components/Results'

const SESSION_LENGTH = 10

type Screen = 'home' | 'practice' | 'results'

function buildSession(section: Section | 'all'): Question[] {
  const pool = section === 'all' ? questions : questions.filter((q) => q.section === section)
  return shuffle(pool).slice(0, SESSION_LENGTH)
}

function App() {
  const { progress, recordAnswer, resetProgress } = useProgress()
  const [screen, setScreen] = useState<Screen>('home')
  const [section, setSection] = useState<Section | 'all'>('all')
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([])

  function startSession(chosenSection: Section | 'all') {
    setSection(chosenSection)
    setSessionQuestions(buildSession(chosenSection))
    setSessionAnswers([])
    setScreen('practice')
  }

  function finishSession(answers: SessionAnswer[]) {
    setSessionAnswers(answers)
    setScreen('results')
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <Home questions={questions} progress={progress} onStart={startSession} onReset={resetProgress} />
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
