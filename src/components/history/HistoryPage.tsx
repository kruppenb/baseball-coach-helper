import { useState, useRef, useCallback, useEffect } from 'react';
import { useGameHistory } from '../../hooks/useGameHistory';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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

// --- Swipe-to-delete hook (mobile only) ---
interface SwipeState {
  startX: number;
  currentX: number;
  swiping: boolean;
}

function useSwipeToDelete(
  enabled: boolean,
  onDelete: () => void,
) {
  const swipeRef = useRef<SwipeState>({ startX: 0, currentX: 0, swiping: false });
  const [offset, setOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      swipeRef.current = { startX: e.clientX, currentX: e.clientX, swiping: true };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [enabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !swipeRef.current.swiping) return;
      const deltaX = e.clientX - swipeRef.current.startX;
      // Only allow swiping left (negative delta)
      if (deltaX < 0) {
        swipeRef.current.currentX = e.clientX;
        setOffset(deltaX);
      }
    },
    [enabled],
  );

  const handlePointerUp = useCallback(() => {
    if (!swipeRef.current.swiping) return;
    swipeRef.current.swiping = false;
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
    if (deltaX < -THRESHOLD) {
      // Swipe past threshold: animate off and delete
      setOffset(-300);
      setTimeout(() => {
        onDelete();
        setOffset(0);
      }, 200);
    } else {
      // Snap back
      setOffset(0);
    }
  }, [onDelete]);

  const handlePointerCancel = useCallback(() => {
    swipeRef.current.swiping = false;
    setOffset(0);
  }, []);

  return {
    cardRef,
    offset,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}

// --- Pending undo state ---
interface PendingUndo {
  entry: GameHistoryEntry;
  index: number;
  timerId: ReturnType<typeof setTimeout>;
}

export function HistoryPage() {
  const { history, deleteGame, undoDelete } = useGameHistory();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  const reversedHistory = [...history].reverse();

  const playerCount = (game: GameHistoryEntry) =>
    game.playerCount ?? game.playerSummaries.length;

  const handleCardClick = (gameId: string) => {
    setExpandedId((prev) => (prev === gameId ? null : gameId));
  };

  // --- Delete + Undo flow ---
  const handleDelete = useCallback(
    (entryId: string) => {
      // If there's a pending undo, commit it (make previous delete permanent)
      if (pendingUndo) {
        clearTimeout(pendingUndo.timerId);
        setPendingUndo(null);
      }

      const result = deleteGame(entryId);
      if (!result) return;

      // Collapse expanded card if it was the deleted one
      setExpandedId((prev) => (prev === entryId ? null : prev));

      const timerId = setTimeout(() => {
        setPendingUndo(null);
      }, 5000);

      setPendingUndo({ entry: result.entry, index: result.index, timerId });
    },
    [deleteGame, pendingUndo],
  );

  const handleUndo = useCallback(() => {
    if (!pendingUndo) return;
    clearTimeout(pendingUndo.timerId);
    undoDelete(pendingUndo.entry, pendingUndo.index);
    setPendingUndo(null);
  }, [pendingUndo, undoDelete]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pendingUndo) {
        clearTimeout(pendingUndo.timerId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = pendingUndo !== null;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Game History</h2>

      {reversedHistory.length === 0 && !showToast ? (
        <p className={styles.emptyState}>
          No games recorded yet. Print a dugout card to save your first game.
        </p>
      ) : (
        <div className={styles.gameList}>
          {reversedHistory.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isExpanded={expandedId === game.id}
              isDesktop={isDesktop}
              onToggle={() => handleCardClick(game.id)}
              onDelete={() => handleDelete(game.id)}
              playerCount={playerCount(game)}
            />
          ))}
        </div>
      )}

      {/* Undo toast */}
      <div
        className={`${styles.undoToast}${showToast ? ` ${styles.undoToastVisible}` : ''}`}
        role="status"
        aria-live="polite"
      >
        Game deleted
        <button className={styles.undoBtn} onClick={handleUndo} type="button">
          Undo
        </button>
      </div>
    </div>
  );
}

// --- Individual game card with swipe support ---
interface GameCardProps {
  game: GameHistoryEntry;
  isExpanded: boolean;
  isDesktop: boolean;
  onToggle: () => void;
  onDelete: () => void;
  playerCount: number;
}

function GameCard({ game, isExpanded, isDesktop, onToggle, onDelete, playerCount }: GameCardProps) {
  const swipe = useSwipeToDelete(!isDesktop, onDelete);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const cardStyle: React.CSSProperties =
    !isDesktop && swipe.offset !== 0
      ? { transform: `translateX(${swipe.offset}px)`, transition: swipe.offset === -300 ? 'transform 0.2s ease' : 'none' }
      : {};

  return (
    <div className={styles.swipeWrapper}>
      {/* Red delete background revealed when swiping */}
      {!isDesktop && swipe.offset < 0 && (
        <div className={styles.deleteBackground} aria-hidden="true">
          Delete
        </div>
      )}
      <div
        ref={swipe.cardRef}
        className={styles.gameCard}
        style={cardStyle}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        {...(!isDesktop ? swipe.handlers : {})}
      >
        <div className={styles.cardHeader}>
          <div className={styles.cardInfo}>
            <div className={styles.date}>{formatDate(game.gameDate)}</div>
            {game.gameLabel && (
              <div className={styles.label}>{game.gameLabel}</div>
            )}
            <div className={styles.summary}>
              {playerCount} players, {game.innings} innings
            </div>
          </div>
          {isDesktop && (
            <button
              className={styles.deleteBtn}
              onClick={handleDeleteClick}
              type="button"
              aria-label={`Delete game from ${formatDate(game.gameDate)}`}
            >
              Delete
            </button>
          )}
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
}
