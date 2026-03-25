import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes
const STALE_THRESHOLD_MS = 2 * 60_000; // 2 minutes — re-fetch on visibility change if older

export interface FieldStatus {
  id: string;
  name: string;
  status: string;
  detail: string;
  updatedAt: number; // unix seconds — when parks dept last updated
}

interface FieldStatusResponse {
  fields: FieldStatus[];
  fetchedAt: number; // unix seconds — when our proxy last fetched
}

interface UseFieldStatusResult {
  fields: FieldStatus[];
  isLoading: boolean;
  error: string | null;
  lastChecked: number | null; // Date.now() ms of last successful client fetch
  isStale: boolean;
  refresh: () => void;
}

export function useFieldStatus({ enabled }: { enabled: boolean }): UseFieldStatusResult {
  const [fields, setFields] = useState<FieldStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const lastFetchRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const hadData = fields.length > 0 || lastChecked !== null;
    if (!hadData) setIsLoading(true);

    try {
      const res = await fetch('/api/field-status', { signal: controller.signal });

      if (!res.ok) {
        throw new Error(res.status === 503 ? 'Field status unavailable' : `Error ${res.status}`);
      }

      const data: FieldStatusResponse = await res.json();
      setFields(data.fields);
      setLastChecked(Date.now());
      lastFetchRef.current = Date.now();
      setError(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Keep stale data if we had it
      if (!hadData) {
        setError((err as Error).message || 'Field status unavailable');
      } else {
        // We have cached data — just mark as stale, don't replace
        setError('outdated');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fields.length, lastChecked]);

  // Fetch on mount + poll interval (only when enabled)
  useEffect(() => {
    if (!enabled) return;

    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled, fetchStatus]);

  // Re-fetch on visibility change if stale
  useEffect(() => {
    if (!enabled) return;

    function handleVisibility() {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastFetchRef.current > STALE_THRESHOLD_MS
      ) {
        fetchStatus();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, fetchStatus]);

  const isStale = lastChecked !== null && Date.now() - lastChecked > 24 * 60 * 60_000;

  return { fields, isLoading, error, lastChecked, isStale, refresh: fetchStatus };
}
