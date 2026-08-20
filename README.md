# SAT Prep

A mobile-first SAT practice app. Pick a section, work through a shuffled
set of questions, get instant feedback with an explanation, then review
anything you missed. Progress (attempts/accuracy per question) is saved
to `localStorage` so stats persist between visits.

## Features

- **Math** and **Reading & Writing** question sets, plus a **Mixed**
  shuffle across both.
- Instant per-question feedback with an explanation.
- End-of-session results with a missed-question review.
- Per-section and overall accuracy tracked locally, no account/backend.
- Single-column, large-tap-target layout designed for phones first.

## Development

```
npm install
npm run dev      # local dev server
npm run build     # typecheck + production build
npm run lint       # oxlint
```

## Structure

- `src/data/questions.ts` — the question bank (`Question[]`).
- `src/useProgress.ts` — localStorage-backed progress tracking hook.
- `src/components/Home.tsx` — section picker + stats.
- `src/components/Practice.tsx` — question flow with instant feedback.
- `src/components/Results.tsx` — session summary + missed-question review.

To add questions, append to the array in `src/data/questions.ts` —
each entry needs `id`, `section` (`'math' | 'reading'`), `skill`,
`prompt`, `choices`, `correctIndex`, and `explanation` (`passage` is
optional, for Reading & Writing items with a short excerpt).
