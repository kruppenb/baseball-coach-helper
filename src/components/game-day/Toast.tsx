import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  visible: boolean;
  onDone: () => void;
}

export function Toast({ message, visible, onDone }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDone]);

  return (
    <div
      className={`${styles.toast} ${visible ? styles.visible : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
