# Architecture: Azure Cloud Sync Integration

**Domain:** Baseball Lineup Builder -- Cloud Sync Extension
**Researched:** 2026-02-12
**Confidence:** HIGH (Azure SWA auth patterns), MEDIUM (MSAL React 19 compat details)

## Executive Summary

This document describes how Azure authentication, Cosmos DB persistence, and offline-first sync integrate with the existing Vite + React 19 SPA. The core principle: **SWA EasyAuth for authentication, managed functions for the API layer, localStorage remains the primary data store with background cloud sync.** The existing hooks architecture is preserved by inserting a sync layer *beneath* the current `useLocalStorage` hook rather than replacing it.

---

## Current Architecture (v1.0 Baseline)

```
User Browser
  |
  v
main.tsx --> App --> AppShell --> [RosterPage, GameSetupPage, LineupPage, HistoryPage]
                                        |
                                  Custom Hooks (useRoster, useGameConfig, useLineup, useGameHistory, useBattingOrder)
                                        |
                                  useLocalStorage (generic hook)
                                        |
                                  localStorage (4-6 keys)
```

**localStorage keys in use:**
| Key | Type | Hook | Size Estimate |
|-----|------|------|---------------|
| `roster` | `Player[]` | useRoster | ~1 KB |
| `gameConfig` | `GameConfig` | useGameConfig | ~50 bytes |
| `lineupState` | `LineupState` | useLineup | ~2-5 KB |
| `gameHistory` | `GameHistoryEntry[]` | useGameHistory | ~1-2 KB per game |
| `battingOrderState` | `BattingOrderState` | useBattingOrder | ~500 bytes |
| `battingHistory` | `BattingHistoryEntry[]` | useBattingOrder | ~500 bytes per game |

**Key architectural facts:**
- All hooks call `useLocalStorage` directly -- no intermediate abstraction
- `useLocalStorage` uses `CustomEvent('local-storage-sync')` for same-tab cross-hook sync
- State is fully independent per hook; no global state store
- No API calls, no network layer, no auth context
- React 19 with Vite 7, TypeScript 5.9

---

## Target Architecture (v2.0 with Azure Cloud Sync)

```
User Browser
  |
  v
main.tsx --> MsalProvider(?) or EasyAuth context
               |
               v
           App --> AuthGate --> AppShell --> [Pages...]
                                   |
                             Custom Hooks (unchanged public API)
                                   |
                             useCloudStorage (new: replaces useLocalStorage calls)
                              /          \
                   localStorage        SyncEngine (new)
                   (immediate,              |
                    offline)          /api/* Azure Functions
                                          |
                                    Cosmos DB (NoSQL)
```

### Authentication Decision: SWA EasyAuth (NOT MSAL.js)

**Recommendation: Use Azure Static Web Apps built-in authentication (EasyAuth), NOT @azure/msal-react.**

**Rationale:**

1. **React 19 compatibility risk with MSAL.** The `@azure/msal-react` library had no React 19 peer dependency support until a PR merged in early 2025. The current npm package may still require `--legacy-peer-deps` or overrides. SWA EasyAuth avoids this entirely -- it operates at the platform level, not in React code.

2. **Zero client-side library.** SWA EasyAuth works via platform-level redirect flows (`/.auth/login/aad`). The browser navigates to an Azure-managed login page, and after auth, SWA sets a secure cookie. No MSAL SDK needed in the bundle.

3. **Simpler token management.** With MSAL, the app must manage token acquisition, refresh, and silentAcquire. With EasyAuth, the SWA platform handles all of this -- API functions receive the authenticated user identity via the `x-ms-client-principal` header automatically.

4. **Built-in role management.** SWA supports invite-only access via the Azure Portal Role Management UI, which maps directly to the "invite-only Microsoft accounts" requirement. Coaches are invited by email, assigned the `coach` role.

5. **Local dev story is solved.** The SWA CLI (`swa start`) provides a mock authentication emulator at `/.auth/login/<provider>` that returns configurable fake `clientPrincipal` objects -- no Entra ID app registration needed for local development.

**Confidence: HIGH** -- Based on official Microsoft documentation (updated January 2026).

