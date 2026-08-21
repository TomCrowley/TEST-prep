import { useCallback, useEffect, useRef, useState } from 'react'
import { loadQuestions } from './questionBank'
import { shuffle } from './shuffle'
import { useProgress } from './useProgress'
import { useProfile } from './useProfile'
import { computeSessionSummary, evaluateNewMedals, SESSION_COMPLETE_BONUS, type SessionResult } from './game'
import type { Question, Section, SessionAnswer } from './types'
import { loadSession, saveSession, clearSession } from './sessionPersistence'
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

  // Read once on mount: if the tab was refreshed mid-session, resume
  // exactly where it left off instead of dropping back to the home screen.
  const [restored] = useState(() => loadSession())

  const [screen, setScreen] = useState<Screen>(restored?.screen ?? 'home')
  const [section, setSection] = useState<Section | 'all'>(restored?.section ?? 'all')
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(restored?.questions ?? [])
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(
    restored?.screen === 'results' ? restored.result : null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  // XP is awarded live per-answer (so leaving a session early keeps what
  // was earned); this just remembers where XP stood when the session
  // started, so the after-action report can show the gain and any rank-up.
  const sessionStartXp = useRef(restored?.screen === 'practice' ? restored.sessionStartXp : 0)

  // Only the very first "practice" mount (a resumed session, if any) should
  // seed from this. Every session started afterward -- fresh or "practice
  // again" -- must start clean, so this gets cleared in startSession().
  const [resumedPractice, setResumedPractice] = useState(() =>
    restored?.screen === 'practice' ? restored : null,
  )

  useEffect(() => {
    if (screen === 'results' && sessionResult) {
      saveSession({ screen: 'results', section, questions: sessionQuestions, result: sessionResult })
    }
    // 'practice' persists via onProgressChange below (it knows index/selected/answers).
    // 'home' and 'loading' have nothing worth resuming.
  }, [screen, section, sessionQuestions, sessionResult])

  const handlePracticeProgress = useCallback(
    (index: number, selected: number | null, answers: SessionAnswer[]) => {
      saveSession({
        screen: 'practice',
        section,
        questions: sessionQuestions,
        index,
        selected,
        answers,
        sessionStartXp: sessionStartXp.current,
      })
    },
    [section, sessionQuestions],
  )

  async function startSession(chosenSection: Section | 'all') {
    clearSession()
    setResumedPractice(null)
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
    const progressStats = Object.values(progress)
    const lifetime = {
      attempts: progressStats.reduce((sum, s) => sum + s.attempts, 0),
      correct: progressStats.reduce((sum, s) => sum + s.correct, 0),
      distinctSeen: progressStats.length,
    }
    const earnedCounts: Record<string, number> = {}
    for (const id of profile.medals) earnedCounts[id] = (earnedCounts[id] ?? 0) + 1
    const newMedalIds = evaluateNewMedals(summary, lifetime, earnedCounts)
    awardMedals(newMedalIds)
    addXp(SESSION_COMPLETE_BONUS)
    setSessionResult({
      summary,
      xpBefore: sessionStartXp.current,
      xpEarned: summary.score + SESSION_COMPLETE_BONUS,
      completionBonus: SESSION_COMPLETE_BONUS,
      newMedalIds,
    })
    setScreen('results')
  }

  function goHome() {
    clearSession()
    setScreen('home')
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
          xp={profile.xp}
          initialIndex={resumedPractice?.index}
          initialSelected={resumedPractice?.selected}
          initialAnswers={resumedPractice?.answers}
          onAnswer={recordAnswer}
          onXpEarned={addXp}
          onProgressChange={handlePracticeProgress}
          onFinish={finishSession}
          onExit={goHome}
        />
      )}
      {screen === 'results' && sessionResult && (
        <Results
          questions={sessionQuestions}
          result={sessionResult}
          onPracticeAgain={() => startSession(section)}
          onHome={goHome}
        />
      )}
    </div>
  )
}

export default App
