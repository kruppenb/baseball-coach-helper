---
phase: 13-sync-hardening
plan: 02
subsystem: ui
tags: [etag, optimistic-concurrency, conflict-resolution, sync, dialog]

# Dependency graph
requires:
  - phase: 13-sync-hardening
    plan: 01
    provides: "412 conflict responses with cloudData/cloudEtag/cloudUpdatedAt from API"
provides:
  - "Frontend ETag tracking on all singleton GET/PUT responses"
  - "If-Match header sent on push requests when ETag stored"
  - "412 conflict detection with ConflictDialog UI"
  - "Two-choice conflict resolution: Keep This Device (re-push) or Keep Cloud (overwrite local)"
  - "Dirty flag protection preventing background pulls from overwriting active edits"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["ETag store + If-Match header pattern for optimistic concurrency", "Native HTML dialog with showModal for modal conflict UI", "Dirty flag guard on pullFromCloud to protect in-progress edits"]

key-files:
  created:
    - src/sync/ConflictDialog.tsx
    - src/sync/ConflictDialog.module.css
  modified:
    - src/sync/sync-types.ts
    - src/sync/sync-engine.ts
    - src/sync/SyncContext.tsx
    - src/sync/useCloudStorage.ts

key-decisions:
  - "ConflictDialog uses native HTML <dialog> with showModal() for automatic focus trapping and backdrop"
  - "Escape key blocked on conflict dialog to force deliberate choice between local and cloud"
  - "Keep This Device updates stored ETag to cloud's current value then re-pushes -- ensures next upsert wins"
  - "Keep Cloud writes cloud data to localStorage and dispatches local-storage-sync event for React state sync"
  - "Dirty flag set in both markDirty (explicit) and debouncedPush (implicit) for double coverage"
  - "retryPendingPushes intentionally does not pass onConflict -- offline-to-online retries fail silently on 412, next manual edit triggers proper conflict handling"

patterns-established:
  - "Conflict resolution flow: pushToCloud 412 -> onConflict callback -> SyncContext state -> ConflictDialog -> resolveConflict"
  - "ETag lifecycle: stored on pull GET -> sent as If-Match on push PUT -> updated from push response -> updated from 412 conflict response"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 13 Plan 02: Frontend ETag Conflict Resolution Summary

**ETag-tracked sync engine with If-Match headers, 412 conflict detection, two-choice ConflictDialog UI, and dirty flag protection for active edits**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T04:06:06Z
- **Completed:** 2026-02-16T04:09:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Sync engine tracks ETags from every successful GET and PUT response, sends If-Match on all singleton pushes
- 412 responses trigger a ConflictDialog modal with "Keep This Device" vs "Keep Cloud" buttons and cloud timestamp
- "Keep This Device" updates the stored ETag and re-pushes local data; "Keep Cloud" overwrites localStorage and syncs React state
- Dirty flag prevents background pullFromCloud from overwriting keys with active in-progress edits
- ConflictInfo type defined for structured conflict data flow between sync engine and UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ETag store, dirty flags, If-Match header, and 412 handling to sync engine** - `0b387bb` (feat)
2. **Task 2: Create ConflictDialog component and wire conflict state through SyncContext** - `d9245b6` (feat)

## Files Created/Modified
- `src/sync/sync-types.ts` - Added ConflictInfo interface for structured conflict data
- `src/sync/sync-engine.ts` - ETag store, dirty flags, If-Match header on push, 412 handling with onConflict callback, ETag storage on success, dirty guard on pull
- `src/sync/ConflictDialog.tsx` - Native `<dialog>` modal with two-column layout, primary/secondary buttons, cloud timestamp display, Escape blocked
- `src/sync/ConflictDialog.module.css` - Dialog styles using project CSS custom properties from tokens.css
- `src/sync/SyncContext.tsx` - activeConflict state, handleConflict/resolveConflict callbacks, ConflictDialog rendered, onConflict exposed via context
- `src/sync/useCloudStorage.ts` - markDirty on edits, onConflict passed through to debouncedPush

## Decisions Made
- ConflictDialog uses native HTML `<dialog>` with `showModal()` for automatic focus trapping and backdrop -- no dependency on a modal library
- Escape key blocked on conflict dialog via cancel event handler to force deliberate choice
- "Keep This Device" updates stored ETag to cloud's current value then re-pushes, ensuring the next upsert wins the If-Match check
- retryPendingPushes intentionally does not pass onConflict -- offline-to-online retries fail silently on 412; next manual edit triggers proper conflict handling
- CSS uses project design tokens (--color-primary, --radius-md, --font-size-sm, etc.) for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete frontend conflict resolution flow is wired end-to-end from ETag tracking through dialog to resolution
- Phase 13 (Sync Hardening) is now complete -- both API ETag concurrency (Plan 01) and frontend conflict resolution (Plan 02) are done
- This completes the v3.0 UX Overhaul milestone (all 13 phases)

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 13-sync-hardening*
*Completed: 2026-02-15*
