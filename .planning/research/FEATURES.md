# Feature Landscape: Azure Cloud Sync Milestone

**Domain:** Cloud authentication, storage, and offline-first sync for an existing React SPA
**Researched:** 2026-02-12
**Overall Confidence:** MEDIUM-HIGH

---

## Context

The Baseball Lineup Builder is a fully functional localStorage-only React SPA (Vite + React 19 + TypeScript). This milestone adds Azure-based authentication, cloud storage, offline-first sync, and deployment. The app stores children's names (privacy-sensitive). Six localStorage keys currently hold all state: `roster`, `gameConfig`, `lineupState`, `battingOrderState`, `battingHistory`, `gameHistory`.

---

## Table Stakes

Features users expect when a cloud-synced app is introduced. Missing = the cloud migration feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Microsoft sign-in (Entra ID via MSAL React)** | Users must authenticate to associate data with an account. Microsoft accounts are the prescribed identity provider. | Medium | Entra ID app registration, `@azure/msal-browser` v5, `@azure/msal-react` v5 | Use Authorization Code Flow with PKCE (default for MSAL React SPAs). MsalProvider wraps the app at the root. PublicClientApplication must be instantiated outside the React component tree. |
| **Sign-in / sign-out UI** | Coaches need a clear way to log in and see who they are logged in as. | Low | MSAL React | Use `AuthenticatedTemplate` and `UnauthenticatedTemplate` built-in components. Show user's display name and a sign-out button in the header. Use popup login (not redirect) to preserve SPA state. |
| **Invite-only access control** | Only explicitly invited coaches should be able to sign in. Random Microsoft account holders must be blocked. Children's data privacy demands this. | Low | Entra ID Enterprise App configuration | Set "Assignment required?" = Yes on the Enterprise Application in Entra admin center. Only users/groups explicitly assigned can sign in. Non-assigned users get a clear denial. No application code needed for enforcement -- Entra handles it. |
| **Cloud persistence of all app data** | The entire point of cloud sync. Roster, game config, lineup state, batting history, and game history must be stored remotely tied to the authenticated user. | High | Azure Functions API + Cosmos DB (serverless, NoSQL) | Six localStorage keys map to one Cosmos DB document per user (or a small set of documents). Partition by userId. Use Azure Functions (TypeScript) as the API layer -- never expose Cosmos DB credentials to the browser. |
| **Offline-first operation** | Coaches use this app at baseball fields where cellular/Wi-Fi is unreliable. The app must work fully offline and sync when connectivity returns. | High | Service worker (vite-plugin-pwa), local-first data layer | The app already works with localStorage. Cloud sync is an enhancement layer on top, not a replacement for local storage. "Local-first, cloud-backup" pattern: always read/write to localStorage, sync to cloud in the background. |
| **Automatic background sync** | Users should not have to press "sync" manually. Data should flow to the cloud seamlessly when online. | Medium | Sync service, online/offline detection | Use `navigator.onLine` + `online`/`offline` events to detect connectivity. Queue writes when offline. Sync on reconnection. Show a subtle sync status indicator (syncing, synced, offline). |
| **Last-write-wins conflict resolution** | When the same data is edited on two devices, the most recent edit wins. For a single-coach tool, this is the pragmatic choice. | Medium | Timestamp-based versioning on each data entity | Each syncable entity gets an `updatedAt` ISO timestamp. On sync, compare local vs remote timestamps. Most recent wins. Use server clock (from Azure Function response) to avoid client clock drift issues. |
| **Data migration from localStorage to cloud** | Existing coaches who used the app offline-only must not lose their data when they first sign in. | Medium | First-sign-in migration flow | On first authenticated session, detect existing localStorage data and upload it to cloud. If cloud already has data (e.g., signed in on another device first), prompt user: "Use data from this device or from cloud?" One-time merge decision. |
| **PWA installability** | Coaches should be able to "install" the app on their phone home screen for quick access at the field. | Low | `vite-plugin-pwa`, web app manifest | Vite plugin handles manifest generation, service worker registration, and install prompt. Provides app-like experience without an app store. |
| **Azure Static Web Apps deployment** | The app needs to be hosted somewhere accessible. SWA free tier fits perfectly: free hosting, free SSL, managed Functions API, CI/CD via GitHub. | Medium | SWA resource, GitHub Actions CI/CD | Free tier: 250 MB app, 100 GB bandwidth, 2 custom domains, managed Azure Functions. Standard plan ($9/mo) only needed if custom auth provider registration is required -- but the free tier supports preconfigured Microsoft auth. |

