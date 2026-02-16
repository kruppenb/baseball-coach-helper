---
phase: 13-sync-hardening
plan: 01
subsystem: api
tags: [cosmos-db, etag, optimistic-concurrency, conflict-resolution]

# Dependency graph
requires:
  - phase: 10-wizard-settings
    provides: "PUT endpoints for roster, game-config, lineup-state, batting"
provides:
  - "ETag-based optimistic concurrency on all 4 singleton PUT endpoints"
  - "412 conflict response with cloudData/cloudEtag/cloudUpdatedAt"
  - "Backward-compatible unconditional upsert when If-Match absent"
affects: [13-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Cosmos DB accessCondition with IfMatch for optimistic concurrency", "412 conflict response with cloud state for client-side resolution"]

key-files:
  created: []
  modified:
    - api/src/functions/roster.ts
    - api/src/functions/game-config.ts
    - api/src/functions/lineup-state.ts
    - api/src/functions/batting.ts

key-decisions:
  - "accessCondition only on singleton doc upserts -- collection-mode endpoints (gameHistory, battingHistory) remain unconditional per research guidance"
  - "412 response includes cloudData/cloudEtag/cloudUpdatedAt so frontend can resolve conflicts without an extra GET"
  - "If-Match header is optional -- omitting it allows unconditional upsert for backward compatibility and first-ever saves"

patterns-established:
  - "ETag concurrency pattern: read If-Match header, build accessCondition conditionally, catch statusCode 412, read current doc, return 412 with cloud state"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 13 Plan 01: API ETag Concurrency Summary

**Cosmos DB ETag-based optimistic concurrency on all 4 singleton PUT endpoints with 412 conflict responses containing cloud state for client resolution**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T04:01:46Z
- **Completed:** 2026-02-16T04:03:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All 4 singleton PUT endpoints (roster, game-config, lineup-state, battingOrderState) now enforce ETag-based optimistic concurrency via Cosmos DB `accessCondition`
- Stale `If-Match` headers produce HTTP 412 with `cloudData`, `cloudEtag`, and `cloudUpdatedAt` for frontend conflict resolution
- Collection-mode endpoints (gameHistory, battingHistory) remain unconditional as designed
- Backward compatibility preserved -- omitting `If-Match` header allows unconditional upsert

## Task Commits

Each task was committed atomically:

1. **Task 1: Add If-Match / 412 concurrency to roster, game-config, and lineup-state PUT endpoints** - `ee62ade` (feat)
2. **Task 2: Add If-Match / 412 concurrency to batting PUT endpoint (battingOrderState only)** - `f18b008` (feat)

## Files Created/Modified
- `api/src/functions/roster.ts` - If-Match header reading, accessCondition on upsert, 412 conflict response with cloud state
- `api/src/functions/game-config.ts` - Same ETag concurrency pattern as roster
- `api/src/functions/lineup-state.ts` - Same ETag concurrency pattern as roster
- `api/src/functions/batting.ts` - ETag concurrency on battingOrderState branch only; battingHistory remains unconditional

## Decisions Made
- accessCondition applied only to singleton document upserts; collection-mode endpoints (gameHistory, battingHistory) remain unconditional per research guidance
- 412 response body includes `cloudData`, `cloudEtag`, `cloudUpdatedAt` so the frontend can resolve conflicts without a separate GET round-trip
- `If-Match` header is optional -- omitting it falls through to unconditional upsert for backward compatibility and first-ever saves

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- API concurrency enforcement complete; ready for Plan 02 (frontend sync hooks and conflict resolution UI)
- All 4 GET endpoints already return `_etag` in responses, so the frontend has the data it needs to send `If-Match` headers

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 13-sync-hardening*
*Completed: 2026-02-15*
