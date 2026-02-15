---
phase: 10-app-restructuring-and-game-day-flow
plan: 03
subsystem: ui
tags: [react, stepper, game-day, batting-order, lineup, print]

# Dependency graph
requires:
  - phase: 10-02
    provides: AttendanceStep, PCAssignmentStep, StepperHeader, useStepperState
provides:
  - GenerateStep component for lineup generation
  - ReviewStep component with lineup review, batting order, FLOW-05 comparison, and finalize
  - PrintStep component wrapping DugoutCard
  - Complete 5-step end-to-end game day stepper flow
  - Back button navigation in stepper
affects: [11-drag-and-drop, 12-scored-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [stepper-step-pattern, previous-game-comparison]

key-files:
  created:
    - src/components/game-day/steps/GenerateStep.tsx
    - src/components/game-day/steps/GenerateStep.module.css
    - src/components/game-day/steps/ReviewStep.tsx
    - src/components/game-day/steps/ReviewStep.module.css
    - src/components/game-day/steps/PrintStep.tsx
    - src/components/game-day/steps/PrintStep.module.css
  modified:
    - src/components/game-day/GameDayStepper.tsx
    - src/components/game-day/GameDayStepper.module.css

key-decisions:
  - "ReviewStep inlines computeFairnessSummary rather than extracting to shared util -- pure helper, same pattern as LineupPage"
  - "Previous batting order comparison uses side-by-side flex layout for desktop, stacks naturally on narrow screens"
  - "PrintStep is a terminal step with no onComplete -- stepper completes all 5 steps at review finalization"

patterns-established:
  - "Stepper step pattern: each step receives onComplete callback, manages own state via hooks, renders Next button"
  - "FLOW-05 comparison: previous game data from useGameHistory displayed alongside current for reference"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 10 Plan 03: Generate, Review, and Print Steps Summary

**Complete 5-step game day stepper: Generate lineup options, Review with fairness/batting-order/previous-game comparison (FLOW-05), Finalize to history, and Print dugout card**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T23:21:43Z
- **Completed:** 2026-02-15T23:24:27Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- GenerateStep with generate/regenerate/clear and status messages
- ReviewStep consolidating lineup selection, grid, fairness summary, validation, batting order generation, previous-game batting order comparison (FLOW-05), and finalize flow
- PrintStep rendering DugoutCard with existing print functionality (data-dugout-card preserved)
- All 5 stepper steps wired in GameDayStepper with back button navigation
- Complete end-to-end flow: Attendance -> P/C Assignment -> Generate -> Review -> Print

## Task Commits

Each task was committed atomically:

1. **Task 1: Build GenerateStep and ReviewStep with batting order comparison** - `f85ecb6` (feat)
2. **Task 2: Build PrintStep and wire complete stepper flow** - `f43bdea` (feat)

## Files Created/Modified
- `src/components/game-day/steps/GenerateStep.tsx` - Lineup generation step with generate/regenerate/clear buttons
- `src/components/game-day/steps/GenerateStep.module.css` - Generate step styling
- `src/components/game-day/steps/ReviewStep.tsx` - Lineup review, batting order, FLOW-05 comparison, and finalize
- `src/components/game-day/steps/ReviewStep.module.css` - Review step styling with comparison layout
- `src/components/game-day/steps/PrintStep.tsx` - Print dugout card step wrapping DugoutCard
- `src/components/game-day/steps/PrintStep.module.css` - Print step minimal styling
- `src/components/game-day/GameDayStepper.tsx` - Wired all 5 steps with back button
- `src/components/game-day/GameDayStepper.module.css` - Added backButton styles

## Decisions Made
- ReviewStep inlines `computeFairnessSummary` as a module-level pure function (same pattern as LineupPage) rather than extracting to a shared utility -- keeps change scope minimal and the function is small
- Previous batting order comparison uses simple side-by-side flex layout that stacks naturally on narrow screens
- PrintStep has no `onComplete` prop since it is the terminal step; the stepper flow effectively completes when the user finalizes in Review and advances to Print

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete 5-step game day stepper flow is functional end-to-end
- Phase 10 (App Restructuring and Game Day Flow) is now fully complete
- Ready for Phase 11 (Drag and Drop Batting Order) and Phase 12 (Scored Generation)

## Self-Check: PASSED

All 8 files verified present. Both task commits (f85ecb6, f43bdea) verified in git log.

---
*Phase: 10-app-restructuring-and-game-day-flow*
*Completed: 2026-02-15*