## Differentiators

Features that set this cloud-sync implementation apart from generic approaches. Not strictly required, but significantly improve the experience.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Graceful auth-optional mode** | Coaches can use the app without signing in (pure localStorage mode), just like v1. Auth is opt-in to unlock cloud sync. No forced sign-in wall. | Medium | Conditional MSAL, feature-flagged sync layer | The app must remain fully functional without authentication. Signing in enables cloud backup. This preserves the "no account needed" privacy story while offering sync as an upgrade. Existing `useLocalStorage` hook continues to work unchanged. |
| **Sync status indicator** | A small icon in the header showing "synced", "syncing", "offline", or "sync error". Builds trust that data is safe. | Low | Online/offline events, sync service state | Use a colored dot or icon: green (synced), yellow (syncing), gray (offline), red (error). Tooltip shows last sync time. Minimal UI footprint. |
| **Multi-device handoff UX** | Coach edits lineup on laptop at home, opens app on phone at the field, sees the same lineup. This is the killer use case. | High (already covered by sync) | Cloud sync working correctly | The sync architecture naturally enables this. Key UX: on app load while authenticated, fetch latest cloud data and merge with local. Show "Last synced: 2 minutes ago" so coach trusts the data is current. |
| **Session persistence across tabs** | MSAL auth state shared across browser tabs so coach does not have to sign in separately per tab. | Low | MSAL `cacheLocation: 'localStorage'` | Default MSAL cache is `sessionStorage` (more secure but per-tab). For multi-tab convenience, use `localStorage` for the MSAL cache. Since this is a coaching tool (not banking), the usability tradeoff is acceptable. |
| **Automatic silent token refresh** | Auth tokens refresh in the background without interrupting the coach. No random sign-in popups mid-game. | Low | MSAL built-in behavior | MSAL.js handles this automatically: `acquireTokenSilent()` uses refresh tokens and hidden iframes. Access tokens last 1 hour, refresh tokens 24 hours. Fallback to popup only if silent refresh fails (e.g., password changed). |
| **Data export before account deletion** | If a coach wants to stop using cloud sync, they can export all data back to localStorage-only mode. | Low | UI option to "disconnect" account | Reverse of migration: copy cloud data to localStorage, clear cloud association. Coach keeps their data locally. |
| **App update notifications** | PWA service worker detects new version and prompts coach to reload. | Low | `vite-plugin-pwa` prompt mode | Use "prompt" update strategy (not auto-update) so mid-game usage is not disrupted. Show "Update available" banner that coach can dismiss until convenient. |

## Anti-Features

Features to explicitly NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time collaborative editing** | Massively increases complexity (WebSockets, operational transforms, conflict resolution at field level). This is a single-coach tool, not Google Docs. | Last-write-wins at the document level. If an assistant coach needs access, they sign in on their own device and see the latest synced state. No simultaneous editing. |
| **Granular per-field conflict resolution** | Merging individual player edits from two devices requires CRDT-like structures. Overkill for a tool where one coach makes changes at a time. | Last-write-wins at the entity level (e.g., entire roster, entire game history). Timestamp comparison decides winner. Simple, predictable, debuggable. |
| **Custom identity provider / social logins** | Google, Apple, Facebook sign-in each require separate OAuth configurations, different consent flows, and provider-specific maintenance. | Microsoft accounts only (via Entra ID). This is an Azure-deployed app for a specific coaching community. One identity provider simplifies everything. |
| **Role-based access control in-app** | Admin vs coach vs parent roles add auth complexity, UI branching, and API authorization layers. | Single role: authenticated coach. All authenticated users have full read/write access to their own data. No sharing between accounts in this milestone. |
| **End-to-end encryption** | E2E encryption of data at rest in Cosmos DB is technically possible but adds significant key management complexity. | Use Cosmos DB's built-in encryption at rest (enabled by default) and HTTPS for data in transit. Data is privacy-sensitive (children's names) but not classified/regulated at a level requiring E2E. Access is already restricted to authenticated users accessing only their own partition. |
| **Direct browser-to-Cosmos-DB access** | The `@azure/cosmos` SDK works in browsers, but exposing connection strings or resource tokens to client code is a security risk. | Always go through Azure Functions API. The Functions app holds the Cosmos DB connection string as an app setting. Browser never sees database credentials. |
| **Complex data schema in Cosmos DB** | Normalized relational-style schema with separate containers for roster, config, games, etc. adds query complexity and costs more RUs. | Single container with documents partitioned by userId. Each document type (roster, config, history) is a different document within the user's partition. Simple, cheap, fast. |
| **Sharing lineups between coaches** | Sharing data between different user accounts requires authorization rules, shared containers, and consent flows. | Each coach owns their own data partition. If a team has two coaches, they use the same Microsoft account or one coaches exports a CSV. Keep it simple. |
| **Push notifications** | Requires notification service (Firebase/Azure Notification Hub), user consent, and ongoing infrastructure cost. | Not needed. This is a pre-game planning tool, not a real-time communication platform. |

