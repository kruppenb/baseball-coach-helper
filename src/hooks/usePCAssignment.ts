import { useMemo, useCallback } from 'react';
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
 * Build an even default per-inning assignment for a list of player IDs.
 * Players are placed into consecutive inning blocks. Used by autofill.
 */
export function buildDefaultAssignments(
  playerIds: string[],
  totalInnings: number,
): Record<number, string> {
  const result: Record<number, string> = {};
  if (playerIds.length === 0 || totalInnings === 0) return result;
  const counts = defaultInningCounts(playerIds.length, totalInnings);
  let inning = 1;
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      result[inning++] = playerIds[i];
    }
  }
  return result;
}

/**
 * Pick up to N players for autofill, skipping any in `excludeIds`.
 *
 * When `strict` is false (default) the function falls back to excluded players
 * if it can't find N eligible ones, returning roster order as a tiebreaker.
 * When `strict` is true, excluded players are never returned even if it means
 * returning fewer than N IDs — used for "no last-game pitcher" enforcement.
 */
export function pickAutofillPlayers(
  presentPlayers: Player[],
  count: number,
  excludeIds: Set<string>,
  strict = false,
): string[] {
  if (count === 0) return [];
  const picked: string[] = [];
  for (const p of presentPlayers) {
    if (picked.length >= count) break;
    if (excludeIds.has(p.id)) continue;
    picked.push(p.id);
  }
  if (!strict && picked.length < count) {
    for (const p of presentPlayers) {
      if (picked.length >= count) break;
      if (picked.includes(p.id)) continue;
      picked.push(p.id);
    }
  }
  return picked;
}

/**
 * Count innings each player is assigned across a per-inning assignment map.
 */
export function countByPlayer(
  assignments: Record<number, string>,
  totalInnings: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 1; i <= totalInnings; i++) {
    const id = assignments[i];
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Return the unique player IDs in a per-inning assignment, ordered by their
 * first appearance (inning 1 first). Used for stable color assignment.
 */
export function rotationOrder(
  assignments: Record<number, string>,
  totalInnings: number,
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (let i = 1; i <= totalInnings; i++) {
    const id = assignments[i];
    if (id && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  return order;
}

/**
 * Merge pitcher and catcher rotations into a single ordered list of unique
 * player IDs. Used for assigning chip colors so the same player gets the same
 * color whether they pitch, catch, or both.
 */
export function combinedRotation(
  pitcherAssignments: Record<number, string>,
  catcherAssignments: Record<number, string>,
  totalInnings: number,
): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of rotationOrder(pitcherAssignments, totalInnings)) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of rotationOrder(catcherAssignments, totalInnings)) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  return order;
}

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

interface UsePCAssignmentParams {
  presentPlayers: Player[];
  innings: number;
  defaultPitcherCount: number;
  defaultCatcherCount: number;
  pitcherAssignments: Record<number, string>;
  catcherAssignments: Record<number, string>;
  lastGamePitcherIds: string[];
  setPitcher: (inning: number, playerId: string) => void;
  setCatcher: (inning: number, playerId: string) => void;
}

export interface UsePCAssignmentReturn {
  /** Map of playerId -> palette color index (stable per session) */
  colorByPlayer: Record<string, number>;
  /** Catching innings count per player (this game) */
  catcherInningsByPlayer: Record<string, number>;
  /** Pitching innings count per player (this game) */
  pitcherInningsByPlayer: Record<string, number>;
  /** Player IDs catching 4+ innings — barred from pitching by LL rule */
  catches4Plus: Set<string>;
  /** True when every inning has a pitcher assigned (catchers optional) */
  allPitchersAssigned: boolean;
  /** Eligible players for a pitcher slot (excludes 4+ catchers) */
  pitcherOptionsFor: (inning: number) => Player[];
  /** Eligible players for a catcher slot (all present) */
  catcherOptionsFor: (inning: number) => Player[];
  /** Set/clear the pitcher for a single inning. Empty string clears. */
  changeInningPitcher: (inning: number, playerId: string) => void;
  /** Set/clear the catcher for a single inning. Empty string clears. */
  changeInningCatcher: (inning: number, playerId: string) => void;
  /** Overwrite all P/C assignments with even defaults using config counts. */
  autofillDefaults: () => void;
  /** Clear every P/C assignment for this game. */
  clearAll: () => void;
}

/**
 * Per-inning P/C assignment hook.
 *
 * Direct edit model: each inning's pitcher and catcher are independent slots.
 * No "slot-then-distribute" intermediate state. Mobile and desktop screens
 * render the chip timeline driven from this hook.
 */
