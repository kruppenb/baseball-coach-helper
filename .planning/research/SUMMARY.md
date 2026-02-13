# Project Research Summary

**Project:** Baseball Coach Helper -- Azure Cloud Sync Milestone
**Domain:** Cloud-enabling an existing localStorage-only React SPA with Azure authentication, Cosmos DB, and offline-first sync
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

This research evaluated how to add Azure-based authentication, cloud storage, and offline-first sync to a fully functional localStorage-only React SPA (Vite 7 + React 19 + TypeScript). The app stores youth baseball roster data and game history, making privacy and offline reliability critical requirements.

**The recommended approach: Azure Static Web Apps with EasyAuth, NOT MSAL.js.** Research revealed that SWA's built-in authentication eliminates the need for client-side auth libraries entirely. FEATURES.md originally described MSAL.js flows because that's the documented SPA pattern, but STACK.md and ARCHITECTURE.md both identified a superior path: SWA EasyAuth handles authentication server-side via platform redirects, with zero client bundle impact and automatic API authentication via headers. This pattern is ideal for an app that only calls its own API (not external APIs like Microsoft Graph). The tradeoff: requires SWA Standard plan ($9/month) for custom Entra ID tenant restriction needed for invite-only access.

**Key risks:** (1) Data migration from existing localStorage keys to user-scoped cloud storage must preserve user data on first login, (2) last-write-wins conflict resolution requires careful timestamp/version tracking to avoid silent data loss, (3) children's names stored in cloud raise COPPA considerations requiring data minimization and privacy safeguards, (4) Cosmos DB document size limits require splitting game history into per-game documents instead of a single array.

## Key Findings

### Recommended Stack

**Core decision: SWA EasyAuth replaces MSAL.js entirely.** FEATURES.md documented MSAL React flows (PublicClientApplication, MsalProvider, acquireTokenSilent) based on standard SPA patterns, but this app doesn't need them. SWA EasyAuth provides authentication via platform-level redirects to `/.auth/login/aad`, sets secure HttpOnly cookies, and automatically forwards auth context to Azure Functions via `x-ms-client-principal` header. Zero npm packages, zero bundle impact, zero token management in React code.

**Core technologies:**
- **SWA EasyAuth (platform feature):** Microsoft Entra ID authentication with built-in tenant restriction and role management — eliminates ~45KB client library (MSAL), avoids React 19 compatibility issues, simplifies token management
- **Azure Cosmos DB for NoSQL (serverless):** Cloud document storage — maps directly to existing localStorage JSON, partition by userId for data isolation, serverless pricing fits sporadic usage ($0 at low scale)
- **Azure Functions v4 (managed):** API layer — TypeScript-native, zero separate deployment, integrates with SWA auth automatically, @azure/cosmos SDK for database access
- **vite-plugin-pwa:** Service worker generation — offline caching, PWA installability, integrates with Vite build pipeline
- **@azure/static-web-apps-cli:** Local development emulator — mock auth, API routing, essential for testing EasyAuth flows locally

**Critical cost finding:** Custom Entra ID authentication (required for tenant restriction) requires SWA Standard plan at $9/month. Free plan only supports preconfigured providers that allow any Microsoft account. Cosmos DB serverless adds ~$0/month at this scale (free tier covers usage). Total: ~$10/month.

**Critical data model finding:** Game history must be split into per-game documents (not a single array) to avoid hitting Cosmos DB's 2MB document limit as season data accumulates.

### Expected Features

Research identified a clean separation between table stakes, differentiators, and anti-features.

**Must have (table stakes):**
- Microsoft sign-in via Entra ID (EasyAuth handles this)
- Invite-only access control (Entra "Assignment required" setting)
- Cloud persistence of all app data (6 localStorage keys map to Cosmos DB documents)
- Offline-first operation (localStorage remains primary, cloud is backup)
- Automatic background sync (online/offline detection with queued writes)
- Last-write-wins conflict resolution (timestamp-based, acceptable for single-coach usage)
- Data migration from localStorage to cloud (first-sign-in flow preserves existing data)
- PWA installability (vite-plugin-pwa)
- Azure Static Web Apps deployment (Standard plan)

**Should have (competitive advantages):**
- Graceful auth-optional mode (app works without sign-in, cloud sync is opt-in)
- Sync status indicator (visual trust signal: synced/syncing/offline/error)
- Multi-device handoff UX (edit on laptop, see on phone)
- App update notifications (PWA update prompt)

**Defer (v2+):**
- Real-time collaborative editing (overkill for single-coach tool)
- Granular per-field conflict resolution (last-write-wins at entity level is sufficient)
- Social logins beyond Microsoft (adds OAuth complexity)
- End-to-end encryption (default at-rest encryption + HTTPS is adequate)
- Sharing lineups between coaches (keep data partitioned by user)

