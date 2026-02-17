import { useState } from 'react';
import { useGameHistory } from '../../hooks/useGameHistory';
import type { GameHistoryEntry } from '../../types/index';
import styles from './HistoryPage.module.css';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function GameCardDetail({ game }: { game: GameHistoryEntry }) {
  const sortedPlayers = [...game.playerSummaries].sort(
    (a, b) => a.battingPosition - b.battingPosition,
  );

  return (
    <div className={styles.detail}>
      <div className={styles.detailSection}>
        <div className={styles.detailHeading}>Batting Order</div>
        <ol className={styles.battingList}>
          {sortedPlayers.map((ps) => (
            <li key={ps.playerId}>
              <span className={styles.battingNumber}>{ps.battingPosition + 1}.</span>
              {ps.playerName}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.detailSection}>
        <div className={styles.detailHeading}>Fielding</div>
        <table className={styles.fieldingTable}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Positions</th>
              <th>Bench</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((ps) => (
              <tr key={ps.playerId}>
                <td>{ps.playerName}</td>
                <td>{ps.fieldingPositions.join(', ')}</td>
                <td>{ps.benchInnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { history } = useGameHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reversedHistory = [...history].reverse();

  const playerCount = (game: GameHistoryEntry) =>
    game.playerCount ?? game.playerSummaries.length;

  const handleCardClick = (gameId: string) => {
    setExpandedId((prev) => (prev === gameId ? null : gameId));
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Game History</h2>

      {reversedHistory.length === 0 ? (
        <p className={styles.emptyState}>
          No games recorded yet. Print a dugout card to save your first game.
        </p>
      ) : (
        <div className={styles.gameList}>
          {reversedHistory.map((game) => {
            const isExpanded = expandedId === game.id;
            return (
              <div key={game.id} className={styles.swipeWrapper}>
                <div
                  className={styles.gameCard}
                  onClick={() => handleCardClick(game.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(game.id);
                    }
                  }}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <div className={styles.date}>{formatDate(game.gameDate)}</div>
                      {game.gameLabel && (
                        <div className={styles.label}>{game.gameLabel}</div>
                      )}
                      <div className={styles.summary}>
                        {playerCount(game)} players, {game.innings} innings
                      </div>
                    </div>
                    <span
                      className={`${styles.chevron}${isExpanded ? ` ${styles.chevronExpanded}` : ''}`}
                      aria-hidden="true"
                    >
                      &#x203A;
                    </span>
                  </div>
                  {isExpanded && <GameCardDetail game={game} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
