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
}
