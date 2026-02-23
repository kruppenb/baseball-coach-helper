import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { SyncStatus, SyncKeyConfig, ConflictInfo } from './sync-types';
import { useOnlineStatus } from './useOnlineStatus';
import {
  retryPendingPushes,
  cancelAllTimers,
  migrateLocalData,
  pushToCloud,
  setStoredEtag,
  setLastSynced,
  clearDirty,
} from './sync-engine';
import { useAuth } from '../auth/useAuth';
import { ConflictDialog } from './ConflictDialog';

interface SyncContextValue {
  status: SyncStatus;
  reportStatus: (key: string, status: SyncStatus) => void;
  registerConfig: (key: string, config: SyncKeyConfig) => void;
  onConflict: (info: ConflictInfo) => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: 'synced',
  reportStatus: () => {},
  registerConfig: () => {},
  onConflict: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [keyStatuses, setKeyStatuses] = useState<Record<string, SyncStatus>>(
    {}
  );
  const configsRef = useRef<Map<string, SyncKeyConfig>>(new Map());
  const prevOnlineRef = useRef<boolean>(true);
  const { user } = useAuth();
  const hasMigrated = useRef(false);

  const reportStatus = useCallback((key: string, status: SyncStatus) => {
    setKeyStatuses((prev) => ({ ...prev, [key]: status }));
  }, []);

  const registerConfig = useCallback((key: string, config: SyncKeyConfig) => {
    configsRef.current.set(key, config);
  }, []);

  const [conflictQueue, setConflictQueue] = useState<ConflictInfo[]>([]);
  const activeConflict = conflictQueue[0] ?? null;

  const handleConflict = useCallback((info: ConflictInfo) => {
    setConflictQueue((prev) => [...prev, info]);
  }, []);

  const resolveOne = useCallback((conflict: ConflictInfo, choice: 'local' | 'cloud') => {
    const { key, cloudData, cloudEtag } = conflict;

    if (choice === 'cloud') {
      const jsonValue = JSON.stringify(cloudData);
      localStorage.setItem(key, jsonValue);
      setLastSynced(key, jsonValue);
      window.dispatchEvent(
        new CustomEvent('local-storage-sync', {
          detail: { key, value: cloudData },
        })
      );
      if (cloudEtag) {
        setStoredEtag(key, cloudEtag);
      }
      clearDirty(key);
      reportStatus(key, 'synced');
    } else {
      if (cloudEtag) {
        setStoredEtag(key, cloudEtag);
      }
      // Restore local data to localStorage — React effects (e.g. PCAssignmentStep)
      // may have cleared it since the module-load snapshot was taken
      localStorage.setItem(key, JSON.stringify(conflict.localData));
      window.dispatchEvent(
        new CustomEvent('local-storage-sync', {
          detail: { key, value: conflict.localData },
        })
      );
      const config = configsRef.current.get(key);
      if (config) {
        pushToCloud(key, config, (status) => reportStatus(key, status), handleConflict);
      }
    }
  }, [reportStatus, handleConflict]);

  const resolveConflict = useCallback((choice: 'local' | 'cloud') => {
    // Apply the user's choice to every queued conflict at once
    for (const conflict of conflictQueue) {
      resolveOne(conflict, choice);
    }
    setConflictQueue([]);
  }, [conflictQueue, resolveOne]);

  // Derive aggregated status: error > syncing > offline > synced
  const statusValues = Object.values(keyStatuses);
  let status: SyncStatus = 'synced';
  if (statusValues.some((s) => s === 'error')) {
    status = 'error';
  } else if (statusValues.some((s) => s === 'syncing')) {
    status = 'syncing';
  } else if (statusValues.some((s) => s === 'offline')) {
    status = 'offline';
  }

  const isOnline = useOnlineStatus();

  // Retry pending pushes when transitioning from offline to online
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      retryPendingPushes(
        (key, keyStatus) => reportStatus(key, keyStatus),
        configsRef.current
      );
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, reportStatus]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      cancelAllTimers();
    };
  }, []);

  // One-time migration of localStorage data to cloud after first authentication.
  // 3-second delay allows useCloudStorage pull-on-mount to complete first,
  // preventing overwrite of cloud data that already exists from another device.
  useEffect(() => {
    if (!user || hasMigrated.current) return;
    if (localStorage.getItem('migration-complete') === 'true') {
      hasMigrated.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      hasMigrated.current = true;
      migrateLocalData((status) => reportStatus('__migration__', status));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user, reportStatus]);

  return (
    <SyncContext.Provider value={{ status, reportStatus, registerConfig, onConflict: handleConflict }}>
      {children}
      <ConflictDialog conflict={activeConflict} onResolve={resolveConflict} />
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  return useContext(SyncContext);
}
