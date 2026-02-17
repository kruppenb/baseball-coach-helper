import { useRef, useEffect, useState } from 'react';
import styles from './GameLabelDialog.module.css';

interface GameLabelDialogProps {
  open: boolean;
  onConfirm: (label: string) => void;
  onCancel: () => void;
}

function getDefaultLabel(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  return `${month} ${day} Game`;
}

export function GameLabelDialog({ open, onConfirm, onCancel }: GameLabelDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(getDefaultLabel);

  useEffect(() => {
    if (open) {
      setLabel(getDefaultLabel());
      dialogRef.current?.showModal();
      // Auto-focus and select all text after dialog opens
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Map Escape to cancel
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(label.trim() || getDefaultLabel());
  };

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <form onSubmit={handleSubmit}>
        <h2 className={styles.title}>Save &amp; Print</h2>
        <label className={styles.label} htmlFor="game-label-input">
          Game label
        </label>
        <input
          ref={inputRef}
          id="game-label-input"
          type="text"
          className={styles.input}
          value={label}
          onChange={e => setLabel(e.target.value)}
          maxLength={50}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className={styles.printBtn}>
            Print
          </button>
        </div>
      </form>
    </dialog>
  );
}