### What EasyAuth Provides

When a user hits `/.auth/login/aad`, SWA redirects to Microsoft Entra ID login. After authentication, SWA sets a session cookie and exposes:

**Frontend -- `GET /.auth/me`** returns:
```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "abcd12345...",
    "userDetails": "coach@outlook.com",
    "userRoles": ["anonymous", "authenticated", "coach"],
    "claims": [
      { "typ": "name", "val": "Coach Smith" }
    ]
  }
}
```

**API Functions** -- receive `x-ms-client-principal` header (Base64-encoded JSON):
```typescript
// In Azure Function
const header = req.headers.get('x-ms-client-principal');
const encoded = Buffer.from(header, 'base64');
const decoded = JSON.parse(encoded.toString('ascii'));
// decoded.userId is the partition key for Cosmos DB
```

---

## Component Boundaries

### New Components and Files

| Component/File | Layer | Purpose |
|----------------|-------|---------|
| `src/auth/AuthGate.tsx` | UI | Conditionally renders login UI or app based on auth state |
| `src/auth/useAuth.ts` | Hook | Fetches `/.auth/me`, exposes `{ user, isAuthenticated, isLoading, login, logout }` |
| `src/auth/auth-types.ts` | Types | `ClientPrincipal`, `AuthState` interfaces |
| `src/sync/useCloudStorage.ts` | Hook | Drop-in replacement for `useLocalStorage` with cloud sync |
| `src/sync/sync-engine.ts` | Logic | Orchestrates localStorage-to-cloud reconciliation |
| `src/sync/api-client.ts` | Logic | Typed fetch wrapper for `/api/*` endpoints |
| `src/sync/sync-types.ts` | Types | `SyncStatus`, `SyncMetadata`, `CloudDocument` |
| `api/src/functions/*.ts` | API | Azure Functions (CRUD for each data entity) |
| `staticwebapp.config.json` | Config | Route rules, auth provider config, API routing |

### Modified Existing Files

| File | Change | Risk |
|------|--------|------|
| `src/main.tsx` | Wrap with auth context (if needed) or leave as-is | LOW |
| `src/components/app-shell/AppShell.tsx` | Add AuthGate wrapper, add user menu/logout button in header | LOW |
| `src/hooks/useRoster.ts` | Change `useLocalStorage` to `useCloudStorage` (one-line import swap) | LOW |
| `src/hooks/useGameConfig.ts` | Change `useLocalStorage` to `useCloudStorage` (one-line import swap) | LOW |
| `src/hooks/useGameHistory.ts` | Change `useLocalStorage` to `useCloudStorage` (one-line import swap) | LOW |
| `src/hooks/useBattingOrder.ts` | Change `useLocalStorage` to `useCloudStorage` (two-line import swap) | LOW |
| `src/hooks/useLineup.ts` | Change `useLocalStorage` to `useCloudStorage` (one-line import swap) | LOW |
| `src/hooks/useLocalStorage.ts` | **No changes** -- preserved as fallback for unauthenticated/offline use | NONE |

**Critical design point:** `useLocalStorage` is NOT modified. The new `useCloudStorage` hook wraps it, adding sync. If auth is unavailable, `useCloudStorage` degrades to pure `useLocalStorage` behavior. This means v1.0 functionality is preserved with zero risk.

### Files That Do NOT Change

All component files in `src/components/*` do NOT change. They consume hooks (useRoster, useLineup, etc.), and the hooks' public API does not change. The sync layer is invisible to the UI.

All files in `src/logic/*` do NOT change. Business logic is pure functions with no storage dependency.

---

## Detailed Architecture

### 1. Authentication Layer

```
src/auth/
  auth-types.ts      -- ClientPrincipal, AuthState types
  useAuth.ts          -- Hook: fetch /.auth/me, manage auth state
  AuthGate.tsx        -- Component: show login or app
```

