import type { SyncKeyConfig, SyncStatus } from './sync-types';

/** Debounce timers keyed by localStorage key */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Keys with pending pushes that failed due to network errors (retry on reconnect) */
const pendingPushKeys = new Set<string>();

/** Keys already pulled from cloud this session (prevents duplicate pulls on component re-mount) */
const pulledKeys = new Set<string>();

/**
 * Schedule a debounced push for the given key.
 * Clears any existing timer for this key and sets a new 2-second delay.
 */
export function debouncedPush(
  key: string,
  config: SyncKeyConfig,
  onStatus: (status: SyncStatus) => void
): void {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);

  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      pushToCloud(key, config, onStatus);
    }, 2000)
  );
}

/**
 * Push the current localStorage value for `key` to the cloud API.
 *
 * Reads directly from localStorage at call time (not from a closure) to avoid
 * stale data after rapid edits.
 */
export async function pushToCloud(
  key: string,
  config: SyncKeyConfig,
  onStatus: (status: SyncStatus) => void
): Promise<void> {
  const raw = localStorage.getItem(key);
  if (raw === null) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  onStatus('syncing');

  try {
    if (config.mode === 'singleton') {
      const body: Record<string, unknown> = { data: parsed };
      if (config.pushDocType) {
        body.docType = config.pushDocType;
      }
      const response = await fetch(config.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 401) {
          onStatus('error');
          return;
        }
        if (response.status >= 500) {
          onStatus('error');
          return;
        }
        onStatus('error');
        return;
      }
    } else {
      // collection mode
      const entries = parsed as unknown[];
      if (!Array.isArray(entries)) {
        onStatus('error');
        return;
      }

      const lastSyncedCountRaw = localStorage.getItem(key + ':lastSyncedCount');
      const lastSyncedCount = lastSyncedCountRaw
        ? parseInt(lastSyncedCountRaw, 10)
        : 0;

      const newEntries = entries.slice(lastSyncedCount);

      for (const entry of newEntries) {
        const body: Record<string, unknown> = { data: entry };
        if (config.pushDocType) {
          body.docType = config.pushDocType;
        }
        const response = await fetch(config.endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          if (response.status === 401) {
            onStatus('error');
            return;
          }
          if (response.status >= 500) {
            onStatus('error');
            return;
          }
          onStatus('error');
          return;
        }
      }

      localStorage.setItem(
        key + ':lastSyncedCount',
        String(entries.length)
      );
    }

    // Success
    pendingPushKeys.delete(key);
    onStatus('synced');
  } catch {
    // Network error (fetch throws on network failure)
    pendingPushKeys.add(key);
    onStatus('offline');
  }
}

/**
 * Pull data from the cloud API and hydrate localStorage for the given key.
 *
 * Dispatches a `local-storage-sync` CustomEvent so that useLocalStorage
 * instances update their React state automatically.
 */
export async function pullFromCloud(
  key: string,
  config: SyncKeyConfig,
  onStatus: (status: SyncStatus) => void
): Promise<void> {
  // Skip if already pulled this session to prevent stale cloud data
  // from overwriting local changes made in earlier steps
  if (pulledKeys.has(key)) {
    onStatus('synced');
    return;
  }

  onStatus('syncing');

  try {
    const response = await fetch(config.endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        onStatus('error');
        return;
      }
      onStatus('error');
      return;
    }

    const json = (await response.json()) as Record<string, unknown>;

    if (config.mode === 'singleton') {
      const data = config.responseKey ? json[config.responseKey] : json.data;

      if (data !== null && data !== undefined) {
        // Check for empty-object default: skip if data is an empty object
        if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) {
          onStatus('synced');
          return;
        }
        localStorage.setItem(key, JSON.stringify(data));
        window.dispatchEvent(
          new CustomEvent('local-storage-sync', {
            detail: { key, value: data },
          })
        );
      }
    } else {
      // collection mode
      const data = config.responseKey ? json[config.responseKey] : json.data;

      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(key, JSON.stringify(data));
        window.dispatchEvent(
          new CustomEvent('local-storage-sync', {
            detail: { key, value: data },
          })
        );
        localStorage.setItem(
          key + ':lastSyncedCount',
          String(data.length)
        );
      }
    }

    pulledKeys.add(key);
    onStatus('synced');
  } catch {
    // Network error -- user works offline
    onStatus('offline');
  }
}

/**
 * Retry all pending pushes that failed due to network errors.
 * Called when the browser comes back online.
 */
