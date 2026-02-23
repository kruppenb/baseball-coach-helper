import { useRef, useEffect } from 'react';
import styles from './WelcomeDialog.module.css';

interface WelcomeDialogProps {
  open: boolean;
  onSignIn: () => void;
  onContinueLocal: () => void;
}

export function WelcomeDialog({
  open,
  onSignIn,
  onContinueLocal,
}: WelcomeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Prevent Escape from dismissing — user must make an explicit choice
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, []);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <h2 className={styles.title}>Welcome to Lineup Builder</h2>
      <p className={styles.subtitle}>
        Manage your team&apos;s batting order and field positions
      </p>

      <div className={styles.options}>
        <div className={styles.option}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onSignIn}
          >
            Sign in with Microsoft
          </button>
          <p className={styles.optionDesc}>
            Save your roster to the cloud and access it from any device
          </p>
        </div>

        <div className={styles.divider}>or</div>

        <div className={styles.option}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onContinueLocal}
          >
            Continue without signing in
          </button>
          <p className={styles.optionDesc}>
            Your data stays on this browser only
          </p>
        </div>
      </div>
    </dialog>
  );
}
