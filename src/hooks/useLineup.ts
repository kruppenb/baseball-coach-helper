import { useMemo, useCallback } from 'react';
import { useCloudStorage } from '../sync/useCloudStorage';
import { useRoster } from './useRoster';
import { useGameConfig } from './useGameConfig';
import { useGameHistory } from './useGameHistory';
import { generateBestLineup, preValidate } from '../logic/lineup-generator';
import { validateLineup } from '../logic/lineup-validator';
import { computeFieldingFairness, computeCatcherInnings } from '../logic/game-history';
import type { LineupState, Position, Lineup, Player } from '../types/index';
import { hasPlayerPitching } from '../types/index';
import type { ValidationError } from '../logic/lineup-types';

const defaultState: LineupState = {
  pitcherAssignments: {},
  catcherAssignments: {},
  positionBlocks: {},
  generatedLineups: [],
  selectedLineupIndex: null,
};

export function useLineup() {
  const [state, setState] = useCloudStorage<LineupState>('lineupState', defaultState, { endpoint: '/api/lineup-state', mode: 'singleton' });
  const { players } = useRoster();
  const { config } = useGameConfig();

  const { history } = useGameHistory();
  const innings = config.innings;
  const division = config.division;
  const presentPlayers = useMemo(
    () => players.filter((p: Player) => p.isPresent),
    [players],
  );

  // Compute bench priority from game history for cross-game fairness
  const benchPriority = useMemo(() => {
    if (history.length === 0) return undefined;
    const presentIds = presentPlayers.map(p => p.id);
    const fairness = computeFieldingFairness(history, presentIds);
    const priority: Record<string, number> = {};
    for (const [id, metrics] of Object.entries(fairness)) {
      priority[id] = metrics.totalBenchInnings;
    }
    return priority;
  }, [history, presentPlayers]);

  // Compute cumulative catcher innings from game history
  const catcherInningsHistory = useMemo(() => {
    if (history.length === 0) return {};
    const presentIds = presentPlayers.map(p => p.id);
    return computeCatcherInnings(history, presentIds);
  }, [history, presentPlayers]);

  // Clean up stale assignments when innings count changes or division is AA
  const cleanState = useMemo(() => {
    let needsCleanup = false;
    let cleanedPitcher = { ...state.pitcherAssignments };
    let cleanedCatcher = { ...state.catcherAssignments };

    // AA has no player pitching — clear all P/C assignments
    if (!hasPlayerPitching(division)) {
      if (Object.keys(cleanedPitcher).length > 0 || Object.keys(cleanedCatcher).length > 0) {
        cleanedPitcher = {};
        cleanedCatcher = {};
        needsCleanup = true;
      }
    } else {
      for (const key of Object.keys(cleanedPitcher)) {
        if (Number(key) > innings) {
          delete cleanedPitcher[Number(key)];
          needsCleanup = true;
        }
      }
      for (const key of Object.keys(cleanedCatcher)) {
        if (Number(key) > innings) {
          delete cleanedCatcher[Number(key)];
          needsCleanup = true;
        }
      }
    }

    if (needsCleanup) {
      return {
        ...state,
        pitcherAssignments: cleanedPitcher,
        catcherAssignments: cleanedCatcher,
      };
    }
    return state;
  }, [state, innings, division]);

  // Persist cleanup if stale keys were found
  useMemo(() => {
    if (cleanState !== state) {
      setState(cleanState);
    }
  }, [cleanState, state, setState]);

  const setPitcher = useCallback((inning: number, playerId: string) => {
    setState((prev: LineupState) => {
      const updated = { ...prev.pitcherAssignments };
      if (playerId === '') {
        delete updated[inning];
      } else {
        updated[inning] = playerId;
      }
      return { ...prev, pitcherAssignments: updated };
    });
  }, [setState]);

  const setCatcher = useCallback((inning: number, playerId: string) => {
    setState((prev: LineupState) => {
      const updated = { ...prev.catcherAssignments };
      if (playerId === '') {
        delete updated[inning];
      } else {
        updated[inning] = playerId;
      }
      return { ...prev, catcherAssignments: updated };
    });
  }, [setState]);

  const togglePositionBlock = useCallback((playerId: string, position: Position) => {
    setState((prev: LineupState) => {
      const current = prev.positionBlocks[playerId] ?? [];
      const idx = current.indexOf(position);
      let updated: Position[];
      if (idx >= 0) {
        updated = current.filter((_, i) => i !== idx);
      } else {
        updated = [...current, position];
      }
      return {
        ...prev,
        positionBlocks: {
          ...prev.positionBlocks,
          [playerId]: updated,
        },
      };
    });
  }, [setState]);

  const generate = useCallback((): { success: boolean; errors: string[]; warnings: string[] } => {
    const playerPitching = hasPlayerPitching(division);
    const input = {
      presentPlayers,
      innings,
      division,
      pitcherAssignments: playerPitching ? cleanState.pitcherAssignments : {},
      catcherAssignments: playerPitching ? cleanState.catcherAssignments : {},
      positionBlocks: cleanState.positionBlocks,
      benchPriority,
    };

    const result = generateBestLineup(input, 10);

    // Always store the lineup if one was produced.
    if (Object.keys(result.lineup).length > 0) {
      setState((prev: LineupState) => ({
        ...prev,
        generatedLineups: [result.lineup],
        selectedLineupIndex: 0,
      }));
    } else {
      setState((prev: LineupState) => ({
        ...prev,
        generatedLineups: [],
        selectedLineupIndex: null,
      }));
    }

    const errors = result.errors.map(e => e.message);
    const warnings = result.warnings;
    const success = result.valid;
    return { success, errors, warnings };
  }, [presentPlayers, innings, division, cleanState, setState, benchPriority]);

  const selectLineup = useCallback((index: number) => {
    setState((prev: LineupState) => ({
      ...prev,
      selectedLineupIndex: index,
    }));
  }, [setState]);

  const clearLineups = useCallback(() => {
    setState((prev: LineupState) => ({
      ...prev,
      generatedLineups: [],
      selectedLineupIndex: null,
    }));
  }, [setState]);

  /** Persist an edited lineup back to cloud storage so it survives step transitions. */
  const updateSelectedLineup = useCallback((lineup: Lineup) => {
    setState((prev: LineupState) => {
      const idx = prev.selectedLineupIndex ?? 0;
      const updated = [...prev.generatedLineups];
      updated[idx] = lineup;
      return { ...prev, generatedLineups: updated };
    });
  }, [setState]);

  /** Reset all lineup state to defaults (used by New Game flow). */
  const resetState = useCallback(() => {
    setState(defaultState);
  }, [setState]);

  const selectedLineup: Lineup | null = useMemo(() => {
    if (
      cleanState.selectedLineupIndex !== null &&
      cleanState.selectedLineupIndex >= 0 &&
      cleanState.selectedLineupIndex < cleanState.generatedLineups.length
    ) {
      return cleanState.generatedLineups[cleanState.selectedLineupIndex];
    }
    return null;
  }, [cleanState.selectedLineupIndex, cleanState.generatedLineups]);

  const validationErrors: ValidationError[] = useMemo(() => {
    if (!selectedLineup) return [];
    return validateLineup(selectedLineup, {
      presentPlayers,
      innings,
      division,
      pitcherAssignments: cleanState.pitcherAssignments,
      catcherAssignments: cleanState.catcherAssignments,
      positionBlocks: cleanState.positionBlocks,
    });
  }, [selectedLineup, presentPlayers, innings, division, cleanState.pitcherAssignments, cleanState.catcherAssignments, cleanState.positionBlocks]);

  const preValidationWarnings: string[] = useMemo(() => {
    const playerPitching = hasPlayerPitching(division);
    return preValidate({
      presentPlayers,
      innings,
      division,
      pitcherAssignments: playerPitching ? cleanState.pitcherAssignments : {},
      catcherAssignments: playerPitching ? cleanState.catcherAssignments : {},
      positionBlocks: cleanState.positionBlocks,
    });
  }, [presentPlayers, innings, division, cleanState.pitcherAssignments, cleanState.catcherAssignments, cleanState.positionBlocks]);

  return {
    // State
    pitcherAssignments: cleanState.pitcherAssignments,
    catcherAssignments: cleanState.catcherAssignments,
    positionBlocks: cleanState.positionBlocks,
    generatedLineups: cleanState.generatedLineups,
    selectedLineupIndex: cleanState.selectedLineupIndex,

    // Computed
    presentPlayers,
    innings,
    division,
    selectedLineup,
    validationErrors,
    preValidationWarnings,
    catcherInningsHistory,

    // Actions
    setPitcher,
    setCatcher,
    togglePositionBlock,
    generate,
    selectLineup,
    clearLineups,
    updateSelectedLineup,
    resetState,
  };
}
