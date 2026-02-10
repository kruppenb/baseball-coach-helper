---
phase: 03-batting-order
plan: 01
subsystem: logic
tags: [batting-order, fairness, tdd, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Player type, project structure"
provides:
  - "getBand function for band categorization"
  - "calculateBandCounts function for history tallying"
  - "generateBattingOrder function for fair order generation"
  - "BattingBand, BattingHistoryEntry, BattingOrderState types"
affects: [03-batting-order, 04-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-band-fairness-rotation, pure-function-generation, fisher-yates-shuffle-duplication]

key-files:
  created:
    - src/logic/batting-order.ts
    - src/logic/batting-order.test.ts
  modified:
    - src/types/index.ts

key-decisions:
  - "Fisher-Yates shuffle duplicated in batting-order.ts (not shared utility) to keep modules independent"
  - "Fairness score = top - bottom band counts (ascending sort pushes top-heavy players down)"
  - "PlayerBandCounts interface kept module-private (not exported from types)"

patterns-established:
  - "Three-band rotation: top/middle/bottom bands via floor(N/3) boundaries for cross-game fairness"
  - "Pure function batting order generation with Player[] + history input, string[] output"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 3 Plan 1: Batting Order Algorithm Summary

**Three-band fairness rotation algorithm with getBand/calculateBandCounts/generateBattingOrder pure functions and 16 unit tests via TDD**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T22:25:13Z
- **Completed:** 2026-02-10T22:27:30Z
- **Tasks:** 3 TDD phases (RED/GREEN/REFACTOR)
- **Files modified:** 3

## Accomplishments
- Batting order types (BattingBand, BattingHistoryEntry, BattingOrderState) added to shared types
- Pure generation algorithm: no-history shuffle path and history-based fairness rotation path
- 16 comprehensive unit tests covering band boundaries (9-12 players), band count tallying (0/1/N games), deleted player resilience, and fairness rotation verification
- Zero type errors across entire codebase

## Task Commits

Each task was committed atomically:

1. **RED: Types + failing tests + stubs** - `fb6d8e8` (test)
2. **GREEN: Implement getBand, calculateBandCounts, generateBattingOrder** - `bb12144` (feat)
3. **REFACTOR: No changes needed** - skipped (code already clean with JSDoc)

**Plan metadata:** (pending)

_Note: TDD plan with RED and GREEN commits. REFACTOR skipped -- no cleanup needed._

## Files Created/Modified
- `src/types/index.ts` - Added BattingBand, BattingHistoryEntry, BattingOrderState types
- `src/logic/batting-order.ts` - Pure batting order generation: getBand, calculateBandCounts, generateBattingOrder
- `src/logic/batting-order.test.ts` - 16 unit tests (260 lines) covering all functions and edge cases

## Decisions Made
- Fisher-Yates shuffle duplicated in batting-order.ts rather than extracting to shared utility -- keeps modules independent per established pattern
- Fairness score formula: (top - bottom) ascending -- simple, effective, transparent to coaches
- PlayerBandCounts interface kept module-private -- only the three exported functions are the public API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Batting order algorithm ready for hook integration (Plan 02: useBattingOrder + UI components)
- Types ready for localStorage persistence via useLocalStorage
- All three exported functions tested and type-safe

## Self-Check: PASSED

- [x] src/types/index.ts -- FOUND
- [x] src/logic/batting-order.ts -- FOUND
- [x] src/logic/batting-order.test.ts -- FOUND
- [x] 03-01-SUMMARY.md -- FOUND
- [x] Commit fb6d8e8 -- FOUND
- [x] Commit bb12144 -- FOUND
- [x] 3 exported functions -- VERIFIED

---
*Phase: 03-batting-order*
*Completed: 2026-02-10*
