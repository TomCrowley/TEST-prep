import type { Bank, Question, Section } from './types'

// Sourced from the College Board digital SAT and PSAT/NMSQT & PSAT 10
// question banks (see scripts/fetch-psat-questions.py and
// scripts/build-question-bank.py). Kept as constants so the home screen
// can show "seen / total" without fetching the full question sets.
export const SECTION_TOTALS: Record<Bank, Record<Section, number>> = {
  sat: { math: 426, reading: 938 },
  psat: { math: 1001, reading: 1844 },
}

function dataFileName(bank: Bank, section: Section): string {
  return bank === 'psat' ? `psat-${section}.json` : `${section}.json`
}

// build-question-bank.py prefixes every PSAT question id with "psat-" so
// the two banks' ids can never collide in ProgressMap, which doesn't
// otherwise track which bank a question came from.
export function bankOfQuestionId(id: string): Bank {
  return id.startsWith('psat-') ? 'psat' : 'sat'
}

const cache = new Map<string, Promise<Question[]>>()

function fetchSection(bank: Bank, section: Section): Promise<Question[]> {
  const key = `${bank}/${section}`
  let pending = cache.get(key)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/${dataFileName(bank, section)}`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${key} questions (${res.status})`)
      return res.json() as Promise<Question[]>
    })
    cache.set(key, pending)
  }
  return pending
}

export async function loadQuestions(bank: Bank, section: Section | 'all'): Promise<Question[]> {
  if (section === 'all') {
    const [math, reading] = await Promise.all([fetchSection(bank, 'math'), fetchSection(bank, 'reading')])
    return [...math, ...reading]
  }
  return fetchSection(bank, section)
}
