# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.
**Current focus:** v2.0 Azure Cloud Sync — Phase 9: PWA + Deployment

## Current Position

Milestone: v2.0 Azure Cloud Sync
Phase: 9 of 9 (PWA + Deployment)
Plan: 2 of 2 in current phase (09-01, 09-02 complete)
Status: Phase 9 complete - v2.0 milestone complete
Last activity: 2026-02-14 — Completed 09-02 Azure Static Web Apps CI/CD

Progress: [==========================......] 84% (26/~31 plans across all milestones)

## Performance Metrics

**Velocity (from v1.0 + v2.0):**
- Total plans completed: 26
- Average duration: 4 min
- Total execution time: 112 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 05-auth-layer | 01 | 2min | 3 | 6 |
| 05-auth-layer | 02 | 3min | 3 | 5 |
| 06-api-database | 01 | 2min | 2 | 9 |
| 06-api-database | 02 | 2min | 2 | 5 |
| 07-sync-engine | 01 | 2min | 2 | 5 |
| 07-sync-engine | 02 | 2min | 2 | 9 |
| 08-data-migration | 01 | 2min | 2 | 2 |
| 09-pwa-deployment | 01 | 2min | 2 | 8 |
| 09-pwa-deployment | 02 | 16min | 2 | 1 |

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

From 06-02 execution:
- Singleton docs use deterministic IDs ({docType}-{userId}) for direct item reads
- Collection docs use compound IDs ({prefix}-{userId}-{entryId}) for per-coach uniqueness
- Batting endpoint combines two doc types under one route via docType discriminator on PUT
- All GET endpoints return 200 with sensible defaults (not 404) when no document exists

From 07-01 execution:
- Read localStorage at push-time (not from closure) to avoid stale data after rapid edits
- apiConfig stored in useRef to prevent object-literal dependency churn and infinite re-renders
- All hooks called unconditionally in useCloudStorage; auth check gates behavior inside callbacks/effects
- Collection push only sends entries since lastSyncedCount (append-only optimization)

From 07-02 execution:
- SyncProvider placed inside AuthProvider (useCloudStorage needs auth context)
- SyncStatusIndicator self-hides for unauthenticated users via early return null
- Batting hook uses responseKey/pushDocType for non-standard compound endpoint
- data-status CSS attribute pattern for multi-state styling

From 08-01 execution:
- Reuse pushToCloud for all 6 migration keys (no custom fetch calls)
- 3-second delay before migration lets useCloudStorage pulls complete first
- Error tracking via onStatus interceptor (hadError flag) since pushToCloud doesn't throw on HTTP errors
- Brand-new users with only default localStorage skip migration immediately
- migration-complete localStorage flag for idempotent one-time operation
- __migration__ synthetic key for reportStatus integration with sync indicator

From 09-01 execution:
- generateSW strategy over injectManifest -- no custom SW code needed for app-shell caching
- autoUpdate registerType -- new SW activates immediately without user prompt
- navigateFallbackDenylist for /.auth and /api -- prevents SW from breaking EasyAuth flows and API requests
- PNG icons generated from SVG via sharp -- maximum browser compatibility
- Dual exclusion: workbox navigateFallbackDenylist AND SWA navigationFallback.exclude for SW files

From 09-02 execution:
- OIDC authentication for Azure SWA deployments (no deployment token needed) -- matches Azure's GitHub deployment source
- Workflow filename must match Azure OIDC federated credential name (azure-static-web-apps-lemon-hill-0d4d7521e.yml)
- GitHub Actions OIDC uses id-token: write permission with @actions/core.getIDToken()
- PR events trigger preview deployments; PR close triggers cleanup job

### Pending Todos

- Move position blocks UI from Lineup tab to Roster section (tech debt from v1.0)
- Add sync conflict resolution with timestamp comparison — prompt user when local data is newer than cloud (sync)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-14 (09-02 execution)
Stopped at: Completed 09-02-PLAN.md -- Azure Static Web Apps CI/CD (Phase 9 complete, v2.0 milestone complete)
Resume file: None
