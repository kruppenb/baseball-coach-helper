import { useGameHistory } from '../../hooks/useGameHistory';
import type { GameHistoryEntry } from '../../types/index';
import styles from './HistoryPage.module.css';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

function GameEntry({ game }: { game: GameHistoryEntry }) {
  const sortedPlayers = [...game.playerSummaries].sort(
    (a, b) => a.battingPosition - b.battingPosition,
  );

  return (
    <div className={styles.gameCard}>
      <div className={styles.gameHeader}>
        {formatDate(game.gameDate)} &mdash; {game.innings} innings, {game.playerSummaries.length} players
      </div>
      <details>
        <summary className={styles.detailsSummary}>Player details</summary>
        <table className={styles.playerTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Fielding</th>
              <th>Bench</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((ps) => (
              <tr key={ps.playerId}>
                <td>{ps.battingPosition + 1}</td>
                <td>{ps.playerName}</td>
                <td>{ps.fieldingPositions.join(', ')}</td>
                <td>{ps.benchInnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function HistoryPage() {
  const { history } = useGameHistory();

  const reversedHistory = [...history].reverse();

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Game History</h2>

      {reversedHistory.length === 0 ? (
        <p className={styles.emptyState}>
          No games recorded yet. Finalize a game on the Lineup tab to see it here.
        </p>
      ) : (
        <div className={styles.gameList}>
          {reversedHistory.map((game) => (
            <GameEntry key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