export function usePCAssignment({
  presentPlayers,
  innings,
  defaultPitcherCount,
  defaultCatcherCount,
  pitcherAssignments,
  catcherAssignments,
  lastGamePitcherIds,
  setPitcher,
  setCatcher,
}: UsePCAssignmentParams): UsePCAssignmentReturn {
  const catcherInningsByPlayer = useMemo(
    () => countByPlayer(catcherAssignments, innings),
    [catcherAssignments, innings],
  );

  const pitcherInningsByPlayer = useMemo(
    () => countByPlayer(pitcherAssignments, innings),
    [pitcherAssignments, innings],
  );

  const catches4Plus = useMemo(() => {
    const set = new Set<string>();
    for (const [id, count] of Object.entries(catcherInningsByPlayer)) {
      if (count >= 4) set.add(id);
    }
    return set;
  }, [catcherInningsByPlayer]);

  const colorByPlayer = useMemo(() => {
    const map: Record<string, number> = {};
    const order = combinedRotation(pitcherAssignments, catcherAssignments, innings);
    order.forEach((id, idx) => {
      map[id] = idx;
    });
    return map;
  }, [pitcherAssignments, catcherAssignments, innings]);

  const allPitchersAssigned = useMemo(() => {
    for (let i = 1; i <= innings; i++) {
      if (!pitcherAssignments[i]) return false;
    }
    return innings > 0;
  }, [pitcherAssignments, innings]);

  const pitcherOptionsFor = useCallback(
    (inning: number) => {
      const sameInningCatcher = catcherAssignments[inning];
      return presentPlayers.filter(
        (p) => !catches4Plus.has(p.id) && p.id !== sameInningCatcher,
      );
    },
    [presentPlayers, catches4Plus, catcherAssignments],
  );

  const catcherOptionsFor = useCallback(
    (inning: number) => {
      const sameInningPitcher = pitcherAssignments[inning];
      return presentPlayers.filter((p) => p.id !== sameInningPitcher);
    },
    [presentPlayers, pitcherAssignments],
  );

  /** Apply a per-inning pitcher edit and re-check LL rule for newly-eligible
   *  catchers. (Catcher counts don't change here, so no auto-clear cascade.) */
  const changeInningPitcher = useCallback(
    (inning: number, playerId: string) => {
      setPitcher(inning, playerId);
    },
    [setPitcher],
  );

  /** Apply a per-inning catcher edit. If this push a player to 4+ catching,
   *  clear them from any pitching innings (LL rule). */
  const changeInningCatcher = useCallback(
    (inning: number, playerId: string) => {
      setCatcher(inning, playerId);

      // Compute hypothetical post-change counts to enforce LL rule
      const next = { ...catcherAssignments };
      if (playerId === '') delete next[inning];
      else next[inning] = playerId;
      const counts = countByPlayer(next, innings);
      for (const [id, count] of Object.entries(counts)) {
        if (count < 4) continue;
        for (let i = 1; i <= innings; i++) {
          if (pitcherAssignments[i] === id) {
            setPitcher(i, '');
          }
        }
      }
    },
    [setCatcher, setPitcher, catcherAssignments, pitcherAssignments, innings],
  );

  const autofillDefaults = useCallback(() => {
    // Pitchers: hard-exclude anyone who pitched last game. If that leaves us
    // short of defaultPitcherCount, the remaining slots stay empty so the
    // coach picks them deliberately.
    const pitcherIds = pickAutofillPlayers(
      presentPlayers,
      defaultPitcherCount,
      new Set(lastGamePitcherIds),
      true,
    );
    // Catchers: prefer not to overlap with pitchers, but fall back if needed.
    const catcherIds = pickAutofillPlayers(
      presentPlayers,
      defaultCatcherCount,
      new Set(pitcherIds),
    );

    const pDist = buildDefaultAssignments(pitcherIds, innings);
    const cDist = buildDefaultAssignments(catcherIds, innings);

    for (let i = 1; i <= innings; i++) {
      setPitcher(i, pDist[i] ?? '');
      setCatcher(i, cDist[i] ?? '');
    }
  }, [
    presentPlayers,
    defaultPitcherCount,
    defaultCatcherCount,
    lastGamePitcherIds,
    innings,
    setPitcher,
    setCatcher,
  ]);

  const clearAll = useCallback(() => {
    for (let i = 1; i <= innings; i++) {
      setPitcher(i, '');
      setCatcher(i, '');
    }
  }, [innings, setPitcher, setCatcher]);

  return {
    colorByPlayer,
    catcherInningsByPlayer,
    pitcherInningsByPlayer,
    catches4Plus,
    allPitchersAssigned,
    pitcherOptionsFor,
    catcherOptionsFor,
    changeInningPitcher,
    changeInningCatcher,
    autofillDefaults,
    clearAll,
  };
}
