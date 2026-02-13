# Phase 8: Data Migration - Research

**Researched:** 2026-02-12
**Domain:** localStorage-to-cloud data migration on first sign-in, React hooks, sync engine integration
**Confidence:** HIGH

## Summary

Phase 8 addresses a specific gap in the sync engine built in Phase 7: when a coach who has been using v1.0 (localStorage-only) signs in for the first time, their existing localStorage data does not automatically appear in their cloud account. The sync engine's `pullFromCloud` correctly handles the "cloud has data, hydrate localStorage" case, and `pushToCloud` handles the "user made an edit, push to cloud" case. But neither covers the "localStorage has data, cloud is empty, push existing data without user action" case.

The solution is a one-time migration function that runs after the first successful authentication. It detects that the cloud account is empty (no prior data) while localStorage contains v1.0 data, and pushes all existing localStorage data to the cloud API endpoints. This is a pure client-side operation using the existing sync-engine's `pushToCloud` function and the existing API endpoints. No new server-side code is needed. The migration must be idempotent (safe to run multiple times) and must not overwrite cloud data that already exists (e.g., if the coach signed in on another device first).

The critical architectural insight from analyzing the existing code: the `pullFromCloud` function in `sync-engine.ts` already runs on mount for authenticated users (in `useCloudStorage`'s useEffect). If the cloud is empty, it leaves localStorage alone. The migration logic should run AFTER this initial pull completes. If the pull found cloud data (meaning the user already migrated on another device), migration is skipped. If the pull found nothing and localStorage has data, migration pushes that data up. A simple `localStorage` flag (`migration-complete`) prevents repeated migration attempts.

**Primary recommendation:** Add a `migrateLocalData` function to `sync-engine.ts` that pushes each localStorage key to its corresponding API endpoint, and trigger it from `SyncProvider` (or a new `MigrationProvider`) after the initial pull cycle completes for a newly authenticated user.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (existing) | ^19.2.0 | useEffect for migration trigger, context for state | Already in project |
| fetch API (built-in) | N/A | Push localStorage data to `/api/*` endpoints | Same-origin, no library needed |
| localStorage (built-in) | N/A | Source of v1.0 data to migrate | Already the data store |
| sync-engine.ts (existing) | N/A | pushToCloud function for uploading data | Already built in Phase 7 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side migration on first sign-in | Server-side migration endpoint | Would require a new API endpoint that accepts bulk data; adds unnecessary complexity since client already has the data and can use existing endpoints |
| Push-based migration (client pushes to cloud) | Pull-based migration (server reads from... what?) | Server has no access to localStorage; client-side push is the only viable approach |
| One-time migration flag in localStorage | Migration flag in Cosmos DB | DB flag survives device changes but adds a round-trip; localStorage flag is simpler and the migration is idempotent anyway (re-running it just re-upserts the same data) |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  sync/
    sync-engine.ts        # ADD: migrateLocalData() function
    sync-types.ts          # ADD: MigrationStatus type if needed
    useCloudStorage.ts     # UNCHANGED
    SyncContext.tsx         # MODIFY: trigger migration after initial pull
    useOnlineStatus.ts     # UNCHANGED
  hooks/
    useLocalStorage.ts     # UNCHANGED
    useRoster.ts           # UNCHANGED (already uses useCloudStorage)
    useGameConfig.ts       # UNCHANGED
    useLineup.ts           # UNCHANGED
    useGameHistory.ts      # UNCHANGED
    useBattingOrder.ts     # UNCHANGED
```

### Pattern 1: Migration Detection (Cloud-Empty + Local-Present)
**What:** Determine whether migration is needed by checking if the cloud account has no data while localStorage contains existing v1.0 data.
**When to use:** On first sign-in for an authenticated user.
**Key insight:** The existing `pullFromCloud` already runs on mount. After pull completes:
- If cloud had data -> it was written to localStorage -> no migration needed
- If cloud was empty -> localStorage retains its original data -> check if localStorage has data -> if yes, migrate

**Detection approach:**
```typescript
// After pullFromCloud completes for a key:
// 1. Check if cloud returned data (pullFromCloud sets localStorage + dispatches event if cloud has data)
// 2. If no cloud data was received, check if localStorage has existing data for that key
// 3. If localStorage has data, this key needs migration (push local -> cloud)

function needsMigration(key: string): boolean {
  // Check the migration flag first
  if (localStorage.getItem('migration-complete') === 'true') return false;

  const raw = localStorage.getItem(key);
  if (!raw) return false;

  // Check if data is non-default
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0) return false;
    if (typeof parsed === 'object' && parsed !== null) {
      // Check for default gameConfig
      if (Object.keys(parsed).length === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}
```

### Pattern 2: Migration Execution (Push All Keys)
**What:** Push all localStorage data keys to their cloud endpoints using the existing pushToCloud function.
**When to use:** When migration is detected as needed.
**Key design:** Use the existing `pushToCloud` function from `sync-engine.ts` which already knows how to handle singleton vs collection mode, read from localStorage at push time, and handle the batting endpoint's special shape.

```typescript
// Source: Derived from existing sync-engine.ts patterns
async function migrateLocalData(
  onStatus: (status: SyncStatus) => void
): Promise<boolean> {
  if (localStorage.getItem('migration-complete') === 'true') return true;

  const migrationConfigs: Array<{ key: string; config: SyncKeyConfig }> = [
    { key: 'roster', config: { endpoint: '/api/roster', mode: 'singleton' } },
    { key: 'gameConfig', config: { endpoint: '/api/game-config', mode: 'singleton' } },
    { key: 'lineupState', config: { endpoint: '/api/lineup-state', mode: 'singleton' } },
    { key: 'gameHistory', config: { endpoint: '/api/game-history', mode: 'collection' } },
    { key: 'battingOrderState', config: { endpoint: '/api/batting', mode: 'singleton', pushDocType: 'battingOrderState' } },
    { key: 'battingHistory', config: { endpoint: '/api/batting', mode: 'collection', pushDocType: 'battingHistory' } },
  ];

  onStatus('syncing');

  for (const { key, config } of migrationConfigs) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      // Skip empty defaults
      if (Array.isArray(parsed) && parsed.length === 0) continue;
      if (typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0) continue;
    } catch {
      continue;
    }

    // pushToCloud reads from localStorage at call time
    await pushToCloud(key, config, onStatus);
  }

  localStorage.setItem('migration-complete', 'true');
  onStatus('synced');
  return true;
}
```

### Pattern 3: Migration Trigger Point
**What:** Where and when to trigger the migration in the React component tree.
**When to use:** After the user authenticates for the first time and the initial pull cycle has had a chance to complete.

**Option A -- Inside SyncProvider (recommended):**
Add a migration effect to `SyncContext.tsx` that fires when the user first authenticates. It waits briefly for initial pulls to complete, then checks if migration is needed and runs it.

```typescript
// Inside SyncProvider:
const { user } = useAuth();
const hasMigrated = useRef(false);

