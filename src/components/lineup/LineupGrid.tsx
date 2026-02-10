import type { Lineup, Player, Position } from '../../types/index';
import { POSITIONS } from '../../types/index';
import type { ValidationError } from '../../logic/lineup-types';
import styles from './LineupGrid.module.css';

interface LineupGridProps {
  lineup: Lineup;
  innings: number;
  players: Player[];
  errors: ValidationError[];
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

export function LineupGrid({ lineup, innings, players, errors }: LineupGridProps) {
  if (innings === 0 || Object.keys(lineup).length === 0) {
    return null;
  }

  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  return (
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
        <>
          <div key={`label-${pos}`} className={styles.positionLabel}>
            {pos}
          </div>
          {inningNumbers.map(inn => {
            const playerId = lineup[inn]?.[pos] ?? '';
            const isError = hasError(inn, pos, errors);
            const cellClass = isError
              ? `${styles.cell} ${styles.errorCell}`
              : styles.cell;
            return (
              <div key={`cell-${pos}-${inn}`} className={cellClass}>
                {getPlayerName(playerId, players)}
              </div>
            );
          })}
        </>
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
        const benchPlayers = players
          .filter(p => p.isPresent && !playingIds.has(p.id))
          .map(p => p.name);
        return (
          <div key={`bench-${inn}`} className={styles.benchCell}>
            {benchPlayers.join(', ')}
          </div>
        );
      })}
    </div>
  );
}
