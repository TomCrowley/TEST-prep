import type { Question, Section } from './types'

// Sourced from the College Board digital SAT question bank (see
// scripts/build-question-bank.py). Kept as constants so the home screen
// can show "seen / total" without fetching the full question sets.
export const SECTION_TOTALS: Record<Section, number> = {
  math: 426,
  reading: 938,
}

const cache = new Map<Section, Promise<Question[]>>()

function fetchSection(section: Section): Promise<Question[]> {
  let pending = cache.get(section)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/${section}.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${section} questions (${res.status})`)
      return res.json() as Promise<Question[]>
    })
    cache.set(section, pending)
  }
  return pending
}

export async function loadQuestions(section: Section | 'all'): Promise<Question[]> {
  if (section === 'all') {
    const [math, reading] = await Promise.all([fetchSection('math'), fetchSection('reading')])
    return [...math, ...reading]
  }
  return fetchSection(section)
}