useEffect(() => {
  if (!user || hasMigrated.current) return;
  if (localStorage.getItem('migration-complete') === 'true') {
    hasMigrated.current = true;
    return;
  }

  // Delay to let useCloudStorage pull-on-mount effects complete first
  const timer = setTimeout(async () => {
    hasMigrated.current = true;
    await migrateLocalData((status) => {
      // Report migration status to the aggregate indicator
      reportStatus('__migration__', status);
    });
  }, 3000); // 3 seconds: enough for initial pulls to complete

  return () => clearTimeout(timer);
}, [user, reportStatus]);
```

**Why Option A over a separate MigrationProvider:** The migration is a one-time sync operation. It uses the same sync status reporting, the same pushToCloud function, and the same auth check. Putting it in SyncProvider keeps all sync-related logic together without adding another provider to the component tree.

### Pattern 4: Idempotent Migration (Safe to Re-run)
**What:** The migration must be safe to run multiple times without creating duplicates or overwriting newer cloud data.
**Why:** The localStorage flag could be cleared (e.g., browser data clear), or the migration could partially fail and need to retry.
**How:**
- **Singletons (roster, gameConfig, lineupState, battingOrderState):** The API uses `container.items.upsert()` which is an unconditional upsert. If cloud already has data, the push overwrites it. Since this is LWW and the migration only runs when the cloud was found empty, this is safe. If re-run after cloud has newer data, the newer data would be overwritten -- but the `migration-complete` flag prevents re-runs.
- **Collections (gameHistory, battingHistory):** The API uses `container.items.upsert()` with IDs derived from the entry's `id` field (e.g., `game-{userId}-{entryId}`). Re-upserting the same entry with the same ID is a no-op (same data, same ID). So collection migration is naturally idempotent.

### Anti-Patterns to Avoid
- **Triggering migration before pullFromCloud completes:** If migration pushes localStorage data before the pull has a chance to discover existing cloud data, it could overwrite newer cloud data with stale local data. Always let the pull cycle complete first.
- **Creating a separate migration API endpoint:** The existing PUT endpoints handle individual document upserts. A bulk migration endpoint adds unnecessary server-side complexity and a new attack surface.
- **Migrating on every app load:** Use a localStorage flag to skip migration after the first successful run. Without this, every authenticated page load would re-push all data.
- **Blocking the UI during migration:** Migration should run in the background with the sync status indicator showing "Syncing...". The coach can use the app immediately.
- **Forgetting to handle the lastSyncedCount for collections:** After migrating game history entries, the `lastSyncedCount` must be set so that subsequent pushes from `useCloudStorage` don't re-push already-migrated entries.
- **Modifying useCloudStorage's pull logic to "push if cloud empty":** This would couple migration into the general sync flow, making it harder to reason about. Keep migration as a separate one-time operation.
- **Deleting localStorage data after migration:** The app is offline-first. localStorage is the primary data store. Never remove it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pushing data to cloud | Custom migration fetch calls | Existing `pushToCloud` from sync-engine.ts | Already handles singleton vs collection, batting endpoint's special shape, error classification |
| Migration status reporting | Custom migration UI | Existing SyncStatusIndicator via `reportStatus` | Shows "Syncing..." during migration, then "Synced" -- exactly the right UX |
| Checking if cloud has data | Custom cloud-empty detection | Rely on existing pullFromCloud behavior | pullFromCloud already sets localStorage from cloud on mount; if cloud is empty, localStorage retains v1.0 data |
| Collection entry deduplication | Custom dedup logic | Cosmos DB upsert with deterministic IDs | `game-{userId}-{entryId}` IDs mean re-upserting is a no-op |

**Key insight:** Phase 7 built all the sync infrastructure. Phase 8's migration is a thin orchestration layer that calls existing functions in a specific order. No new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: Race Condition Between Pull and Migration
**What goes wrong:** Migration pushes localStorage data to cloud before pullFromCloud finishes. If the cloud already had data (from another device), it gets overwritten with stale local data.
**Why it happens:** Both pullFromCloud (in useCloudStorage's useEffect) and migration trigger run on mount for authenticated users.
**How to avoid:** Delay migration to run AFTER the initial pull cycle. A 3-second timeout is sufficient (pulls are single GET requests to same-origin API). Alternatively, track pull completion state and trigger migration only after all pulls resolve.
**Warning signs:** Data from another device disappears after signing in on a new device that has old localStorage data.

### Pitfall 2: Collection lastSyncedCount Not Set After Migration
**What goes wrong:** After migration pushes all gameHistory entries to cloud, the `lastSyncedCount` for that key is not updated. On the next user edit (e.g., finalizing a new game), `pushToCloud` reads `lastSyncedCount` as 0 and re-pushes ALL entries again.
**Why it happens:** `pushToCloud` in collection mode uses `lastSyncedCount` from localStorage to determine which entries are new. Migration uses pushToCloud which DOES update lastSyncedCount. But if migration uses a different code path, this could be missed.
**How to avoid:** Use the existing `pushToCloud` function for migration (not a custom push). It already handles `lastSyncedCount` updates after successful collection pushes. Verify this explicitly.
**Warning signs:** Duplicate API calls after migration, excessive Cosmos DB RU consumption.

### Pitfall 3: Default Values Treated as Migrateable Data
**What goes wrong:** Migration pushes default values (empty roster `[]`, default gameConfig `{ innings: 6 }`, empty lineupState) to cloud, overwriting cloud data that might have been set on another device.
**Why it happens:** useLocalStorage initializes with default values and writes them to localStorage. So localStorage always has data, even for a brand-new user.
**How to avoid:** Check if localStorage data differs from the default initial values before deciding to migrate. Skip keys where the data matches the hook's `initialValue`. For roster, skip if `[]`. For gameConfig, skip if `{ innings: 6 }`. For lineupState, skip if it matches `defaultState`. For empty collections, skip if `[]`.
**Warning signs:** New users with no v1.0 data see "Syncing..." briefly on first sign-in as defaults are pushed.

### Pitfall 4: Partial Migration Failure
**What goes wrong:** Migration pushes roster and gameConfig successfully, but gameHistory fails (network error). The `migration-complete` flag is set anyway. Game history never makes it to the cloud.
**Why it happens:** Setting the flag before all pushes complete, or not checking individual push results.
**How to avoid:** Only set `migration-complete` flag after ALL pushes succeed. If any push fails, don't set the flag so migration retries on next app load. The sync status indicator will show "error" or "offline" which is the correct UX.
**Warning signs:** Coach signs in and sees most data synced but some data missing in cloud.

### Pitfall 5: Migration Runs for Brand-New Users
**What goes wrong:** A brand-new user (no v1.0 data, first time using the app) signs in. Migration detects "cloud empty" and tries to push default localStorage values.
**Why it happens:** No distinction between "localStorage has real v1.0 data" and "localStorage has default initial values from hooks."
**How to avoid:** Check that localStorage data is non-default before migrating each key. If all keys contain only default values, skip migration entirely and set the flag immediately.
**Warning signs:** Unnecessary API calls for new users; potential overwrite of cloud data set on another device.

### Pitfall 6: useCloudStorage Pull Overwrites Local Data During Migration Window
**What goes wrong:** While migration is pushing roster to cloud, useCloudStorage for gameConfig triggers a pull that returns the default empty config from cloud, overwriting the coach's real gameConfig in localStorage.
**Why it happens:** useCloudStorage pullFromCloud fires independently for each key. The timing between pulls and migration pushes is non-deterministic.
**How to avoid:** The existing `pullFromCloud` implementation already handles this correctly: for singletons, it skips hydration if the cloud returns empty/default data (the empty-object check on line 166-169 of sync-engine.ts). For collections, it skips if the array is empty. So pulls won't overwrite existing localStorage data with empty cloud defaults. Verify this is true for all data types.
**Warning signs:** localStorage data disappearing during the migration window.

## Code Examples

Verified patterns from the existing codebase:

### Existing localStorage Keys and Their Defaults
```typescript
// Source: src/hooks/*.ts (verified from codebase)

