import type { Difficulty, Question, SessionAnswer } from './types'

export const DIFFICULTY_POINTS: Record<Difficulty, number> = { E: 100, M: 150, H: 250 }
const DEFAULT_POINTS = 100

export interface StreakTier {
  min: number
  multiplier: number
  label: string | null
}

// Ordered low to high; the highest tier whose `min` the current streak meets applies.
// Labels escalate like a Quake arena-shooter kill streak announcer.
export const STREAK_TIERS: StreakTier[] = [
  { min: 0, multiplier: 1, label: null },
  { min: 2, multiplier: 1.15, label: 'Double Kill' },
  { min: 3, multiplier: 1.3, label: 'Multi Kill' },
  { min: 4, multiplier: 1.5, label: 'Ultra Kill' },
  { min: 5, multiplier: 1.65, label: 'Monster Kill' },
  { min: 6, multiplier: 1.8, label: 'Killing Spree' },
  { min: 7, multiplier: 2, label: 'Rampage' },
  { min: 8, multiplier: 2.25, label: 'Dominating' },
  { min: 9, multiplier: 2.5, label: 'Unstoppable' },
]

export function getStreakTier(streak: number): StreakTier {
  let tier = STREAK_TIERS[0]
  for (const t of STREAK_TIERS) {
    if (streak >= t.min) tier = t
  }
  return tier
}

export interface Rank {
  name: string
  minXp: number
}

export const RANKS: Rank[] = [
  { name: 'Recruit', minXp: 0 },
  { name: 'Private', minXp: 800 },
  { name: 'Corporal', minXp: 2000 },
  { name: 'Sergeant', minXp: 4000 },
  { name: 'Staff Sergeant', minXp: 7000 },
  { name: 'Lieutenant', minXp: 11000 },
  { name: 'Captain', minXp: 16000 },
  { name: 'Major', minXp: 23000 },
  { name: 'Colonel', minXp: 32000 },
  { name: 'General', minXp: 45000 },
]

export interface RankProgress {
  rank: Rank
  index: number
  nextRank: Rank | null
  xpIntoRank: number
  xpForNextRank: number | null
}

export function getRankProgress(xp: number): RankProgress {
  let index = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) index = i
  }
  const rank = RANKS[index]
  const nextRank = RANKS[index + 1] ?? null
  return {
    rank,
    index,
    nextRank,
    xpIntoRank: xp - rank.minXp,
    xpForNextRank: nextRank ? nextRank.minXp - rank.minXp : null,
  }
}

export interface Medal {
  id: string
  name: string
  description: string
  icon: string
}

export const MEDALS: Medal[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Answer your first question correctly.', icon: '🎖️' },
  { id: 'marksman', name: 'Marksman', description: 'Get a 5-answer correct streak in one session.', icon: '🎯' },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Get an 8-answer correct streak in one session.', icon: '🔥' },
  { id: 'ace', name: 'Ace', description: 'Answer every question correctly in a full session.', icon: '🏆' },
  { id: 'veteran', name: 'Veteran', description: 'Answer 100 questions, lifetime.', icon: '🪖' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Get 5 Hard-difficulty questions right in one session.', icon: '💥' },
]

export interface AnsweredPoint {
  answer: SessionAnswer
  streakAfter: number
  points: number
  tier: StreakTier
}

export interface SessionSummary {
  points: AnsweredPoint[]
  score: number
  correctCount: number
  total: number
  maxStreak: number
  hardCorrectCount: number
}

export function computeSessionSummary(answers: SessionAnswer[], questionsById: Map<string, Question>): SessionSummary {
  let streak = 0
  let maxStreak = 0
  let score = 0
  let correctCount = 0
  let hardCorrectCount = 0
  const points: AnsweredPoint[] = []

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId)
    if (answer.correct) {
      streak += 1
      correctCount += 1
      maxStreak = Math.max(maxStreak, streak)
      const base = (question?.difficulty && DIFFICULTY_POINTS[question.difficulty]) || DEFAULT_POINTS
      const tier = getStreakTier(streak)
      const earned = Math.round(base * tier.multiplier)
      score += earned
      if (question?.difficulty === 'H') hardCorrectCount += 1
      points.push({ answer, streakAfter: streak, points: earned, tier })
    } else {
      streak = 0
      points.push({ answer, streakAfter: 0, points: 0, tier: STREAK_TIERS[0] })
    }
  }

  return { points, score, correctCount, total: answers.length, maxStreak, hardCorrectCount }
}

export interface SessionResult {
  summary: SessionSummary
  xpBefore: number
  xpEarned: number
  newMedalIds: string[]
}

export function evaluateNewMedals(
  summary: SessionSummary,
  lifetimeAttempts: number,
  alreadyEarned: ReadonlySet<string>,
): string[] {
  const earned: string[] = []
  const qualifies = (id: string, condition: boolean) => {
    if (condition && !alreadyEarned.has(id)) earned.push(id)
  }

  qualifies('first_blood', summary.correctCount >= 1)
  qualifies('marksman', summary.maxStreak >= 5)
  qualifies('unstoppable', summary.maxStreak >= 8)
  qualifies('ace', summary.total >= 10 && summary.correctCount === summary.total)
  qualifies('veteran', lifetimeAttempts >= 100)
  qualifies('sharpshooter', summary.hardCorrectCount >= 5)

  return earned
}
