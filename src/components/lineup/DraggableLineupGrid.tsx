import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { Feedback } from '@dnd-kit/dom';
import { DraggableCell } from './DraggableCell';
import { BenchPlayerChip } from './BenchPlayerChip';
import type { Lineup, Player, Position } from '../../types/index';
import { POSITIONS } from '../../types/index';
import type { ValidationError } from '../../logic/lineup-types';
import styles from './DraggableLineupGrid.module.css';

const plugins = [Feedback.configure({ dropAnimation: null })];

interface DraggableLineupGridProps {
  lineup: Lineup;
  innings: number;
  players: Player[];
  errors: ValidationError[];
  onSwap: (inning: number, posA: Position, posB: Position) => void;
  onBenchSwap: (inning: number, position: Position, benchPlayerId: string) => void;
}

function getPlayerName(playerId: string, players: Player[]): string {
  const player = players.find(p => p.id === playerId);
  return player?.name ?? '';
}

function hasError(
  inning: number,
  position: Position,
  errors: ValidationError[],
): boolean {
  return errors.some(
    e => e.inning === inning && e.position === position,
  );
}

export function DraggableLineupGrid({
  lineup,
  innings,
  players,
  errors,
  onSwap,
  onBenchSwap,
}: DraggableLineupGridProps) {
  if (innings === 0 || Object.keys(lineup).length === 0) {
    return null;
  }

  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  function handleDragEnd(event: Parameters<NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragEnd']>>[0]) {
    if (event.canceled) return;

    const { source, target } = event.operation;
    if (!source || !target) return;

    const sourceBench = !!source.data?.isBench;
    const targetBench = !!target.data?.isBench;
    const inning = source.data?.inning as number;

    if (!sourceBench && !targetBench) {
      // Field → Field swap
      const sourcePosition = source.data?.position as Position | undefined;
      const targetPosition = target.data?.position as Position | undefined;
      if (sourcePosition && targetPosition && sourcePosition !== targetPosition) {
        onSwap(inning, sourcePosition, targetPosition);
      }
    } else if (sourceBench && !targetBench) {
      // Bench → Field: place bench player at the field position
      const targetPosition = target.data?.position as Position | undefined;
      const benchPlayerId = source.data?.playerId as string;
      if (targetPosition && benchPlayerId) {
        onBenchSwap(inning, targetPosition, benchPlayerId);
      }
    } else if (!sourceBench && targetBench) {
      // Field → Bench: swap the field player with the bench player
      const sourcePosition = source.data?.position as Position | undefined;
      const benchPlayerId = target.data?.playerId as string;
      if (sourcePosition && benchPlayerId) {
        onBenchSwap(inning, sourcePosition, benchPlayerId);
      }
    }
  }

  return (
    <DragDropProvider plugins={plugins} onDragEnd={handleDragEnd}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `auto repeat(${innings}, 1fr)` }}
      >
        {/* Header row */}
        <div className={styles.cornerCell} />
        {inningNumbers.map(inn => (
          <div key={`header-${inn}`} className={styles.headerCell}>
            Inn {inn}
          </div>
        ))}

        {/* Position rows */}
        {POSITIONS.map(pos => (
          <div key={`row-${pos}`} className={styles.positionRow}>
            <div className={styles.positionLabel}>
              {pos}
            </div>
            {inningNumbers.map(inn => {
              const playerId = lineup[inn]?.[pos] ?? '';
              const isError = hasError(inn, pos, errors);
              return (
                <DraggableCell
                  key={`cell-${pos}-${inn}`}
                  inning={inn}
                  position={pos}
                  playerId={playerId}
                  playerName={getPlayerName(playerId, players)}
                  hasError={isError}
                />
              );
            })}
          </div>
        ))}

        {/* Bench row */}
        <div className={`${styles.positionLabel} ${styles.benchLabel}`}>
          Bench
        </div>
        {inningNumbers.map(inn => {
          const assignment = lineup[inn];
          const playingIds = assignment
            ? new Set(POSITIONS.map(pos => assignment[pos]))
            : new Set<string>();
          const benchPlayers = players.filter(
            p => p.isPresent && !playingIds.has(p.id),
          );
          return (
            <div key={`bench-${inn}`} className={styles.benchCell}>
              <div className={styles.benchChipWrapper}>
                {benchPlayers.map(p => (
                  <BenchPlayerChip
                    key={`bench-chip-${inn}-${p.id}`}
                    inning={inn}
                    playerId={p.id}
                    playerName={p.name}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {(source) => source ? (
          <div className={styles.dragOverlay}>
            {source.data?.playerName ?? ''}
          </div>
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
