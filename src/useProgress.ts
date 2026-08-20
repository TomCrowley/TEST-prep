import { useCallback, useEffect, useState } from 'react'
import type { ProgressMap, Section } from './types'

const STORAGE_KEY = 'sat-prep-progress'

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const recordAnswer = useCallback((questionId: string, section: Section, correct: boolean) => {
    setProgress((prev) => {
      const existing = prev[questionId]
      const attempts = (existing?.attempts ?? 0) + 1
      const correctCount = (existing?.correct ?? 0) + (correct ? 1 : 0)
      return {
        ...prev,
        [questionId]: { section, attempts, correct: correctCount, lastCorrect: correct },
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setProgress({})
  }, [])

  return { progress, recordAnswer, resetProgress }
}
