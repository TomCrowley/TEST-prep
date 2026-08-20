import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sat-prep-profile'

export interface Profile {
  xp: number
  medals: string[]
}

const DEFAULT_PROFILE: Profile = { xp: 0, medals: [] }

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<Profile>
    return { xp: parsed.xp ?? 0, medals: parsed.medals ?? [] }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  // Awarded the instant a question is answered correctly, so XP earned so
  // far is never lost by exiting a session before it's finished.
  const addXp = useCallback((amount: number) => {
    if (amount === 0) return
    setProfile((prev) => ({ ...prev, xp: prev.xp + amount }))
  }, [])

  // Medals require full-session context (a perfect session, a streak
  // within one session), so they're only awarded once a session finishes.
  const awardMedals = useCallback((newMedalIds: string[]) => {
    if (newMedalIds.length === 0) return
    setProfile((prev) => ({ ...prev, medals: [...prev.medals, ...newMedalIds] }))
  }, [])

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE)
  }, [])

  return { profile, addXp, awardMedals, resetProfile }
}
