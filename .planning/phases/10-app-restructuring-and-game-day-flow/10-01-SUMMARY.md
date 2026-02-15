---
phase: 10-app-restructuring-and-game-day-flow
plan: 01
subsystem: ui
tags: [react, navigation, stepper, tabs, settings, app-shell]

# Dependency graph
requires: []
provides:
  - "2-tab bottom navigation shell (Game Day + Settings)"
  - "useStepperState hook with reducer-based state machine"
  - "Consolidated Settings page with roster, CSV, position blocks, innings, sync"
  - "StepId and StepperState types"
affects: [10-02, 10-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bottom tab bar with fixed positioning and top-border active indicator"
    - "useReducer-based stepper state machine for multi-step wizard flows"
    - "Consolidated settings page reusing existing child components"

key-files:
  created:
    - src/hooks/useStepperState.ts
    - src/components/settings/SettingsPage.tsx
    - src/components/settings/SettingsPage.module.css
  modified:
    - src/types/index.ts
    - src/components/app-shell/AppShell.tsx
    - src/components/app-shell/AppShell.module.css
    - src/components/app-shell/TabBar.module.css

key-decisions:
  - "Stepper uses useReducer instead of useState for complex state transitions"
  - "Tab bar active indicator changed from bottom-border to top-border for bottom positioning"
  - "SettingsPage reuses all existing child components (PlayerInput, PlayerList, PositionBlocks, SettingsPanel, SyncStatusIndicator) without modification"

patterns-established:
  - "Bottom tab navigation: fixed position, centered, z-index 100"
  - "Stepper state machine: reducer with GO_TO_STEP, COMPLETE_STEP, CLEAR_STALE_WARNING, RESET actions"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 10 Plan 01: App Shell Restructuring Summary

**2-tab bottom nav (Game Day + Settings) with useReducer stepper state machine and consolidated Settings page reusing all existing config components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T23:10:49Z
- **Completed:** 2026-02-15T23:13:47Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Restructured app from 4-tab top navigation to 2-tab bottom navigation (Game Day + Settings)
- Created useStepperState hook with 5-step state machine (attendance -> pc-assignment -> generate -> review -> print) supporting linear and free navigation modes
- Built consolidated Settings page with all 5 configuration sections (Roster, CSV Import/Export, Position Blocks, Innings, Sync Status)
- App now opens to Game Day tab by default

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stepper types, create useStepperState hook, and restructure app shell to 2-tab bottom nav** - `2d918de` (feat)
2. **Task 2: Build consolidated Settings page with all configuration sections** - `a0bee52` (feat)

**Plan metadata:** `f5afbf5` (docs: complete plan)

## Files Created/Modified
- `src/types/index.ts` - Added StepId, StepperState types; updated TabId to game-day | settings
- `src/hooks/useStepperState.ts` - Reducer-based stepper state machine with 5 ordered steps
- `src/components/app-shell/AppShell.tsx` - 2-tab shell with Game Day placeholder and Settings page
- `src/components/app-shell/AppShell.module.css` - Added padding-bottom for fixed tab bar
- `src/components/app-shell/TabBar.module.css` - Bottom-fixed tab bar with centered layout
- `src/components/settings/SettingsPage.tsx` - Consolidated settings with all 5 config sections
- `src/components/settings/SettingsPage.module.css` - Styles for settings page sections

## Decisions Made
- Used useReducer instead of useState for stepper state management -- complex state transitions with multiple interdependent fields (currentStep, completedSteps, hasCompletedAllOnce, staleWarning) are better expressed as reducer actions
- Changed tab active indicator from bottom-border to top-border since the tab bar is now at the bottom of the screen
- SettingsPage calls each hook (useRoster, useGameConfig, useLineup, useAuth) once at the top level and passes data down to reused child components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- App shell ready for Plan 02 to build the Game Day stepper UI on top of the useStepperState hook
- Settings page fully functional with all configuration relocated from old 4-tab layout
- Game Day tab shows placeholder text ready to be replaced with stepper content

## Self-Check: PASSED

All 7 files verified present. Both task commits (2d918de, a0bee52) verified in git log. TypeScript check and production build both pass with zero errors.

---
*Phase: 10-app-restructuring-and-game-day-flow*
*Completed: 2026-02-15*
