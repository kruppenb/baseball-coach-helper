---
phase: 02-lineup-engine
plan: 01
subsystem: logic
tags: [typescript, validation, tdd, vitest, lineup, constraints]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Player type, GameConfig, project structure
provides:
  - Position, Lineup, InningAssignment, BatteryAssignments, PositionBlocks types
  - LineupState interface for localStorage persistence
  - ValidationRule, ValidationError, GenerateLineupInput, GenerateLineupResult types
  - validateLineup() function with 8 validation rules
  - vitest test infrastructure
affects: [02-02, 02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [pure-function-validation, coach-friendly-error-messages, tdd-red-green]

key-files:
  created:
    - src/logic/lineup-types.ts
    - src/logic/lineup-validator.ts
    - src/logic/lineup-validator.test.ts
    - vitest.config.ts
  modified:
    - src/types/index.ts
    - package.json
    - tsconfig.app.json

key-decisions:
  - "Used 10-player lineup for valid test case (11 players with fixed P/C makes infield minimum mathematically impossible with 4 non-battery infield slots x 4 innings = 16 < 9 players x 2 = 18)"
  - "Separated vitest.config.ts from vite.config.ts to avoid TypeScript type conflicts with vitest v4"
  - "INFIELD_POSITIONS includes P and C (6 positions total) per plan spec"

patterns-established:
  - "Pure logic in src/logic/ with zero React dependencies"
  - "Structured ValidationError objects with rule, message, inning, playerId, position"
  - "Player name resolution via presentPlayers array (never expose IDs in messages)"

# Metrics
duration: 12min
completed: 2026-02-10
---

# Phase 2 Plan 1: Lineup Types and Validation System Summary

**TDD-built lineup validation system with 8 constraint rules, coach-friendly error messages, and complete type definitions for the lineup engine**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-10T17:21:34Z
- **Completed:** 2026-02-10T17:34:30Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments
- Defined all lineup-related TypeScript types (Position, Lineup, InningAssignment, BatteryAssignments, PositionBlocks, LineupState)
- Built complete validation system with 8 rules: GRID_COMPLETE, NO_DUPLICATES, PITCHER_MATCH, CATCHER_MATCH, NO_CONSECUTIVE_BENCH, INFIELD_MINIMUM, NO_CONSECUTIVE_POSITION, POSITION_BLOCK
- All error messages use player names (never IDs) for coach-friendly output
- P/C correctly exempt from NO_CONSECUTIVE_POSITION rule
- INFIELD_MINIMUM correctly checks innings 1-4 regardless of total innings
- Added vitest test infrastructure with 13 passing tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest infrastructure** - `40bbd77` (chore)
2. **Task 2: Add lineup type definitions** - `aa2f2e3` (feat)
3. **Task 3: Write failing tests (TDD RED)** - `8881a6b` (test)
4. **Task 4: Implement validator (TDD GREEN)** - `992e040` (feat)

## Files Created/Modified
- `src/types/index.ts` - Extended with Position, POSITIONS, INFIELD_POSITIONS, OUTFIELD_POSITIONS, InningAssignment, Lineup, BatteryAssignments, PositionBlocks, LineupState
- `src/logic/lineup-types.ts` - ValidationRule, ValidationError, GenerateLineupInput, GenerateLineupResult
- `src/logic/lineup-validator.ts` - validateLineup() with 8 sub-validators, all pure functions
- `src/logic/lineup-validator.test.ts` - 13 test cases covering all 8 rules + edge cases
- `vitest.config.ts` - Vitest test runner configuration
- `package.json` - Added vitest dependency and test script
- `tsconfig.app.json` - Added vitest/globals types

## Decisions Made
- Used 10 players for the valid lineup test instead of 11. With 11 players and fixed P/C, the infield minimum constraint is mathematically unsatisfiable (16 available non-battery infield slots < 18 needed). The generator will handle this by rotating P/C or accepting partial satisfaction, but tests need a provably valid baseline.
- Created a separate vitest.config.ts instead of embedding test config in vite.config.ts, because vitest v4's `test` property causes TypeScript errors when using vite's `defineConfig`.
- INFIELD_POSITIONS includes P and C per the plan specification (6 positions: P, C, 1B, 2B, 3B, SS).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Separated vitest config to fix TypeScript compilation**
- **Found during:** Task 1 (vitest infrastructure)
- **Issue:** Adding `test` property to vite.config.ts caused TS2769 error with vitest v4's type definitions
- **Fix:** Created separate vitest.config.ts using `vitest/config` defineConfig
- **Files modified:** vite.config.ts, vitest.config.ts
- **Verification:** `npx tsc -b` passes with zero errors
- **Committed in:** aa2f2e3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Config fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
- Constructing a valid test lineup that satisfies all 8 constraints simultaneously required careful manual constraint solving. The infield minimum rule creates a tight constraint: with fixed P/C and 11 players, it is mathematically impossible to give every non-battery player 2+ infield positions in 4 innings (only 16 slots for 18 needs). Resolved by using 10 players for the valid lineup test.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All types exported and ready for lineup generator (plan 02-02)
- validateLineup() ready to validate generated lineups
- vitest infrastructure ready for TDD across remaining Phase 2 plans
- No blockers for plan 02-02

---
*Phase: 02-lineup-engine*
*Completed: 2026-02-10*
