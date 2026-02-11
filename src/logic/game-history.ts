import type { Player, Position, Lineup, GameHistoryEntry, PlayerGameSummary } from '../types/index.ts';
import { POSITIONS } from '../types/index.ts';

/**
 * Create a game history entry from a finalized game's data.
 *
 * Iterates each inning to determine each present player's fielding position
 * (or bench status). Produces a complete snapshot suitable for localStorage persistence.
 */
export function createGameHistoryEntry(
  lineup: Lineup,
  battingOrder: string[],
  innings: number,
  players: Player[],
): GameHistoryEntry {
  const playerMap = new Map(players.map(p => [p.id, p.name]));

  const playerSummaries: PlayerGameSummary[] = players
    .filter(p => p.isPresent)
    .map(player => {
      const fieldingPositions: Position[] = [];
      let benchInnings = 0;

      for (let inn = 1; inn <= innings; inn++) {
        const inningAssignment = lineup[inn];
        const pos = POSITIONS.find(p => inningAssignment[p] === player.id);
        if (pos) {
          fieldingPositions.push(pos);
        } else {
          benchInnings++;
        }
      }

      return {
        playerId: player.id,
        playerName: playerMap.get(player.id) ?? 'Unknown',
        battingPosition: battingOrder.indexOf(player.id),
        fieldingPositions,
        benchInnings,
      };
    });

  return {
    id: crypto.randomUUID(),
    gameDate: new Date().toISOString(),
    innings,
    lineup,
    battingOrder,
    playerSummaries,
  };
}

/**
 * Compute cumulative fielding fairness metrics from game history.
 *
 * For each present player, sums total bench innings and collects all unique
 * positions played across all history entries. Players not in presentPlayerIds
 * are silently skipped (handles roster deletions). Players with no history
 * get zero metrics.
 */
export function computeFieldingFairness(
  history: GameHistoryEntry[],
  presentPlayerIds: string[],
): Record<string, { totalBenchInnings: number; positionsPlayed: Position[] }> {
  const metrics: Record<string, { totalBenchInnings: number; positionsSet: Set<Position> }> = {};

  // Initialize zero metrics for all present players
  for (const id of presentPlayerIds) {
    metrics[id] = { totalBenchInnings: 0, positionsSet: new Set() };
  }

  // Accumulate from history
  for (const game of history) {
    for (const summary of game.playerSummaries) {
      if (!metrics[summary.playerId]) continue; // Skip deleted players
      metrics[summary.playerId].totalBenchInnings += summary.benchInnings;
      for (const pos of summary.fieldingPositions) {
        metrics[summary.playerId].positionsSet.add(pos);
      }
    }
  }

  // Convert Sets to sorted arrays for stable output
  const result: Record<string, { totalBenchInnings: number; positionsPlayed: Position[] }> = {};
  for (const id of presentPlayerIds) {
    result[id] = {
      totalBenchInnings: metrics[id].totalBenchInnings,
      positionsPlayed: [...metrics[id].positionsSet],
    };
  }

  return result;
}
