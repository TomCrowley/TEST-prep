import { useState } from 'react'
import type { Bank, ProgressMap, Section } from '../types'
import { SECTION_TOTALS, bankOfQuestionId } from '../questionBank'
import { MEDALS, getRankProgress } from '../game'
import type { Profile } from '../useProfile'
import XpBar from './XpBar'

interface Props {
  progress: ProgressMap
  profile: Profile
  bank: Bank
  onBankChange: (bank: Bank) => void
  onStart: (section: Section | 'all') => void
  onReset: () => void
  onOpenRanks: () => void
  error?: string | null
}

function sectionStats(progress: ProgressMap, bank: Bank, section?: Section) {
  let attempts = 0
  let correct = 0
  let answered = 0
  const totals = SECTION_TOTALS[bank]
  const total = section ? totals[section] : totals.math + totals.reading

  for (const [id, stat] of Object.entries(progress)) {
    if (bankOfQuestionId(id) !== bank) continue
    if (section && stat.section !== section) continue
    answered += 1
    attempts += stat.attempts
    correct += stat.correct
  }

  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null
  return { answered, total, accuracy }
}

const BANK_LABELS: Record<Bank, string> = { sat: 'SAT', psat: 'PSAT' }

export default function Home({ progress, profile, bank, onBankChange, onStart, onReset, onOpenRanks, error }: Props) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [activeMedalId, setActiveMedalId] = useState<string | null>(null)
  const overall = sectionStats(progress, bank)
  const math = sectionStats(progress, bank, 'math')
  const reading = sectionStats(progress, bank, 'reading')
  // Reset clears progress for every bank at once, so whether to show the
  // link can't be scoped to the currently toggled bank's answered count --
  // that would hide it while viewing PSAT even though SAT progress (or vice
  // versa) still exists to reset.
  const hasAnyProgress = Object.keys(progress).length > 0
  const rankProgress = getRankProgress(profile.xp)
  const activeMedal = MEDALS.find((m) => m.id === activeMedalId) ?? null

  return (
    <div className="screen home">
      <header className="hero">
        <h1>BattlePrep II</h1>
        <p className="tagline">Campus Invasion Edition</p>
        <p className="subtitle">{BANK_LABELS[bank]} Math and Reading &amp; Writing, gamified.</p>
      </header>

      {error && <p className="error-message">{error}</p>}

      <button className="rank-card" onClick={onOpenRanks}>
        <div className="rank-top">
          <span className="rank-name">
            {rankProgress.rank.name} <span className="rank-xp">· {profile.xp.toLocaleString()} XP</span>
          </span>
          <span className="rank-accuracy">{overall.accuracy === null ? '—' : `🎯 ${overall.accuracy}%`}</span>
        </div>
        <XpBar xp={profile.xp} />
        <div className="rank-next">
          <span>
            {rankProgress.nextRank
              ? `${(rankProgress.xpForNextRank! - rankProgress.xpIntoRank).toLocaleString()} XP to ${rankProgress.nextRank.name}`
              : 'Max rank reached'}
          </span>
          <span className="rank-seen">
            {overall.answered}/{overall.total} seen
          </span>
        </div>
      </button>

      <div className="medal-case">
        {MEDALS.map((medal) => {
          const count = profile.medals.filter((id) => id === medal.id).length
          const earned = count > 0
          return (
            <button
              key={medal.id}
              type="button"
              className={`medal ${earned ? 'earned' : 'locked'}${activeMedalId === medal.id ? ' active' : ''}`}
              title={`${medal.name} — ${medal.description}`}
              onClick={() => setActiveMedalId((id) => (id === medal.id ? null : medal.id))}
            >
              <span className="medal-icon">{medal.icon}</span>
              {medal.repeatable && count > 1 && <span className="medal-count">x{count}</span>}
            </button>
          )
        })}
      </div>

      {activeMedal && (
        <div className="medal-detail">
          <span className="medal-detail-icon">{activeMedal.icon}</span>
          <div>
            <div className="medal-detail-name">
              {activeMedal.name}
              {(() => {
                const count = profile.medals.filter((id) => id === activeMedal.id).length
                if (count === 0) return <span className="medal-detail-locked"> · locked</span>
                if (activeMedal.repeatable && count > 1) return <span className="medal-detail-count"> · x{count}</span>
                return null
              })()}
            </div>
            <div className="medal-detail-desc">{activeMedal.description}</div>
          </div>
          <button className="medal-detail-close" onClick={() => setActiveMedalId(null)} aria-label="Close">
            ✕
          </button>
        </div>
      )}

      <div className="section-list">
        <button className="section-card" onClick={() => onStart('math')}>
          <div className="section-card-top">
            <span className="section-name">Math</span>
            <span className="section-badge">{math.accuracy === null ? '—' : `${math.accuracy}%`}</span>
          </div>
          <span className="section-meta">
            {math.answered}/{math.total} seen · algebra, geometry, data
          </span>
        </button>

        <button className="section-card" onClick={() => onStart('reading')}>
          <div className="section-card-top">
            <span className="section-name">Reading &amp; Writing</span>
            <span className="section-badge">{reading.accuracy === null ? '—' : `${reading.accuracy}%`}</span>
          </div>
          <span className="section-meta">
            {reading.answered}/{reading.total} seen · grammar, vocab, logic
          </span>
        </button>

        <button className="section-card" onClick={() => onStart('all')}>
          <div className="section-card-top">
            <span className="section-name">Mixed practice</span>
            <span className="section-badge">{overall.accuracy === null ? '—' : `${overall.accuracy}%`}</span>
          </div>
          <span className="section-meta">A shuffled set from both sections</span>
        </button>
      </div>

      <div className="home-footer">
        <div className="bank-toggle">
          <span className="bank-toggle-label">Question bank</span>
          <div className="bank-toggle-buttons">
            {(Object.keys(BANK_LABELS) as Bank[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`bank-toggle-button${bank === option ? ' active' : ''}`}
                onClick={() => onBankChange(option)}
              >
                {BANK_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {hasAnyProgress && (
          <button className="reset-link" onClick={() => setConfirmingReset(true)}>
            Reset progress
          </button>
        )}
      </div>

      {confirmingReset && (
        <div className="modal-overlay" onClick={() => setConfirmingReset(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-message">
              Are you sure you want to reset your progress? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-button modal-button-danger"
                onClick={() => {
                  onReset()
                  setConfirmingReset(false)
                }}
              >
                Reset
              </button>
              <button className="modal-button modal-button-cancel" onClick={() => setConfirmingReset(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
