# Roadmap: Baseball Lineup Builder

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-11)
- [ ] **v2.0 Azure Cloud Sync** — Phases 5-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-02-09
- [x] Phase 2: Lineup Engine (5/5 plans) — completed 2026-02-10
- [x] Phase 3: Batting Order (2/2 plans) — completed 2026-02-10
- [x] Phase 3.1: UI Fixes (2/2 plans) — completed 2026-02-10 (INSERTED)
- [x] Phase 4: History & Output (5/5 plans) — completed 2026-02-11

</details>

### v2.0 Azure Cloud Sync

**Milestone Goal:** Move from localStorage-only to Azure-backed storage with Microsoft authentication, so coaches can use the app across devices with offline support at the field.

- [ ] **Phase 5: Auth Layer** — Microsoft sign-in via SWA EasyAuth with invite-only access
- [ ] **Phase 6: API + Database** — Azure Functions API with Cosmos DB per-user storage
- [ ] **Phase 7: Sync Engine** — Offline-first background sync with conflict resolution
- [ ] **Phase 8: Data Migration** — Existing localStorage data migrates to cloud on first sign-in
- [ ] **Phase 9: PWA + Deployment** — Azure Static Web Apps hosting with installable PWA

## Phase Details

### Phase 5: Auth Layer
**Goal**: Coaches can sign in with their Microsoft account; only invited coaches can access the app; the app continues to work without signing in
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Coach can click "Sign in with Microsoft" and authenticate via Entra ID redirect (AUTH-01)
  2. A Microsoft user NOT assigned in Azure Portal sees an access denied page (AUTH-02)
  3. After sign-in, coach sees their display name and a sign-out button in the app header (AUTH-03)
  4. Coach can use the entire app without signing in, with all v1.0 functionality intact (AUTH-04)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: API + Database
**Goal**: A secure server-side API layer stores and retrieves coach data from Cosmos DB, with credentials never exposed to the browser
**Depends on**: Phase 5 (authenticated user identity available)
**Requirements**: DEPL-03, SYNC-01
**Success Criteria** (what must be TRUE):
  1. Azure Functions API accepts authenticated requests and rejects unauthenticated ones via x-ms-client-principal header (DEPL-03)
  2. Coach's roster, game config, lineup state, and game history are stored in Cosmos DB under their userId partition (SYNC-01)
  3. Cosmos DB connection string exists only in server-side application settings, never in client bundle (DEPL-03)
  4. API returns only data belonging to the requesting coach (SYNC-01)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Sync Engine
**Goal**: The app reads/writes localStorage first and syncs to cloud in the background, with visible sync status and safe conflict resolution
**Depends on**: Phase 6 (API endpoints available)
**Requirements**: SYNC-02, SYNC-03, SYNC-05
**Success Criteria** (what must be TRUE):
  1. Writes apply to localStorage immediately; cloud sync happens in the background without blocking the UI (SYNC-02)
  2. Coach sees a sync status indicator in the header showing synced, syncing, offline, or error state (SYNC-03)
  3. When the same data is edited on two devices, the last write wins using Cosmos DB etag versioning without data corruption (SYNC-05)
  4. App remains fully functional when network is unavailable, and syncs automatically when connectivity returns (SYNC-02)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Data Migration
**Goal**: Coaches who used v1.0 have their existing localStorage data automatically migrated to their cloud account on first sign-in
**Depends on**: Phase 7 (sync engine operational)
**Requirements**: SYNC-04
**Success Criteria** (what must be TRUE):
  1. On first sign-in, existing localStorage roster, game config, and game history appear in the coach's cloud account without manual action (SYNC-04)
  2. Existing hooks (useRoster, useGameConfig, useLineup, useGameHistory, useBattingOrder) use cloud-synced storage for signed-in coaches (SYNC-04)
  3. All existing tests continue to pass after the hook integration (SYNC-04)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: PWA + Deployment
**Goal**: The app is hosted on Azure Static Web Apps, installable as a PWA on mobile, and works offline at the field
**Depends on**: Phase 8 (all features integrated)
**Requirements**: DEPL-01, DEPL-02
**Success Criteria** (what must be TRUE):
  1. App is served from Azure Static Web Apps Standard plan with CI/CD deploying from GitHub on push (DEPL-01)
  2. Coach can tap "Add to Home Screen" on their phone and launch the app like a native app (DEPL-02)
  3. App loads and functions at the field with no network connectivity after initial install (DEPL-02)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:** 5 -> 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-09 |
| 2. Lineup Engine | v1.0 | 5/5 | Complete | 2026-02-10 |
| 3. Batting Order | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3.1 UI Fixes | v1.0 | 2/2 | Complete | 2026-02-10 |
| 4. History & Output | v1.0 | 5/5 | Complete | 2026-02-11 |
| 5. Auth Layer | v2.0 | 0/TBD | Not started | - |
| 6. API + Database | v2.0 | 0/TBD | Not started | - |
| 7. Sync Engine | v2.0 | 0/TBD | Not started | - |
| 8. Data Migration | v2.0 | 0/TBD | Not started | - |
| 9. PWA + Deployment | v2.0 | 0/TBD | Not started | - |
