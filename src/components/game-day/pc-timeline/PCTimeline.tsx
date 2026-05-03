import { useState, useCallback } from 'react';
import type { Player } from '../../../types';
import { PCChip } from './PCChip';
import { PCChipPopover } from './PCChipPopover';
import styles from './PCTimeline.module.css';

interface PCTimelineProps {
  innings: number;
  presentPlayers: Player[];
  pitcherAssignments: Record<number, string>;
  catcherAssignments: Record<number, string>;
  colorByPlayer: Record<string, number>;
  catcherInningsByPlayer: Record<string, number>;
  pitcherInningsByPlayer: Record<string, number>;
  pitcherOptionsFor: (inning: number) => Player[];
  catcherOptionsFor: (inning: number) => Player[];
  onPitcherChange: (inning: number, playerId: string) => void;
  onCatcherChange: (inning: number, playerId: string) => void;
  onAutofill: () => void;
  onClearAll: () => void;
  /** Compact mode: tighter chips, smaller font (used in desktop card). */
  compact?: boolean;
}

type PopoverState =
  | { open: false }
  | { open: true; role: 'P' | 'C'; inning: number };

export function PCTimeline({
  innings,
  presentPlayers,
  pitcherAssignments,
  catcherAssignments,
  colorByPlayer,
  catcherInningsByPlayer,
  pitcherInningsByPlayer,
  pitcherOptionsFor,
  catcherOptionsFor,
  onPitcherChange,
  onCatcherChange,
  onAutofill,
  onClearAll,
  compact = false,
}: PCTimelineProps) {
  const [popover, setPopover] = useState<PopoverState>({ open: false });
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  const playersById = new Map(presentPlayers.map((p) => [p.id, p]));

  const openChip = useCallback(
    (role: 'P' | 'C', inning: number) => setPopover({ open: true, role, inning }),
    [],
  );
  const closePopover = useCallback(() => setPopover({ open: false }), []);

  const handlePick = useCallback(
    (playerId: string) => {
      if (!popover.open) return;
      if (popover.role === 'P') onPitcherChange(popover.inning, playerId);
      else onCatcherChange(popover.inning, playerId);
      closePopover();
    },
    [popover, onPitcherChange, onCatcherChange, closePopover],
  );

  const popoverOptions =
    popover.open
      ? popover.role === 'P'
        ? pitcherOptionsFor(popover.inning)
        : catcherOptionsFor(popover.inning)
      : [];

  const popoverCurrent =
    popover.open
      ? popover.role === 'P'
        ? pitcherAssignments[popover.inning] ?? ''
        : catcherAssignments[popover.inning] ?? ''
      : '';

  const hasAnyAssignment =
    Object.keys(pitcherAssignments).length > 0 ||
    Object.keys(catcherAssignments).length > 0;

  return (
    <div className={`${styles.timeline} ${compact ? styles.compact : ''}`}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.autofillBtn}
          onClick={onAutofill}
        >
          Auto-fill
        </button>
        {hasAnyAssignment && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={onClearAll}
          >
            Clear all
          </button>
        )}
      </div>

      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `auto repeat(${innings}, minmax(0, 1fr))` }}
      >
        <span className={styles.cornerCell} />
        {inningNumbers.map((inn) => (
          <span key={`hdr-${inn}`} className={styles.inningHeader}>
            {inn}
          </span>
        ))}

        <span className={styles.rowLabel}>P</span>
        {inningNumbers.map((inn) => {
          const id = pitcherAssignments[inn] ?? '';
          const player = id ? playersById.get(id) : undefined;
          return (
            <PCChip
              key={`p-${inn}`}
              role="P"
              inning={inn}
              player={player}
              colorIndex={id ? colorByPlayer[id] : undefined}
              totalForPlayer={id ? pitcherInningsByPlayer[id] : undefined}
              onClick={() => openChip('P', inn)}
            />
          );
        })}

        <span className={styles.rowLabel}>C</span>
        {inningNumbers.map((inn) => {
          const id = catcherAssignments[inn] ?? '';
          const player = id ? playersById.get(id) : undefined;
          return (
            <PCChip
              key={`c-${inn}`}
              role="C"
              inning={inn}
              player={player}
              colorIndex={id ? colorByPlayer[id] : undefined}
              totalForPlayer={id ? catcherInningsByPlayer[id] : undefined}
              onClick={() => openChip('C', inn)}
            />
          );
        })}
      </div>

      {popover.open && (
        <PCChipPopover
          role={popover.role}
          inning={popover.inning}
          options={popoverOptions}
          currentPlayerId={popoverCurrent}
          catcherInningsByPlayer={catcherInningsByPlayer}
          pitcherInningsByPlayer={pitcherInningsByPlayer}
          onPick={handlePick}
          onClear={() => handlePick('')}
          onClose={closePopover}
        />
      )}
    </div>
  );
}
