import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { createGameHistoryEntry } from '../logic/game-history';
import type { GameHistoryEntry, Lineup, Player } from '../types/index';

export function useGameHistory() {
  const [history, setHistory] = useLocalStorage<GameHistoryEntry[]>(
    'gameHistory',
    [],
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
