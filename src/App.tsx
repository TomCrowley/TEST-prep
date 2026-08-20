import { useRef, useState } from 'react'
import { loadQuestions } from './questionBank'
import { shuffle } from './shuffle'
import { useProgress } from './useProgress'
import { useProfile } from './useProfile'
import { computeSessionSummary, evaluateNewMedals, type SessionResult } from './game'
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
  const { profile, addXp, awardMedals, resetProfile } = useProfile()
  const [screen, setScreen] = useState<Screen>('home')
  const [section, setSection] = useState<Section | 'all'>('all')
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // XP is awarded live per-answer (so leaving a session early keeps what
  // was earned); this just remembers where XP stood when the session
  // started, so the after-action report can show the gain and any rank-up.
  const sessionStartXp = useRef(0)

  async function startSession(chosenSection: Section | 'all') {
    setSection(chosenSection)
    setScreen('loading')
    setLoadError(null)
    try {
      const pool = await loadQuestions(chosenSection)
      setSessionQuestions(pickSession(pool, progress))
      setSessionResult(null)
      sessionStartXp.current = profile.xp
      setScreen('practice')
    } catch {
      setLoadError('Could not load questions. Check your connection and try again.')
      setScreen('home')
    }
  }

  function finishSession(answers: SessionAnswer[], questionsById: Map<string, Question>) {
    const summary = computeSessionSummary(answers, questionsById)
    const lifetimeAttempts = Object.values(progress).reduce((sum, s) => sum + s.attempts, 0)
    const newMedalIds = evaluateNewMedals(summary, lifetimeAttempts, new Set(profile.medals))
    awardMedals(newMedalIds)
    setSessionResult({ summary, xpBefore: sessionStartXp.current, xpEarned: summary.score, newMedalIds })
    setScreen('results')
  }

  function resetAll() {
    resetProgress()
    resetProfile()
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <Home progress={progress} profile={profile} onStart={startSession} onReset={resetAll} error={loadError} />
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
          onXpEarned={addXp}
          onFinish={finishSession}
          onExit={() => setScreen('home')}
        />
      )}
      {screen === 'results' && sessionResult && (
        <Results
          questions={sessionQuestions}
          result={sessionResult}
          onPracticeAgain={() => startSession(section)}
          onHome={() => setScreen('home')}
        />
      )}
    </div>
  )
}

export default App
