import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../auth/useAuth';
import { useSyncContext } from './SyncContext';
import type { SyncKeyConfig } from './sync-types';
import { debouncedPush, pullFromCloud, markDirty } from './sync-engine';

/**
 * Drop-in replacement for useLocalStorage that adds background cloud sync
 * for authenticated users.
 *
 * - Unauthenticated users get pure localStorage passthrough (zero network activity)
 * - Writes go to localStorage immediately, then schedule a debounced push to cloud
 * - On mount for authenticated users, cloud data is pulled once to hydrate localStorage
 *
 * Return type is identical to useLocalStorage: [T, (value: T | ((prev: T) => T)) => void]
 */
export function useCloudStorage<T>(
  key: string,
  initialValue: T,
  apiConfig: SyncKeyConfig
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setLocalValue] = useLocalStorage<T>(key, initialValue);
  const { user } = useAuth();
  const { reportStatus, registerConfig, onConflict } = useSyncContext();

  // Use ref for apiConfig to avoid stale closures and dependency array churn
  // (apiConfig is typically an object literal, new reference every render)
  const apiConfigRef = useRef(apiConfig);
  apiConfigRef.current = apiConfig;

  // Register config on mount so SyncContext can retry pushes for this key
  useEffect(() => {
    registerConfig(key, apiConfigRef.current);
  }, [key, registerConfig]);

  // Wrapped setter: writes to localStorage then schedules cloud push
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setLocalValue(newValue);
      if (user) {
        markDirty(key);
        debouncedPush(
          key,
          apiConfigRef.current,
          (status) => reportStatus(key, status),
          onConflict
        );
      }
    },
    [key, setLocalValue, user, reportStatus, onConflict]
  );

  // Pull from cloud on mount (authenticated only)
  useEffect(() => {
    if (!user) return;
    pullFromCloud(key, apiConfigRef.current, (status) =>
      reportStatus(key, status)
    );
  }, [key, user, reportStatus]);

  // For unauthenticated users, return plain localStorage setter
  if (!user) {
    return [value, setLocalValue];
  }

  return [value, setValue];
}
