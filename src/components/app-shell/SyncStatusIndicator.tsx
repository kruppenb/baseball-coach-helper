import { useSyncContext } from '../../sync/SyncContext';
import { useAuth } from '../../auth/useAuth';
import styles from './SyncStatusIndicator.module.css';

const statusLabels: Record<string, string> = {
  synced: 'Synced',
  syncing: 'Syncing...',
  offline: 'Offline',
  error: 'Sync error',
};

export function SyncStatusIndicator() {
  const { status } = useSyncContext();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <span className={styles.indicator} data-status={status}>
      <span className={styles.dot} />
      <span className={styles.label}>{statusLabels[status]}</span>
    </span>
  );
}