**useAuth hook:**
```typescript
// src/auth/useAuth.ts
interface ClientPrincipal {
  identityProvider: string;
  userId: string;           // SWA-unique per-app user ID
  userDetails: string;      // email address
  userRoles: string[];      // ["anonymous", "authenticated", "coach"]
  claims: { typ: string; val: string }[];
}

interface AuthState {
  user: ClientPrincipal | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function useAuth(): AuthState & { login: () => void; logout: () => void } {
  // 1. On mount, fetch /.auth/me
  // 2. If clientPrincipal is null, user is not authenticated
  // 3. login() navigates to /.auth/login/aad?post_login_redirect_uri=/
  // 4. logout() navigates to /.auth/logout?post_logout_redirect_uri=/
}
```

**AuthGate component:**
```typescript
// src/auth/AuthGate.tsx
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginPage onLogin={login} />;
  return <>{children}</>;
}
```

**AppShell integration:**
```typescript
// src/components/app-shell/AppShell.tsx (modified)
import { AuthGate } from '../../auth/AuthGate';

export function AppShell() {
  return (
    <AuthGate>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>Lineup Builder</h1>
          <UserMenu />  {/* new: shows email, logout button */}
        </header>
        {/* ... rest unchanged */}
      </div>
    </AuthGate>
  );
}
```

**staticwebapp.config.json:**
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    { "route": "/.auth/login/github", "statusCode": 404 },
    { "route": "/api/*", "allowedRoles": ["authenticated"] },
    { "route": "/*", "allowedRoles": ["anonymous", "authenticated"] }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

**Key decisions:**
- Block GitHub provider (only Microsoft/Entra ID allowed)
- API routes require authentication
- Frontend is accessible to anonymous users (AuthGate handles UX)
- 401 on API auto-redirects to login (belt and suspenders with AuthGate)

### 2. Sync Layer (Offline-First)

This is the most architecturally significant addition.

```
src/sync/
  sync-types.ts       -- SyncStatus, CloudDocument, SyncMetadata
  useCloudStorage.ts  -- Drop-in useLocalStorage replacement with sync
  sync-engine.ts      -- Reconciliation logic
  api-client.ts       -- Typed /api/* fetch wrapper
```

#### useCloudStorage Hook

```typescript
// src/sync/useCloudStorage.ts
// Same signature as useLocalStorage -- drop-in replacement
function useCloudStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 1. Use useLocalStorage internally (localStorage is ALWAYS the source of truth for reads)
  const [value, setLocalValue] = useLocalStorage<T>(key, initialValue);
  const { isAuthenticated } = useAuth();

  // 2. On mount + when authenticated, pull from cloud and reconcile
  useEffect(() => {
    if (!isAuthenticated) return;
    syncEngine.pull(key).then(cloudValue => {
      if (cloudValue && isNewerThan(cloudValue, value)) {
        setLocalValue(cloudValue.data);
      }
    });
  }, [isAuthenticated, key]);

  // 3. On local write, push to cloud in background
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setLocalValue(newValue);  // Immediate localStorage write (offline-safe)
    if (isAuthenticated) {
      syncEngine.push(key, newValue);  // Background cloud write (fire-and-forget)
    }
  }, [key, isAuthenticated, setLocalValue]);

  return [value, setValue];
}
```

#### Sync Strategy: Last-Write-Wins with Timestamps

For a single-user, single-coach application where the same person uses it on phone and laptop, a simple **last-write-wins** (LWW) strategy is sufficient. Complex CRDT or OT conflict resolution is overkill for this use case.

**Each synced document has metadata:**
```typescript
interface CloudDocument<T> {
  id: string;            // e.g., "roster" or "gameConfig"
  userId: string;        // partition key (from clientPrincipal.userId)
  key: string;           // localStorage key name
  data: T;               // the actual data (Player[], GameConfig, etc.)
  updatedAt: string;     // ISO timestamp -- used for LWW comparison
  version: number;       // monotonic counter for optimistic concurrency
}
```

**Sync flow:**

```
LOCAL WRITE (user edits roster)
  1. setLocalValue(newRoster)        -- immediate, synchronous
  2. localStorage.setItem(...)       -- immediate, synchronous
  3. UI re-renders                   -- immediate
  4. syncEngine.push("roster", data) -- async, background
     |
     +--> POST /api/data/roster
          { data: [...], updatedAt: now(), version: prev+1 }
          |
          +--> If 409 (version conflict):
               GET /api/data/roster
               Compare timestamps, take newer
               Update local if cloud is newer

CLOUD PULL (app opens, or comes online)
  1. GET /api/data/roster
  2. Compare cloud.updatedAt vs local updatedAt
  3. If cloud is newer, update localStorage + React state
  4. If local is newer, push local to cloud
```

