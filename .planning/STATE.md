# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.
**Current focus:** Phase 4 - History & Output

## Current Position

Phase: 4 of 4 (History & Output)
Plan: 2 of 5 complete
Status: Executing
Last activity: 2026-02-10 -- Completed 04-02 (CSV Import/Export)

Progress: [########--] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 5 min
- Total execution time: 65 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 9 min | 3 min |
| 02-lineup-engine | 5/5 | 46 min | 9 min |
| 03-batting-order | 2/2 | 4 min | 2 min |
| 03.1-ui-fixes | 2/2 | 4 min | 2 min |
| 04-history-output | 2/5 | 2 min | 1 min |

**Recent Trend:**
- 01-02: 2 min (2 tasks, 9 files)
- 01-03: 3 min (2 tasks, 11 files)
- 02-01: 12 min (4 tasks, 8 files)
- 02-02: 4 min (3 tasks, 2 files)
- 02-03: 3 min (2 tasks, 5 files)
- 02-04: 2 min (2 tasks, 5 files)
- 02-05: 25 min (3 tasks, 6 files)
- 03-01: 2 min (2 tasks, 3 files)
- 03-02: 2 min (2 tasks, 6 files)
- 03.1-01: 2 min (2 tasks, 4 files)
- 03.1-02: 2 min (2 tasks, 3 files)
- 04-01: 2 min (2 tasks, 3 files)
- 04-02: 2 min (2 tasks, 5 files)

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
- BattingOrderSection renders independently of fielding lineup state (BATT-02)
- Confirm appends new history entry each time -- coach controls when to confirm
- BattingOrderList is pure presentational (no hooks) -- receives order and players as props
- Removed band badges entirely from batting order display (confusing to coaches per UAT)
- Per-player bench summary format: "Name (1, 4)" sorted by first bench inning for consistent ordering
- Lineup option cards vertically stacked (flex-direction: column) instead of horizontal scroll
- computeFairnessSummary is a module-level pure function (not a hook or useMemo)
- FairnessSummary is a sibling to LineupGrid inside the same section div, rendered by LineupPage
- CSV field escaping follows RFC 4180 (double-quote wrapping, internal quote doubling)
- importPlayers deduplicates within import batch and against existing roster (case-insensitive)
- Hidden file input triggered by visible button for consistent CSV import UX
- Secondary button style (outlined border) for CSV actions, differentiating from primary add button
- fieldingPositions stores actual positions played per inning; benchInnings tracked as separate count (not BENCH in array)
- computeFieldingFairness returns Position[] (not Set) for JSON-serializable localStorage persistence
- playerName stored alongside playerId in PlayerGameSummary for robustness against roster deletion

### Pending Todos

None.

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: Lineup and batting order UI fixes (URGENT)

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-10 (plan 04-01 execution)
Stopped at: Completed 04-01-PLAN.md (Game History Data Model)
Resume file: None
