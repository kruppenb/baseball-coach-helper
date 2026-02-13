import type { SyncKeyConfig, SyncStatus } from './sync-types';

/** Debounce timers keyed by localStorage key */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Keys with pending pushes that failed due to network errors (retry on reconnect) */
const pendingPushKeys = new Set<string>();

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