## Feature Dependencies (Cloud Sync Milestone)

```
Azure Infrastructure Setup
    |-- Entra ID App Registration (client ID, tenant, redirect URIs)
    |-- Cosmos DB Account (serverless, NoSQL API)
    |-- Azure Functions App (TypeScript, Node.js runtime)
    |-- Azure Static Web Apps Resource (free tier, linked Functions)
    |
    v
MSAL React Integration
    |-- PublicClientApplication initialization (outside React tree)
    |-- MsalProvider wrapper in main.tsx
    |-- AuthenticatedTemplate / UnauthenticatedTemplate in AppShell
    |-- Sign-in button (popup flow)
    |-- User info display + sign-out
    |-- Invite-only enforcement (Entra Enterprise App config, no code needed)
    |
    v
API Layer (Azure Functions)
    |-- GET /api/data/{userId} -- fetch user's full data document
    |-- PUT /api/data/{userId} -- upsert user's data with timestamp
    |-- Token validation middleware (validate MSAL access token)
    |-- Cosmos DB SDK v4 for read/write operations
    |
    v
Sync Service (client-side)
    |-- SyncProvider context wrapping the app
    |-- Online/offline detection (navigator.onLine + events)
    |-- Background sync on data change (debounced, 2-3 second delay)
    |-- Pull latest on app load (when authenticated + online)
    |-- Last-write-wins merge logic (compare updatedAt timestamps)
    |-- Sync status state (synced | syncing | offline | error)
    |
    v
Data Migration
    |-- First-sign-in detection (no cloud data for userId)
    |-- Upload existing localStorage data to cloud
    |-- Subsequent sign-ins: pull cloud data, merge with local
    |
    v
PWA / Offline Support
    |-- vite-plugin-pwa configuration (generateSW strategy)
    |-- Web app manifest (name, icons, theme color)
    |-- Service worker caches all static assets for offline use
    |-- Prompt-based update strategy (do not auto-reload mid-use)
    |
    v
Deployment Pipeline
    |-- GitHub Actions workflow for Static Web Apps
    |-- Environment variables for MSAL clientId/tenantId
    |-- Linked Azure Functions backend
```

## User Experience Flows

### Flow 1: First-Time Sign-In (existing offline user)

1. Coach opens app (already has roster and game history in localStorage)
2. Coach sees "Sign in to sync across devices" prompt (non-blocking, dismissible)
3. Coach clicks "Sign in with Microsoft"
4. Popup opens to Microsoft login page
5. Coach signs in with their Microsoft account
6. Popup closes, app shows user name in header + sync indicator
7. App detects no cloud data exists for this user
8. App automatically uploads all localStorage data to cloud
9. Sync indicator shows "Synced" (green)
10. Coach continues using app normally -- all writes go to localStorage AND cloud

### Flow 2: Second Device Setup

1. Coach opens app on phone (empty localStorage)
2. Coach signs in with Microsoft
3. App detects cloud data exists but localStorage is empty
4. App downloads cloud data and populates localStorage
5. Sync indicator shows "Synced"
6. Coach sees their full roster, history, and config from their laptop

### Flow 3: Offline Usage at the Field

