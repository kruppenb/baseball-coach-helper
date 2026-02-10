import type { ValidationError } from '../../logic/lineup-types';
import styles from './ValidationPanel.module.css';

interface ValidationPanelProps {
  errors: ValidationError[];
  preErrors: string[];
}

export function ValidationPanel({ errors, preErrors }: ValidationPanelProps) {
  if (errors.length === 0 && preErrors.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel}>
      {preErrors.length > 0 && (
        <div className={styles.warningBox}>
          <div className={styles.heading}>Warning</div>
          <ul className={styles.list}>
            {preErrors.map((msg, i) => (
              <li key={i} className={styles.listItem}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div className={styles.errorBox}>
          <div className={styles.heading}>Lineup Issues</div>
          <ul className={styles.list}>
            {errors.map((err, i) => (
              <li key={i} className={styles.listItem}>
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
