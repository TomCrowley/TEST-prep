import type { Question, Section, SessionAnswer } from './types'
import type { SessionResult } from './game'

const KEY = 'sat-prep-active-session'

// sessionStorage (not localStorage): it survives an accidental refresh in
// this tab but doesn't linger forever like an abandoned localStorage entry
// would if the user closes the browser mid-session.
export type PersistedSession =
  | {
      screen: 'practice'
      section: Section | 'all'
      questions: Question[]
      index: number
      selected: number | null
      answers: SessionAnswer[]
      sessionStartXp: number
    }
  | {
      screen: 'results'
      section: Section | 'all'
      questions: Question[]
      result: SessionResult
    }

export function saveSession(session: PersistedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // storage unavailable (e.g. private browsing) -- resuming just won't work
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
