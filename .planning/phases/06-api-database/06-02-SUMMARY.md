---
phase: 06-api-database
plan: 02
subsystem: api
tags: [azure-functions, cosmos-db, http-endpoints, crud, typescript]

# Dependency graph
requires:
  - phase: 06-api-database
    plan: 01
    provides: "Azure Functions project scaffold, parseClientPrincipal auth helper, singleton CosmosClient, CosmosDocument types"
provides:
  - "GET/PUT /api/roster endpoints for coach player roster"
  - "GET/PUT /api/game-config endpoints for innings configuration"
  - "GET/PUT /api/lineup-state endpoints for lineup generation state"
  - "GET/PUT /api/game-history endpoints for per-game history entries"
  - "GET/PUT /api/batting endpoints for batting order state and history"
  - "Complete server-side API: 10 HTTP handlers across 5 function files"
affects: [07-sync-layer, api, frontend-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Singleton-document pattern with deterministic ID ({docType}-{userId})", "Collection-document pattern with compound ID and query by docType", "DocType discriminator for multi-type PUT endpoints (batting)"]

key-files:
  created:
    - api/src/functions/roster.ts
    - api/src/functions/game-config.ts
    - api/src/functions/lineup-state.ts
    - api/src/functions/game-history.ts
    - api/src/functions/batting.ts
  modified: []

key-decisions:
  - "Singleton docs use deterministic IDs ({docType}-{userId}) enabling direct item reads without queries"
  - "Collection docs use compound IDs ({prefix}-{userId}-{entryId}) for uniqueness per coach per entry"
  - "Batting endpoint combines two document types (battingOrderState singleton + battingHistory collection) under one route with docType discriminator"
  - "All GET handlers return sensible defaults when no document exists (empty array, default config, null) rather than 404"

patterns-established:
  - "Singleton GET pattern: direct item read with fallback to default value"
  - "Collection GET pattern: parameterized query filtering by userId + docType"
  - "Upsert-only writes: all PUT handlers use container.items.upsert for idempotent creates/updates"
  - "Consistent error handling: 401 for missing auth, 500 with context.error logging for Cosmos failures"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 06 Plan 02: API CRUD Endpoints Summary

**10 Azure Functions HTTP handlers (GET+PUT) for all coach data types using singleton and collection document patterns with Cosmos DB**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T04:37:37Z
- **Completed:** 2026-02-13T04:39:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created 3 singleton-document endpoints (roster, game-config, lineup-state) with deterministic IDs and sensible GET defaults
- Created 2 collection-document endpoints (game-history, batting) using Cosmos queries and compound document IDs
- All 10 HTTP handlers authenticate via SWA x-ms-client-principal header and scope data by userId partition key
- Full API builds cleanly producing 5 JS files in api/dist/functions/

## Task Commits

Each task was committed atomically:

1. **Task 1: Create singleton-document endpoints** - `7ae710d` (feat)
2. **Task 2: Create collection-document endpoints** - `702e856` (feat)

## Files Created/Modified
- `api/src/functions/roster.ts` - GET/PUT /api/roster with empty array default for new coaches
- `api/src/functions/game-config.ts` - GET/PUT /api/game-config with {innings: 6} default
- `api/src/functions/lineup-state.ts` - GET/PUT /api/lineup-state with null default
- `api/src/functions/game-history.ts` - GET queries all game entries, PUT upserts single entry with compound ID
- `api/src/functions/batting.ts` - GET combines battingOrderState singleton + battingHistory collection, PUT uses docType discriminator

## Decisions Made
- Singleton documents use deterministic IDs (`{docType}-{userId}`) allowing direct `container.item().read()` without queries
- Collection documents use compound IDs (`{prefix}-{userId}-{entryId}`) ensuring uniqueness per coach per game/entry
- Batting endpoint serves two document types through a single route -- GET returns both in one response, PUT accepts docType field to route to correct upsert pattern
- All GET endpoints return HTTP 200 with sensible defaults (not 404) when no document exists, simplifying frontend error handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Cosmos DB connection string was already configured in Plan 01.

## Next Phase Readiness
- Complete server-side API is built and compiles cleanly
- All 5 function files produce JS output in api/dist/functions/
- Ready for Phase 07 sync layer to integrate frontend hooks with these endpoints
- No production deployment blockers beyond the Cosmos DB connection string (documented in Plan 01)

## Self-Check: PASSED

All 5 created files verified present. Both task commits (7ae710d, 702e856) verified in git log.

---
*Phase: 06-api-database*
*Completed: 2026-02-13*