1. Coach opens app at baseball field (no connectivity)
2. App loads from service worker cache (PWA)
3. Data loads from localStorage (always available offline)
4. Sync indicator shows "Offline" (gray)
5. Coach creates lineup, modifies roster, finalizes game
6. All changes write to localStorage normally
7. Changes are queued for cloud sync
8. Phone regains connectivity (back at car/home)
9. App detects online status, begins background sync
10. Queued changes upload to cloud
11. Sync indicator transitions: "Syncing..." (yellow) then "Synced" (green)

### Flow 4: Conflict (rare, last-write-wins)

1. Coach edits roster on laptop (adds player "Jake") at 7:00 PM
2. Laptop syncs to cloud (roster updatedAt: 7:00 PM)
3. Coach opens phone (which was offline since 6:00 PM, has stale roster)
4. Phone goes online, fetches cloud data
5. Cloud roster (7:00 PM) is newer than phone's local roster (6:00 PM)
6. Phone's local roster is replaced with cloud version (includes Jake)
7. If phone had also made edits while offline (e.g., removed player "Sam" at 6:30 PM), those edits are lost because cloud timestamp (7:00 PM) wins
8. This is acceptable: single-coach usage means true simultaneous editing is rare

### Flow 5: Unauthenticated Usage

1. New coach opens app for the first time
2. App works immediately -- no sign-in required
3. Coach adds roster, generates lineups, prints dugout cards
4. All data stays in localStorage only
5. Coach sees optional "Sign in to sync" prompt
6. Coach can ignore it indefinitely -- the app is fully functional without auth

## Data Model for Cloud Storage

```typescript
// Single Cosmos DB document per user
interface UserDataDocument {
  // Cosmos DB fields
  id: string;                    // matches userId from MSAL
  partitionKey: string;          // same as id (userId)

  // Sync metadata
  updatedAt: string;             // ISO timestamp, set by server
  schemaVersion: number;         // for future migrations (start at 1)

  // App data (mirrors localStorage keys)
  roster: Player[];
  gameConfig: GameConfig;
  lineupState: LineupState;
  battingOrderState: BattingOrderState;
  battingHistory: BattingHistoryEntry[];
  gameHistory: GameHistoryEntry[];
}
```

**Why a single document:** The total data for one coach is small (a roster of 12 players, 5-6 innings of lineup data, maybe 20 game history entries per season). This fits comfortably within Cosmos DB's 2 MB document limit. A single read/write per sync operation minimizes RU consumption and simplifies the sync logic. If data grows beyond 2 MB in the future, the document can be split by entity type.

## Complexity Assessment

| Feature Area | Estimated Effort | Risk Level | Notes |
|--------------|-----------------|------------|-------|
| Entra ID app registration | 1-2 hours | Low | Portal configuration, not code. Well-documented. |
| MSAL React integration | 1-2 days | Low | Well-documented pattern. Install 2 packages, configure, wrap app. |
| Invite-only access | 30 minutes | Low | Single toggle in Entra admin center + user assignment. |
| Azure Functions API | 2-3 days | Medium | TypeScript Functions with Cosmos DB SDK. Token validation is the tricky part. |
| Cosmos DB setup | 1-2 hours | Low | Create serverless account, create container, set partition key. |
| Sync service (client) | 3-5 days | High | This is the hardest part. Online/offline detection, debounced sync, merge logic, error handling, retry. |
| Data migration flow | 1-2 days | Medium | First-sign-in detection, upload, and merge logic need careful testing. |
| PWA setup (vite-plugin-pwa) | 1 day | Low | Mostly configuration. Test offline behavior across browsers. |
| Static Web Apps deployment | 1 day | Low | GitHub Actions template, environment variables, linked Functions. |
| **Total estimate** | **10-16 days** | **Medium** | Sync service is the long pole. Auth and deployment are well-trodden paths. |

## Privacy Considerations

| Concern | Mitigation | Status |
|---------|-----------|--------|
| Children's names stored in cloud | Data partitioned by userId -- only the authenticated coach can access their partition. Cosmos DB encryption at rest enabled by default. HTTPS for transit. | Addressed by architecture |
| COPPA compliance | App does not collect data directly from children. Coach (adult) enters names. App does not collect email, phone, location, or photos of children. First names only, no identifying metadata. | LOW risk -- consult legal if distributing commercially |
| Data retention | Cloud data persists until coach deletes account or data. Consider adding a "delete all my data" function for GDPR-style data rights. | Future enhancement |
| Third-party data sharing | No data leaves Azure infrastructure. No analytics, no third-party SDKs that access user data. MSAL tokens go to Microsoft only. | Addressed by architecture |
| Invite-only prevents unauthorized access | Entra ID "Assignment required" blocks non-invited Microsoft accounts. Even if someone guesses the app URL, they cannot sign in. | Addressed by Entra configuration |