### Architecture Approach

**Core principle: SWA EasyAuth for authentication, managed functions for API, localStorage remains primary with background cloud sync.** The existing hooks architecture is preserved by inserting a sync layer beneath the current `useLocalStorage` hook rather than replacing it.

**Major components:**
1. **Auth layer (SWA EasyAuth)** — Platform-level authentication via `/.auth/login/aad`, exposes user info via `/.auth/me`, no React libraries needed
2. **Sync layer (useCloudStorage hook)** — Drop-in replacement for useLocalStorage that wraps it with background cloud sync, online/offline detection, last-write-wins reconciliation
3. **API layer (Azure Functions)** — GET/PUT/DELETE endpoints for user data, validates `x-ms-client-principal` header, enforces userId-based access control
4. **Database (Cosmos DB)** — Serverless NoSQL, partition by userId, one document per localStorage key (roster, gameConfig, lineupState, battingHistory), separate documents per game in gameHistory to avoid size limits

**Key patterns:**
- **Transparent sync hook:** useCloudStorage has identical signature to useLocalStorage — existing hooks swap one import, change nothing else
- **Optimistic local, eventual cloud:** All writes apply to localStorage immediately (synchronous), cloud sync is fire-and-forget background
- **Platform-level auth:** Authentication handled by SWA infrastructure, React app only calls `/.auth/me` to check status
- **User-partitioned data:** All Cosmos DB documents partitioned by userId from `clientPrincipal.userId`, provides data isolation and efficient queries

**Anti-patterns to avoid:**
- Blocking UI on network requests (localStorage must be primary for offline reliability)
- Using MSAL.js for auth (adds bundle size, token management complexity, React 19 compatibility concerns — EasyAuth solves this)
- Granular document sync (syncing individual players wastes RUs and complicates merge — sync at localStorage-key level)
- Replacing localStorage with cloud (app becomes unusable offline — localStorage remains primary)

### Critical Pitfalls

Research identified 18 pitfalls across CRITICAL/MODERATE/MINOR severity. Top 5 critical issues:

1. **Existing localStorage data orphaned after auth** — Users who used the app before auth have roster/game data in unprefixed localStorage keys. After auth scopes data by userId, old data disappears. MUST implement one-time migration prompt on first authenticated login to preserve existing data.

2. **Last-write-wins silently destroys roster changes** — Device that was offline longer syncs later, and its stale data overwrites fresher data. Use Cosmos DB `_etag` version counter (not timestamps) for optimistic concurrency. Show "last synced" indicator so users can detect stale data.

3. **Cosmos DB connection string exposed to browser** — NEVER put connection string in Vite env vars (VITE_* prefix bundles them client-side). Always access Cosmos DB via Azure Functions API layer with connection string in server-side Application Settings only.

4. **Children's names stored without COPPA consideration** — Storing children's first names in cloud creates privacy risk. Minimize PII (first name + last initial only), enable encryption at rest, implement data retention policy (auto-delete old seasons), add privacy notice, avoid analytics that create persistent identifiers.

5. **Custom auth requires Standard plan ($9/month)** — SWA Free plan only supports preconfigured auth providers that allow ANY Microsoft account. Custom Entra ID with tenant restriction (required for invite-only access) requires Standard plan. Budget accordingly from start.

**EasyAuth-specific mitigation:** By using SWA EasyAuth instead of MSAL.js, we AVOID 5 additional critical/moderate pitfalls:
- MSAL instance re-creation on re-renders (would cause auth redirect loops)
- MSAL localStorage key collisions with app data
- MSAL token acquisition silent failures
- React Router stripping auth hash during redirects (avoided by keeping tab-based nav)
- MSAL React 19 compatibility issues (v5 had rocky launch Feb 2026)

## Implications for Roadmap

Based on research, the recommended build order follows a dependency-driven path. Critical finding: **authentication must be built first** because everything else (API, sync, migration) depends on knowing the user's identity.

### Suggested Phase Structure

**Phase 1: SWA Configuration + Auth Layer**
**Rationale:** Foundation for entire milestone. API calls and sync require authenticated user identity. EasyAuth is platform-level configuration (not library integration), making this phase low-risk and well-documented.
**Delivers:** Authenticated user context, login/logout UI, invite-only access enforcement
**Addresses:** Microsoft sign-in (table stakes), invite-only access control (table stakes)
**Avoids:** MSAL integration pitfalls (by using EasyAuth), React 19 compatibility issues
**Includes:**
- Create `staticwebapp.config.json` with Entra ID custom provider config
- Implement `useAuth` hook (fetch `/.auth/me`)
- Implement `AuthGate` component and `LoginPage`/`UserMenu` UI
- Set up SWA CLI for local development with mock auth
- Integrate `AuthGate` into AppShell

