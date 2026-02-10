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

function getCompactBenchSummary(lineup: Lineup, innings: number, players: Player[]): string {
  const presentPlayers = players.filter(p => p.isPresent);
  const benchMap = new Map<string, number[]>();

  for (let inn = 1; inn <= innings; inn++) {
    const assignment = lineup[inn];
    if (!assignment) continue;
    const playingIds = new Set(POSITIONS.map((pos: Position) => assignment[pos]));
    for (const player of presentPlayers) {
      if (!playingIds.has(player.id)) {
        const existing = benchMap.get(player.name) ?? [];
        existing.push(inn);
        benchMap.set(player.name, existing);
      }
    }
  }

  if (benchMap.size === 0) {
    return 'No bench';
  }

  // Sort by first bench inning number (ascending)
  const entries = Array.from(benchMap.entries()).sort((a, b) => a[1][0] - b[1][0]);
  return entries.map(([name, innings]) => `${name} (${innings.join(', ')})`).join(', ');
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
          const benchText = getCompactBenchSummary(lineup, innings, players);
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
                Bench: {benchText}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