export function retryPendingPushes(
  onStatus: (key: string, status: SyncStatus) => void,
  configs: Map<string, SyncKeyConfig>
): void {
  for (const key of pendingPushKeys) {
    const config = configs.get(key);
    if (config) {
      pushToCloud(key, config, (status) => onStatus(key, status));
    }
  }
}

/**
 * Cancel all pending debounce timers. Called on SyncProvider unmount.
 */
export function cancelAllTimers(): void {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
}

/**
 * Check if a localStorage key contains real user data (not just hook defaults).
 * Returns false if the key is missing, unparseable, or contains only default values.
 */
export function hasNonDefaultData(key: string): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  switch (key) {
    case 'roster':
      return Array.isArray(parsed) && parsed.length > 0;

    case 'gameConfig':
      return (
        parsed !== null &&
        typeof parsed === 'object' &&
        'innings' in (parsed as Record<string, unknown>) &&
        (parsed as Record<string, unknown>).innings !== 6
      );

    case 'lineupState': {
      const ls = parsed as Record<string, unknown>;
      const pitcherAssignments = ls.pitcherAssignments as
        | Record<string, unknown>
        | undefined;
      const catcherAssignments = ls.catcherAssignments as
        | Record<string, unknown>
        | undefined;
      const positionBlocks = ls.positionBlocks as
        | Record<string, unknown>
        | undefined;
      const generatedLineups = ls.generatedLineups as unknown[] | undefined;

      return (
        (pitcherAssignments !== undefined &&
          Object.keys(pitcherAssignments).length > 0) ||
        (catcherAssignments !== undefined &&
          Object.keys(catcherAssignments).length > 0) ||
        (positionBlocks !== undefined &&
          Object.keys(positionBlocks).length > 0) ||
        (Array.isArray(generatedLineups) && generatedLineups.length > 0)
      );
    }

    case 'battingOrderState': {
      const bos = parsed as Record<string, unknown>;
      return bos?.currentOrder !== null && bos?.currentOrder !== undefined;
    }

    case 'gameHistory':
      return Array.isArray(parsed) && parsed.length > 0;

    case 'battingHistory':
      return Array.isArray(parsed) && parsed.length > 0;

    default:
      return false;
  }
}

/**
 * One-time migration of existing localStorage data to the cloud.
 *
 * Reuses pushToCloud for all 6 sync keys. Skips keys with only default data.
 * Sets a `migration-complete` localStorage flag on success to prevent re-runs.
 * Does NOT set the flag on partial failure so migration retries next time.
 */
export async function migrateLocalData(
  onStatus: (status: SyncStatus) => void
): Promise<boolean> {
  // Idempotency: skip if already completed
  if (localStorage.getItem('migration-complete') === 'true') {
    return true;
  }

  const migrationConfigs: { key: string; config: SyncKeyConfig }[] = [
    { key: 'roster', config: { endpoint: '/api/roster', mode: 'singleton' } },
    {
      key: 'gameConfig',
      config: { endpoint: '/api/game-config', mode: 'singleton' },
    },
    {
      key: 'lineupState',
      config: { endpoint: '/api/lineup-state', mode: 'singleton' },
    },
    {
      key: 'battingOrderState',
      config: {
        endpoint: '/api/batting',
        mode: 'singleton',
        pushDocType: 'battingOrderState',
      },
    },
    {
      key: 'gameHistory',
      config: { endpoint: '/api/game-history', mode: 'collection' },
    },
    {
      key: 'battingHistory',
      config: {
        endpoint: '/api/batting',
        mode: 'collection',
        pushDocType: 'battingHistory',
      },
    },
  ];

  const keysToMigrate = migrationConfigs.filter(({ key }) =>
    hasNonDefaultData(key)
  );

  // Brand-new user with only defaults -- nothing to migrate
  if (keysToMigrate.length === 0) {
    localStorage.setItem('migration-complete', 'true');
    return true;
  }

  onStatus('syncing');

  // Track whether any push reported an error or offline status
  let hadError = false;

  for (const { key, config } of keysToMigrate) {
    try {
      await pushToCloud(key, config, (status) => {
        if (status === 'error' || status === 'offline') {
          hadError = true;
        }
        onStatus(status);
      });
    } catch {
      // pushToCloud catches internally, but guard against unexpected throws
      hadError = true;
      onStatus('error');
    }
  }

  if (hadError) {
    onStatus('error');
    return false;
  }

  localStorage.setItem('migration-complete', 'true');
  onStatus('synced');
  return true;
}