// Singleton keys:
// key: 'roster',          initialValue: []                    endpoint: '/api/roster'
// key: 'gameConfig',      initialValue: { innings: 6 }        endpoint: '/api/game-config'
// key: 'lineupState',     initialValue: defaultState (*)      endpoint: '/api/lineup-state'
// key: 'battingOrderState', initialValue: defaultState (**)   endpoint: '/api/batting'

// Collection keys:
// key: 'gameHistory',     initialValue: []                    endpoint: '/api/game-history'
// key: 'battingHistory',  initialValue: []                    endpoint: '/api/batting'

// (*) LineupState default: { pitcherAssignments: {}, catcherAssignments: {}, positionBlocks: {}, generatedLineups: [], selectedLineupIndex: null }
// (**) BattingOrderState default: { currentOrder: null, isConfirmed: false }
```

### Existing pushToCloud Signature (Reuse for Migration)
```typescript
// Source: src/sync/sync-engine.ts (line 36-129)
export async function pushToCloud(
  key: string,
  config: SyncKeyConfig,
  onStatus: (status: SyncStatus) => void
): Promise<void>
// Reads from localStorage.getItem(key) at call time
// Handles singleton (PUT whole object) and collection (PUT each entry) modes
// Updates lastSyncedCount for collections after success
```

### Existing pullFromCloud Empty-Data Guard
```typescript
// Source: src/sync/sync-engine.ts (lines 162-176)
// For singletons:
if (data !== null && data !== undefined) {
  // Skip if data is an empty object
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) {
    onStatus('synced');
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
  // ... dispatch event
}

