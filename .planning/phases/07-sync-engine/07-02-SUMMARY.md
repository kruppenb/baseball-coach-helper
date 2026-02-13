---
phase: 07-sync-engine
plan: 02
subsystem: sync
tags: [cloud-sync, react-hooks, offline-first, status-indicator, hook-migration]

# Dependency graph
requires:
  - phase: 07-sync-engine
    provides: "useCloudStorage hook, SyncProvider context, sync-engine push/pull"
  - phase: 05-auth-layer
    provides: "AuthContext, useAuth hook for gating sync on authentication"
  - phase: 06-api-database
    provides: "REST API endpoints for roster, game-config, lineup-state, batting, game-history"
provides:
  - "All 5 domain hooks cloud-enabled via useCloudStorage"
  - "SyncProvider wired into app component tree"
  - "SyncStatusIndicator visual component in header"
affects: [08-data-migration, 09-pwa]

# Tech tracking
tech-stack:
  added: []
  patterns: ["useCloudStorage as drop-in useLocalStorage replacement in domain hooks", "data-status CSS attribute for multi-state styling"]

key-files:
  created:
    - src/components/app-shell/SyncStatusIndicator.tsx
    - src/components/app-shell/SyncStatusIndicator.module.css
  modified:
    - src/hooks/useRoster.ts
    - src/hooks/useGameConfig.ts
    - src/hooks/useLineup.ts
    - src/hooks/useGameHistory.ts
    - src/hooks/useBattingOrder.ts
    - src/App.tsx
    - src/components/app-shell/AppHeader.tsx

key-decisions:
  - "SyncProvider placed inside AuthProvider (useCloudStorage needs auth context)"
  - "SyncStatusIndicator self-hides for unauthenticated users via early return null"
  - "Batting hook uses responseKey/pushDocType for non-standard compound endpoint"

patterns-established:
  - "Domain hooks use useCloudStorage(key, initial, apiConfig) instead of useLocalStorage(key, initial)"
  - "data-status attribute pattern for CSS state styling"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 7 Plan 2: Hook Migration and Status Indicator Summary

**All 5 domain hooks migrated from useLocalStorage to useCloudStorage with SyncProvider wiring and visual sync status indicator in header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T06:05:14Z
- **Completed:** 2026-02-13T06:06:58Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Migrated all 5 domain hooks (useRoster, useGameConfig, useLineup, useGameHistory, useBattingOrder) from useLocalStorage to useCloudStorage with endpoint-specific config
- Wired SyncProvider into App.tsx component tree inside AuthProvider
- Built SyncStatusIndicator component with colored dot + label for synced/syncing/offline/error states
- Integrated indicator into AppHeader, visible only for authenticated users
- All 87 existing tests pass unchanged (hooks degrade to pure localStorage when no auth context)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate domain hooks to useCloudStorage and wire SyncProvider** - `e7bfd5f` (feat)
2. **Task 2: Build SyncStatusIndicator and integrate into AppHeader** - `2f95154` (feat)

## Files Created/Modified
- `src/hooks/useRoster.ts` - Cloud-synced roster hook via /api/roster singleton
- `src/hooks/useGameConfig.ts` - Cloud-synced game config hook via /api/game-config singleton
- `src/hooks/useLineup.ts` - Cloud-synced lineup state hook via /api/lineup-state singleton
- `src/hooks/useGameHistory.ts` - Cloud-synced game history hook via /api/game-history collection
- `src/hooks/useBattingOrder.ts` - Cloud-synced batting state + history via /api/batting with responseKey/pushDocType
- `src/App.tsx` - Added SyncProvider wrapping AppShell inside AuthProvider
- `src/components/app-shell/SyncStatusIndicator.tsx` - Visual sync status badge (green/blue/gray/red dot + label)
- `src/components/app-shell/SyncStatusIndicator.module.css` - Status-specific styles with pulse animation for syncing
- `src/components/app-shell/AppHeader.tsx` - Added SyncStatusIndicator before auth controls

## Decisions Made
- SyncProvider placed inside AuthProvider because useCloudStorage calls useAuth which requires AuthContext
- SyncStatusIndicator returns null for unauthenticated users (self-hiding, no conditional rendering needed in parent)
- Batting hook uses responseKey and pushDocType options for the non-standard compound batting endpoint that combines two doc types
- Used data-status attribute for CSS styling rather than conditional className merging (cleaner, more maintainable)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 07 (Sync Engine) is now complete -- all sync infrastructure and integration done
- All domain hooks are cloud-enabled for authenticated users
- Sync status is visible in the header for signed-in coaches
- Unauthenticated users retain full v1.0 functionality with no visible changes
- Ready for Phase 08 (Data Migration) or Phase 09 (PWA)

## Self-Check: PASSED

- All 2 created files exist (SyncStatusIndicator.tsx, SyncStatusIndicator.module.css)
- All 2 task commits verified (e7bfd5f, 2f95154)
- SUMMARY.md exists at .planning/phases/07-sync-engine/07-02-SUMMARY.md

---
*Phase: 07-sync-engine*
*Completed: 2026-02-13*
