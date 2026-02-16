---
phase: 11-drag-and-drop-editing
plan: 02
subsystem: ui
tags: [dnd-kit, react, sortable, batting-order, drag-and-drop, css-modules]

# Dependency graph
requires:
  - phase: 11-drag-and-drop-editing/01
    provides: useLineupEditor hook, DraggableLineupGrid, DraggableCell
  - phase: 10-app-restructuring-and-game-day-flow
    provides: ReviewStep, BattingOrderList, stepper flow
provides:
  - SortableBattingOrder component for drag-and-drop batting order reordering
  - SortableItem component with drag handle for individual batting entries
  - Full DnD integration in ReviewStep (fielding grid + batting order)
  - Edited lineup/batting order passed to finalize and print
affects: [12-scored-generation, print-step, game-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [useSortable-with-handleRef, isSortable-type-guard, editor-state-for-finalization]

key-files:
  created:
    - src/components/batting-order/SortableBattingOrder.tsx
    - src/components/batting-order/SortableItem.tsx
    - src/components/batting-order/SortableBattingOrder.module.css
  modified:
    - src/components/game-day/steps/ReviewStep.tsx
    - src/components/game-day/steps/ReviewStep.module.css
    - src/components/game-day/steps/PrintStep.tsx
    - src/hooks/useBattingOrder.ts

key-decisions:
  - "PrintStep reads from last game history entry (finalized edited data) instead of original context hooks"
  - "useBattingOrder.confirm accepts optional orderOverride for edited batting order to batting history"
  - "SortableBattingOrder uses isSortable type guard with initialIndex/index for reorder"

patterns-established:
  - "Sortable list pattern: DragDropProvider + useSortable with handleRef for drag handle"
  - "Editor-to-finalize flow: useLineupEditor state passed to finalizeGame and confirmBatting, not original generated values"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 11 Plan 02: SortableBattingOrder + ReviewStep DnD Integration Summary

**SortableBattingOrder with drag handles, full ReviewStep DnD integration for fielding and batting, with edited data flowing through to finalize and print**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T00:07:30Z
- **Completed:** 2026-02-16T00:11:30Z
- **Tasks:** 3 (2 auto + 1 human checkpoint)
- **Files modified:** 7

## Accomplishments
- Built SortableBattingOrder and SortableItem components with @dnd-kit sortable primitives and drag handles
- Wired DraggableLineupGrid and SortableBattingOrder into ReviewStep via useLineupEditor for complete DnD editing
- Fixed PrintStep to read finalized edited data from game history instead of stale original context hooks
- Fixed useBattingOrder.confirm to accept edited order override for correct fairness history tracking
- Human-verified all four DND requirements (fielding swap, batting reorder, real-time validation, mobile touch)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SortableBattingOrder and SortableItem components** - `76258a1` (feat)
2. **Task 2: Wire DnD components into ReviewStep with useLineupEditor** - `bd7e240` (feat)
3. **Task 3: Fix PrintStep to show edited lineup** - `9ce0c20` (fix)

## Files Created/Modified
- `src/components/batting-order/SortableItem.tsx` - Sortable batting order item with useSortable hook and drag handle
- `src/components/batting-order/SortableBattingOrder.tsx` - DragDropProvider wrapper with isSortable reorder logic
- `src/components/batting-order/SortableBattingOrder.module.css` - Styles for sortable list, drag handle, dragging state
- `src/components/game-day/steps/ReviewStep.tsx` - Replaced LineupGrid/BattingOrderList with DnD variants, useLineupEditor integration, edited data finalization
- `src/components/game-day/steps/ReviewStep.module.css` - Added editsBadge style
- `src/components/game-day/steps/PrintStep.tsx` - Reads from game history instead of original hooks
- `src/hooks/useBattingOrder.ts` - confirm() accepts optional orderOverride parameter

## Decisions Made
- PrintStep reads the last game history entry for lineup/batting data since finalizeGame already saves the edited versions there — simpler than pushing edited state back into original context hooks
- useBattingOrder.confirm takes an optional orderOverride to save the correct (edited) batting order to batting history for future fairness calculations
- SortableBattingOrder uses isSortable type guard providing initialIndex/index for splice-based reorder (per @dnd-kit/react docs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] PrintStep reading stale data after finalization**
- **Found during:** Task 3 (human verification)
- **Issue:** PrintStep used useLineup().selectedLineup and useBattingOrder().currentOrder — original generated values, not edited ones
- **Fix:** Changed PrintStep to read from useGameHistory().history[last] which contains the finalized edited data
- **Files modified:** src/components/game-day/steps/PrintStep.tsx
- **Verification:** Human verified Print step shows edited lineup after finalize
- **Committed in:** 9ce0c20

**2. [Rule 2 - Missing Critical] confirmBatting saving original order to batting history**
- **Found during:** Task 3 (human verification investigation)
- **Issue:** confirm() always saved state.currentOrder (original) instead of the edited batting order
- **Fix:** Added optional orderOverride parameter to confirm(), ReviewStep passes editor.battingOrder
- **Files modified:** src/hooks/useBattingOrder.ts, src/components/game-day/steps/ReviewStep.tsx
- **Verification:** TypeScript compiles, tests pass
- **Committed in:** 9ce0c20

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes essential for correctness — edited data must flow through finalize to print and history. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All DnD editing complete — fielding grid swaps and batting order reorder work on desktop and mobile
- useLineupEditor provides mutable state layer ready for Phase 12 scored generation integration
- Real-time validation and fairness summary update after every edit
- Game history stores edited data correctly for cross-game fairness tracking

## Self-Check: PASSED

- [x] src/components/batting-order/SortableBattingOrder.tsx - FOUND
- [x] src/components/batting-order/SortableItem.tsx - FOUND
- [x] src/components/batting-order/SortableBattingOrder.module.css - FOUND
- [x] Commit 76258a1 - FOUND
- [x] Commit bd7e240 - FOUND
- [x] Commit 9ce0c20 - FOUND

---
*Phase: 11-drag-and-drop-editing*
*Completed: 2026-02-15*
