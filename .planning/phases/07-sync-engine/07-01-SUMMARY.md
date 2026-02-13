---
phase: 07-sync-engine
plan: 01
subsystem: sync
tags: [offline-first, cloud-sync, react-hooks, context, debounce, localStorage]

# Dependency graph
requires:
  - phase: 05-auth-layer
    provides: "AuthContext, useAuth hook for user authentication state"
  - phase: 06-api-database
    provides: "REST API endpoints for roster, game-config, lineup-state, batting, game-history"
provides:
  - "SyncStatus type and SyncKeyConfig for sync configuration"
  - "sync-engine with pushToCloud, pullFromCloud, debouncedPush, retryPendingPushes"
  - "useOnlineStatus hook for navigator.onLine tracking"
  - "SyncProvider context with aggregated sync status"
  - "useCloudStorage hook as drop-in useLocalStorage replacement with cloud sync"
affects: [07-02-hook-migration, 08-data-migration, 09-pwa]

# Tech tracking
tech-stack:
  added: []
  patterns: ["offline-first sync with localStorage-first writes", "debounced background push", "pull-on-mount hydration via CustomEvent", "priority-based status aggregation"]

key-files:
  created:
    - src/sync/sync-types.ts
    - src/sync/sync-engine.ts
    - src/sync/useOnlineStatus.ts
    - src/sync/SyncContext.tsx
    - src/sync/useCloudStorage.ts
  modified: []

key-decisions:
  - "Read localStorage at push-time (not from closure) to avoid stale data after rapid edits"
  - "apiConfig stored in useRef to prevent object-literal dependency churn and infinite re-renders"
  - "All hooks called unconditionally in useCloudStorage; auth check gates behavior inside callbacks/effects"
  - "Collection push only sends entries since lastSyncedCount (append-only optimization)"

patterns-established:
  - "useCloudStorage(key, initialValue, apiConfig) as standard hook for synced state"
  - "SyncProvider wraps app to aggregate per-key sync status"
  - "local-storage-sync CustomEvent bridges pull data into React state"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 7 Plan 1: Sync Engine Infrastructure Summary

**Offline-first sync engine with useCloudStorage hook, debounced push/pull engine, online detection, and React context for aggregated status**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T06:01:07Z
- **Completed:** 2026-02-13T06:03:14Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Built complete sync type system (SyncStatus, SyncKeyConfig, API response shapes)
- Implemented push/pull sync engine with singleton and collection mode support, debounced writes, and retry-on-reconnect
- Created SyncProvider context that aggregates per-key sync status with error > syncing > offline > synced priority
- Delivered useCloudStorage hook with identical signature to useLocalStorage, ready for domain hook migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sync types, sync engine module, and online status hook** - `66c8a5b` (feat)
2. **Task 2: Create SyncContext provider and useCloudStorage hook** - `9d67349` (feat)

## Files Created/Modified
- `src/sync/sync-types.ts` - SyncStatus type, SyncKeyConfig, SyncApiResponse, BattingApiResponse interfaces
- `src/sync/sync-engine.ts` - Core push/pull logic with debounce, retry, collection diff tracking
- `src/sync/useOnlineStatus.ts` - Hook wrapping navigator.onLine with online/offline event listeners
- `src/sync/SyncContext.tsx` - SyncProvider with per-key status aggregation and reconnect retry
- `src/sync/useCloudStorage.ts` - Drop-in useLocalStorage replacement gated on auth state

## Decisions Made
- Read localStorage directly at push-time instead of from closure to guarantee latest data after rapid edits
- Store apiConfig in useRef to avoid infinite re-render loops from object literal props being new references each render
- Call all hooks unconditionally in useCloudStorage (React rules) with auth check gating behavior inside callbacks/effects
- Collection push tracks lastSyncedCount in localStorage and only sends new entries (append-only optimization for game history)
- Pull dispatches local-storage-sync CustomEvent to bridge cloud data into React state via existing useLocalStorage listener

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 sync infrastructure files compile cleanly with zero new dependencies
- useCloudStorage is ready for domain hook migration (plan 07-02)
- SyncProvider needs to be wired into the app component tree (plan 07-02)
- Sync status indicator UI component needed in AppHeader (plan 07-02)

## Self-Check: PASSED

- All 5 source files exist in src/sync/
- All 2 task commits verified (66c8a5b, 9d67349)
- SUMMARY.md exists at .planning/phases/07-sync-engine/07-01-SUMMARY.md

---
*Phase: 07-sync-engine*
*Completed: 2026-02-13*
