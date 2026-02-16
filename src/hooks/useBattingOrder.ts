import { useMemo, useCallback } from 'react';
import { useCloudStorage } from '../sync/useCloudStorage';
import { useRoster } from './useRoster';
import { generateBattingOrder, calculateBandCounts } from '../logic/batting-order';
import type { BattingOrderState, BattingHistoryEntry, Player } from '../types/index';

const defaultState: BattingOrderState = {
  currentOrder: null,
  isConfirmed: false,
};

export function useBattingOrder() {
  const [state, setState] = useCloudStorage<BattingOrderState>(
    'battingOrderState',
    defaultState,
    { endpoint: '/api/batting', mode: 'singleton', responseKey: 'battingOrderState', pushDocType: 'battingOrderState' },
  );
  const [history, setHistory] = useCloudStorage<BattingHistoryEntry[]>(
    'battingHistory',
    [],
    { endpoint: '/api/batting', mode: 'collection', responseKey: 'battingHistory', pushDocType: 'battingHistory' },
  );
  const { players } = useRoster();

  const presentPlayers = useMemo(
    () => players.filter((p: Player) => p.isPresent),
    [players],
  );

  const presentPlayerIds = useMemo(
    () => presentPlayers.map((p) => p.id),
    [presentPlayers],
  );

  const bandCounts = useMemo(
    () => calculateBandCounts(presentPlayerIds, history),
    [presentPlayerIds, history],
  );

  const generate = useCallback(() => {
    const order = generateBattingOrder(presentPlayers, history);
    setState({ currentOrder: order, isConfirmed: false });
  }, [presentPlayers, history, setState]);

  const confirm = useCallback((orderOverride?: string[]) => {
    const order = orderOverride ?? state.currentOrder;
    if (!order || state.isConfirmed) return;

    const entry: BattingHistoryEntry = {
      id: crypto.randomUUID(),
      gameDate: new Date().toISOString(),
      order,
    };

    setHistory((prev: BattingHistoryEntry[]) => [...prev, entry]);
    setState((prev: BattingOrderState) => ({ ...prev, isConfirmed: true }));
  }, [state.currentOrder, state.isConfirmed, setHistory, setState]);

  const clear = useCallback(() => {
    setState(defaultState);
  }, [setState]);

  return {
    // State
    currentOrder: state.currentOrder,
    isConfirmed: state.isConfirmed,
    history,
    bandCounts,
    presentPlayers,

    // Actions
    generate,
    confirm,
    clear,
  };
}
