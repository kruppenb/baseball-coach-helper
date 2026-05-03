import { useEffect, useRef } from 'react';
import type { Player } from '../../../types';
import styles from './PCTimeline.module.css';

interface PCChipPopoverProps {
  role: 'P' | 'C';
  inning: number;
  options: Player[];
  currentPlayerId: string;
  catcherInningsByPlayer: Record<string, number>;
  pitcherInningsByPlayer: Record<string, number>;
  onPick: (playerId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Centered modal sheet listing eligible players for a single inning's P or C
 * slot. Tapping outside or pressing Esc closes without changes.
 */
export function PCChipPopover({
  role,
  inning,
  options,
  currentPlayerId,
  catcherInningsByPlayer,
  pitcherInningsByPlayer,
  onPick,
  onClear,
  onClose,
}: PCChipPopoverProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = role === 'P' ? `Pitcher · Inning ${inning}` : `Catcher · Inning ${inning}`;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.popover}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className={styles.popoverHeader}>
          <span className={styles.popoverTitle}>{title}</span>
          <button
            type="button"
            className={styles.popoverClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <ul className={styles.optionList}>
          <li>
            <button
              type="button"
              className={`${styles.optionRow} ${styles.optionClear}`}
              onClick={onClear}
            >
              <span>{role === 'P' ? '— No pitcher —' : '— No catcher —'}</span>
              {currentPlayerId === '' && <span className={styles.checkmark}>✓</span>}
            </button>
          </li>
          {options.map((p) => {
            const cInn = catcherInningsByPlayer[p.id] ?? 0;
            const pInn = pitcherInningsByPlayer[p.id] ?? 0;
            const tags: string[] = [];
            if (role === 'P' && pInn > 0 && p.id !== currentPlayerId) tags.push(`already P×${pInn}`);
            if (role === 'P' && pInn > 0 && p.id === currentPlayerId && pInn > 1) tags.push(`P×${pInn}`);
            if (role === 'C' && cInn > 0 && p.id !== currentPlayerId) tags.push(`already C×${cInn}`);
            if (role === 'C' && cInn > 0 && p.id === currentPlayerId && cInn > 1) tags.push(`C×${cInn}`);
            if (cInn >= 3 && role === 'C') tags.push(cInn >= 4 ? '⚠ no pitching' : '⚠ near 4');
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.optionRow}
                  onClick={() => onPick(p.id)}
                >
                  <span className={styles.optionName}>{p.name}</span>
                  {tags.length > 0 && (
                    <span className={styles.optionMeta}>{tags.join(' · ')}</span>
                  )}
                  {currentPlayerId === p.id && <span className={styles.checkmark}>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
