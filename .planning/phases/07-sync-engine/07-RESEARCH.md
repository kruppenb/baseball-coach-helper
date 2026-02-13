# Phase 7: Sync Engine - Research

**Researched:** 2026-02-12
**Domain:** Offline-first sync (localStorage + REST API), React custom hooks, online/offline detection, Cosmos DB etag conflict resolution
**Confidence:** HIGH

## Summary

Phase 7 introduces a `useCloudStorage` hook that wraps the existing `useLocalStorage` hook with background cloud synchronization. The architecture is straightforward: writes go to localStorage immediately (preserving the instant-feeling UI), then a debounced background sync pushes changes to the Phase 6 API endpoints. On app load (for signed-in users), a one-time pull from the cloud hydrates localStorage with the latest server state.

The key design constraint is that `useCloudStorage` must expose the **identical API signature** as `useLocalStorage` -- `[T, (value: T | ((prev: T) => T)) => void]` -- so the existing domain hooks (useRoster, useGameConfig, useLineup, useGameHistory, useBattingOrder) can switch from `useLocalStorage` to `useCloudStorage` with a one-line import change. For unauthenticated users, `useCloudStorage` simply delegates to `useLocalStorage` with no cloud behavior. The sync status indicator (synced/syncing/offline/error) lives in the AppHeader alongside the existing auth controls.

Conflict resolution uses last-write-wins (LWW) without etag-based optimistic concurrency on the client side. The current API endpoints already use `container.items.upsert()` which is an unconditional upsert -- the last write to reach Cosmos DB wins. Since this is a single-coach tool (not collaborative editing), conflicts are rare and LWW is explicitly the chosen strategy per requirements. The `_etag` returned by the API can be stored for informational purposes but is not used for conditional writes in this phase. The key sync decision for collections (gameHistory, battingHistory) is that the client pushes individual entries, not the whole array -- matching the API's per-document design.

**Primary recommendation:** Build a `useCloudStorage` hook and a `SyncProvider` context. The hook handles per-key sync logic; the context aggregates sync status across all keys and provides the status indicator data to AppHeader.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (existing) | ^19.2.0 | Context, hooks, state management | Already in project |
| fetch API (built-in) | N/A | HTTP calls to `/api/*` endpoints | No HTTP library needed; endpoints are same-origin |
| navigator.onLine + events | N/A | Online/offline detection | Built-in browser API, no dependency needed |
| localStorage (existing) | N/A | Primary offline data store | Already working via useLocalStorage hook |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No additional libraries needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom sync hook | TanStack Query (React Query) | Full cache/sync framework with stale-while-revalidate, but adds ~13KB and is overkill for 6 localStorage keys with simple PUT/GET REST endpoints |
| Custom sync hook | RxDB | Full offline-first reactive DB, massive overkill for this use case |
| navigator.onLine | Periodic fetch heartbeat | More reliable but adds unnecessary API calls; navigator.onLine is sufficient for showing a UI hint, and actual sync failures handle the real offline case |
| Custom debounce | lodash.debounce | Adds dependency for a 10-line utility function |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  sync/
    SyncContext.tsx       # SyncProvider with aggregated sync status
    useCloudStorage.ts    # Drop-in replacement for useLocalStorage (adds cloud sync)
    useOnlineStatus.ts    # Hook wrapping navigator.onLine + events
    sync-engine.ts        # Core sync logic: push/pull, debounce, retry
    sync-types.ts         # SyncStatus, SyncState, API response types
  hooks/
    useLocalStorage.ts    # UNCHANGED - still the offline storage primitive
    useRoster.ts          # Change: import useCloudStorage instead of useLocalStorage
    useGameConfig.ts      # Change: import useCloudStorage instead of useLocalStorage
    useLineup.ts          # Change: import useCloudStorage instead of useLocalStorage
    useGameHistory.ts     # Change: import useCloudStorage instead of useLocalStorage
    useBattingOrder.ts    # Change: import useCloudStorage instead of useLocalStorage
  components/
    app-shell/
      AppHeader.tsx       # Add SyncStatusIndicator
      SyncStatusIndicator.tsx    # Visual sync status badge
      SyncStatusIndicator.module.css
```

### Pattern 1: useCloudStorage Hook (Drop-in Replacement)
**What:** A hook with the same signature as `useLocalStorage` that adds background cloud sync for authenticated users.
**When to use:** Replace every `useLocalStorage` call in domain hooks.
**Example:**
```typescript
// src/sync/useCloudStorage.ts
import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../auth/useAuth';
import { useSyncContext } from './SyncContext';

