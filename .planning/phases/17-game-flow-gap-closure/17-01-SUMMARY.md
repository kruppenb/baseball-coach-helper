---
phase: 17-game-flow-gap-closure
plan: 01
subsystem: ui
tags: [react, refs, drag-and-drop, game-history, cleanup]

# Dependency graph
requires:
  - phase: 15-01
    provides: "saveGame-based print-as-save flow replacing finalizeGame"
  - phase: 14-01
    provides: "Desktop DnD editing via useLineupEditor"
provides:
  - "DnD-edited lineup and batting order persist to game history on print"
  - "No finalizeGame references remain in codebase"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ref-based display state lifting (avoids re-renders on DnD drags)"
    - "Callback + useEffect pattern to report child editor state to parent"

key-files:
  created: []
  modified:
    - src/components/app-shell/AppShell.tsx
    - src/components/game-day/GameDayDesktop.tsx
    - src/components/game-day/GameDayStepper.tsx
    - src/hooks/useGameHistory.ts
    - src/types/index.ts
    - src/logic/game-history.ts
    - src/components/history/HistoryPage.tsx

key-decisions:
  - "Used refs instead of state for display values to avoid re-renders on every DnD drag"
  - "GameDayStepper accepts onDisplayStateChange as optional prop for interface consistency but does not call it"
  - "Cleanup function in useEffect clears refs on GameDayDesktop unmount"

patterns-established:
  - "Ref-based state lifting: use refs when parent only needs child values at a specific moment (save time), not for rendering"

requirements-completed: [GFLW-03, GFLW-04]

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 17 Plan 01: Game Flow Gap Closure Summary

**Wire DnD-edited lineup and batting order to AppShell save flow via refs, and remove dead finalizeGame code**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T15:50:17Z
- **Completed:** 2026-02-17T15:53:12Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- DnD position swaps and batting order reordering on desktop now persist to game history when printing
- Save flow uses displayLineupRef/displayBattingOrderRef with fallback to hook values for mobile compatibility
- Removed deprecated finalizeGame function and all "finalized game" / "Finalize" references from src/

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire edited lineup and batting order from desktop/stepper to AppShell save flow** - `eb77206` (feat)
2. **Task 2: Remove dead Finalize code and stale JSDoc references** - `f8cfa28` (refactor)

## Files Created/Modified
- `src/components/app-shell/AppShell.tsx` - Added displayLineupRef, displayBattingOrderRef, onDisplayStateChange callback; save flow uses refs with fallback
- `src/components/game-day/GameDayDesktop.tsx` - Accepts onDisplayStateChange prop; useEffect reports editor.lineup and editor.battingOrder
- `src/components/game-day/GameDayStepper.tsx` - Accepts optional onDisplayStateChange prop for interface consistency
- `src/hooks/useGameHistory.ts` - Removed finalizeGame useCallback and export
- `src/types/index.ts` - Updated JSDoc from "finalized game" to "saved game"
- `src/logic/game-history.ts` - Updated JSDoc from "finalized game's data" to "saved game's data"
- `src/components/history/HistoryPage.tsx` - Updated comment from "finalize" to "commit"

## Decisions Made
- Used refs (not state) in AppShell for display values to avoid triggering re-renders on every DnD drag -- values only need to be read at save time
- GameDayStepper accepts the prop as optional but never calls it, since mobile has no DnD editing and the generated values ARE the display values
- Cleanup function in GameDayDesktop's useEffect clears refs on unmount to prevent stale data when switching tabs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 17 plan 01 complete. All game flow gap closure work done.
- Build and type-check pass cleanly.
- No remaining finalizeGame references in codebase.

## Self-Check: PASSED

All 8 files verified present. Both task commits (eb77206, f8cfa28) verified in git log.

---
*Phase: 17-game-flow-gap-closure*
*Completed: 2026-02-17*
