import type { Player, BattingBand, BattingHistoryEntry } from '../types/index.ts';
import { shuffle } from './shuffle.ts';

/** Band counts for a single player across games */
interface PlayerBandCounts {
  playerId: string;
  top: number;
  middle: number;
  bottom: number;
}

/**
 * Determine which band a given 0-based batting position falls into.
 *
 * For N players:
 *   - Top:    positions 0 to floor(N/3) - 1
 *   - Middle: positions floor(N/3) to floor(2*N/3) - 1
 *   - Bottom: positions floor(2*N/3) to N - 1
 */
export function getBand(position: number, totalPlayers: number): BattingBand {
  const topEnd = Math.floor(totalPlayers / 3);
  const midEnd = Math.floor((2 * totalPlayers) / 3);
  if (position < topEnd) return 'top';
  if (position < midEnd) return 'middle';
  return 'bottom';
}

/**
 * Calculate cumulative band counts from history for current present players.
 * Players in history but not in presentPlayerIds are silently skipped.
 * Players in presentPlayerIds but not in history get zero counts.
 */
export function calculateBandCounts(
  presentPlayerIds: string[],
  history: BattingHistoryEntry[],
): PlayerBandCounts[] {
  const counts: Record<string, PlayerBandCounts> = {};

  // Initialize zero counts for all present players
  for (const id of presentPlayerIds) {
    counts[id] = { playerId: id, top: 0, middle: 0, bottom: 0 };
  }

  // Tally from history
  for (const entry of history) {
    const totalInEntry = entry.order.length;
    entry.order.forEach((playerId, position) => {
      if (!counts[playerId]) return; // Skip players no longer present
      const band = getBand(position, totalInEntry);
      counts[playerId][band]++;
    });
  }

  return presentPlayerIds.map(id => counts[id]);
}

/**
 * Generate a fair batting order based on history.
 * Returns an array of player IDs in batting order.
 *
 * - No history: returns a shuffled array of all present player IDs.
 * - With history: sorts by fairness score (top - bottom, ascending) so
 *   players who have batted at top more often are pushed toward bottom.
 *   Shuffles within each band for variety.
 */
export function generateBattingOrder(
  presentPlayers: Player[],
  history: BattingHistoryEntry[],
): string[] {
  const playerIds = presentPlayers.map(p => p.id);

  // First game: simple shuffle
  if (history.length === 0) {
    return shuffle(playerIds);
  }

  // Calculate band counts
  const bandCounts = calculateBandCounts(playerIds, history);
  const totalPlayers = playerIds.length;
  const topSize = Math.floor(totalPlayers / 3);
  const midEnd = Math.floor((2 * totalPlayers) / 3);
  const midSize = midEnd - topSize;

  // Sort by fairness: score = top - bottom (ascending)
  // Players with fewer top starts (or more bottom starts) get top positions
  const sorted = [...bandCounts].sort((a, b) => {
    const aScore = a.top - a.bottom;
    const bScore = b.top - b.bottom;
    if (aScore !== bScore) return aScore - bScore;
    // Tiebreaker: randomize
    return Math.random() - 0.5;
  });

  // Assign to bands and shuffle within each band for variety
  const topBand = sorted.slice(0, topSize).map(p => p.playerId);
  const midBand = sorted.slice(topSize, topSize + midSize).map(p => p.playerId);
  const bottomBand = sorted.slice(topSize + midSize).map(p => p.playerId);

  return [...shuffle(topBand), ...shuffle(midBand), ...shuffle(bottomBand)];
}
