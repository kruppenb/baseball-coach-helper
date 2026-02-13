import { useCallback } from 'react';
import { useCloudStorage } from '../sync/useCloudStorage';
import { createGameHistoryEntry } from '../logic/game-history';
import type { GameHistoryEntry, Lineup, Player } from '../types/index';

export function useGameHistory() {
  const [history, setHistory] = useCloudStorage<GameHistoryEntry[]>(
    'gameHistory',
    [],
    { endpoint: '/api/game-history', mode: 'collection' },
  );

  const finalizeGame = useCallback(
    (
      lineup: Lineup,
      battingOrder: string[],
      innings: number,
      players: Player[],
    ): GameHistoryEntry => {
      const entry = createGameHistoryEntry(lineup, battingOrder, innings, players);
      setHistory((prev: GameHistoryEntry[]) => [...prev, entry]);
      return entry;
    },
    [setHistory],
  );

  return {
    history,
    finalizeGame,
  };
}
