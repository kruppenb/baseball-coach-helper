import { useState, useCallback, useMemo } from 'react';
import { useFieldStatus } from '../../hooks/useFieldStatus';
import type { FieldStatus } from '../../hooks/useFieldStatus';
import styles from './FieldStatusBanner.module.css';

function timeAgo(unixSeconds: number): string {
  const minutes = Math.round((Date.now() / 1000 - unixSeconds) / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function checkedAgo(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function dotStatus(status: string): string {
  if (status === 'Open') return 'Open';
  if (status === 'Closed') return 'Closed';
  return 'other';
}

function summarize(fields: FieldStatus[]): string {
  const statuses = new Set(fields.map((f) => f.status));
  if (statuses.size === 1) {
    const s = [...statuses][0];
    return `All fields ${s.toLowerCase()}`;
  }
  const open = fields.filter((f) => f.status === 'Open').length;
  const closed = fields.filter((f) => f.status === 'Closed').length;
  const parts: string[] = [];
  if (open) parts.push(`${open} open`);
  if (closed) parts.push(`${closed} closed`);
  const other = fields.length - open - closed;
  if (other) parts.push(`${other} notice`);
  return parts.join(', ');
}

interface FieldStatusBannerProps {
  enabled: boolean;
}

export function FieldStatusBanner({ enabled }: FieldStatusBannerProps) {
  const { fields, isLoading, error, lastChecked, isStale, refresh } = useFieldStatus({ enabled });

  // Expand/collapse: default to collapsed when all statuses match, expanded when mixed
  const allSame = useMemo(
    () => fields.length > 0 && new Set(fields.map((f) => f.status)).size === 1,
    [fields],
  );

  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const expanded = userToggled !== null ? userToggled : !allSame;

  const handleToggle = useCallback(() => {
    setUserToggled((prev) => (prev !== null ? !prev : !(!allSame)));
  }, [allSame]);

  // Most recent parks update across all fields
  const latestParksUpdate = useMemo(
    () => (fields.length > 0 ? Math.max(...fields.map((f) => f.updatedAt)) : null),
    [fields],
  );

  // Nothing to show yet on first load
  if (isLoading && fields.length === 0) return null;

  // Error with no cached data
  if (error && error !== 'outdated' && fields.length === 0) {
    return (
      <div className={styles.banner}>
        <div className={styles.errorRow} role="status">
          <span>Field status unavailable</span>
          <button type="button" className={styles.retryLink} onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data at all (shouldn't happen, but guard)
  if (fields.length === 0) return null;

  const checkedStr = lastChecked ? checkedAgo(lastChecked) : '';
  const outdated = error === 'outdated';

  return (
    <div className={styles.banner} aria-live="polite">
      {/* Summary row: toggle button + timestamp + refresh */}
      <div className={styles.summaryRow}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={`Field status: ${summarize(fields)}. Tap to ${expanded ? 'collapse' : 'expand'}`}
        >
          {/* Mobile: colored dots + summary text */}
          <span className={styles.dots}>
            {fields.map((f) => (
              <span
                key={f.id}
                className={styles.dot}
                data-status={dotStatus(f.status)}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className={styles.summaryText}>
            {summarize(fields)}
          </span>

          {/* Desktop: inline field items */}
          <span className={styles.inlineFields}>
            {fields.map((f) => (
              <span key={f.id} className={styles.inlineField}>
                <span
                  className={styles.dot}
                  data-status={dotStatus(f.status)}
                  aria-hidden="true"
                />
                <span className={styles.fieldName}>{f.name}:</span>
                <span className={styles.fieldStatus}>{f.status}</span>
              </span>
            ))}
          </span>

          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} aria-hidden="true">
            &#9662;
          </span>
        </button>

        {checkedStr && (
          <span className={`${styles.timestamp} ${isStale ? styles.timestampStale : ''}`}>
            {outdated ? `Checked ${checkedStr} (outdated)` : `Checked ${checkedStr}`}
            {isStale && ' — may be outdated'}
          </span>
        )}
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={refresh}
          aria-label="Refresh field status"
          title="Refresh field status"
        >
          <span className={isLoading ? styles.refreshSpin : ''} aria-hidden="true">&#8635;</span>
        </button>
      </div>

      {/* Expanded detail — mobile only */}
      {expanded && (
        <div className={styles.detail}>
          {fields.map((f) => (
            <div key={f.id} className={styles.fieldRow}>
              <span
                className={styles.dot}
                data-status={dotStatus(f.status)}
                aria-hidden="true"
              />
              <span className={styles.fieldName}>{f.name}</span>
              <span>&mdash;</span>
              <span className={styles.fieldStatus}>{f.status}</span>
              {f.detail && (
                <span className={styles.fieldDetail} title={f.detail}>
                  {f.detail}
                </span>
              )}
            </div>
          ))}
          {latestParksUpdate && (
            <div className={styles.parksTimestamp}>
              Parks updated {timeAgo(latestParksUpdate)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
