import type { Lineup, Player, Position } from '../../types/index';
import { POSITIONS } from '../../types/index';
import styles from './DugoutCard.module.css';

interface DugoutCardProps {
  lineup: Lineup;
  innings: number;
  players: Player[];
  battingOrder: string[] | null;
  gameLabel?: string;
}

function getPlayerName(playerId: string, players: Player[]): string {
  const player = players.find(p => p.id === playerId);
  return player?.name ?? '';
}

export function DugoutCard({ lineup, innings, players, battingOrder, gameLabel }: DugoutCardProps) {
  const inningNumbers = Array.from({ length: innings }, (_, i) => i + 1);

  return (
    <div className={styles.card} data-dugout-card>
      {gameLabel && <span className={styles.gameLabel}>{gameLabel}</span>}
      <span className={styles.date}>{new Date().toLocaleDateString()}</span>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.cornerCell}></th>
            {inningNumbers.map(inn => (
              <th key={`header-${inn}`}>Inn {inn}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POSITIONS.map((pos: Position) => (
            <tr key={`row-${pos}`}>
              <td className={styles.positionLabel}>{pos}</td>
              {inningNumbers.map(inn => {
                const playerId = lineup[inn]?.[pos] ?? '';
                return (
                  <td key={`cell-${pos}-${inn}`}>
                    {getPlayerName(playerId, players)}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className={styles.benchRow}>
            <td className={styles.positionLabel}>Bench</td>
            {inningNumbers.map(inn => {
              const assignment = lineup[inn];
              const playingIds = assignment
                ? new Set(POSITIONS.map(pos => assignment[pos]))
                : new Set<string>();
              const benchPlayers = players
                .filter(p => p.isPresent && !playingIds.has(p.id))
                .map(p => p.name);
              return (
                <td key={`bench-${inn}`}>
                  {benchPlayers.join(', ')}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <div className={styles.battingSection}>
        <h4 className={styles.battingTitle}>Batting Order</h4>
        {battingOrder && battingOrder.length > 0 ? (
          <ol className={styles.battingList}>
            {battingOrder.map((playerId, index) => (
              <li key={`bat-${index}`}>
                {getPlayerName(playerId, players)}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.noBattingOrder}>Not generated yet</p>
        )}
      </div>

    </div>
  );
}
