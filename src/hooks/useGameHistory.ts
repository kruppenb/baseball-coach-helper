import { useCallback, useRef } from 'react';
import { useCloudStorage } from '../sync/useCloudStorage';
import { useAuth } from '../auth/useAuth';
import { createGameHistoryEntry } from '../logic/game-history';
import type { CreateGameHistoryOptions } from '../logic/game-history';
import type { GameHistoryEntry, Lineup, Player } from '../types/index';

export function useGameHistory() {
  const [history, setHistory] = useCloudStorage<GameHistoryEntry[]>(
    'gameHistory',
    [],
    { endpoint: '/api/game-history', mode: 'collection' },
  );
  const { user } = useAuth();

  /** Tracks the active game session for duplicate detection */
  const currentGameId = useRef<string | null>(null);

  /**
   * Save a game to history with duplicate detection.
   * - If currentGameId is set, updates the existing entry (re-print after changes).
   * - If currentGameId is null, creates a new entry and sets currentGameId.
   */
  const saveGame = useCallback(
    (
      lineup: Lineup,
      battingOrder: string[],
      innings: number,
      players: Player[],
      options?: CreateGameHistoryOptions,
    ): GameHistoryEntry => {
      if (currentGameId.current) {
        // Update existing entry (overwrite for re-print)
        const updatedEntry = createGameHistoryEntry(lineup, battingOrder, innings, players, options);
        const existingId = currentGameId.current;
        // Preserve the original id so we overwrite the same slot
        updatedEntry.id = existingId;
        setHistory((prev: GameHistoryEntry[]) =>
          prev.map(e => (e.id === existingId ? updatedEntry : e)),
        );
        return updatedEntry;
      } else {
        // Create new entry
        const entry = createGameHistoryEntry(lineup, battingOrder, innings, players, options);
        currentGameId.current = entry.id;
        setHistory((prev: GameHistoryEntry[]) => [...prev, entry]);
        return entry;
      }
    },
    [setHistory],
  );

  /** Reset the current game session (called when starting a new game). */
  const resetCurrentGame = useCallback(() => {
    currentGameId.current = null;
  }, []);

  /**
   * Delete a game from history.
   * Removes from local state immediately, fires cloud DELETE as fire-and-forget.
   * Returns the removed entry and its original index for undo support.
   */
  const deleteGame = useCallback(
    (entryId: string): { entry: GameHistoryEntry; index: number } | null => {
      let removed: { entry: GameHistoryEntry; index: number } | null = null;
      setHistory((prev: GameHistoryEntry[]) => {
        const index = prev.findIndex((e) => e.id === entryId);
        if (index === -1) return prev;
        removed = { entry: prev[index], index };
        return prev.filter((e) => e.id !== entryId);
      });

      // Update lastSyncedCount so collection sync stays in sync
      const countStr = localStorage.getItem('gameHistory:lastSyncedCount');
      const count = countStr ? parseInt(countStr, 10) : 0;
      localStorage.setItem(
        'gameHistory:lastSyncedCount',
        String(Math.max(0, count - 1)),
      );

      // Fire cloud deletion (fire-and-forget)
      if (user) {
        fetch(`/api/game-history/${entryId}`, { method: 'DELETE' }).catch(
          () => {},
        );
      }

      return removed;
    },
    [setHistory, user],
  );

  /**
   * Undo a previous deleteGame operation.
   * Re-inserts the entry at its original position and re-pushes to cloud.
   */
  const undoDelete = useCallback(
    (entry: GameHistoryEntry, originalIndex: number): void => {
      setHistory((prev: GameHistoryEntry[]) => {
        const next = [...prev];
        next.splice(originalIndex, 0, entry);
        return next;
      });

      // Re-increment lastSyncedCount
      const countStr = localStorage.getItem('gameHistory:lastSyncedCount');
      const count = countStr ? parseInt(countStr, 10) : 0;
      localStorage.setItem(
        'gameHistory:lastSyncedCount',
        String(count + 1),
      );

      // Re-push to cloud
      if (user) {
        fetch('/api/game-history', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: entry }),
        }).catch(() => {});
      }
    },
    [setHistory, user],
  );

  return {
    history,
    saveGame,
    resetCurrentGame,
    deleteGame,
    undoDelete,
  };
}
