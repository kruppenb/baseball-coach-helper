import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useRoster } from './useRoster';
import { useGameConfig } from './useGameConfig';
import { generateMultipleLineups, preValidate } from '../logic/lineup-generator';
import { validateLineup } from '../logic/lineup-validator';
import type { LineupState, Position, Lineup, Player } from '../types/index';
import type { ValidationError } from '../logic/lineup-types';

const defaultState: LineupState = {
  pitcherAssignments: {},
  catcherAssignments: {},
  positionBlocks: {},
  generatedLineups: [],
  selectedLineupIndex: null,
};

export function useLineup() {
  const [state, setState] = useLocalStorage<LineupState>('lineupState', defaultState);
  const { players } = useRoster();
  const { config } = useGameConfig();

  const innings = config.innings;
  const presentPlayers = useMemo(
    () => players.filter((p: Player) => p.isPresent),
    [players],
  );

  // Clean up stale assignments when innings count changes
  // (e.g., assignments for inning 6 when innings is now 5)
  const cleanState = useMemo(() => {
    let needsCleanup = false;
    const cleanedPitcher = { ...state.pitcherAssignments };
    const cleanedCatcher = { ...state.catcherAssignments };

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

    if (needsCleanup) {
      return {
        ...state,
        pitcherAssignments: cleanedPitcher,
        catcherAssignments: cleanedCatcher,
      };
    }
    return state;
  }, [state, innings]);

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

  const generate = useCallback((): { success: boolean; count: number; errors: string[] } => {
    const input = {
      presentPlayers,
      innings,
      pitcherAssignments: cleanState.pitcherAssignments,
      catcherAssignments: cleanState.catcherAssignments,
      positionBlocks: cleanState.positionBlocks,
    };

    const preErrors = preValidate(input);
    if (preErrors.length > 0) {
      return { success: false, count: 0, errors: preErrors };
    }

    const results = generateMultipleLineups(input, 3);
    const validLineups: Lineup[] = results.filter(r => r.valid).map(r => r.lineup);

    setState((prev: LineupState) => ({
      ...prev,
      generatedLineups: validLineups,
      selectedLineupIndex: validLineups.length > 0 ? 0 : null,
    }));

    if (validLineups.length === 0) {
      return {
        success: false,
        count: 0,
        errors: ['Could not generate a valid lineup with these settings. Try adjusting pitcher/catcher assignments or position blocks.'],
      };
    }

    return { success: true, count: validLineups.length, errors: [] };
  }, [presentPlayers, innings, cleanState, setState]);

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
      pitcherAssignments: cleanState.pitcherAssignments,
      catcherAssignments: cleanState.catcherAssignments,
      positionBlocks: cleanState.positionBlocks,
    });
  }, [selectedLineup, presentPlayers, innings, cleanState.pitcherAssignments, cleanState.catcherAssignments, cleanState.positionBlocks]);

  // Lightweight real-time checks for pre-assignment conflicts
  const preAssignmentErrors: string[] = useMemo(() => {
    const errors: string[] = [];
    const presentIds = new Set(presentPlayers.map(p => p.id));

    for (let inn = 1; inn <= innings; inn++) {
      const pitcherId = cleanState.pitcherAssignments[inn];
      const catcherId = cleanState.catcherAssignments[inn];

      // Same player as P+C in same inning
      if (pitcherId && catcherId && pitcherId === catcherId) {
        const player = presentPlayers.find(p => p.id === pitcherId);
        const name = player?.name ?? 'A player';
        errors.push(`${name} is assigned as both pitcher and catcher in inning ${inn}.`);
      }

      // Pitcher not present
      if (pitcherId && !presentIds.has(pitcherId)) {
        errors.push(`Pitcher for inning ${inn} is not in the active roster.`);
      }

      // Catcher not present
      if (catcherId && !presentIds.has(catcherId)) {
        errors.push(`Catcher for inning ${inn} is not in the active roster.`);
      }
    }

    return errors;
  }, [presentPlayers, innings, cleanState.pitcherAssignments, cleanState.catcherAssignments]);

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
    selectedLineup,
    validationErrors,
    preAssignmentErrors,

    // Actions
    setPitcher,
    setCatcher,
    togglePositionBlock,
    generate,
    selectLineup,
    clearLineups,
  };
}