export function useCloudStorage<T>(
  key: string,
  initialValue: T,
  apiConfig: {
    endpoint: string;        // e.g., '/api/roster'
    mode: 'singleton' | 'collection';
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setLocalValue] = useLocalStorage<T>(key, initialValue);
  const { user } = useAuth();
  const { reportStatus } = useSyncContext();

  // If not authenticated, just use localStorage (no cloud sync)
  if (!user) {
    return [value, setLocalValue];
  }

  // Wrap setter to trigger background sync after localStorage write
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setLocalValue(newValue);
    // Schedule debounced push to cloud
    schedulePush(key, apiConfig);
  }, [key, setLocalValue, apiConfig]);

  // On mount (authenticated): pull from cloud to hydrate localStorage
  useEffect(() => {
    pullFromCloud(key, apiConfig, setLocalValue, reportStatus);
  }, [key, user]);

  return [value, setValue];
}
```

### Pattern 2: SyncProvider Context (Aggregated Status)
**What:** A React context that aggregates sync status across all useCloudStorage instances and exposes a single SyncStatus for the UI.
**When to use:** Wrap the app (inside AuthProvider) to provide sync status to AppHeader.
**Example:**
```typescript
// src/sync/SyncContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SyncStatus } from './sync-types';

interface SyncContextValue {
  status: SyncStatus;  // 'synced' | 'syncing' | 'offline' | 'error'
  reportStatus: (key: string, status: SyncStatus) => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: 'synced',
  reportStatus: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [keyStatuses, setKeyStatuses] = useState<Record<string, SyncStatus>>({});

  const reportStatus = useCallback((key: string, status: SyncStatus) => {
    setKeyStatuses(prev => ({ ...prev, [key]: status }));
  }, []);

  // Aggregate: worst status wins
  // Priority: error > syncing > offline > synced
  const aggregated = deriveAggregateStatus(keyStatuses);

