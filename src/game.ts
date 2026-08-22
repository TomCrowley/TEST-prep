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
// (i.e. including it) and the question's difficulty. Using the hint halves it.
export function pointsForCorrectAnswer(streakAfter: number, difficulty: Difficulty | null, hintUsed = false): number {
  const base = (difficulty && DIFFICULTY_POINTS[difficulty]) || DEFAULT_POINTS
  const tier = getStreakTier(streakAfter)
  const points = base * tier.multiplier
  return Math.round(hintUsed ? points * 0.5 : points)
}

export interface Rank {
  name: string
  minXp: number
  description: string
}

// 40 ranks, a single ~1.137x-per-rank exponential climb (rank 1 is the
// fixed 0 XP starting point). Rank 20 (the middle) lands at 100,000 XP;
// rank 40 (Scholastic God) at 1,300,000 -- the same ceiling as before,
// still comfortably under the ~1.35M XP a clean, no-mistakes pass
// through every question in both banks earns (simulated, stable within
// +-5K across random play orders), so "answer everything correctly"
// still reaches the top rank rather than requiring repeat grinding.
//
// Each of the original 20 names got doubled into a pair: an adjective-
// qualified "lesser" tier followed by the plain name as its graduation --
// reusing real military qualifiers where one exists (Buck Private, Lance
// Corporal, Second Lieutenant, Lieutenant Colonel, Brigadier General are
// all genuine ranks) and matching invented ones for the mythic back half.
export const RANKS: Rank[] = [
  { name: 'Raw Recruit', minXp: 0, description: 'Fresh off the bus. Everyone starts here.' },
  { name: 'Recruit', minXp: 9900, description: 'Boots on the ground, orders understood.' },
  { name: 'Buck Private', minXp: 11300, description: 'Cleared basic. Still learning the ropes.' },
  { name: 'Private', minXp: 12800, description: 'Trusted with a rifle.' },
  { name: 'Lance Corporal', minXp: 14600, description: 'One step from leading a team.' },
  { name: 'Corporal', minXp: 16600, description: 'Leads a fire team.' },
  { name: 'Junior Sergeant', minXp: 18900, description: 'New stripes, already running drills.' },
  { name: 'Sergeant', minXp: 21500, description: 'Runs the squad, no excuses.' },
  { name: 'Trainee Staff Sergeant', minXp: 24400, description: 'Training for the stripes, not there yet.' },
  { name: 'Staff Sergeant', minXp: 27700, description: 'Senior NCO. Sets the standard.' },
  { name: 'Second Lieutenant', minXp: 31500, description: 'First officer stripes, still finding their feet.' },
  { name: 'Lieutenant', minXp: 35800, description: 'Leads from the front.' },
  { name: 'Deputy Captain', minXp: 40700, description: 'Given a command, still proving it.' },
  { name: 'Captain', minXp: 46300, description: 'Commands a full company.' },
  { name: 'Provisional Major', minXp: 52700, description: "Filling the post before it's made official." },
  { name: 'Major', minXp: 59900, description: 'Battalion staff. Plans the assault.' },
  { name: 'Lieutenant Colonel', minXp: 68100, description: 'Second-in-command of a regiment.' },
  { name: 'Colonel', minXp: 77400, description: 'Commands a regiment.' },
  { name: 'Brigadier General', minXp: 88000, description: "One star. The generals' ranks begin." },
  { name: 'General', minXp: 100000, description: 'Top of the chain of command.' },
  // Past General there's no higher real rank to hold, so the theme turns
  // from real military grades into increasingly mythic, knowledge-god
  // territory.
  { name: 'Vice Field Marshal', minXp: 114000, description: 'Second to the top field command, and close enough to touch it.' },
  { name: 'Field Marshal', minXp: 129000, description: 'Commands every front. As high as real armies go.' },
  { name: 'Rising Warlord', minXp: 147000, description: 'Carving out territory, one battle at a time.' },
  { name: 'Warlord', minXp: 167000, description: 'Answers to no one. Feared across the battlefield.' },
  { name: 'Budding Grandmaster', minXp: 190000, description: 'Sees ten moves ahead, still counting.' },
  { name: 'Grandmaster', minXp: 216000, description: 'The battlefield becomes a chessboard.' },
  { name: 'Emerging Mastermind', minXp: 245000, description: 'The plan is coming together.' },
  { name: 'Mastermind', minXp: 279000, description: 'Every question solved before it finishes being asked.' },
  { name: 'Young Sage', minXp: 317000, description: 'Wisdom beyond their years, and it shows.' },
  { name: 'Sage', minXp: 361000, description: 'Knowledge itself starts to bend to your will.' },
  { name: 'Lesser Oracle', minXp: 410000, description: 'Glimpses of the answer, not yet the certainty.' },
  { name: 'Oracle', minXp: 466000, description: 'You see the answer before the question is written.' },
  { name: 'Dawning Luminary', minXp: 530000, description: 'Word is starting to spread.' },
  { name: 'Luminary', minXp: 602000, description: 'A legend whispered about in study halls.' },
  { name: 'Minor Archon', minXp: 685000, description: "Holds a fraction of the throne's authority." },
  { name: 'Archon', minXp: 778000, description: 'Ruler of the exam realm.' },
  { name: 'Nascent Ascendant', minXp: 885000, description: 'Almost beyond rank entirely.' },
  { name: 'Ascendant', minXp: 1010000, description: 'Beyond rank. Beyond rival.' },
  { name: 'Aspiring Scholastic God', minXp: 1140000, description: 'Mortal, but not for long.' },
  { name: 'Scholastic God', minXp: 1300000, description: 'There is no higher truth. You are the curriculum.' },
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
    milestones: [1, 25, 100, 300, 750, 1500, 2500, 4000, 6000],
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
    milestones: [100, 300, 750, 1500, 3000, 5000, 7500, 10000, 15000],
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
    milestones: [50, 150, 400, 800, 1500, 2500, 3500, TOTAL_QUESTIONS],
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
      const earned = pointsForCorrectAnswer(streak, question?.difficulty ?? null, answer.hintUsed)
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
