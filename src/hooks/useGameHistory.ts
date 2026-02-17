import { useCallback, useRef } from 'react';
import { useCloudStorage } from '../sync/useCloudStorage';
import { createGameHistoryEntry } from '../logic/game-history';
import type { CreateGameHistoryOptions } from '../logic/game-history';
import type { GameHistoryEntry, Lineup, Player } from '../types/index';

export function useGameHistory() {
  const [history, setHistory] = useCloudStorage<GameHistoryEntry[]>(
    'gameHistory',
    [],
    { endpoint: '/api/game-history', mode: 'collection' },
  );

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

  /** @deprecated Use saveGame instead. Kept for backward compatibility. */
  const finalizeGame = useCallback(
    (
      lineup: Lineup,
      battingOrder: string[],
      innings: number,
      players: Player[],
    ): GameHistoryEntry => {
      return saveGame(lineup, battingOrder, innings, players);
    },
    [saveGame],
  );

  return {
    history,
    finalizeGame,
    saveGame,
    resetCurrentGame,
  };
}
