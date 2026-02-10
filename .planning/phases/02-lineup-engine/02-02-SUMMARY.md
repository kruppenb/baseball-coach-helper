---
phase: 02-lineup-engine
plan: 02
subsystem: logic
tags: [constraint-solver, lineup-generation, tdd, fisher-yates, pure-functions]

# Dependency graph
requires:
  - phase: 02-lineup-engine/01
    provides: "Lineup types (GenerateLineupInput, GenerateLineupResult, ValidationError) and validateLineup()"
provides:
  - "preValidate() - pre-validation of generation inputs"
  - "generateLineup() - single lineup constraint solver"
  - "generateMultipleLineups() - multi-lineup generation with deduplication"
affects: [02-lineup-engine/03, 02-lineup-engine/04, 02-lineup-engine/05]

# Tech tracking
tech-stack:
  added: []
  patterns: ["retry-based constraint solver with Fisher-Yates shuffle", "pre-validation before generation", "meaningful lineup deduplication (bench + infield diff)"]

key-files:
  created:
    - src/logic/lineup-generator.ts
    - src/logic/lineup-generator.test.ts
  modified: []

key-decisions:
  - "Fisher-Yates shuffle instead of Math.random sort for unbiased randomization"
  - "Pre-validation runs before every generation attempt to fail fast on impossible inputs"
  - "Meaningful deduplication checks bench patterns and infield assignments, ignores outfield-only swaps"
  - "P/C assignments are optional per inning -- generator picks randomly when unassigned"
  - "Max 200 attempts per single lineup, count*300 total attempts for multiple lineups"

patterns-established:
  - "Pure function constraint solver: inputs in, structured result out, no side effects"
  - "Pre-validate -> generate -> validate pipeline for lineup generation"
  - "Priority-based infield pre-assignment: P/C players get infield slots first"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 2 Plan 2: Lineup Generation Algorithm Summary

**Retry-based constraint solver with Fisher-Yates shuffle, pre-validation, and multi-lineup deduplication -- all as pure functions with zero React dependencies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T17:36:44Z
- **Completed:** 2026-02-10T17:40:54Z
- **Tasks:** 3 (TDD RED, GREEN, REFACTOR)
- **Files modified:** 2

## Accomplishments
- preValidate() catches impossible inputs: too few players, absent P/C, same-player P+C conflicts, unfillable positions from blocks
- generateLineup() solves the constraint problem for 10-12 player rosters across 5-6 innings with position blocks
- generateMultipleLineups() produces 3 distinct valid lineups with meaningful deduplication
- Full TDD cycle: 23 new tests all passing, 36 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests (RED)** - `2595d64` (test)
2. **Task 2: Implement lineup generator (GREEN)** - `0cb3727` (feat)
3. **Task 3: Refactor infield fill logic (REFACTOR)** - `71d5171` (refactor)

## Files Created/Modified
- `src/logic/lineup-generator.ts` - Core generation algorithm: preValidate, generateLineup, generateMultipleLineups (471 lines)
- `src/logic/lineup-generator.test.ts` - Comprehensive tests: 7 preValidate, 12 generateLineup, 4 generateMultipleLineups (351 lines)

## Decisions Made
- Fisher-Yates shuffle chosen over Math.random sort to eliminate bias in player ordering
- Pre-validation integrated into generateLineup() to fail fast on impossible inputs rather than burning 200 retry attempts
- Meaningful deduplication for generateMultipleLineups() checks bench patterns and infield assignments -- outfield-only swaps don't count as different lineups
- P/C assignments made optional per inning (generator picks randomly when unassigned) for maximum coach flexibility
- Max 200 attempts per lineup, count*300 total attempts for multi-lineup to prevent excessive computation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Minor TypeScript build error from unused imports (Player, ValidationError) -- fixed immediately during GREEN phase

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Lineup generation engine complete, ready for Plan 03 (pre-assignments UI and position blocks)
- All 36 tests passing, zero TypeScript errors
- Pure functions ready to be consumed by React hooks and components

## Self-Check: PASSED

- [x] src/logic/lineup-generator.ts exists
- [x] src/logic/lineup-generator.test.ts exists
- [x] Commit 2595d64 (RED) exists
- [x] Commit 0cb3727 (GREEN) exists
- [x] Commit 71d5171 (REFACTOR) exists

---
*Phase: 02-lineup-engine*
*Completed: 2026-02-10*
