import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { SyncStatus, SyncKeyConfig } from './sync-types';
import { useOnlineStatus } from './useOnlineStatus';
import { retryPendingPushes, cancelAllTimers } from './sync-engine';

interface SyncContextValue {
  status: SyncStatus;
  reportStatus: (key: string, status: SyncStatus) => void;
  registerConfig: (key: string, config: SyncKeyConfig) => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: 'synced',
  reportStatus: () => {},
  registerConfig: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [keyStatuses, setKeyStatuses] = useState<Record<string, SyncStatus>>(
    {}
  );
  const configsRef = useRef<Map<string, SyncKeyConfig>>(new Map());
  const prevOnlineRef = useRef<boolean>(true);

  const reportStatus = useCallback((key: string, status: SyncStatus) => {
    setKeyStatuses((prev) => ({ ...prev, [key]: status }));
  }, []);

  const registerConfig = useCallback((key: string, config: SyncKeyConfig) => {
    configsRef.current.set(key, config);
  }, []);

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

  return (
    <SyncContext.Provider value={{ status, reportStatus, registerConfig }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  return useContext(SyncContext);
}
