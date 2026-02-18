import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { validateLineup } from '../logic/lineup-validator';
import type { Lineup, Position } from '../types/index';
import type { GenerateLineupInput, ValidationError } from '../logic/lineup-types';

export function useLineupEditor(
  initialLineup: Lineup | null,
  validationInput: GenerateLineupInput,
) {
  const [editedLineup, setEditedLineup] = useState<Lineup | null>(
    initialLineup ? structuredClone(initialLineup) : null,
  );
  const [battingOrder, setBattingOrder] = useState<string[] | null>(null);

  // Store initial values for hasEdits comparison
  const initialLineupRef = useRef<Lineup | null>(initialLineup);
  const initialBattingOrderRef = useRef<string[] | null>(null);

  // Reset edited state when initialLineup changes
  useEffect(() => {
    setEditedLineup(initialLineup ? structuredClone(initialLineup) : null);
    initialLineupRef.current = initialLineup;
  }, [initialLineup]);

  const validationErrors: ValidationError[] = useMemo(() => {
    if (!editedLineup) return [];
    return validateLineup(editedLineup, validationInput);
  }, [editedLineup, validationInput]);

  const swapPositions = useCallback(
    (inning: number, posA: Position, posB: Position) => {
      if (posA === posB) return;
      setEditedLineup(prev => {
        if (!prev || !prev[inning]) return prev;
        const updated = structuredClone(prev);
        const playerA = updated[inning][posA];
        const playerB = updated[inning][posB];
        updated[inning][posA] = playerB;
        updated[inning][posB] = playerA;
        return updated;
      });
    },
    [],
  );

  const benchSwap = useCallback(
    (inning: number, fieldPosition: Position, benchPlayerId: string) => {
      setEditedLineup(prev => {
        if (!prev || !prev[inning]) return prev;
        const updated = structuredClone(prev);
        updated[inning][fieldPosition] = benchPlayerId;
        return updated;
      });
    },
    [],
  );

  const reorderBattingOrder = useCallback((newOrder: string[]) => {
    setBattingOrder(newOrder);
  }, []);

  const setBattingOrderWithRef = useCallback((order: string[] | null) => {
    setBattingOrder(order);
    initialBattingOrderRef.current = order;
  }, []);

  const hasEdits = useMemo(() => {
    const lineupChanged =
      JSON.stringify(editedLineup) !==
      JSON.stringify(initialLineupRef.current);
    const battingChanged =
      JSON.stringify(battingOrder) !==
      JSON.stringify(initialBattingOrderRef.current);
    return lineupChanged || battingChanged;
  }, [editedLineup, battingOrder]);

  const reset = useCallback(() => {
    setEditedLineup(
      initialLineupRef.current
        ? structuredClone(initialLineupRef.current)
        : null,
    );
    setBattingOrder(initialBattingOrderRef.current);
  }, []);

  return {
    lineup: editedLineup,
    validationErrors,
    swapPositions,
    benchSwap,
    reorderBattingOrder,
    battingOrder,
    setBattingOrder: setBattingOrderWithRef,
    hasEdits,
    reset,
  };
}
