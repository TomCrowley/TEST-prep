import type { Difficulty, Question, SessionAnswer } from './types'
import { SECTION_TOTALS } from './questionBank'

// Recon's final milestone is "seen everything" -- across both banks, since
// distinctSeen counts SAT and PSAT questions together (rewards aren't
// split by bank, only the question pool is).
const TOTAL_QUESTIONS = Object.values(SECTION_TOTALS).reduce((sum, totals) => sum + totals.math + totals.reading, 0)

export const DIFFICULTY_POINTS: Record<Difficulty, number> = { E: 100, M: 150, H: 250 }
const DEFAULT_POINTS = 100

// Flat bonus for finishing a full session (as opposed to exiting early) —
// worth one Easy question.
export const SESSION_COMPLETE_BONUS = DIFFICULTY_POINTS.E

export interface StreakTier {
  min: number
  multiplier: number
  label: string | null
  icon: string
}

// Ordered low to high; the highest tier whose `min` the current streak meets applies.
// Labels escalate like a Quake arena-shooter kill streak announcer.
export const STREAK_TIERS: StreakTier[] = [
  { min: 0, multiplier: 1, label: null, icon: '🔥' },
  { min: 2, multiplier: 1.15, label: 'Double Kill', icon: '⚡' },
  { min: 3, multiplier: 1.3, label: 'Multi Kill', icon: '💥' },
  { min: 4, multiplier: 1.5, label: 'Ultra Kill', icon: '🔥' },
  { min: 5, multiplier: 1.65, label: 'Monster Kill', icon: '👹' },
  { min: 6, multiplier: 1.8, label: 'Killing Spree', icon: '☠️' },
  { min: 7, multiplier: 2, label: 'Rampage', icon: '🌪️' },
  { min: 8, multiplier: 2.25, label: 'Dominating', icon: '👑' },
  { min: 9, multiplier: 2.5, label: 'Unstoppable', icon: '🚀' },
]

export function getStreakTier(streak: number): StreakTier {
  let tier = STREAK_TIERS[0]
  for (const t of STREAK_TIERS) {
    if (streak >= t.min) tier = t
  }
  return tier
}

// Points for a correct answer, given the streak count *after* this answer
// (i.e. including it) and the question's difficulty.
export function pointsForCorrectAnswer(streakAfter: number, difficulty: Difficulty | null): number {
  const base = (difficulty && DIFFICULTY_POINTS[difficulty]) || DEFAULT_POINTS
  const tier = getStreakTier(streakAfter)
  return Math.round(base * tier.multiplier)
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
  // All medals can be earned again -- session-based ones (Marksman,
  // Unstoppable, Ace, Sharpshooter) whenever a later session requalifies,
  // and milestone ones (First Blood, Veteran, Recon) every time their
  // running lifetime total crosses the next threshold in `milestones`.
  repeatable: boolean
  /** Escalating lifetime thresholds for milestone medals. Undefined for
   *  session-based achievement medals, which are just re-checked fresh
   *  each session instead. */
  milestones?: number[]
}

export const MEDALS: Medal[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Rack up correct answers, lifetime.',
    icon: '🎖️',
    repeatable: true,
    milestones: [1, 25, 100, 300, 750, 1500],
  },
  {
    id: 'marksman',
    name: 'Marksman',
    description: 'Get a 5-answer correct streak in one session.',
    icon: '🎯',
    repeatable: true,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Get an 8-answer correct streak in one session.',
    icon: '🔥',
    repeatable: true,
  },
  {
    id: 'ace',
    name: 'Ace',
    description: 'Answer every question correctly in a full session.',
    icon: '🏆',
    repeatable: true,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Rack up question attempts, lifetime.',
    icon: '🪖',
    repeatable: true,
    milestones: [100, 300, 750, 1500, 3000, 5000],
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Get 5 Hard-difficulty questions right in one session.',
    icon: '💥',
    repeatable: true,
  },
  {
    id: 'recon',
    name: 'Recon',
    description: 'See new questions from the bank, lifetime.',
    icon: '🗺️',
    repeatable: true,
    milestones: [50, 150, 400, 800, TOTAL_QUESTIONS],
  },
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
      const tier = getStreakTier(streak)
      const earned = pointsForCorrectAnswer(streak, question?.difficulty ?? null)
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
  completionBonus: number
  newMedalIds: string[]
}

export interface LifetimeStats {
  attempts: number
  correct: number
  distinctSeen: number
}

// `earnedCounts` (how many times each medal id already appears in the
// player's profile) rather than a plain earned/not-earned set, since a
// milestone medal's next threshold depends on how many it's already
// crossed, not just whether it's ever fired once.
export function evaluateNewMedals(
  summary: SessionSummary,
  lifetime: LifetimeStats,
  earnedCounts: Readonly<Record<string, number>>,
): string[] {
  const earned: string[] = []

  const qualifiesThisSession = (id: string, condition: boolean) => {
    if (condition) earned.push(id)
  }

  // Awards one copy of `id` for every threshold in its `milestones` list
  // that the current lifetime total has crossed but wasn't already
  // credited for -- normally 0 or 1 per session, but handles a session
  // that leaps past more than one threshold at once too.
  const qualifiesMilestones = (id: string, value: number) => {
    const medal = MEDALS.find((m) => m.id === id)
    const thresholds = medal?.milestones ?? []
    const crossed = thresholds.filter((t) => value >= t).length
    const newlyCrossed = crossed - (earnedCounts[id] ?? 0)
    for (let i = 0; i < newlyCrossed; i++) earned.push(id)
  }

  qualifiesThisSession('marksman', summary.maxStreak >= 5)
  qualifiesThisSession('unstoppable', summary.maxStreak >= 8)
  qualifiesThisSession('ace', summary.total >= 10 && summary.correctCount === summary.total)
  qualifiesThisSession('sharpshooter', summary.hardCorrectCount >= 5)

  qualifiesMilestones('first_blood', lifetime.correct)
  qualifiesMilestones('veteran', lifetime.attempts)
  qualifiesMilestones('recon', lifetime.distinctSeen)

  return earned
}
