# Domain Pitfalls: Azure Cloud Sync Integration

**Domain:** Adding Azure auth, Cosmos DB, offline sync, and Static Web Apps deployment to existing localStorage-based React SPA
**Researched:** 2026-02-12
**Confidence:** HIGH (official Microsoft docs verified most claims)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or security incidents.

---

### Pitfall 1: MSAL Instance Re-creation on React Re-renders

**What goes wrong:** The `PublicClientApplication` instance is created inside a React component, causing it to be re-instantiated on every re-render. This breaks token caching, triggers "interaction in progress" errors, and causes infinite redirect loops.

**Why it happens:** React developers instinctively create objects inside components or hooks. MSAL's `PublicClientApplication` is a stateful singleton that must persist across the entire app lifecycle. Creating it inside a component means every re-render produces a new instance with empty cache, which then tries to handle the redirect response again, causing a loop.

**Consequences:**
- Infinite redirect loops between app and Entra ID login page
- "Interaction is currently in progress" errors blocking all auth
- Token cache lost on every re-render, forcing constant re-authentication
- Users see blank screen or login flicker

**Prevention:**
Create the MSAL instance at module scope (outside any React component), then pass it to `MsalProvider`. In this codebase, create a dedicated `src/auth/msalInstance.ts` file:

```typescript
// src/auth/msalInstance.ts -- module scope, NOT inside a component
import { PublicClientApplication } from '@azure/msal-browser';

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'localStorage' },
});
```

Then in `main.tsx`, wrap the app:

```tsx
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './auth/msalInstance';

// Await initialization BEFORE rendering
await msalInstance.initialize();
await msalInstance.handleRedirectPromise();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MsalProvider instance={msalInstance}>
    <App />
  </MsalProvider>
);
```

**Detection:** Auth redirect loops in browser, "interaction_in_progress" errors in console, MSAL instance count growing in memory profiler.

