import { useRef, useEffect } from 'react';
import styles from './NewGameDialog.module.css';

interface NewGameDialogProps {
  open: boolean;
  hasLineup: boolean;
  onDontSave: () => void;
  onSaveAndNew: () => void;
  onCancel: () => void;
}

export function NewGameDialog({
  open,
  hasLineup,
  onDontSave,
  onSaveAndNew,
  onCancel,
}: NewGameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Prevent Escape from dismissing without explicit Cancel
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <h2 className={styles.title}>Start New Game?</h2>
      <p className={styles.description}>
        Current game data will be cleared.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.dontSaveBtn}
          onClick={onDontSave}
        >
          Don&apos;t Save
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          disabled={!hasLineup}
          onClick={onSaveAndNew}
        >
          Save &amp; New
        </button>
      </div>
      {!hasLineup && (
        <p className={styles.helperText}>Generate a lineup first to save</p>
      )}
    </dialog>
  );
}
