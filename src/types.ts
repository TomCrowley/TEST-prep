export type Section = 'math' | 'reading'

export interface Question {
  id: string
  section: Section
  skill: string
  passage?: string
  prompt: string
  choices: string[]
  correctIndex: number
  explanation: string
}

export interface QuestionStat {
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