**Confidence:** HIGH -- verified via [MSAL React FAQ](https://learn.microsoft.com/en-us/entra/msal/javascript/react/faq) and [MSAL.js common errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors).

---

### Pitfall 2: MSAL localStorage Keys Collide with App Data

**What goes wrong:** MSAL stores authentication tokens and cache entries in localStorage using `msal.` prefixed keys. The existing app uses unprefixed localStorage keys (`roster`, `gameConfig`, `lineupState`, `gameHistory`). If MSAL's cache reset logic ever clears localStorage broadly, or if a future storage-clearing operation in the app wipes MSAL tokens, both systems break.

**Why it happens:** This codebase's `useLocalStorage` hook writes directly to localStorage with bare keys like `roster` and `lineupState`. MSAL also writes to localStorage (when configured with `cacheLocation: 'localStorage'`). Both systems share the same origin's localStorage namespace. Historically, [MSAL's cache reset cleared all localStorage items, not just msal-prefixed ones](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/103). While newer versions scope to `msal.` prefixes, the risk of cross-contamination remains if the app implements a "clear all data" feature or if MSAL behavior changes.

**Consequences:**
- App "clear data" button logs user out by deleting MSAL tokens
- MSAL cache operations could theoretically affect app data
- Debugging becomes confusing when both systems write to same storage

**Prevention:**
1. Namespace all app localStorage keys with a prefix (e.g., `blb:roster`, `blb:gameConfig`, `blb:lineupState`, `blb:gameHistory`). Update the `useLocalStorage` hook to prepend this prefix automatically.
2. Never implement a blanket `localStorage.clear()`. Instead, clear only app-prefixed keys.
3. Use `cacheLocation: 'localStorage'` for MSAL (not sessionStorage) to get cross-tab SSO, but document that MSAL owns `msal.*` keys.

**Detection:** Auth failures after user clears roster data, or roster data missing after MSAL token refresh.

**Confidence:** HIGH -- verified via [MSAL caching docs](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching) and [GitHub issue #103](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/103).

---

### Pitfall 3: Existing localStorage Data Orphaned After Auth Is Added

**What goes wrong:** Users who have been using the app before auth was added have roster and game history data in localStorage under an anonymous context. After auth is added, the app scopes data to the authenticated user's ID, and all pre-existing data disappears. The coach loses their entire roster and game history.

**Why it happens:** Adding user-scoped storage (keyed by user ID) means old data (keyed without user ID) is invisible to the new storage layer. Developers focus on the "new user" flow and forget that existing users have weeks or months of accumulated data in the old format.

**Consequences:**
- Coaches lose entire roster, game history, and lineup configurations
- Complete loss of trust in the app
- No way to recover data once the old keys are overwritten or ignored

**Prevention:**
Implement a one-time data migration flow:
1. On first authenticated login, check for existence of old unprefixed keys (`roster`, `gameHistory`, etc.)
2. If found, prompt the user: "We found existing data. Migrate to your account?"
3. On confirmation, read old data, write to new user-scoped storage, and optionally to Cosmos DB
4. Mark migration as complete (store a `blb:migrated` flag) so the prompt does not repeat
5. Do NOT delete old keys immediately -- keep them for 30 days as a safety net

**Detection:** User reports losing data after logging in for the first time.

**Confidence:** HIGH -- this is an inevitable consequence of the architecture change visible in the existing codebase (bare `useLocalStorage` calls in `useRoster.ts`, `useGameHistory.ts`, `useLineup.ts`, `useGameConfig.ts`).

---

### Pitfall 4: Cosmos DB Connection String Exposed to Browser

**What goes wrong:** Developer puts the Cosmos DB connection string in the React SPA's environment variables (e.g., `VITE_COSMOS_CONNECTION_STRING`), which gets bundled into the client-side JavaScript. Anyone viewing page source can extract the connection string and directly access, modify, or delete all data in the database.

**Why it happens:** Vite's `VITE_` prefix convention for environment variables makes them available in client-side code. Developers accustomed to server-side frameworks (where env vars are server-only) carry over the same pattern. The Cosmos DB SDK can technically run in a browser, making it easy to accidentally expose credentials.

**Consequences:**
- Complete database compromise: read, write, delete all data
- Children's personal information exposed
- Potential regulatory violations (COPPA)
- Unrecoverable if connection string is harvested before rotation

**Prevention:**
NEVER access Cosmos DB directly from the browser. Use one of these patterns:
1. **Azure Static Web Apps Data API** (recommended for simplicity): Configure the built-in `/data-api` endpoint which proxies requests through the server side. Connection string stays in Application Settings, never reaches the client.
2. **Azure Functions API layer**: Write serverless functions that accept authenticated requests, validate authorization, and then call Cosmos DB. Connection strings live in Azure Application Settings.
3. **Managed Identity** (best security): Use Azure Managed Identity from Functions to Cosmos DB, eliminating connection strings entirely.

**Detection:** Search the built JavaScript bundle for "AccountEndpoint=" or "AccountKey=" strings. If found, the connection string has been leaked.

**Confidence:** HIGH -- verified via [Azure Static Web Apps database connections docs](https://learn.microsoft.com/en-us/azure/static-web-apps/database-azure-cosmos-db) and [Cosmos DB security best practices](https://azure.microsoft.com/en-us/blog/how-to-develop-secure-applications-using-azure-cosmos-db/).

---

### Pitfall 5: Children's Names Stored Without COPPA Consideration

**What goes wrong:** The app stores children's first names (and currently auto-capitalizes them, suggesting real names). If the app becomes cloud-synced, children's names are now stored in a cloud database, potentially subject to COPPA (Children's Online Privacy Protection Act) requirements. Even if COPPA does not technically apply (the app is used by coaches, not children), storing children's PII in a cloud database creates legal and privacy risk.

**Why it happens:** The app started as a pure client-side tool where data never left the device. Moving to cloud storage fundamentally changes the privacy posture. Developers treat the cloud migration as a technical problem and overlook the legal implications of where children's data now resides.

**Consequences:**
- Potential COPPA liability if the FTC views the app as collecting children's personal information (the 2025 COPPA amendments expanded the definition of "personal information")
- Parent trust violation if data breach exposes children's names linked to team membership
- COPPA violations carry penalties of up to $53,088 per violation (as of 2025 amendments effective April 2026)

**Prevention:**
1. **Minimize data collection**: Store only first name + last initial (e.g., "Jake T.") rather than full names. The existing `autoCapitalize` function in `useRoster.ts` already processes names -- add truncation there.
2. **Encrypt at rest**: Enable Cosmos DB encryption (on by default) and consider application-level encryption for the names field.
3. **Data retention policy**: Auto-delete game data older than one season (6 months). Implement a cleanup function.
4. **Privacy notice**: Add a clear notice that data is stored in the cloud and what data is collected.
5. **No analytics tracking**: Do not add analytics SDKs that create persistent identifiers on the same origin as children's data. The 2025 COPPA amendments specifically target persistent identifiers.
6. **Tenant isolation**: Each coach's data should be completely isolated by user ID in Cosmos DB partition design.

**Detection:** Review the data model for any PII. Check if names stored in Cosmos DB can be linked to real children.

**Confidence:** HIGH -- verified via [FTC COPPA Rule 2025 amendments](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa), [COPPA compliance guide](https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/), and [Wipfli COPPA 2026 readiness](https://www.wipfli.com/insights/articles/is-your-institution-ready-for-coppas-2026-changes-to-better-protect-childrens-online-privacy).

---

### Pitfall 6: Last-Write-Wins Silently Destroys Roster Changes

**What goes wrong:** Coach edits roster on their phone (adds a player), then opens laptop where old cached data syncs up to Cosmos DB. The laptop's older version overwrites the phone's newer version because the laptop's write has a later timestamp (it synced later, even though the data is older). The added player vanishes with no warning.

**Why it happens:** Last-write-wins (LWW) conflict resolution uses timestamps to determine which version to keep. But "last write" does not mean "latest content" -- it means "most recent sync operation." A device that was offline longer will sync later, and its stale data will overwrite fresher data from a device that synced earlier.

**Consequences:**
- Silent data loss with no user notification
- Coach shows up to game with wrong roster (missing players, wrong lineup)
- Extremely difficult to debug because the data looks valid -- it is just the wrong version
- Loss of trust in cloud sync feature

**Prevention:**
1. **Version counter instead of timestamps**: Use a monotonically incrementing version number (`_etag` in Cosmos DB) rather than client timestamps. Cosmos DB provides `_etag` on every document for optimistic concurrency.
2. **Detect conflicts, don't auto-resolve**: When a write fails due to etag mismatch, show the user both versions and let them choose, or merge non-conflicting changes.
3. **For this app specifically**: Since it is primarily single-user (one coach), LWW with a version counter is acceptable IF paired with a "last synced" indicator in the UI showing the user when each device last synced.
4. **Document-level granularity**: Sync roster, game history, and config as separate documents so a roster change does not conflict with a game history change.
5. **Sync status indicator**: Always show when data was last synced and from which device, so the user can detect stale data.

**Detection:** User reports data reverting to older state, or added players disappearing.

**Confidence:** HIGH -- verified via [LWW implementation guide](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view), [Offline-first architecture patterns](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79), [RxDB offline-first downsides](https://rxdb.info/downsides-of-offline-first.html).

---

## Moderate Pitfalls

Mistakes that cause significant debugging time or degraded UX.

---

### Pitfall 7: MSAL Token Acquisition Fails Silently, App Appears Broken

**What goes wrong:** `acquireTokenSilent` fails (expired refresh token, cache cleared, network issue) and the app does not handle the `InteractionRequiredAuthError`, so API calls fail with 401 errors. The app appears to be "logged in" (MSAL has an account in cache) but cannot actually make authenticated API calls.

**Why it happens:** Developers test with fresh tokens that have not expired. The happy path works, but the silent token renewal failure path is never tested. MSAL's `acquireTokenSilent` can fail for many reasons: expired refresh token, consent revoked, conditional access policy change, or cache corruption.

**Prevention:**
Always wrap `acquireTokenSilent` with a fallback to interactive authentication:

```typescript
async function getToken(instance: IPublicClientApplication, account: AccountInfo) {
  try {
    const response = await instance.acquireTokenSilent({
      scopes: ['api://YOUR_API_SCOPE/.default'],
      account,
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Fallback to popup (not redirect, to avoid losing app state)
      const response = await instance.acquireTokenPopup({
        scopes: ['api://YOUR_API_SCOPE/.default'],
      });
      return response.accessToken;
    }
    throw error;
  }
}
```

Additionally:
- Use a blank page as `redirectUri` for silent token renewal to avoid router interference
- Check `inProgress !== InteractionStatus.None` before initiating any interactive request
- Never retry token acquisition in a loop -- the identity provider will throttle you

**Detection:** Users report "logged in but nothing works" or API calls returning 401.

**Confidence:** HIGH -- verified via [MSAL.js error handling docs](https://learn.microsoft.com/en-us/entra/identity-platform/msal-error-handling-js) and [MSAL common errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors).

---

### Pitfall 8: React Router Strips Hash During MSAL Redirect Flow

**What goes wrong:** After authenticating with Entra ID, the user is redirected back to the app with auth response data in the URL hash. If the app uses a client-side router (React Router, or even custom routing), the router processes the URL before MSAL can extract the hash, stripping the auth response. MSAL then throws `hash_empty_error` or `monitor_window_timeout`.

**Why it happens:** Client-side routers intercept URL changes (including hash changes) and navigate to matching routes. MSAL's redirect flow depends on the hash being intact when `handleRedirectPromise` runs. If the router fires first, the hash is gone.

**Prevention:**
- This app currently does NOT use React Router (it uses tab-based navigation via `TabId` state). This is actually an advantage -- keep it that way.
- If routing is added later, ensure `handleRedirectPromise` is called and awaited BEFORE the router mounts.
- Use a dedicated blank page as `redirectUri` for silent and popup flows:
  ```
  public/auth-redirect.html  (blank HTML page)
  ```
- Register this blank page as a redirect URI in the Entra ID app registration.

**Detection:** `hash_empty_error` or `hash_does_not_contain_known_properties` in console after redirect from login.

**Confidence:** HIGH -- verified via [MSAL.js common errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors).

---

### Pitfall 9: Azure Static Web Apps Returns index.html for Vite Asset Requests

**What goes wrong:** After deploying to Azure Static Web Apps, the app loads but then shows a blank white screen. JavaScript files in `/assets/` return `text/html` content type because the SPA fallback route catches asset requests and serves `index.html` instead of the actual `.js` files.

**Why it happens:** SPA deployments need a catch-all fallback route (`/* -> /index.html`) for client-side routing. But if the fallback is configured as a blanket route rewrite without excluding static assets, Vite's hashed output files (e.g., `/assets/index-abc123.js`) are matched by the fallback and served as HTML.

**Prevention:**
Create `staticwebapp.config.json` in the project root with proper asset exclusion:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "*.{js,css,json,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot,webmanifest}"]
  },
  "routes": [
    {
      "route": "/assets/*",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

Also verify that `vite.config.ts` sets `base: '/'` (default) and that the build output goes to `dist/` which Azure Static Web Apps expects.

**Detection:** Blank white screen after deployment; browser console shows "Expected module script but got text/html" errors.

**Confidence:** HIGH -- verified via [Azure Static Web Apps configuration docs](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) and [Azure Q&A on MIME type issues](https://learn.microsoft.com/en-us/answers/questions/5641757/azure-static-web-apps-vite-js-served-as-text-html).

---

### Pitfall 10: Cosmos DB Serverless vs Provisioned Throughput Cost Surprise

**What goes wrong:** Developer provisions a Cosmos DB account with provisioned throughput (the default in many tutorials) at 400 RU/s minimum. For a small app with sporadic usage, this costs $20-25/month for an app that might process 10 requests per day. Alternatively, developer uses free tier provisioned but leaves indexing policies at defaults, consuming unnecessary RUs.

**Why it happens:** Most Cosmos DB tutorials demonstrate provisioned throughput because it is the more common enterprise pattern. The serverless option is buried in documentation. Default indexing policies index every property in every document, which is unnecessary for a simple lookup-by-userId app and wastes RUs on writes.

**Prevention:**
1. **Use Serverless mode**: For this app's usage pattern (single coach, few devices, sporadic access), serverless is dramatically cheaper. You pay only per-request (fractions of a cent per operation) with no minimum monthly cost.
2. **Use the Free Tier**: Cosmos DB offers a lifetime free tier with 1000 RU/s and 25 GB storage. For serverless, this means substantial free usage.
3. **Optimize indexing**: Exclude unnecessary paths from indexing. For this app, only `/userId` (partition key) and `/id` need indexing:
   ```json
   {
     "indexingMode": "consistent",
     "includedPaths": [{ "path": "/userId/*" }],
     "excludedPaths": [{ "path": "/*" }]
   }
   ```
4. **Monitor RU consumption**: Use Azure Cost Management alerts and check RU headers on responses during development.

**Detection:** Unexpected Azure bill; RU consumption in Azure Monitor higher than expected.

**Confidence:** HIGH -- verified via [Cosmos DB pricing](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/serverless/), [Free tier docs](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier), [Cost management docs](https://learn.microsoft.com/en-us/azure/cosmos-db/plan-manage-costs).

---

### Pitfall 11: Partition Key Lock-in with Wrong Design

**What goes wrong:** Developer chooses a partition key that does not match access patterns (e.g., partitioning by `gameDate` or `id` instead of `userId`). Since partition keys cannot be changed after container creation, this requires migrating to a new container -- effectively rebuilding the database.

**Why it happens:** Cosmos DB partition key selection is a one-time, irrevocable choice made during container creation. Developers unfamiliar with Cosmos DB choose keys based on data structure rather than access patterns. For a small app, partition key seems unimportant, so they pick something arbitrary.

**Prevention:**
For this app, the access pattern is clear: all queries are scoped to a single coach (user). The partition key should be `/userId`. This means:
- All of one coach's data lives in the same logical partition (efficient reads)
- Cross-user queries are unnecessary (each coach only sees their own data)
- Perfect tenant isolation at the database level

Store the data model as:
```
Container: "userData"
Partition key: /userId
Documents:
  { id: "roster", userId: "abc123", type: "roster", data: [...] }
  { id: "gameHistory", userId: "abc123", type: "gameHistory", data: [...] }
  { id: "gameConfig", userId: "abc123", type: "config", data: {...} }
  { id: "lineupState", userId: "abc123", type: "lineupState", data: {...} }
```

**Detection:** Cross-partition query warnings in Cosmos DB logs; high RU consumption on simple reads.

**Confidence:** HIGH -- verified via [Cosmos DB partitioning overview](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview).

---

### Pitfall 12: Custom Auth Requires Standard Plan (Not Free)

**What goes wrong:** Developer builds the entire MSAL integration assuming Azure Static Web Apps will work with custom Entra ID authentication on the Free plan. At deployment time, they discover custom authentication providers require the Standard plan ($9/month). They either pay unexpectedly or must rearchitect to use the limited built-in auth.

**Why it happens:** Azure Static Web Apps Free plan supports built-in authentication (GitHub, Twitter), but custom OpenID Connect providers (including custom Entra ID tenant configuration) require the Standard plan. The distinction is not prominent in getting-started tutorials.

**Prevention:**
- Plan for Standard plan from the start ($9/month) since this app requires Entra ID with single-tenant restriction.
- The built-in Entra ID provider on the Free plan allows any Microsoft account to sign in and cannot be restricted to a specific tenant. For invite-only access, you MUST use custom authentication (Standard plan).
- Budget: Standard plan ($9/mo) + Cosmos DB serverless (near-$0 for this usage) = approximately $10/month total.

**Detection:** Deployment fails with "Custom authentication requires Standard plan" error, or any Microsoft account can sign in despite expecting tenant restriction.

**Confidence:** HIGH -- verified via [Static Web Apps authentication docs](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization), [Static Web Apps plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans), [Custom authentication docs](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom).

---

## Minor Pitfalls

Issues that cause friction but are easily fixed.

---

### Pitfall 13: `navigator.onLine` Is Unreliable for Offline Detection

**What goes wrong:** The app uses `navigator.onLine` to detect offline status and toggle between localStorage-only and sync modes. But `navigator.onLine` only detects physical network disconnection, not actual internet reachability. A captive portal (hotel WiFi login page), DNS failure, or firewall blocking Azure endpoints all report `onLine: true` while the app cannot reach Cosmos DB.

**Prevention:**
- Do not rely solely on `navigator.onLine`. Use it as a fast initial hint, but verify with an actual network request (ping the API endpoint).
- Design the sync layer to always try the network request and gracefully fall back to localStorage on any failure (timeout, 4xx, 5xx, network error).
- Use the `online` and `offline` window events to trigger sync attempts, not to gate functionality.

**Detection:** Sync fails silently when user has "internet" but cannot reach Azure.

**Confidence:** MEDIUM -- based on multiple community reports and [TanStack Query's migration away from navigator.onLine](https://github.com/TanStack/query/discussions/7027).

---

### Pitfall 14: MSAL Token Cache Location Mismatch Between Environments

**What goes wrong:** Developer uses `sessionStorage` for MSAL cache during development (the default), then deploys. Users opening a second tab find they are not logged in because sessionStorage is per-tab. Alternatively, developer uses `localStorage` but then MSAL's silent token renewal in hidden iframes fails because the iframe cannot access the parent's sessionStorage.

**Prevention:**
- Use `cacheLocation: 'localStorage'` for this app. The coach needs cross-tab SSO (open lineup in one tab, roster in another).
- Starting in MSAL v4, localStorage tokens are encrypted by default, mitigating the XSS concern.
- Document this decision so future developers do not change it without understanding the tradeoff.

**Detection:** Users must re-login when opening new tabs; silent token renewal fails.

**Confidence:** HIGH -- verified via [MSAL caching docs](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching).

---

### Pitfall 15: Service Worker Caches Stale Auth-Related Pages

**What goes wrong:** A service worker (added for offline-first PWA capability) aggressively caches the app shell including the redirect URI page. When MSAL redirects back after authentication, the service worker serves a cached version that may not have the latest auth response hash, causing token acquisition to fail.

**Prevention:**
- Exclude the auth redirect URI page from service worker caching.
- Use a `networkFirst` strategy for HTML pages and `cacheFirst` only for static assets (JS, CSS, images).
- Do NOT enable a service worker until the auth flow is fully working and tested.
- If using Vite PWA plugin, configure it to exclude auth-related routes.

**Detection:** Auth works on first visit but fails on subsequent visits; clearing browser cache fixes the issue temporarily.

**Confidence:** MEDIUM -- based on community reports of [service worker interference with MSAL](https://github.com/facebook/create-react-app/issues/11987).

---

### Pitfall 16: Invite-Only Access Not Actually Enforced

**What goes wrong:** Developer configures the Entra ID app registration as single-tenant, assuming this restricts access to invited users. But single-tenant means "anyone in this tenant directory," which could include all employees in an organization. If the Entra ID tenant is a personal tenant, it may not restrict access at all.

**Prevention:**
1. In the Entra ID app registration, enable "Assignment required" under Enterprise Applications > Properties. This means only explicitly assigned users can sign in.
2. Manually assign users (coaches) to the application via Enterprise Applications > Users and groups.
3. On the API side, validate the user's `oid` claim against a list of allowed user IDs, not just that they have a valid token.
4. Consider implementing a role assignment function in Azure Static Web Apps that checks user identity and assigns roles dynamically.

**Detection:** An unintended user from the same Entra ID tenant successfully logs in and can access/modify data.

**Confidence:** HIGH -- verified via [Restricting app to specific users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users).

---

### Pitfall 17: Sync Hydration Causes UI Flash on App Load

**What goes wrong:** App loads, displays data from localStorage (fast), then cloud sync completes and replaces the data (possibly different). The UI flashes or jumps as roster data changes. If the user was mid-interaction (selecting players), their selections may be invalidated.

**Prevention:**
- Show a brief "syncing" indicator on app load before displaying mutable data.
- Use a "stale-while-revalidate" pattern: show localStorage data immediately but mark it as "syncing" with a subtle indicator.
- Do NOT replace in-memory state if the cloud version matches the local version (compare version numbers or hashes).
- Never replace state while the user is actively editing. Queue the sync result and apply it on the next navigation or idle moment.

**Detection:** UI flickers on load; user reports roster "jumping" or changing unexpectedly.

**Confidence:** MEDIUM -- based on common offline-first UX patterns from [Offline-first architecture articles](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79).

---

### Pitfall 18: Cosmos DB 2MB Document Size Limit with Growing Game History

**What goes wrong:** Game history is stored as a single document containing an array of `GameHistoryEntry` objects. After a full season (20-30 games), each with detailed per-player summaries and full lineup data, the document approaches or exceeds Cosmos DB's 2MB document size limit. Writes fail with "Request size is too large."

**Why it happens:** The current `GameHistoryEntry` type includes the full `Lineup` (record of all innings and positions), `battingOrder` (full array), and `playerSummaries` (array of detailed per-player stats). This is compact for 1-5 games but grows linearly. A single game entry could be 5-20KB depending on roster size, so 30+ games approaches 600KB -- still well under 2MB, but future features (notes, stats, photos) could push it over.

**Prevention:**
- Store each game history entry as its own Cosmos DB document (with `userId` partition key and `gameId` as document `id`).
- Do NOT store the entire game history array as a single document. This also makes individual game queries more efficient (lower RU cost).
- For the roster document, size is not a concern (well under 2MB even for large rosters).

**Detection:** "413 Request Entity Too Large" or "Request size is too large" errors from Cosmos DB.

**Confidence:** HIGH -- verified via [Cosmos DB limits](https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| MSAL.js integration | Instance re-creation on re-render (Pitfall 1) | Create instance at module scope, await initialize() | CRITICAL |
| MSAL.js integration | Token acquisition failure not handled (Pitfall 7) | Always fallback from acquireTokenSilent to interactive | MODERATE |
| MSAL.js integration | localStorage key collision (Pitfall 2) | Namespace all app keys with prefix | CRITICAL |
| Entra ID setup | Custom auth requires Standard plan (Pitfall 12) | Budget for Standard plan from start | MODERATE |
| Entra ID setup | Invite-only not actually enforced (Pitfall 16) | Enable "Assignment required" in app registration | MODERATE |
| Cosmos DB setup | Partition key wrong, irrevocable (Pitfall 11) | Use `/userId` as partition key | CRITICAL |
| Cosmos DB setup | Cost surprise from provisioned throughput (Pitfall 10) | Use serverless mode + free tier | MODERATE |
| Cosmos DB setup | Single document for game history hits size limit (Pitfall 18) | One document per game entry | MINOR |
| Data migration | Existing localStorage data orphaned (Pitfall 3) | One-time migration prompt on first login | CRITICAL |
| Offline sync | Last-write-wins destroys data (Pitfall 6) | Use etag-based version tracking + sync indicator | CRITICAL |
| Offline sync | navigator.onLine unreliable (Pitfall 13) | Try network request, fall back gracefully | MINOR |
| Offline sync | Sync hydration causes UI flash (Pitfall 17) | Stale-while-revalidate pattern with sync indicator | MINOR |
| SWA deployment | Assets served as text/html (Pitfall 9) | Proper navigationFallback with exclude patterns | MODERATE |
| SWA deployment | Router strips auth hash (Pitfall 8) | Keep tab-based nav; use blank redirectUri page | MODERATE |
| Privacy/security | Cosmos DB credentials in client bundle (Pitfall 4) | API layer (Functions or Data API), never direct access | CRITICAL |
| Privacy/security | Children's names in cloud without COPPA consideration (Pitfall 5) | Minimize PII, add privacy notice, data retention | CRITICAL |
| PWA/offline | Service worker caches stale auth pages (Pitfall 15) | Exclude auth pages from SW cache | MINOR |

---

## Integration-Specific Pitfalls (localStorage to Cloud)

These pitfalls are unique to adding cloud sync to an EXISTING localStorage-based app, not relevant for greenfield builds.

### The "Two Sources of Truth" Problem

The current app has one source of truth: localStorage. After adding cloud sync, there are temporarily two: localStorage AND Cosmos DB. Every hook in the codebase (`useRoster`, `useGameHistory`, `useLineup`, `useGameConfig`) reads from and writes to localStorage via `useLocalStorage`. The migration must:

1. **Preserve the localStorage-first pattern** for offline capability
2. **Add a sync layer on top** that pushes/pulls to Cosmos DB
3. **Handle the case where they disagree** (conflict resolution)

The recommended architecture is:
```
React State <-> useLocalStorage (unchanged) <-> Sync Layer <-> Cosmos DB
                                                    ^
                                          Runs on app load + periodic
                                          Uses etag for conflict detection
```

This means `useLocalStorage` continues to work exactly as it does today. A separate `useSyncToCloud` hook handles the push/pull to Cosmos DB without interfering with the existing data flow.

### The "Custom Event Sync" Interference

The existing `useLocalStorage` hook uses a `CustomEvent('local-storage-sync')` pattern to sync state across components using the same key within the same tab (see `useLocalStorage.ts` lines 31-40). When cloud sync writes new data to localStorage, it must also dispatch this custom event, or React components will show stale data until the next re-render.

### The "Optimistic Write" Rollback

The existing hooks (`useRoster.addPlayer`, `useGameHistory.finalizeGame`, etc.) write to localStorage immediately and synchronously. With cloud sync, a write might succeed locally but fail to sync (network error, auth expired, Cosmos DB throttled). The app must either:
- **Accept eventual consistency**: Data is in localStorage, will sync later (recommended for this app)
- **Rollback on sync failure**: Undo the localStorage write if cloud sync fails (complex, not recommended)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| MSAL redirect loop (Pitfall 1) | LOW | Clear localStorage MSAL entries (`msal.*` keys), refresh page |
| localStorage key collision (Pitfall 2) | MEDIUM | Manual key migration script; one-time operation |
| Orphaned pre-auth data (Pitfall 3) | LOW if caught early, HIGH if user deletes old keys | Read old keys, prompt user, migrate data |
| Cosmos DB credentials exposed (Pitfall 4) | HIGH | Rotate all Cosmos DB keys immediately, audit access logs, remove credentials from client bundle |
| COPPA violation (Pitfall 5) | HIGH | Legal review, data audit, potentially delete all children's data, add privacy notice |
| LWW data loss (Pitfall 6) | MEDIUM | Cosmos DB has a continuous backup feature; restore from point-in-time |
| Token acquisition failure (Pitfall 7) | LOW | Force logout and re-login |
| SWA asset MIME type error (Pitfall 9) | LOW | Fix `staticwebapp.config.json` and redeploy |
| Wrong partition key (Pitfall 11) | HIGH | Create new container with correct key, migrate all data |
| Standard plan surprise (Pitfall 12) | LOW | Upgrade plan in Azure portal (no data loss) |

---

## Sources

### MSAL.js / Authentication
- [MSAL React FAQ - Microsoft Learn](https://learn.microsoft.com/en-us/entra/msal/javascript/react/faq)
- [Common errors in MSAL.js - Microsoft Learn](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors)
- [MSAL.js caching documentation - Microsoft Learn](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- [MSAL error handling - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/msal-error-handling-js)
- [@azure/msal-react npm](https://www.npmjs.com/package/@azure/msal-react)
- [React 19 support issue #7577](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/7577)
- [MSAL localStorage reset issue #103](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/103)

### Azure Static Web Apps
- [SWA Configuration - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
- [SWA Authentication - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [SWA Custom Authentication - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom)
- [SWA Hosting Plans - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/plans)
- [SWA + Vite MIME type issue - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5641757/azure-static-web-apps-vite-js-served-as-text-html)
- [SPA Fallback Route Configuration - Medium](https://medium.com/techhappily/azure-static-web-apps-single-page-application-fallback-route-configuration-1fc0e7c871d9)

### Cosmos DB
- [Cosmos DB Partitioning Overview - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Cosmos DB Free Tier - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier)
- [Cosmos DB Serverless Pricing - Azure](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/serverless/)
- [Cosmos DB Limits - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits)
- [Cosmos DB Cost Management - Microsoft Learn](https://learn.microsoft.com/en-us/azure/cosmos-db/plan-manage-costs)
- [SWA Database Connections - Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/database-azure-cosmos-db)

### Offline-First / Sync
- [Offline-First Architecture - Medium](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [Downsides of Offline-First - RxDB](https://rxdb.info/downsides-of-offline-first.html)
- [How to Implement Last-Write-Wins - OneUptime](https://oneuptime.com/blog/post/2026-01-30-last-write-wins/view)
- [Offline-First Frontend Apps in 2025 - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Offline Data Sync Patterns - OutSystems](https://success.outsystems.com/documentation/11/building_apps/data_management/mobile_performance_strategies_and_offline_optimization/offline_data_sync_patterns/read_write_data_last_write_wins/)

### Privacy / COPPA
- [COPPA Rule - FTC](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- [COPPA Compliance 2025 Guide - Promise Legal](https://blog.promise.legal/startup-central/coppa-compliance-in-2025-a-practical-guide-for-tech-edtech-and-kids-apps/)
- [FTC COPPA 2025 Amendments - Securiti](https://securiti.ai/ftc-coppa-final-rule-amendments/)
- [COPPA 2026 Readiness - Wipfli](https://www.wipfli.com/insights/articles/is-your-institution-ready-for-coppas-2026-changes-to-better-protect-childrens-online-privacy)
- [Restricting App to Set of Users - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)

### Entra ID / Access Control
- [Restrict App to Set of Users - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [SWA Tenant Restriction Issue #308](https://github.com/Azure/static-web-apps/issues/308)

---
*Pitfalls research for: Azure Cloud Sync Integration -- Baseball Lineup Builder*
*Researched: 2026-02-12*
