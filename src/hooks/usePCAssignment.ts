import { useState, useMemo, useEffect } from 'react';
import type { Player } from '../types';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Distribute `count` players evenly across `innings` innings.
 * Returns a map of inning number -> player id.
 * Example: 3 pitchers across 6 innings = P1 for 1-2, P2 for 3-4, P3 for 5-6
 */
export function distributeAcrossInnings(
  players: string[],
  innings: number,
): Record<number, string> {
  const assignments: Record<number, string> = {};
  if (players.length === 0) return assignments;

  const inningsPerPlayer = Math.ceil(innings / players.length);

  for (let i = 1; i <= innings; i++) {
    const playerIndex = Math.min(
      Math.floor((i - 1) / inningsPerPlayer),
      players.length - 1,
    );
    assignments[i] = players[playerIndex];
  }

  return assignments;
}

/**
 * Extract player IDs from inning-level assignments, preserving order.
 * Groups consecutive innings by player and allows duplicates so the same
 * player can appear in multiple slots (e.g. catcher slots 1 and 3).
 * Converts {1:'a', 2:'a', 3:'b', 4:'b', 5:'a', 6:'a'} -> ['a','b','a'].
 */
export function slotsFromAssignments(
  assignments: Record<number, string>,
  slotCount: number,
): string[] {
  const innings = Object.keys(assignments).map(Number).sort((a, b) => a - b);
  const sequence: string[] = [];
  let lastId = '';
  for (const inn of innings) {
    const id = assignments[inn];
    if (id && id !== lastId) {
      sequence.push(id);
      lastId = id;
    }
  }
  const slots = Array(slotCount).fill('');
  for (let i = 0; i < Math.min(sequence.length, slotCount); i++) {
    slots[i] = sequence[i];
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

interface UsePCAssignmentParams {
  presentPlayers: Player[];
  innings: number;
  pitcherCount: number;
  catcherCount: number;
  pitcherAssignments: Record<number, string>;
  catcherAssignments: Record<number, string>;
  setPitcher: (inning: number, playerId: string) => void;
  setCatcher: (inning: number, playerId: string) => void;
}

export interface UsePCAssignmentReturn {
  selectedPitchers: string[];
  selectedCatchers: string[];
  catches4Plus: Set<string>;
  catcherInningsByPlayer: Record<string, number>;
  pitcherOptionsFor: (slotIndex: number) => Player[];
  catcherOptionsFor: (slotIndex: number) => Player[];
  handlePitcherChange: (slotIndex: number, playerId: string) => void;
  handleCatcherChange: (slotIndex: number, playerId: string) => void;
}

/**
 * Shared hook that encapsulates all P/C slot state management, LL eligibility
 * computation, option filtering, and change handlers with auto-clear logic.
 *
 * Both the mobile PCAssignmentStep and desktop GameDayDesktop consume this
 * hook and only handle rendering.
 */
export function usePCAssignment({
  presentPlayers,
  innings,
  pitcherCount,
  catcherCount,
  pitcherAssignments,
  catcherAssignments,
  setPitcher,
  setCatcher,
}: UsePCAssignmentParams): UsePCAssignmentReturn {
  // Slot arrays: initialized from existing lineupState assignments to preserve
  // selections across page reloads (e.g. after SWA auth redirect).
  const [selectedPitchers, setSelectedPitchers] = useState<string[]>(
    () => slotsFromAssignments(pitcherAssignments, pitcherCount),
  );
  const [selectedCatchers, setSelectedCatchers] = useState<string[]>(
    () => slotsFromAssignments(catcherAssignments, catcherCount),
  );

  // Resize slot arrays when config changes
  useEffect(() => {
    setSelectedPitchers((prev) => {
      if (prev.length === pitcherCount) return prev;
      const next = Array(pitcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, pitcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [pitcherCount]);

  useEffect(() => {
    setSelectedCatchers((prev) => {
      if (prev.length === catcherCount) return prev;
      const next = Array(catcherCount).fill('');
      for (let i = 0; i < Math.min(prev.length, catcherCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [catcherCount]);

  // Compute per-player catcher innings from slot selections.
  // LL rule: a player who catches 4+ innings cannot pitch that game.
  const catcherInningsByPlayer = useMemo(() => {
    const filledCatchers = selectedCatchers.filter(Boolean);
    const dist = distributeAcrossInnings(filledCatchers, innings);
    const counts: Record<string, number> = {};
    for (let i = 1; i <= innings; i++) {
      const id = dist[i];
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [selectedCatchers, innings]);

  const catches4Plus = useMemo(() => {
    const set = new Set<string>();
    for (const [id, count] of Object.entries(catcherInningsByPlayer)) {
      if (count >= 4) set.add(id);
    }
    return set;
  }, [catcherInningsByPlayer]);

  // Apply assignments to inning-level P/C whenever selections change
  useEffect(() => {
    const filledPitchers = selectedPitchers.filter(Boolean);
    const pitcherDist = distributeAcrossInnings(filledPitchers, innings);
    for (let i = 1; i <= innings; i++) {
      setPitcher(i, pitcherDist[i] ?? '');
    }
  }, [selectedPitchers, innings, setPitcher]);

  useEffect(() => {
    const filledCatchers = selectedCatchers.filter(Boolean);
    const catcherDist = distributeAcrossInnings(filledCatchers, innings);
    for (let i = 1; i <= innings; i++) {
      setCatcher(i, catcherDist[i] ?? '');
    }
  }, [selectedCatchers, innings, setCatcher]);

  const handlePitcherChange = (slotIndex: number, playerId: string) => {
    setSelectedPitchers((prev) => {
      const next = [...prev];
      next[slotIndex] = playerId;
      return next;
    });
  };

  const handleCatcherChange = (slotIndex: number, playerId: string) => {
    const nextCatchers = [...selectedCatchers];
    nextCatchers[slotIndex] = playerId;
    setSelectedCatchers(nextCatchers);

    // If this catcher change causes any pitcher to catch 4+ innings, clear them from pitcher slots
    const filledCatchers = nextCatchers.filter(Boolean);
    const dist = distributeAcrossInnings(filledCatchers, innings);
    const counts: Record<string, number> = {};
    for (let i = 1; i <= innings; i++) {
      const id = dist[i];
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
    setSelectedPitchers((prev) => {
      const cleared = prev.map((id) => (id && counts[id] >= 4 ? '' : id));
      return cleared.some((id, i) => id !== prev[i]) ? cleared : prev;
    });
  };

  /** Available options for a pitcher slot: exclude players catching 4+ innings (LL rule) */
  const pitcherOptionsFor = (_slotIndex: number) =>
    presentPlayers.filter((p: Player) => !catches4Plus.has(p.id));

  /** Available options for a catcher slot: all present players (same player can fill multiple slots) */
  const catcherOptionsFor = (_slotIndex: number) => presentPlayers;

  return {
    selectedPitchers,
    selectedCatchers,
    catches4Plus,
    catcherInningsByPlayer,
    pitcherOptionsFor,
    catcherOptionsFor,
    handlePitcherChange,
    handleCatcherChange,
  };
}
