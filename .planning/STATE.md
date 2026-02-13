# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.
**Current focus:** v2.0 Azure Cloud Sync — Phase 6: API & Database

## Current Position

Milestone: v2.0 Azure Cloud Sync
Phase: 6 of 9 (API & Database)
Plan: 1 of 2 in current phase (done)
Status: Executing
Last activity: 2026-02-13 — Completed 06-01 API project scaffold

Progress: [====================............] 65% (20/~31 plans across all milestones)

## Performance Metrics

**Velocity (from v1.0 + v2.0):**
- Total plans completed: 20
- Average duration: 4 min
- Total execution time: 86 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 05-auth-layer | 01 | 2min | 3 | 6 |
| 05-auth-layer | 02 | 3min | 3 | 5 |
| 06-api-database | 01 | 2min | 2 | 9 |

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table (12 validated from v1.0, 5 pending for v2.0).

Key v2.0 decisions from research:
- SWA EasyAuth over MSAL.js (zero client library, platform-level auth)
- SWA Standard plan required ($9/mo) for custom Entra ID tenant restriction
- Cosmos DB serverless with /userId partition key
- Per-game documents for game history (avoid 2MB limit)
- useCloudStorage wraps useLocalStorage with identical API signature

From 05-01 execution:
- TENANT_ID left as placeholder in SWA config -- user replaces at deployment time
- getDisplayName extracts name claim first, falls back to userDetails, then 'Coach'
- Auth fetch errors gracefully set user: null (AUTH-04 preserved)
- /api proxy to port 7071 configured now for Phase 6 readiness

From 05-02 execution:
- Auth controls are plain <a> tags (not buttons) -- navigate to SWA EasyAuth endpoints
- Auth section renders nothing during isLoading to prevent layout flash
- Inline header in AppShell replaced entirely by AppHeader component

From 06-01 execution:
- Cosmos client is module-scope singleton reused across Azure Functions invocations
- API ClientPrincipal simplified from frontend (no claims array -- API only needs userId)
- CosmosDocument.data typed as unknown -- each endpoint casts to specific frontend type
- Shared libs pattern: api/src/lib/ for auth, cosmos, types

### Pending Todos

- Move position blocks UI from Lineup tab to Roster section (tech debt from v1.0)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-13 (06-01 execution)
Stopped at: Completed 06-01-PLAN.md -- API project scaffold with shared libraries
Resume file: None
