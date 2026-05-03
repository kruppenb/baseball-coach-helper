import type { Division } from '../../types';
import styles from './DivisionToggle.module.css';

const DIVISIONS: Division[] = ['AA', 'AAA', 'Coast'];

interface DivisionToggleProps {
  division: Division;
  onChange: (value: Division) => void;
  /** Compact variant for inline use in toolbars (smaller font, ~30px tall). */
  compact?: boolean;
}

export function DivisionToggle({ division, onChange, compact = false }: DivisionToggleProps) {
  return (
    <div
      className={`${styles.toggle} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label="Division"
    >
      {DIVISIONS.map((value) => {
        const active = value === division;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.segment} ${active ? styles.active : ''}`}
            onClick={() => {
              if (!active) onChange(value);
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