  return (
    <SyncContext.Provider value={{ status: aggregated, reportStatus }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  return useContext(SyncContext);
}
```

### Pattern 3: Sync Engine (Push/Pull Logic)
**What:** A module with pure functions for pushing local data to the API and pulling cloud data to localStorage.
**When to use:** Called by useCloudStorage hook internals.
**Key behaviors:**
- **Push (local -> cloud):** Debounced (e.g., 2 seconds after last write). Reads current localStorage value, PUTs to API endpoint. On success, updates status to 'synced'. On network failure, sets status to 'offline' and queues for retry when online. On server error (5xx), sets status to 'error'.
- **Pull (cloud -> local):** One-time on mount for authenticated users. GETs from API endpoint, writes to localStorage if cloud has data. If localStorage already has data and cloud is empty, pushes local to cloud (initial migration case -- but that is Phase 8's concern).
- **Retry on reconnect:** When the browser fires the `online` event, retry any pending pushes.

### Pattern 4: Online/Offline Detection Hook
**What:** A simple hook that tracks `navigator.onLine` and listens for `online`/`offline` events.
**When to use:** Used by SyncContext to know when to retry failed syncs.
**Example:**
```typescript
// src/sync/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

### Pattern 5: Singleton vs Collection Sync Strategy
**What:** Two different sync strategies based on document type.
**When to use:** Singleton docs (roster, gameConfig, lineupState, battingOrderState) use direct PUT/GET. Collection docs (gameHistory, battingHistory) need special handling because localStorage stores the full array but the API stores per-entry documents.

**Singleton sync flow:**
1. Pull: `GET /api/roster` -> response.data -> `localStorage.setItem('roster', JSON.stringify(data))`
2. Push: `localStorage.getItem('roster')` -> `PUT /api/roster` with `{ data: parsed }`

**Collection sync flow:**
1. Pull: `GET /api/game-history` -> response.data (array) -> `localStorage.setItem('gameHistory', JSON.stringify(data))`
2. Push: Read full array from localStorage, diff against last-synced snapshot, PUT only new/changed entries individually.
3. Simplification: For game history, entries are append-only (finalized games are never edited). So push = iterate new entries since last sync and PUT each one.

### Pattern 6: Sync Status Indicator UI
**What:** A small visual indicator in the AppHeader showing current sync status.
**When to use:** Only shown for authenticated users.
**States:**
- **synced**: Green dot or checkmark, "Synced" text
- **syncing**: Animated spinner, "Syncing..." text
- **offline**: Gray dot, "Offline" text
- **error**: Red dot, "Sync error" text (with retry button)

### Anti-Patterns to Avoid
- **Blocking the UI on sync:** Writes MUST go to localStorage first and return immediately. Never `await` the API call in the setter path.
- **Syncing on every keystroke:** Use debounce (2 second delay). Without debounce, rapid roster edits would fire dozens of API calls.
- **Storing etags in localStorage for conditional writes:** Overcomplicates the LWW strategy. The API uses unconditional upsert. Etags are returned but not required for writes.
- **Replacing the full gameHistory array on each push:** The API stores per-entry documents. Push individual entries, not the whole array.
- **Making useCloudStorage async:** The hook must return `[T, setter]` synchronously, just like useLocalStorage. All async work happens in side effects.
- **Skipping the pull on app load:** Without initial pull, a user on a new device would see empty data until they make an edit.
- **Using Service Worker for sync in this phase:** Background Sync API requires a Service Worker (Phase 9's concern). Phase 7 uses in-page fetch with retry on reconnect.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Online/offline detection | Complex heartbeat system | `navigator.onLine` + `online`/`offline` events | Good enough for UI hints; actual sync failure handling covers the real offline case |
| HTTP client | Axios or custom wrapper | `fetch()` | Same-origin API, no CORS, no interceptors needed, keeps bundle small |
| Debounce utility | npm package (lodash.debounce) | Simple `setTimeout`/`clearTimeout` wrapper (10 lines) | One use case, one timer per key, trivial to implement |
| State machine for sync status | XState or similar | Simple string union type with priority-based aggregation | Only 4 states, transitions are obvious, no complex guards |
| Conflict resolution | CRDT library or custom merge | Unconditional upsert (LWW) | Explicitly chosen strategy; single-coach tool, conflicts are rare |
| Retry with exponential backoff | Retry library | Simple retry-on-reconnect via `online` event listener | Only need to retry when network comes back, not exponential polling |

**Key insight:** This sync engine is intentionally simple because the data model is simple (6 localStorage keys, single-writer, append-only collections). The complexity of real-time collaborative sync frameworks (CRDTs, OT, conflict-free replication) is orders of magnitude beyond what's needed.

## Common Pitfalls

### Pitfall 1: Race Condition Between Pull and Push on App Load
**What goes wrong:** App loads, starts pulling cloud data, but user makes an edit before pull completes. The pull then overwrites the user's edit in localStorage.
**Why it happens:** Pull is async; user interaction is instant.
**How to avoid:** During the initial pull, set a "hydrating" flag. If the user writes during hydration, the write goes to localStorage but the push is deferred until pull completes. After pull completes, compare timestamps or do a merge. For LWW, the simplest approach: pull sets localStorage only if the cloud `updatedAt` is newer than local data's timestamp, or if localStorage is empty. If localStorage already has data, skip pull (defer to Phase 8 migration logic).
**Warning signs:** Data flickers or reverts on app load.

### Pitfall 2: Infinite Sync Loop
**What goes wrong:** Push triggers a re-render (because it updates status), which triggers another push, creating an infinite loop.
**Why it happens:** The push function updates React state (sync status), which re-renders the component, which calls useEffect, which calls push again.
**How to avoid:** Use refs for mutable state that shouldn't trigger re-renders (pending push flags, debounce timers). Only update React state for the sync status indicator, and ensure the effect's dependency array doesn't include values that change on every push.
**Warning signs:** Rapid API calls, browser performance degradation, "Maximum update depth exceeded" error.

### Pitfall 3: Stale Closure in Debounced Push
**What goes wrong:** The debounced push captures an old localStorage value because of JavaScript closure semantics. By the time the debounce fires, the user has made more edits, but the push sends stale data.
**Why it happens:** The debounce callback closes over the value at the time it was created, not at the time it fires.
**How to avoid:** Don't capture the value in the debounce. Instead, read directly from `localStorage.getItem(key)` at push time. This guarantees the push always sends the latest data.
**Warning signs:** Cloud data is behind local data after sync completes.

### Pitfall 4: Unauthenticated Users Triggering API Calls
**What goes wrong:** The sync engine tries to call `/api/roster` for a user who isn't signed in, getting 401 errors.
**Why it happens:** The `useCloudStorage` hook doesn't properly check auth state, or the auth state hasn't loaded yet when the first sync fires.
**How to avoid:** `useCloudStorage` must check `user !== null` before any cloud operations. When `user` is null, it must be a pure pass-through to `useLocalStorage` with zero network activity.
**Warning signs:** 401 errors in the console for unauthenticated users.

### Pitfall 5: Collection Sync Sends Duplicate Entries
**What goes wrong:** Every push of gameHistory sends ALL entries to the API, creating unnecessary upserts and wasting RUs in Cosmos DB.
**Why it happens:** No tracking of which entries have already been synced.
**How to avoid:** Track the last-synced snapshot (by count or by IDs). On push, only send entries that are new since last sync. Since gameHistory is append-only, this can be as simple as tracking `lastSyncedCount` and sending `array.slice(lastSyncedCount)`.
**Warning signs:** Cosmos DB RU consumption grows linearly with history size on every save.

### Pitfall 6: navigator.onLine False Positive
**What goes wrong:** `navigator.onLine` reports `true` but the device can't actually reach the API (e.g., connected to WiFi but no internet).
**Why it happens:** `navigator.onLine` only checks network adapter status, not actual internet connectivity.
**How to avoid:** Don't rely on `navigator.onLine` alone for sync decisions. Use it for the UI indicator, but let actual fetch failures drive retry logic. If a push fails with a network error, set status to 'offline' regardless of `navigator.onLine`.
**Warning signs:** Status shows "Synced" but data isn't actually in the cloud.

### Pitfall 7: Batting Endpoint Has Non-Standard Shape
**What goes wrong:** Sync code assumes all GET endpoints return `{ data: T, _etag: string }` but `/api/batting` GET returns `{ battingOrderState: {...}, battingHistory: [...] }` -- a different shape with two fields.
**Why it happens:** The batting endpoint combines two document types for efficiency.
**How to avoid:** The sync config for battingOrderState and battingHistory must know they share the `/api/batting` GET endpoint but have different response paths. Use custom pull/push logic for the batting endpoint, or refactor to call the endpoint once and split the response into two localStorage keys.
**Warning signs:** `undefined` data after hydrating battingOrderState or battingHistory.

## Code Examples

Verified patterns from the existing codebase and official docs:

### Current useLocalStorage Signature (Must Match)
```typescript
// Source: src/hooks/useLocalStorage.ts (existing)
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void]
```

### API Response Shapes (From Phase 6 Implementation)

Singleton endpoints (roster, game-config, lineup-state):
```typescript
// GET response
{ data: T, _etag: string | null }

// PUT request body
{ data: T }

// PUT response
{ data: T, _etag: string }
```

Batting endpoint (combined):
```typescript
// GET response (DIFFERENT SHAPE)
{
  battingOrderState: BattingOrderState,
  battingHistory: BattingHistoryEntry[]
}

// PUT request body (with discriminator)
{ docType: 'battingOrderState' | 'battingHistory', data: T }

// PUT response
{ data: T, _etag: string }
```

Game history endpoint:
```typescript
// GET response
{ data: GameHistoryEntry[] }

// PUT request body (single entry)
{ data: GameHistoryEntry }

// PUT response
{ data: GameHistoryEntry, _etag: string }
```

### SyncStatus Type Definition
```typescript
// src/sync/sync-types.ts
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

// Per-key sync state tracked internally
export interface KeySyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;   // ISO timestamp
  pendingPush: boolean;
  error: string | null;
}
```

### Debounce Utility (No Library Needed)
```typescript
// Simple debounce for push scheduling
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedPush(key: string, pushFn: () => void, delayMs = 2000) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    pushFn();
  }, delayMs));
}
```

### Fetch Wrapper With Error Classification
```typescript
// Classify errors for sync status reporting
export async function syncFetch(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: unknown; errorType: 'none' | 'network' | 'auth' | 'server' }> {
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, errorType: 'none' };
    }
    if (response.status === 401) {
      return { ok: false, errorType: 'auth' };
    }
    return { ok: false, errorType: 'server' };
  } catch {
    // Network error (offline, DNS failure, etc.)
    return { ok: false, errorType: 'network' };
  }
}
```

### Hook Migration (One-Line Change Per Hook)
```typescript
// BEFORE (current):
import { useLocalStorage } from './useLocalStorage';
const [players, setPlayers] = useLocalStorage<Player[]>('roster', []);

// AFTER (phase 7):
import { useCloudStorage } from '../sync/useCloudStorage';
const [players, setPlayers] = useCloudStorage<Player[]>('roster', [], {
  endpoint: '/api/roster',
  mode: 'singleton',
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sync-first (fetch then render) | Offline-first (render from cache, sync in background) | 2022+ industry trend | UI is instant; sync is non-blocking |
| Custom sync frameworks | TanStack Query, RxDB, PowerSync, etc. | 2023-2025 | Libraries handle complex sync; overkill for simple cases |
| navigator.onLine only | navigator.onLine + actual fetch failure detection | Long-standing best practice | onLine is a hint; real failures drive behavior |
| Full-document conflict resolution (CRDTs) | LWW for single-writer apps | Depends on use case | CRDTs only needed for multi-writer collaboration |
| Polling for sync | Event-driven sync (write triggers push) + reconnect retry | 2020+ | More efficient, lower latency |

**Deprecated/outdated:**
- `navigator.connection` API: Still experimental, inconsistent browser support, not needed here
- AppCache (for offline): Replaced by Service Workers, but not relevant to this phase (Phase 9)
- XMLHttpRequest: Replaced by fetch API

## Open Questions

1. **Pull-on-load vs. Phase 8 Migration Overlap**
   - What we know: Phase 7 needs to pull cloud data on app load for authenticated users. Phase 8 handles migrating existing localStorage data to cloud on first sign-in.
   - What's unclear: If a user signs in for the first time (no cloud data), should Phase 7's pull find nothing and leave localStorage alone? Or should it push localStorage to cloud?
   - Recommendation: Phase 7's pull should be non-destructive. If cloud returns empty/default data and localStorage has existing data, do nothing (leave localStorage as-is). Phase 8 will handle the "push existing local data to cloud on first sign-in" case. This keeps the phases cleanly separated.

2. **Batting Endpoint's Non-Standard Response Shape**
   - What we know: `/api/batting` GET returns `{ battingOrderState, battingHistory }` instead of `{ data, _etag }`. The two localStorage keys (`battingOrderState`, `battingHistory`) map to this single endpoint.
   - What's unclear: Whether to call the endpoint once and split, or restructure the hook.
   - Recommendation: The `useBattingOrder` hook already uses two `useLocalStorage` calls. For `useCloudStorage`, create a specialized pull function for the batting endpoint that makes one GET and splits the response into two localStorage writes. Each of the two `useCloudStorage` instances tracks its own push independently.

3. **Debounce Delay Duration**
   - What we know: Too short = excessive API calls. Too long = stale cloud data if the user closes the browser.
   - What's unclear: The optimal delay for a coaching app.
   - Recommendation: Use 2 seconds. This is long enough to batch rapid edits (e.g., toggling multiple players' attendance) but short enough that data syncs before a typical page close. Also add a `beforeunload` handler to flush pending pushes synchronously (fire-and-forget via `navigator.sendBeacon` or synchronous XHR as last resort).

4. **Handling `beforeunload` for Pending Syncs**
   - What we know: If the user closes the tab with pending debounced pushes, data is lost (only in localStorage, not synced to cloud).
   - What's unclear: Whether `navigator.sendBeacon` can reliably send a PUT with JSON body.
   - Recommendation: `sendBeacon` only supports POST and has limited body types (Blob, FormData, URLSearchParams). For a simple coaching app, accept that closing the tab mid-debounce means the next app open will pull from cloud (which may be slightly stale). The data is safe in localStorage. On next app load, the pull-then-push cycle will reconcile.

## Sources

### Primary (HIGH confidence)
- [Azure Cosmos DB - Optimistic Concurrency Control](https://learn.microsoft.com/en-us/azure/cosmos-db/database-transactions-optimistic-concurrency) - etag mechanism, if-match header, 412 Precondition Failure behavior
- [@azure/cosmos RequestOptions API Reference](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/requestoptions) - accessCondition property with `{ condition: string, type: string }` for if-match
- [MDN - Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) - onLine property reliability, online/offline events, limitations
- Existing codebase: `src/hooks/useLocalStorage.ts` - exact hook signature to match
- Existing codebase: `api/src/functions/*.ts` - all 5 API endpoint shapes and behaviors
- Existing codebase: `src/auth/AuthContext.tsx` + `src/auth/useAuth.ts` - auth state availability

### Secondary (MEDIUM confidence)
- [React Native Data Sync Pattern](https://oneuptime.com/blog/post/2026-01-15-react-native-data-sync/view) - offline-first architecture principles (verified against general patterns)
- [Jotai + localStorage + React Query Pattern](https://kunjan.in/writings/combining-jotai-localstorage-and-react-query-a-powerful-state-management-pattern/) - state management pattern inspiration (adapted for simpler use case)
- [LogRocket - Custom Debounce Hook](https://blog.logrocket.com/create-custom-debounce-hook-react/) - debounce implementation patterns

### Tertiary (LOW confidence)
- navigator.sendBeacon for beforeunload sync - needs validation for PUT-equivalent behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; all patterns use existing React + fetch + browser APIs
- Architecture: HIGH - Direct extension of existing hook architecture with well-understood patterns; all API shapes verified from codebase
- Pitfalls: HIGH - Identified from first principles analysis of the specific codebase interactions (closure bugs, race conditions, collection sync)
- Sync strategy: HIGH - LWW with unconditional upsert is explicitly the project's chosen approach; API already implements it

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable patterns, no fast-moving dependencies)
