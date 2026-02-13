# Requirements: Baseball Lineup Builder

**Defined:** 2026-02-12
**Core Value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## v2.0 Requirements

Requirements for Azure Cloud Sync milestone. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: Coach can sign in with their Microsoft account via Azure Entra ID (SWA EasyAuth)
- [ ] **AUTH-02**: Only coaches explicitly invited in Azure Portal can access the app (assignment-required)
- [ ] **AUTH-03**: Coach sees their display name and a sign-out button in the app header
- [ ] **AUTH-04**: App works fully without signing in (localStorage-only, like v1.0); signing in unlocks cloud sync

### Cloud Sync

- [ ] **SYNC-01**: Coach's roster, game config, lineup state, and game history persist to Azure Cosmos DB per-user partition
- [ ] **SYNC-02**: App reads/writes localStorage first (offline-first); syncs to cloud in background when online
- [ ] **SYNC-03**: Coach sees sync status indicator in the header (synced / syncing / offline / error)
- [ ] **SYNC-04**: On first sign-in, existing localStorage data automatically migrates to the coach's cloud account
- [ ] **SYNC-05**: Conflicts resolved via last-write-wins using Cosmos DB etag-based versioning

### Deployment

- [ ] **DEPL-01**: App is hosted on Azure Static Web Apps (Standard plan) with CI/CD from GitHub
- [ ] **DEPL-02**: App is installable as a PWA with "Add to Home Screen" on mobile
- [ ] **DEPL-03**: API layer uses SWA managed Azure Functions with Cosmos DB connection server-side only (credentials never in browser)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### UX Enhancements

- **UX-01**: App prompts coach when a new version is available (controlled service worker update)
- **UX-02**: Coach can export all data back to localStorage-only mode (disconnect cloud account)
- **UX-03**: Coach can delete all their cloud data ("delete my account" for data rights)

### Admin

- **ADMIN-01**: Data retention policy auto-deletes game data older than one season

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | Single-coach tool; LWW sync is sufficient |
| Granular per-field conflict resolution | CRDTs/OT overkill for single-writer data |
| Social logins (Google, Apple, etc.) | Microsoft-only, Azure-native stack |
| Role-based access control | All authenticated coaches are equal; no admin/viewer distinction |
| End-to-end encryption | Cosmos DB encryption at rest + HTTPS sufficient; key management too complex |
| Direct browser-to-Cosmos-DB access | Security risk; always go through Functions API |
| Push notifications | Not needed for pre-game planning tool |
| Sharing lineups between coaches | Each coach owns their data; share via CSV export |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| SYNC-01 | — | Pending |
| SYNC-02 | — | Pending |
| SYNC-03 | — | Pending |
| SYNC-04 | — | Pending |
| SYNC-05 | — | Pending |
| DEPL-01 | — | Pending |
| DEPL-02 | — | Pending |
| DEPL-03 | — | Pending |

**Coverage:**
- v2.0 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 (pending roadmap creation)

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after initial definition*
