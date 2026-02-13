---
phase: 06-api-database
plan: 01
subsystem: api
tags: [azure-functions, cosmos-db, typescript, swa]

# Dependency graph
requires:
  - phase: 05-auth-layer
    provides: "EasyAuth config and ClientPrincipal type definition"
provides:
  - "Azure Functions v4 TypeScript project scaffold in api/"
  - "parseClientPrincipal auth helper for SWA header decoding"
  - "Singleton CosmosClient bound to baseball-coach/coach-data"
  - "CosmosDocument and DocType shared type definitions"
affects: [06-02-endpoints, api, database]

# Tech tracking
tech-stack:
  added: ["@azure/functions ^4.11.0", "@azure/cosmos ^4.9.0"]
  patterns: ["Module-scope singleton for CosmosClient", "x-ms-client-principal base64 header parsing"]

key-files:
  created:
    - api/package.json
    - api/tsconfig.json
    - api/host.json
    - api/local.settings.json
    - api/.funcignore
    - api/src/lib/auth.ts
    - api/src/lib/cosmos.ts
    - api/src/lib/types.ts
  modified:
    - .gitignore

key-decisions:
  - "Cosmos client uses module-scope singleton -- reused across Azure Functions invocations"
  - "API ClientPrincipal is simplified from frontend (no claims array -- API only needs userId)"
  - "CosmosDocument.data typed as unknown -- each endpoint casts to specific frontend type"

patterns-established:
  - "Shared libs in api/src/lib/ -- all endpoint functions import from here"
  - "DocType discriminator for single-container design with /userId partition key"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Phase 06 Plan 01: API Project Scaffold Summary

**Azure Functions v4 TypeScript project with shared auth header parser, singleton CosmosClient, and typed document schema**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T04:33:22Z
- **Completed:** 2026-02-13T04:35:25Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created standalone api/ Node.js project with Azure Functions v4 programming model
- Built parseClientPrincipal helper that decodes SWA x-ms-client-principal base64 header
- Established singleton CosmosClient bound to baseball-coach/coach-data container
- Defined CosmosDocument interface with DocType discriminator for all document types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API project scaffold** - `2e63e45` (chore)
2. **Task 2: Create shared auth, Cosmos, and types libraries** - `053a10f` (feat)

## Files Created/Modified
- `api/package.json` - API project definition with @azure/functions and @azure/cosmos deps, main: dist/functions/*.js
- `api/tsconfig.json` - TypeScript config targeting ES2022 with Node16 module resolution
- `api/host.json` - Azure Functions host config with extension bundle
- `api/local.settings.json` - Local dev settings with Cosmos emulator connection string (gitignored)
- `api/.funcignore` - Deployment exclusion list
- `api/src/lib/auth.ts` - parseClientPrincipal function extracting userId from SWA header
- `api/src/lib/cosmos.ts` - Singleton CosmosClient and container export
- `api/src/lib/types.ts` - CosmosDocument interface and DocType union
- `.gitignore` - Added local.settings.json and api/dist/ exclusions

## Decisions Made
- Cosmos client is a module-scope singleton reused across Azure Functions invocations (standard pattern for serverless)
- API-side ClientPrincipal is simplified from frontend type (no claims array -- API only needs userId, identityProvider, userDetails, userRoles)
- CosmosDocument.data typed as `unknown` -- each endpoint casts to the specific frontend type it needs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

Cosmos DB connection string required for production. The local.settings.json is pre-configured with the Cosmos emulator default. For Azure deployment, set COSMOSDB_CONNECTION_STRING in the SWA app settings via Azure Portal.

## Next Phase Readiness
- api/ project builds cleanly with zero TypeScript errors
- Shared libraries ready for Plan 02's CRUD endpoint functions to import
- All endpoint functions will use parseClientPrincipal for auth and container for data access

## Self-Check: PASSED

All 9 created/modified files verified present. Both task commits (2e63e45, 053a10f) verified in git log.

---
*Phase: 06-api-database*
*Completed: 2026-02-13*