**Sync metadata in localStorage:**
```typescript
// Stored alongside data in localStorage
// Key: `_sync_meta_{key}`
interface SyncMetadata {
  key: string;
  updatedAt: string;
  version: number;
  lastSyncedAt: string | null;
  isDirty: boolean;  // true if local changes haven't been pushed
}
```

#### API Client

```typescript
// src/sync/api-client.ts
const API_BASE = '/api';

async function pullDocument<T>(key: string): Promise<CloudDocument<T> | null> {
  const res = await fetch(`${API_BASE}/data/${key}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
  return res.json();
}

async function pushDocument<T>(key: string, doc: CloudDocument<T>): Promise<CloudDocument<T>> {
  const res = await fetch(`${API_BASE}/data/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (res.status === 409) throw new ConflictError(await res.json());
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
  return res.json();
}
```

### 3. API Layer (Azure Functions -- Managed)

**Recommendation: Use SWA managed functions (not bring-your-own).**

**Rationale:**
- The API needs are simple CRUD -- no background triggers, no Durable Functions
- Managed functions deploy automatically with the SWA (single repo, single deploy)
- HTTP triggers only is fine -- we only need REST endpoints
- Cold start (15-30s worst case) is acceptable for a sync-in-background pattern where the user is never blocked waiting for API responses

**Confidence: HIGH** -- managed functions support Node.js 20, HTTP triggers, and integrate directly with SWA auth.

```
api/
  src/
    functions/
      getData.ts       -- GET /api/data/{key}
      putData.ts       -- PUT /api/data/{key}
      deleteData.ts    -- DELETE /api/data/{key}
  host.json
  package.json          -- @azure/cosmos, @azure/functions
  tsconfig.json
```

**Function structure (v4 programming model):**

```typescript
// api/src/functions/getData.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosContainer } from '../shared/cosmos';
import { parseClientPrincipal } from '../shared/auth';

async function getData(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = parseClientPrincipal(req);
  if (!user) return { status: 401 };

  const key = req.params.key;
  const container = getCosmosContainer();

  try {
    const { resource } = await container.item(key, user.userId).read();
    if (!resource) return { status: 404 };
    return { status: 200, jsonBody: resource };
  } catch (err: any) {
    if (err.code === 404) return { status: 404 };
    throw err;
  }
}

app.http('getData', {
  methods: ['GET'],
  authLevel: 'anonymous',  // SWA handles auth via x-ms-client-principal
  route: 'data/{key}',
  handler: getData,
});
```

```typescript
// api/src/functions/putData.ts
async function putData(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = parseClientPrincipal(req);
  if (!user) return { status: 401 };

  const key = req.params.key;
  const body = await req.json() as CloudDocument<unknown>;

  // Ensure userId matches authenticated user (prevent data tampering)
  body.userId = user.userId;
  body.id = key;

  const container = getCosmosContainer();
  const { resource } = await container.items.upsert(body);
  return { status: 200, jsonBody: resource };
}
```

```typescript
// api/src/shared/auth.ts
export function parseClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  const decoded = Buffer.from(header, 'base64').toString('ascii');
  return JSON.parse(decoded);
}
```

### 4. Cosmos DB Data Model

**Account type:** Serverless (pay-per-request, free tier eligible: 1000 RU/s + 25 GB)

**Database:** `lineup-builder`
**Container:** `user-data`
**Partition key:** `/userId`

All of a coach's data lives in a single logical partition (their userId). This is ideal because:
- All reads/writes are scoped to one user
- No cross-user queries needed
- A single partition holds all 4-6 documents per user (~10-20 KB total)
- Well within the 20 GB logical partition limit

**Document structure:**

```json
// Example: roster document
{
  "id": "roster",
  "userId": "abcd12345...",
  "key": "roster",
  "data": [
    { "id": "uuid-1", "name": "Alex", "isPresent": true },
    { "id": "uuid-2", "name": "Bailey", "isPresent": true }
  ],
  "updatedAt": "2026-02-12T15:30:00.000Z",
  "version": 7
}

// Example: gameHistory document
{
  "id": "gameHistory",
  "userId": "abcd12345...",
  "key": "gameHistory",
  "data": [
    { "id": "game-1", "gameDate": "2026-02-01T...", "innings": 6, ... },
    { "id": "game-2", "gameDate": "2026-02-08T...", "innings": 5, ... }
  ],
  "updatedAt": "2026-02-08T18:00:00.000Z",
  "version": 3
}
```

**Why one document per localStorage key (not one per entity):**
- Mirrors the existing data model exactly (each localStorage key = one JSON blob)
- Minimizes Cosmos DB RU consumption (one read per key, not one per player)
- Simplifies sync logic (sync a key, not individual records)
- Total data per user is tiny (<50 KB) -- well within Cosmos DB's 2 MB document limit
- No need for per-item granularity since there is only one writer (the coach)

**Cost estimate for this workload:**
- ~10 coaches, each using app 2-3 times/week during season
- ~50 RU per sync session (3-4 reads + 1-2 writes)
- Monthly: ~2,000 RU total -- well within free tier (1000 RU/s = ~2.6 billion RU/month)
- Storage: <1 MB total -- well within 25 GB free tier

---

## Data Flow Diagrams

### Write Flow (User Edits Roster)

```
User types player name
    |
    v
RosterPage.addPlayer()
    |
    v
useRoster.setPlayers(...)
    |
    v
useCloudStorage.setValue(...)
    |
    +---> [SYNC] localStorage.setItem("roster", JSON)   <-- immediate
    |
    +---> [SYNC] React state updates, UI re-renders      <-- immediate
    |
    +---> [ASYNC] syncEngine.push("roster", data)         <-- background
              |
              +---> PUT /api/data/roster
                        |
                        +---> Cosmos DB upsert (userId partition)
                                  |
                                  +---> 200 OK (sync complete)
```

### Read Flow (App Opens)

```
App mounts
    |
    v
useCloudStorage("roster", [])
    |
    +---> localStorage.getItem("roster")  <-- immediate, shows cached data
    |
    +---> [ASYNC] syncEngine.pull("roster")
              |
              +---> GET /api/data/roster
                        |
                        +---> Compare cloud.updatedAt vs local updatedAt
                              |
                              +---> Cloud newer? Update localStorage + setState
                              |
                              +---> Local newer? Push local to cloud
                              |
                              +---> Same? No-op
```

### Offline Flow

```
User is offline (airplane mode, bad signal at ballfield)
    |
    v
useCloudStorage.setValue(...)
    |
    +---> localStorage write succeeds       <-- works offline
    +---> React state updates               <-- works offline
    +---> syncEngine.push() fails (fetch)   <-- SyncMetadata.isDirty = true
    |
    v
[Later: user regains connectivity]
    |
    v
syncEngine detects online (navigator.onLine + window 'online' event)
    |
    v
For each dirty key: push to cloud
    |
    v
Reconcile (LWW by updatedAt timestamp)
```

### Authentication Flow

```
User opens app
    |
    v
AuthGate mounts
    |
    v
useAuth: fetch /.auth/me
    |
    +---> 200 { clientPrincipal: {...} }  --> isAuthenticated = true --> render app
    |
    +---> 200 { clientPrincipal: null }   --> isAuthenticated = false --> show login page
              |
              v
         User clicks "Sign in with Microsoft"
              |
              v
         navigate to /.auth/login/aad?post_login_redirect_uri=/
              |
              v
         Microsoft Entra ID login page (external)
              |
              v
         Redirect back to app with SWA session cookie
              |
              v
         AuthGate re-checks /.auth/me --> authenticated --> render app
```

---

## Project File Structure (After Integration)

```
baseball-coach-helper/
  api/                              # NEW: Azure Functions API
    src/
      functions/
        getData.ts                  # GET /api/data/{key}
        putData.ts                  # PUT /api/data/{key}
        deleteData.ts               # DELETE /api/data/{key}
      shared/
        cosmos.ts                   # Cosmos DB client singleton
        auth.ts                     # x-ms-client-principal parser
    host.json
    package.json                    # @azure/cosmos, @azure/functions
    tsconfig.json
  src/
    auth/                           # NEW: Authentication
      auth-types.ts
      useAuth.ts
      AuthGate.tsx
      LoginPage.tsx
      UserMenu.tsx
    sync/                           # NEW: Cloud sync
      sync-types.ts
      useCloudStorage.ts
      sync-engine.ts
      api-client.ts
    hooks/                          # EXISTING: minimal changes
      useLocalStorage.ts            # UNCHANGED (preserved as offline fallback)
      useRoster.ts                  # CHANGED: import swap only
      useGameConfig.ts              # CHANGED: import swap only
      useLineup.ts                  # CHANGED: import swap only
      useGameHistory.ts             # CHANGED: import swap only
      useBattingOrder.ts            # CHANGED: import swap only
    logic/                          # EXISTING: NO changes
      lineup-generator.ts
      lineup-validator.ts
      game-history.ts
      batting-order.ts
      csv.ts
    components/                     # EXISTING: minimal changes
      app-shell/
        AppShell.tsx                # CHANGED: add AuthGate, UserMenu
        TabBar.tsx                  # UNCHANGED
      roster/                       # UNCHANGED
      game-setup/                   # UNCHANGED
      lineup/                       # UNCHANGED
      history/                      # UNCHANGED
      batting-order/                # UNCHANGED
    types/
      index.ts                      # UNCHANGED
  staticwebapp.config.json          # NEW: SWA configuration
  swa-cli.config.json               # NEW: local dev configuration
```

---

## Patterns to Follow

### Pattern 1: Transparent Sync Hook

**What:** The `useCloudStorage` hook has the exact same signature as `useLocalStorage`. Consuming hooks swap one import and change nothing else.

**Why:** This preserves all existing tests, all existing component behavior, and makes cloud sync an invisible infrastructure concern.

**Example migration in useRoster.ts:**
```typescript
// Before
import { useLocalStorage } from './useLocalStorage';

// After
import { useCloudStorage as useLocalStorage } from '../sync/useCloudStorage';
// OR
import { useCloudStorage } from '../sync/useCloudStorage';
// and change: const [players, setPlayers] = useCloudStorage<Player[]>('roster', []);
```

### Pattern 2: Optimistic Local, Eventual Cloud

**What:** All state mutations apply to localStorage immediately (synchronous). Cloud sync is fire-and-forget in the background. The user never waits for a network request.

**Why:** The app is used at baseball fields with unreliable connectivity. localStorage must be the source of truth for responsiveness. Cloud is for backup/cross-device sync.

### Pattern 3: Platform-Level Auth

**What:** Authentication is handled by Azure Static Web Apps at the infrastructure level, not by React libraries. The React app only needs to call `/.auth/me` to check status.

**Why:** Eliminates MSAL.js dependency, token management complexity, and React 19 compatibility concerns. Fewer moving parts, smaller bundle.

### Pattern 4: User-Partitioned Data

**What:** All Cosmos DB documents are partitioned by `userId` (from SWA's `clientPrincipal.userId`). API functions always filter by the authenticated user's ID.

**Why:** Provides data isolation (coach A cannot see coach B's roster), efficient queries (single partition reads), and simple authorization (identity = partition).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Blocking UI on Network Requests

**What:** Making the user wait for API calls before showing data or accepting input.

**Why bad:** The app is used at baseball fields. Network may be slow or unavailable. Blocking on fetch makes the app feel broken.

**Instead:** Always read from localStorage first. Show cached data immediately. Sync in background. Show a subtle sync indicator, not a spinner.

### Anti-Pattern 2: Using MSAL.js for Auth

**What:** Installing `@azure/msal-browser` and `@azure/msal-react` and wrapping the app in `MsalProvider`.

**Why bad:** Adds ~50 KB to bundle, requires Entra ID app registration for local dev, had React 19 compatibility issues, requires managing token acquisition/refresh in React code.

**Instead:** Use SWA EasyAuth. Zero client-side SDK. Platform handles tokens. SWA CLI handles local dev mocking.

### Anti-Pattern 3: Granular Document Sync

**What:** Syncing individual players, individual games as separate Cosmos DB documents.

**Why bad:** Massively increases RU consumption (100 reads to load a 15-player roster), requires complex merge logic for arrays, introduces partial-sync states where half the roster is updated.

**Instead:** Sync at the localStorage-key level. One document = one key. Roster is one document. Game history is one document.

### Anti-Pattern 4: Replacing localStorage with Cloud

**What:** Making Cosmos DB the primary data store and removing localStorage.

**Why bad:** App becomes unusable offline. Every interaction requires network. Latency becomes visible to users. Massive regression from v1.0.

**Instead:** localStorage is always primary. Cloud is secondary. The sync layer sits between them.

---

## Scalability Considerations

| Concern | 1-10 coaches | 100 coaches | 1000+ coaches |
|---------|-------------|-------------|---------------|
| Cosmos DB cost | Free tier (0$) | Free tier (0$) | ~$1-5/month serverless |
| Cold start (managed functions) | 15-30s first call, acceptable for background sync | Same, but more frequent warm-hits | Consider bring-your-own functions |
| Auth management | Manual invites via Azure Portal | Manual invites (still manageable) | Need automated invite flow or self-registration |
| Data isolation | userId partition works | userId partition works | userId partition works (Cosmos DB scales partitions) |
| localStorage size | <50 KB | <50 KB per user | <50 KB per user (client-side) |

---

## Build Order (Dependency-Driven)

### Phase 1: SWA Configuration + Auth Hook

**Build first because:** Everything else (API calls, sync) requires knowing who the user is.

1. Create `staticwebapp.config.json` with Entra ID custom provider config
2. Implement `useAuth` hook (fetch `/.auth/me`)
3. Implement `AuthGate` component
4. Implement `LoginPage` and `UserMenu` components
5. Set up SWA CLI for local development with mock auth
6. Integrate `AuthGate` into `AppShell`

**Dependencies:** None (uses platform features, not libraries)
**Test:** Local dev with SWA CLI mock auth, verify login/logout flow

### Phase 2: Azure Functions API + Cosmos DB

**Build second because:** The sync layer needs API endpoints to talk to.

1. Initialize `api/` folder with Azure Functions v4 project
2. Create Cosmos DB client singleton
3. Implement `getData` function (GET /api/data/{key})
4. Implement `putData` function (PUT /api/data/{key})
5. Implement `deleteData` function (DELETE /api/data/{key})
6. Add `parseClientPrincipal` auth helper
7. Test with SWA CLI (functions run locally)

**Dependencies:** Phase 1 (auth headers flow through SWA)
**Test:** Manual API calls via curl/Postman with mock auth headers

### Phase 3: Sync Engine + useCloudStorage

**Build third because:** This is the bridge between existing hooks and the cloud.

1. Implement `api-client.ts` (typed fetch wrapper)
2. Implement `sync-engine.ts` (pull/push/reconcile logic)
3. Implement `useCloudStorage` hook (wraps `useLocalStorage` + sync)
4. Add `SyncMetadata` to localStorage for tracking dirty state
5. Add online/offline detection and reconnection sync
6. Add sync status indicator component (subtle, non-blocking)

**Dependencies:** Phase 1 (auth state), Phase 2 (API endpoints)
**Test:** Unit tests for sync-engine reconciliation logic, integration test with local SWA

### Phase 4: Hook Migration

**Build fourth because:** This is the actual integration -- swapping imports in existing hooks.

1. Change `useRoster` to use `useCloudStorage`
2. Change `useGameConfig` to use `useCloudStorage`
3. Change `useLineup` to use `useCloudStorage`
4. Change `useGameHistory` to use `useCloudStorage`
5. Change `useBattingOrder` to use `useCloudStorage`
6. Run all existing tests -- they should pass without changes

**Dependencies:** Phase 3 (useCloudStorage exists)
**Test:** All existing unit tests pass. Manual test: edit on one device, see changes on another.

### Phase 5: Deployment (Azure Static Web Apps)

**Build last because:** Requires all other phases working.

1. Create Azure Static Web Apps resource (Standard plan for custom auth)
2. Create Cosmos DB serverless account (free tier)
3. Configure GitHub Actions workflow for deployment
4. Set application settings (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, COSMOS_CONNECTION_STRING)
5. Configure Entra ID app registration (redirect URIs)
6. Test end-to-end: login, create roster, verify Cosmos DB, open on another device

**Dependencies:** Phases 1-4
**Test:** Full end-to-end on staging environment

---

## Local Development Setup

```bash
# Install SWA CLI globally
npm install -g @azure/static-web-apps-cli

# Start local dev (Vite frontend + Functions backend + auth emulator)
swa start http://localhost:5180 \
  --run "npm run dev" \
  --api-location api

# Access at http://localhost:4280
# Auth mock at http://localhost:4280/.auth/login/aad (configurable fake user)
# API at http://localhost:4280/api/*
```

The SWA CLI reverse proxy:
- `/.auth/**` --> Auth emulator (mock login/logout/me)
- `/api/**` --> Azure Functions local runtime
- `/**` --> Vite dev server (http://localhost:5180)

**swa-cli.config.json:**
```json
{
  "configurations": {
    "app": {
      "appDevserverUrl": "http://localhost:5180",
      "apiLocation": "api",
      "outputLocation": "dist"
    }
  }
}
```

---

## Security Considerations

### Data Privacy (Children's Names)

1. **Transport:** HTTPS enforced by SWA (automatic)
2. **At rest:** Cosmos DB encrypts data at rest by default (Microsoft-managed keys)
3. **Access control:** API functions validate `x-ms-client-principal` on every request -- no endpoint is accessible without authentication
4. **Data isolation:** userId-partitioned data prevents cross-user access
5. **Invite-only:** SWA Role Management restricts who can authenticate (not just "any Microsoft account")
6. **No client-side tokens:** EasyAuth uses HttpOnly session cookies, not localStorage tokens

### API Security

1. **Authentication:** SWA strips `x-ms-client-principal` from external requests -- it can only be set by the platform, not spoofed by clients
2. **Authorization:** `staticwebapp.config.json` restricts `/api/*` to `authenticated` role
3. **Data validation:** API functions enforce `userId = authenticatedUser.userId` on all writes
4. **No direct Cosmos DB access:** Connection string is only in Azure Functions environment, never exposed to browser

---

## Sources

**Azure Static Web Apps Authentication:**
- [Authenticate and authorize Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization) -- Official docs, updated Jan 2026
- [Custom authentication in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom) -- Entra ID custom provider config
- [Accessing user information](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information) -- /.auth/me response format, x-ms-client-principal in functions

**Azure Static Web Apps Functions:**
- [API support with Azure Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions) -- Managed vs bring-your-own comparison
- [Azure Static Web Apps configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) -- staticwebapp.config.json format

**MSAL React 19 Compatibility (avoided):**
- [GitHub Issue #7455: Add react 19 to peer deps](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/7455) -- React 19 support merged late, community frustration

**Azure Cosmos DB:**
- [Partitioning and horizontal scaling](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview) -- Partition key design
- [Lifetime Free Tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier) -- 1000 RU/s + 25 GB free
- [Serverless pricing](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/serverless/) -- Pay-per-request model

**SWA CLI / Local Development:**
- [SWA CLI documentation](https://azure.github.io/static-web-apps-cli/) -- Local auth emulation, reverse proxy setup
- [Local Authentication](https://azure.github.io/static-web-apps-cli/docs/cli/local-auth/) -- Mock auth for local development

**Azure Functions v4 Model:**
- [Azure Functions TypeScript Cosmos DB](https://learn.microsoft.com/en-us/samples/azure-samples/functions-quickstart-typescript-azd-cosmosdb/starter-cosmosdb-trigger-typescript/) -- v4 programming model examples

---
*Architecture research for: Baseball Lineup Builder -- Azure Cloud Sync Integration*
*Researched: 2026-02-12*
