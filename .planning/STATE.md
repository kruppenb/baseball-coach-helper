# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.
**Current focus:** Phase 3 - Batting Order

## Current Position

Phase: 3 of 4 (Batting Order)
Plan: 1 of 2 complete
Status: In Progress
Last activity: 2026-02-10 -- Completed 03-01 (Batting Order Algorithm)

Progress: [#####-----] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 6 min
- Total execution time: 57 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 9 min | 3 min |
| 02-lineup-engine | 5/5 | 46 min | 9 min |
| 03-batting-order | 1/2 | 2 min | 2 min |

**Recent Trend:**
- 01-02: 2 min (2 tasks, 9 files)
- 01-03: 3 min (2 tasks, 11 files)
- 02-01: 12 min (4 tasks, 8 files)
- 02-02: 4 min (3 tasks, 2 files)
- 02-03: 3 min (2 tasks, 5 files)
- 02-04: 2 min (2 tasks, 5 files)
- 02-05: 25 min (3 tasks, 6 files)
- 03-01: 2 min (2 tasks, 3 files)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- CSS Modules with CSS custom properties for styling (no Tailwind, no component library)
- Conditional tab panel rendering (simpler, roster data persists via localStorage)
- Disabled Lineup and History tabs shown in tab bar for future scalability
- Single-input inline edit pattern for player names (always an input, styled as text when idle)
- Two-step delete confirmation inline (no modal dialogs) for player removal
- RosterPage consumes useRoster() directly (no prop drilling through AppShell)
- Innings default to 6 per user decision (persistent setting, set once, stays until changed)
- Entire player row is tappable button with role=switch for attendance toggle
- Absent players dimmed with opacity 0.45 and line-through text decoration
- Dev server port changed to 5180 per user request
- Used 10-player lineup for valid test case (11 players with fixed P/C makes infield minimum mathematically unsatisfiable)
- Separated vitest.config.ts from vite.config.ts for vitest v4 TypeScript compatibility
- INFIELD_POSITIONS includes P and C (6 positions total) per plan spec
- Fisher-Yates shuffle for unbiased lineup generation randomization
- Pre-validation before generation to fail fast on impossible inputs
- Meaningful lineup deduplication: bench + infield differences, not outfield swaps
- P/C assignments optional per inning -- generator picks randomly when unassigned
- Pure presentational components with no hooks for PreAssignments and PositionBlocks
- Native <select> for P/C dropdowns (mobile-friendly per research)
- HTML <details>/<summary> for collapsible position blocks (zero JS state)
- useLineup uses Record types throughout (not Map/Set) for JSON-serializable localStorage persistence
- Stale P/C assignments auto-cleaned when innings count changes
- LineupGrid and ValidationPanel are purely presentational -- no hooks, all data via props
- LineupOptions renders selectable cards showing bench rotation per lineup option
- LineupPage container owns status message state for generation feedback
- AppShell dynamically enables Lineup tab when presentCount >= 9
- Auto-redirect from Lineup to Game Setup if player count drops below 9
- useLocalStorage cross-component sync via custom events for real-time state updates
- Fisher-Yates shuffle duplicated in batting-order.ts (not shared utility) to keep modules independent
- Fairness score = top - bottom band counts (ascending sort pushes top-heavy players down)
- PlayerBandCounts interface kept module-private (not exported from types)

### Pending Todos

- Per-player fairness summary on lineup grid: show infield innings count (P/C count as infield) and bench innings per kid so coach can validate fairness at a glance. Target: Phase 3 or 4.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-10 (plan 03-01 execution)
Stopped at: Completed 03-01-PLAN.md (Batting Order Algorithm)
Resume file: None
