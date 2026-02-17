---
phase: 16-game-history-management
plan: 01
subsystem: api, ui
tags: [azure-functions, cosmos-db, react, hooks, navigation]

# Dependency graph
requires:
  - phase: 15-game-flow-streamlining
    provides: saveGame with duplicate detection and game history hook
provides:
  - DELETE /api/game-history/{entryId} endpoint
  - useGameHistory.deleteGame with local + cloud removal
  - useGameHistory.undoDelete with local + cloud restore
  - History tab in AppShell tab bar rendering HistoryPage
affects: [16-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget cloud DELETE with swallowed errors for graceful offline"
    - "Undo pattern returning removed entry + original index for re-insertion"

key-files:
  created: []
  modified:
    - api/src/functions/game-history.ts
    - src/hooks/useGameHistory.ts
    - src/types/index.ts
    - src/components/app-shell/AppShell.tsx

key-decisions:
  - "deleteGame returns removed entry and index for caller undo support"
  - "Cloud operations fire-and-forget with swallowed errors for offline resilience"

patterns-established:
  - "Undo pattern: delete returns {entry, index}, undoDelete accepts them to restore"

requirements-completed: [HMGT-01, HMGT-02]

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 16 Plan 01: Game History Data Layer and Navigation Summary

**DELETE API endpoint, deleteGame/undoDelete hook functions with undo support, and History tab wired into AppShell navigation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T07:30:29Z
- **Completed:** 2026-02-17T07:32:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DELETE /api/game-history/{entryId} endpoint with proper 204/404/500 responses and Cosmos doc ID pattern
- useGameHistory.deleteGame removes entry from local state, updates lastSyncedCount, and fires cloud DELETE
- useGameHistory.undoDelete re-inserts entry at original position and re-pushes to cloud
- History tab visible between Game Day and Settings, rendering HistoryPage with proper ARIA attributes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DELETE API endpoint and useGameHistory.deleteGame with undo support** - `21f24e0` (feat)
2. **Task 2: Add History tab to AppShell navigation** - `ad31832` (feat)

## Files Created/Modified
- `api/src/functions/game-history.ts` - Added deleteGameHistoryEntry handler and DELETE route registration
- `src/hooks/useGameHistory.ts` - Added deleteGame and undoDelete functions with useAuth integration
- `src/types/index.ts` - Extended TabId union with 'history'
- `src/components/app-shell/AppShell.tsx` - Added History tab, HistoryPage import, and tabpanel rendering

## Decisions Made
- deleteGame returns the removed entry and its original index as an object, enabling the caller to implement undo by passing them back to undoDelete
- Cloud operations (DELETE and re-PUT) are fire-and-forget with `.catch(() => {})` for graceful offline behavior
- localStorage `gameHistory:lastSyncedCount` is manually decremented/incremented to keep collection sync mode aligned

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: deleteGame and undoDelete ready for Plan 02 UI consumption
- History tab renders HistoryPage, which Plan 02 will enhance with delete UI (swipe/button + undo toast)
- No blockers

## Self-Check: PASSED

- All 4 modified files exist on disk
- Commit `21f24e0` found (Task 1)
- Commit `ad31832` found (Task 2)
- `deleteGameHistoryEntry` present in API (3 occurrences: handler, export, route)
- `deleteGame` present in hook (3 occurrences)
- `undoDelete` present in hook (2 occurrences)
- `'history'` present in TabId type
- `HistoryPage` imported and rendered in AppShell

---
*Phase: 16-game-history-management*
*Completed: 2026-02-17*
