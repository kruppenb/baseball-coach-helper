import type { Lineup, Player, Position } from '../../types/index';
import { POSITIONS } from '../../types/index';
import styles from './LineupOptions.module.css';

interface LineupOptionsProps {
  lineups: Lineup[];
  selectedIndex: number | null;
  innings: number;
  players: Player[];
  onSelect: (index: number) => void;
}

function getBenchSummary(lineup: Lineup, innings: number, players: Player[]): string {
  const lines: string[] = [];
  for (let inn = 1; inn <= innings; inn++) {
    const assignment = lineup[inn];
    if (!assignment) continue;
    const playingIds = new Set(POSITIONS.map((pos: Position) => assignment[pos]));
    const benchNames = players
      .filter(p => p.isPresent && !playingIds.has(p.id))
      .map(p => p.name);
    if (benchNames.length > 0) {
      lines.push(`Inn ${inn}: ${benchNames.join(', ')}`);
    }
  }
  return lines.join('\n');
}

export function LineupOptions({
  lineups,
  selectedIndex,
  innings,
  players,
  onSelect,
}: LineupOptionsProps) {
  if (lineups.length === 0) {
    return null;
  }

  return (
    <div className={styles.options}>
      <h3 className={styles.heading}>Generated Lineups</h3>
      <p className={styles.subtitle}>
        {lineups.length} option(s) found. Tap to select.
      </p>
      <div className={styles.cardContainer}>
        {lineups.map((lineup, index) => {
          const isSelected = selectedIndex === index;
          const cardClass = isSelected
            ? `${styles.card} ${styles.cardSelected}`
            : styles.card;
          const benchText = getBenchSummary(lineup, innings, players);
          return (
            <button
              key={index}
              type="button"
              className={cardClass}
              aria-pressed={isSelected}
              onClick={() => onSelect(index)}
            >
              <div className={styles.cardTitle}>Option {index + 1}</div>
              <div className={styles.benchSummary}>
                {benchText.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
