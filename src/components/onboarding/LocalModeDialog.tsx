import { useRef, useEffect } from 'react';
import styles from './LocalModeDialog.module.css';

interface LocalModeDialogProps {
  open: boolean;
  onDismiss: () => void;
}

export function LocalModeDialog({ open, onDismiss }: LocalModeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Escape key dismisses this informational dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onDismiss();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onDismiss]);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <h2 className={styles.title}>Local Mode</h2>
      <div className={styles.body}>
        <p>Your data stays on this browser and device only.</p>
        <p>
          You can import and export your roster as CSV in Settings.
        </p>
        <p>
          To sign in later, use the <strong>Sign in with Microsoft</strong> link
          in the header.
        </p>
      </div>
      <button
        type="button"
        className={styles.gotItBtn}
        onClick={onDismiss}
      >
        Got it
      </button>
    </dialog>
  );
}