## MVP Recommendation (Cloud Sync Milestone)

### Must Have (launch blockers)

1. **MSAL React sign-in/sign-out** -- foundation for everything else
2. **Invite-only access** -- children's data cannot be accessible to anyone
3. **Azure Functions API with token validation** -- secure data access layer
4. **Cosmos DB single-document storage per user** -- cloud persistence
5. **Sync service with online/offline detection** -- the core value proposition
6. **Last-write-wins merge on app load** -- multi-device support
7. **First-sign-in data migration** -- do not lose existing localStorage data
8. **PWA installability + offline caching** -- field-ready reliability
9. **Static Web Apps deployment** -- the app must be accessible somewhere

### Should Have (include if time permits)

- **Sync status indicator** -- visual trust signal
- **Auth-optional mode** -- graceful degradation for non-signed-in use
- **App update prompt** -- controlled service worker updates

### Defer

- **Data export / account disconnect** -- nice to have, not launch-blocking
- **Session persistence across tabs** -- edge case
- **Advanced conflict resolution** -- last-write-wins is sufficient for now

## Sources

**MSAL React / Entra ID Authentication:**
- [Tutorial: Prepare a React SPA for authentication - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-single-page-app-react-prepare-app) - MEDIUM confidence (official docs)
- [Get started with MSAL React - Microsoft Learn](https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started) - MEDIUM confidence (official docs)
- [@azure/msal-react npm](https://www.npmjs.com/package/@azure/msal-react) - HIGH confidence (v5.0.4 as of 2026-02-10)
- [Restrict a Microsoft Entra app to a set of users - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users) - HIGH confidence (official docs, verified via WebFetch)
- [Acquire a token to call a web API (SPAs) - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token) - MEDIUM confidence (official docs)

**Azure Cosmos DB:**
- [Azure Cosmos DB serverless - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless) - HIGH confidence (official docs, verified via WebFetch)
- [Cosmos DB pricing model - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/how-pricing-works) - MEDIUM confidence (official docs)
- [Azure Cosmos DB JavaScript SDK v4 - Microsoft Community Hub](https://techcommunity.microsoft.com/blog/educatordeveloperblog/getting-started-with-azure-cosmos-db-sdk-for-typescriptjavascript-4-2-0/4345532) - MEDIUM confidence

**Azure Static Web Apps:**
- [Azure Static Web Apps hosting plans - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/plans) - HIGH confidence (official docs, verified via WebFetch)
- [Database connections retirement notice](https://learn.microsoft.com/en-us/azure/static-web-apps/database-overview) - HIGH confidence (SWA database connections feature retired Nov 2025, do NOT use)
- [Bring your own Functions to Static Web Apps - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own) - MEDIUM confidence

**Offline-First / PWA:**
- [vite-plugin-pwa - GitHub](https://github.com/vite-pwa/vite-plugin-pwa) - HIGH confidence (active, widely used)
- [Vite PWA documentation](https://vite-pwa-org.netlify.app/) - HIGH confidence
- [Offline-first frontend apps in 2025 - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - LOW confidence (blog, but corroborates patterns)
- [MDN: Offline and background operation - PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) - HIGH confidence

**Conflict Resolution:**
- [Cosmos DB conflict resolution policies - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies) - MEDIUM confidence
- [How to Implement Last-Write-Wins - OneUptime](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view) - LOW confidence (blog)

**Privacy / COPPA:**
- [COPPA Rule - FTC](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) - HIGH confidence (official regulatory source)
- [Protecting Youth Sports Data and Privacy - Spond](https://www.spond.com/en-us/news-and-blog/protecting-youth-sports-data/) - LOW confidence (vendor blog)

---
*Feature research for: Baseball Lineup Builder -- Azure Cloud Sync Milestone*
*Researched: 2026-02-12*
*Confidence: MEDIUM-HIGH (MSAL React and Azure Static Web Apps patterns well-documented; offline sync is the highest-uncertainty area)*
