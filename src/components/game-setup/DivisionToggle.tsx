import { useRef } from 'react';
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
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const moveTo = (index: number) => {
    const next = DIVISIONS[(index + DIVISIONS.length) % DIVISIONS.length];
    onChange(next);
    buttonsRef.current[(index + DIVISIONS.length) % DIVISIONS.length]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = DIVISIONS.indexOf(division);
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo(currentIndex - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo(currentIndex + 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(DIVISIONS.length - 1);
        break;
    }
  };

  return (
    <div
      className={`${styles.toggle} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label="Division"
      onKeyDown={handleKeyDown}
    >
      {DIVISIONS.map((value, index) => {
        const active = value === division;
        return (
          <button
            key={value}
            ref={(el) => { buttonsRef.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
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
