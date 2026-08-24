export type Section = 'math' | 'reading'
export type Bank = 'sat' | 'psat'
export type Difficulty = 'E' | 'M' | 'H'

export interface Question {
  id: string
  section: Section
  skill: string
  difficulty: Difficulty | null
  /** HTML: the passage/stimulus a Reading & Writing question refers to, if any. */
  passageHtml: string | null
  /** HTML: the question itself (may contain MathML for Math questions). */
  promptHtml: string
  /** HTML per choice, in display order. */
  choices: string[]
  correctIndex: number
  /** HTML explanation of the correct answer. */
  explanationHtml: string
  /** One-sentence plain-text summary of explanationHtml, shown before it.
   *  Null: not yet reviewed. Empty string: reviewed, judged not worth one
   *  (short/already-terse explanation). Non-empty: the summary. */
  tldr: string | null
}

export interface QuestionStat {
  section: Section
  attempts: number
  correct: number
  lastCorrect: boolean
}

export type ProgressMap = Record<string, QuestionStat>

export interface SessionAnswer {
  questionId: string
  chosenIndex: number
  correct: boolean
  /** Whether the hint (eliminate 2 wrong answers) was used before answering -- halves the XP earned. */
  hintUsed: boolean
}
