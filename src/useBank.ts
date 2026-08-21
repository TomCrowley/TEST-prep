import { useCallback, useState } from 'react'
import type { Bank } from './types'

const STORAGE_KEY = 'sat-prep-bank'

function loadBank(): Bank {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw === 'sat' ? 'sat' : 'psat'
}

export function useBank() {
  const [bank, setBankState] = useState<Bank>(() => loadBank())

  const setBank = useCallback((next: Bank) => {
    setBankState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return { bank, setBank }
}