**Phase 2: Azure Functions API + Cosmos DB**
**Rationale:** Sync layer needs API endpoints to talk to. This phase builds the middle tier before touching existing React hooks.
**Delivers:** Secure API layer with user-scoped data access, Cosmos DB storage
**Uses:** @azure/functions v4, @azure/cosmos SDK, SWA managed functions
**Implements:** API component from architecture (GET/PUT/DELETE endpoints)
**Avoids:** Cosmos DB credentials in client (API-only access), wrong partition key (use /userId)
**Includes:**
- Initialize `api/` folder with Azure Functions v4 project
- Create Cosmos DB serverless account with userId partition key
- Implement getData/putData/deleteData functions
- Add `parseClientPrincipal` auth helper for x-ms-client-principal validation
- Test with SWA CLI local functions

**Phase 3: Sync Engine + useCloudStorage Hook**
**Rationale:** Bridge between existing hooks and cloud. This phase is architecturally complex but isolated — existing app continues working unchanged.
**Delivers:** Background cloud sync, online/offline detection, conflict resolution
**Uses:** Custom sync logic (no library), vite-plugin-pwa for offline caching
**Implements:** Sync layer component from architecture
**Avoids:** Last-write-wins data loss (use etag versioning), navigator.onLine unreliability (try actual requests)
**Includes:**
- Implement `api-client.ts` (typed fetch wrapper)
- Implement `sync-engine.ts` (pull/push/reconcile with etag-based LWW)
- Implement `useCloudStorage` hook (wraps useLocalStorage + sync)
- Add `SyncMetadata` to localStorage for dirty tracking
- Add sync status indicator component

**Phase 4: Data Migration + Hook Integration**
**Rationale:** This is the actual cutover — swapping imports in existing hooks and migrating user data. Must come after sync layer is tested.
**Delivers:** Existing hooks connected to cloud, user data preserved
**Addresses:** Data migration (table stakes), orphaned localStorage data (critical pitfall)
**Avoids:** Silent data loss on first login
**Includes:**
- Implement first-sign-in migration flow (detect unprefixed keys, prompt user, copy to cloud)
- Change useRoster/useGameConfig/useLineup/useGameHistory/useBattingOrder to use useCloudStorage
- Run all existing tests (should pass without changes)
- Manual test: edit on one device, verify sync to another

**Phase 5: PWA + Deployment**
**Rationale:** Build last because requires all other phases working. PWA service worker can interfere with auth if added too early.
**Delivers:** Installable PWA, production deployment
**Uses:** vite-plugin-pwa, GitHub Actions, SWA Standard plan, Cosmos DB in production
**Addresses:** PWA installability (table stakes), deployment (table stakes)
**Avoids:** Service worker caching stale auth pages, SWA asset MIME type errors
**Includes:**
- Configure vite-plugin-pwa (exclude auth pages from cache)
- Create Azure resources (SWA Standard, Cosmos DB serverless)
- Configure GitHub Actions deployment workflow
- Set application settings (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, COSMOS_CONNECTION_STRING)
- Test end-to-end on staging environment

### Phase Ordering Rationale

- **Auth first:** Everything else requires knowing userId. EasyAuth is platform config (low risk).
- **API second:** Sync needs endpoints. Building API separately allows testing before touching existing React code.
- **Sync third:** Isolated from existing hooks. Can be tested independently.
- **Migration fourth:** Only touch existing hooks after sync is proven working.
- **PWA last:** Service workers can interfere with auth. Add after auth flow is solid.

This ordering minimizes risk to the existing working app. Phases 1-3 add new code without modifying existing hooks. Phase 4 is the only invasive change (import swaps), and it comes after everything else is tested.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Sync Engine):** Custom sync logic (no library) requires careful design. Research identified patterns but implementation details need phase-level research. Specifically: etag-based versioning, conflict detection UI, dirty state tracking.
- **Phase 4 (Data Migration):** First-sign-in migration flow has edge cases (what if user declines migration? what if cloud already has data from another device?). Needs detailed planning.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (SWA Auth):** Well-documented platform features. Official Microsoft Learn docs are comprehensive.
- **Phase 2 (API + Cosmos):** Standard Azure Functions + Cosmos DB patterns. TypeScript SDK is well-documented.
- **Phase 5 (Deployment):** SWA deployment is turnkey (GitHub Actions template auto-generated).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core decision (EasyAuth over MSAL) verified in official SWA docs updated Jan 2026. All package versions verified on npm. Standard plan requirement confirmed. |
| Features | MEDIUM-HIGH | Table stakes and differentiators well-researched. MSAL flows in FEATURES.md translate cleanly to EasyAuth patterns. Auth-optional mode needs UX validation. |
| Architecture | HIGH | SWA EasyAuth pattern is official Microsoft recommendation for own-API scenarios. Sync layer architecture follows established offline-first patterns. Build order is dependency-driven. |
| Pitfalls | HIGH | Critical pitfalls verified via official docs and GitHub issues. EasyAuth avoids entire class of MSAL-specific pitfalls. COPPA considerations researched via FTC sources. |

