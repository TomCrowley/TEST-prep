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

  const applySessionRewards = useCallback((xpEarned: number, newMedalIds: string[]) => {
    setProfile((prev) => ({
      xp: prev.xp + xpEarned,
      medals: newMedalIds.length ? [...prev.medals, ...newMedalIds] : prev.medals,
    }))
  }, [])

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE)
  }, [])

  return { profile, applySessionRewards, resetProfile }
}
