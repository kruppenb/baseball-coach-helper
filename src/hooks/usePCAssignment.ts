import { useState, useMemo, useEffect, useRef } from 'react';
import type { Player } from '../types';

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Compute default innings per slot: earlier slots get more when innings
 * don't divide evenly. E.g. 4 pitchers / 6 innings = [2, 2, 1, 1].
 */
export function defaultInningCounts(
  playerCount: number,
  totalInnings: number,
): number[] {
  if (playerCount === 0) return [];
  const base = Math.floor(totalInnings / playerCount);
  const remainder = totalInnings % playerCount;
  return Array.from(
    { length: playerCount },
    (_, i) => base + (i < remainder ? 1 : 0),
  );
}

/**
 * Build default slot-level innings counts: filled slots get innings from
 * defaultInningCounts, empty slots get 0.
 */
export function slotDefaultInningCounts(
  slots: string[],
  totalInnings: number,
): number[] {
  const filledIndices = slots
    .map((id, i) => (id ? i : -1))
    .filter((i) => i >= 0);
  if (filledIndices.length === 0) return slots.map(() => 0);
  const defaults = defaultInningCounts(filledIndices.length, totalInnings);
  const result = Array(slots.length).fill(0);
  filledIndices.forEach((slotIdx, i) => {
    result[slotIdx] = defaults[i];
  });
  return result;
}

/**
 * Assign players to innings using explicit per-player counts.
 * E.g. players=['a','b'], counts=[3,2] → {1:'a', 2:'a', 3:'a', 4:'b', 5:'b'}
 */
export function distributeWithCounts(
  players: string[],
  counts: number[],
): Record<number, string> {
  const assignments: Record<number, string> = {};
  let inning = 1;
  for (let p = 0; p < players.length; p++) {
    if (!players[p]) continue;
    for (let j = 0; j < (counts[p] || 0); j++) {
      assignments[inning] = players[p];
      inning++;
    }
  }
  return assignments;
}

/**
 * Distribute `count` players evenly across `innings` innings.
 * Returns a map of inning number -> player id.
 * Example: 4 pitchers across 6 innings = P1 for 1-2, P2 for 3-4, P3 for 5, P4 for 6
 */
export function distributeAcrossInnings(
  players: string[],
  innings: number,
): Record<number, string> {
  if (players.length === 0) return {};
  const counts = defaultInningCounts(players.length, innings);
  return distributeWithCounts(players, counts);
}

/**
 * Recover per-slot innings counts from saved inning-level assignments.
 */
export function inningCountsFromAssignments(
  assignments: Record<number, string>,
  slots: string[],
  totalInnings: number,
): number[] {
  const counts: Record<string, number> = {};
  for (let i = 1; i <= totalInnings; i++) {
    const id = assignments[i];
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return slots.map((id) => (id ? (counts[id] ?? 0) : 0));
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
  pitcherInningCounts: number[];
  pitcherInningsTotal: number;
  catches4Plus: Set<string>;
  catcherInningsByPlayer: Record<string, number>;
  pitcherOptionsFor: (slotIndex: number) => Player[];
  catcherOptionsFor: (slotIndex: number) => Player[];
  handlePitcherChange: (slotIndex: number, playerId: string) => void;
  handleCatcherChange: (slotIndex: number, playerId: string) => void;
  handlePitcherInningsChange: (slotIndex: number, count: number) => void;
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

  // Per-pitcher innings counts: restored from saved assignments or defaults
  const [pitcherInningCounts, setPitcherInningCounts] = useState<number[]>(
    () => {
      const slots = slotsFromAssignments(pitcherAssignments, pitcherCount);
      const filledCount = slots.filter(Boolean).length;
      if (filledCount > 0) {
        return inningCountsFromAssignments(pitcherAssignments, slots, innings);
      }
      return slotDefaultInningCounts(slots, innings);
    },
  );

  // Track filled pitcher count to auto-recalculate defaults
  const prevFilledCountRef = useRef(
    selectedPitchers.filter(Boolean).length,
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
    setPitcherInningCounts((prev) => {
      if (prev.length === pitcherCount) return prev;
      const next = Array(pitcherCount).fill(0);
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

  // Total assigned pitcher innings
  const pitcherInningsTotal = useMemo(
    () => pitcherInningCounts.reduce((sum, c) => sum + c, 0),
    [pitcherInningCounts],
  );

  // Apply pitcher assignments using custom innings counts
  useEffect(() => {
    const filledPitchers: string[] = [];
    const filledCounts: number[] = [];
    for (let i = 0; i < selectedPitchers.length; i++) {
      if (selectedPitchers[i]) {
        filledPitchers.push(selectedPitchers[i]);
        filledCounts.push(pitcherInningCounts[i] || 0);
      }
    }
    const pitcherDist = distributeWithCounts(filledPitchers, filledCounts);
    for (let i = 1; i <= innings; i++) {
      setPitcher(i, pitcherDist[i] ?? '');
    }
  }, [selectedPitchers, pitcherInningCounts, innings, setPitcher]);

  useEffect(() => {
    const filledCatchers = selectedCatchers.filter(Boolean);
    const catcherDist = distributeAcrossInnings(filledCatchers, innings);
    for (let i = 1; i <= innings; i++) {
      setCatcher(i, catcherDist[i] ?? '');
    }
  }, [selectedCatchers, innings, setCatcher]);

  const handlePitcherChange = (slotIndex: number, playerId: string) => {
    const nextPitchers = [...selectedPitchers];
    nextPitchers[slotIndex] = playerId;
    setSelectedPitchers(nextPitchers);

    // Recalculate default innings when the set of filled slots changes
    const newFilledCount = nextPitchers.filter(Boolean).length;
    if (newFilledCount !== prevFilledCountRef.current) {
      prevFilledCountRef.current = newFilledCount;
      setPitcherInningCounts(slotDefaultInningCounts(nextPitchers, innings));
    }
  };

  const handlePitcherInningsChange = (slotIndex: number, count: number) => {
    setPitcherInningCounts((prev) => {
      const next = [...prev];
      next[slotIndex] = count;
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
    pitcherInningCounts,
    pitcherInningsTotal,
    catches4Plus,
    catcherInningsByPlayer,
    pitcherOptionsFor,
    catcherOptionsFor,
    handlePitcherChange,
    handleCatcherChange,
    handlePitcherInningsChange,
  };
}
