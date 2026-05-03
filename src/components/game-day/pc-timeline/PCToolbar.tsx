import type { Division } from '../../../types';
import { DivisionToggle } from '../../game-setup/DivisionToggle';
import styles from './PCToolbar.module.css';

interface PCToolbarProps {
  division: Division;
  onDivisionChange: (value: Division) => void;
  /** Optional — hidden when not provided (e.g. AA division has no autofill). */
  onAutofill?: () => void;
  /** Optional — hidden when no assignments to clear. */
  onClearAll?: () => void;
}

export function PCToolbar({
  division,
  onDivisionChange,
  onAutofill,
  onClearAll,
}: PCToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <DivisionToggle division={division} onChange={onDivisionChange} compact />
      {onAutofill && (
        <button
          type="button"
          className={styles.autofillBtn}
          onClick={onAutofill}
        >
          Auto-fill
        </button>
      )}
      {onClearAll && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
