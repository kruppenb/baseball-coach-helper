---
phase: 03-batting-order
plan: 02
subsystem: ui
tags: [batting-order, react, hooks, css-modules, localStorage]

# Dependency graph
requires:
  - phase: 03-batting-order
    plan: 01
    provides: "generateBattingOrder, calculateBandCounts, getBand functions and batting types"
  - phase: 01-foundation
    provides: "Player type, useLocalStorage hook, useRoster hook"
  - phase: 02-lineup-engine
    provides: "LineupPage container, CSS patterns, component architecture"
provides:
  - "useBattingOrder hook for batting order state management"
  - "BattingOrderList presentational component with band badges"
  - "BattingOrderSection container with generate/confirm/clear workflow"
  - "LineupPage with integrated batting order section"
affects: [04-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [hook-bridges-logic-to-ui, container-presentational-split, independent-feature-sections]

key-files:
  created:
    - src/hooks/useBattingOrder.ts
    - src/components/batting-order/BattingOrderList.tsx
    - src/components/batting-order/BattingOrderList.module.css
    - src/components/batting-order/BattingOrderSection.tsx
    - src/components/batting-order/BattingOrderSection.module.css
  modified:
    - src/components/lineup/LineupPage.tsx

key-decisions:
  - "BattingOrderSection renders independently of fielding lineup state -- no dependency on useLineup (BATT-02)"
  - "Confirm appends new history entry each time (no duplicate-game deduplication) -- coach controls when to confirm"
  - "BattingOrderList is pure presentational (no hooks) -- receives order and players as props"

patterns-established:
  - "Independent feature sections on same page: separate hook + container + presentational component"
  - "Section divider pattern: div with .section class providing border-top separation"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 3 Plan 2: Batting Order Hook, UI Components, and LineupPage Integration Summary

**useBattingOrder hook with localStorage persistence, BattingOrderList with three-band color badges, BattingOrderSection container with generate/confirm/clear workflow, integrated into LineupPage below fielding grid**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T22:29:49Z
- **Completed:** 2026-02-10T22:31:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- useBattingOrder hook bridges batting-order logic to UI with generate/confirm/clear actions and localStorage persistence via two keys (battingOrderState, battingHistory)
- BattingOrderList pure presentational component renders numbered player list with top/middle/bottom band color badges
- BattingOrderSection container manages the full workflow: generate, view numbered list, confirm to save history, clear for new game
- LineupPage integrates BattingOrderSection below fielding content with consistent section divider styling
- Batting order is fully independent of fielding lineup (BATT-02) -- no shared state between the two features

## Task Commits

Each task was committed atomically:

1. **Task 1: useBattingOrder hook and BattingOrderList component** - `e98f118` (feat)
2. **Task 2: BattingOrderSection container and LineupPage integration** - `f17d47e` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/hooks/useBattingOrder.ts` - State management hook with generate/confirm/clear actions, useLocalStorage for persistence
- `src/components/batting-order/BattingOrderList.tsx` - Pure presentational numbered list with band color badges
- `src/components/batting-order/BattingOrderList.module.css` - Styles for list items and top/middle/bottom band labels
- `src/components/batting-order/BattingOrderSection.tsx` - Container component consuming useBattingOrder with full workflow UI
- `src/components/batting-order/BattingOrderSection.module.css` - Styles matching LineupPage patterns (generateButton, confirmButton, clearButton)
- `src/components/lineup/LineupPage.tsx` - Added BattingOrderSection import and render below fielding content

## Decisions Made
- BattingOrderSection renders independently of fielding lineup state -- satisfies BATT-02 (batting independent of fielding)
- Confirm appends a new history entry each time -- no duplicate-game deduplication; coach controls when to confirm
- BattingOrderList is pure presentational with no hooks -- receives order and players as props, resolves names via Map lookup
- Used hasGenerated local state in BattingOrderSection to toggle "Generate"/"Regenerate" button label

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (batting order) is fully complete: algorithm + types (plan 01) and hook + UI + integration (plan 02)
- All three BATT requirements satisfied: continuous batting order (BATT-01), independent of fielding (BATT-02), cross-game fairness via history (BATT-03)
- battingHistory localStorage key ready for Phase 4 (History) to display past games
- 52 tests still passing, zero TypeScript errors

## Self-Check: PASSED

- [x] src/hooks/useBattingOrder.ts -- FOUND
- [x] src/components/batting-order/BattingOrderList.tsx -- FOUND
- [x] src/components/batting-order/BattingOrderList.module.css -- FOUND
- [x] src/components/batting-order/BattingOrderSection.tsx -- FOUND
- [x] src/components/batting-order/BattingOrderSection.module.css -- FOUND
- [x] src/components/lineup/LineupPage.tsx -- FOUND (modified)
- [x] 03-02-SUMMARY.md -- FOUND
- [x] Commit e98f118 -- FOUND
- [x] Commit f17d47e -- FOUND

---
*Phase: 03-batting-order*
*Completed: 2026-02-10*