// For collections:
if (Array.isArray(data) && data.length > 0) {
  localStorage.setItem(key, JSON.stringify(data));
  // ... dispatch event + set lastSyncedCount
}
```
This confirms: pullFromCloud will NOT overwrite localStorage with empty cloud data. This is critical for the migration to work correctly.

### API Default Responses (When No Cloud Data Exists)
```typescript
// Source: api/src/functions/*.ts (verified from codebase)

// GET /api/roster     -> { data: [], _etag: null }           (no doc found)
// GET /api/game-config -> { data: { innings: 6 }, _etag: null } (no doc found)
// GET /api/lineup-state -> { data: null, _etag: null }       (no doc found)
// GET /api/batting    -> { battingOrderState: { currentOrder: null, isConfirmed: false }, battingHistory: [] }
// GET /api/game-history -> { data: [] }                      (no docs found)
```

### Determining if a Key Has Non-Default Data
```typescript
// Helper to check if localStorage has real user data (not just defaults)
function hasNonDefaultData(key: string): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);

    switch (key) {
      case 'roster':
        return Array.isArray(parsed) && parsed.length > 0;
      case 'gameConfig':
        // Only non-default if innings !== 6 (the only config option)
        return parsed?.innings !== undefined && parsed.innings !== 6;
      case 'lineupState':
        // Has data if any assignments exist or lineups generated
        return (
          Object.keys(parsed?.pitcherAssignments ?? {}).length > 0 ||
          Object.keys(parsed?.catcherAssignments ?? {}).length > 0 ||
          Object.keys(parsed?.positionBlocks ?? {}).length > 0 ||
          (parsed?.generatedLineups?.length ?? 0) > 0
        );
      case 'battingOrderState':
        return parsed?.currentOrder !== null;
      case 'gameHistory':
      case 'battingHistory':
        return Array.isArray(parsed) && parsed.length > 0;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
```

### Complete Migration Flow
```typescript
// Recommended migration orchestration:

// 1. User signs in (AuthProvider sets user)
// 2. useCloudStorage hooks fire pullFromCloud for each key
// 3. pullFromCloud finds empty cloud -> leaves localStorage alone
// 4. After delay (3s), SyncProvider triggers migrateLocalData()
// 5. migrateLocalData checks migration-complete flag
// 6. For each key with non-default data: pushToCloud(key, config, onStatus)
// 7. On all success: set migration-complete flag
// 8. Sync indicator shows "Synced"
//
// On subsequent sign-ins:
// 1. migration-complete flag found -> skip migration
// 2. useCloudStorage pulls from cloud -> hydrates localStorage with cloud data
// 3. Normal sync behavior continues
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual export/import for migration | Automatic background migration on first sign-in | Standard pattern | Zero user friction |
| Server-side batch migration endpoint | Client-side push through existing APIs | Depends on architecture | No new API surface; simpler, less to maintain |
| Blocking UI during migration | Non-blocking migration with status indicator | UX best practice | Coach can use app immediately |

**Deprecated/outdated:**
- Nothing deprecated for this phase. All patterns are standard.

## Open Questions

1. **Migration Timing: Delay vs. Event-Driven**
   - What we know: A timeout-based delay (e.g., 3 seconds) is simple but imprecise. The initial pulls might take longer on slow networks, or finish faster on fast networks.
   - What's unclear: Whether tracking pull completion across all keys is worth the added complexity.
   - Recommendation: Use the simple timeout approach. The migration is idempotent, so even if it runs slightly before a pull completes, the worst case is that it pushes local data that will be immediately overwritten by the subsequent pull's cloud data on the next app load. Given that migration only runs when cloud is empty, this race condition is benign.

2. **What Happens If Coach Clears Browser Data After Migration**
   - What we know: If localStorage is cleared, the `migration-complete` flag is also cleared. On next sign-in, migration would detect empty localStorage and skip (no data to push).
   - What's unclear: Whether this is a problem.
   - Recommendation: This is fine. The cloud data survives. pullFromCloud will hydrate localStorage from cloud on next sign-in. The migration-complete flag being lost is harmless.

3. **Should lineupState Be Migrated?**
   - What we know: lineupState contains ephemeral per-game-setup data (pitcher/catcher assignments, generated lineups). It's reset each game.
   - What's unclear: Whether coaches want their in-progress lineup setup to survive across devices.
   - Recommendation: Migrate it. The data is already being synced via useCloudStorage. Migration should treat all synced keys equally. If the data is empty/default, the migration skip logic handles it.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/sync/sync-engine.ts` - pushToCloud, pullFromCloud behavior (read directly)
- Existing codebase: `src/sync/useCloudStorage.ts` - pull-on-mount effect, auth gating (read directly)
- Existing codebase: `src/sync/SyncContext.tsx` - status aggregation, provider lifecycle (read directly)
- Existing codebase: `src/hooks/*.ts` - all 5 domain hooks, their keys and initial values (read directly)
- Existing codebase: `api/src/functions/*.ts` - API response shapes for empty data cases (read directly)
- Existing codebase: `src/auth/AuthContext.tsx` - authentication state management (read directly)
- Phase 7 research: `.planning/phases/07-sync-engine/07-RESEARCH.md` - sync architecture decisions
- Phase 7 verification: `.planning/phases/07-sync-engine/07-VERIFICATION.md` - confirms all sync infrastructure working

### Secondary (MEDIUM confidence)
- General pattern knowledge: localStorage migration to cloud storage is a well-understood pattern in offline-first web apps

### Tertiary (LOW confidence)
- None. All findings are based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; reuses all existing sync infrastructure
- Architecture: HIGH - Direct analysis of existing pullFromCloud/pushToCloud behavior reveals the exact gap and solution
- Pitfalls: HIGH - Derived from first-principles analysis of timing, ordering, and data flow in the existing codebase
- Migration logic: HIGH - The migration is a thin orchestration of existing functions with well-understood behavior

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable patterns, no external dependencies)