**Overall confidence:** HIGH

Research surfaced one major discrepancy (MSAL vs EasyAuth) which was resolved in favor of EasyAuth based on:
1. Official Microsoft docs recommend EasyAuth for apps calling own APIs (verified Jan 2026)
2. MSAL.js v5 had rocky launch (GitHub issue #8254) — Feb 10, 2026
3. Bundle size impact (0 KB vs 45 KB)
4. This specific app does not need Microsoft Graph or external API scopes

### Gaps to Address

**Data model for game history:** Research identified that game history must be split into per-game documents (not single array) to avoid 2MB limit. Exact document structure needs refinement during Phase 2 planning. Current structure stores full `Lineup` (all innings) + `battingOrder` + `playerSummaries` per game — estimate 5-20KB per game. After 30+ games this approaches concerning size.

**Conflict resolution UX:** Research recommends etag-based versioning with conflict detection, but UI for presenting conflicts to user needs design. For MVP, silent LWW with "last synced" indicator may be acceptable since single-coach usage makes true conflicts rare.

**COPPA compliance:** Research identified privacy concerns but not definitive legal guidance. Mitigation strategies documented (minimize PII, data retention, privacy notice), but legal review recommended before commercial distribution.

**Offline-first testing:** Research documented patterns but actual network partition testing (airplane mode, poor connectivity at baseball fields, captive portals) needs manual validation during Phase 3.

**Auth-optional mode implementation:** FEATURES.md suggests auth should be opt-in (app works without sign-in). Architecture shows AuthGate wrapping entire app, which would force login. These two approaches need reconciliation during Phase 1 planning. Recommendation: Make AuthGate show "Continue without signing in" option that sets `isAuthenticated: false` but renders app normally.

## Sources

### Primary (HIGH confidence)
**Azure Static Web Apps:**
- [SWA Authentication and Authorization](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization) — EasyAuth patterns, built-in auth (Jan 2026)
- [SWA Custom Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom) — Entra ID custom provider config (Jan 2026)
- [SWA API Support](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions) — Managed vs BYO functions, HTTP-only limitation
- [SWA Hosting Plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans) — Standard plan requirement for custom auth (verified)
- [SWA Configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) — staticwebapp.config.json format

**Azure Cosmos DB:**
- [Cosmos DB Serverless](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless) — Pay-per-request pricing (verified via WebFetch)
- [Cosmos DB Free Tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier) — 1000 RU/s, 25 GB lifetime free
- [Cosmos DB Partitioning](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview) — Partition key design
- [Cosmos DB Limits](https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits) — 2MB document size limit
- [Cosmos DB JS SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme) — v4 GA, TypeScript native

**MSAL.js (avoided but researched):**
- [@azure/msal-react npm](https://www.npmjs.com/package/@azure/msal-react) — v5.0.4 (Feb 10, 2026)
- [MSAL v5 issue #8254](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/8254) — Half-baked release concerns
- [MSAL React FAQ](https://learn.microsoft.com/en-us/entra/msal/javascript/react/faq) — Instance creation best practices
- [MSAL Common Errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors) — Error handling patterns

**Authentication & Access Control:**
- [Restrict App to Set of Users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users) — "Assignment required" setting

### Secondary (MEDIUM confidence)
**Offline-First Patterns:**
- [Offline-First Architecture](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79) — Sync patterns
- [Last-Write-Wins Implementation](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) — LWW conflict resolution
- [Downsides of Offline-First](https://rxdb.info/downsides-of-offline-first.html) — When not to use heavy sync libraries

**PWA:**
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — Vite 7 support (v1.0.1+)
- [Vite PWA documentation](https://vite-pwa-org.netlify.app/guide/) — React integration, workbox config

### Tertiary (LOW confidence, needs validation)
**Privacy/COPPA:**
- [FTC COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) — Official regulations
- [COPPA 2025 Amendments](https://securiti.ai/ftc-coppa-final-rule-amendments/) — Recent changes (effective April 2026)
- [COPPA Compliance Guide](https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/) — Implementation guidance

---
*Research completed: 2026-02-12*
*Ready for roadmap: yes*
