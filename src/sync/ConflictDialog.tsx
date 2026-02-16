import { useRef, useEffect } from 'react';
import type { ConflictInfo } from './sync-types';
import styles from './ConflictDialog.module.css';

interface ConflictDialogProps {
  conflict: ConflictInfo | null;
  onResolve: (choice: 'local' | 'cloud') => void;
}

export function ConflictDialog({ conflict, onResolve }: ConflictDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Prevent Escape from dismissing without a choice
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => e.preventDefault();
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, []);

  useEffect(() => {
    if (conflict) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [conflict]);

  if (!conflict) return null;

  const cloudTime = conflict.cloudUpdatedAt
    ? new Date(conflict.cloudUpdatedAt).toLocaleString()
    : 'Unknown';

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <h2 className={styles.title}>Sync Conflict</h2>
      <p className={styles.description}>
        Your data was changed on another device since your last sync. Choose
        which version to keep.
      </p>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3>This Device</h3>
          <p className={styles.timestamp}>Your current changes</p>
          <button
            className={styles.choiceButtonPrimary}
            onClick={() => onResolve('local')}
          >
            Keep This Device
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.column}>
          <h3>Cloud</h3>
          <p className={styles.timestamp}>Last saved: {cloudTime}</p>
          <button
            className={styles.choiceButtonSecondary}
            onClick={() => onResolve('cloud')}
          >
            Keep Cloud
          </button>
        </div>
      </div>
    </dialog>
  );
}
