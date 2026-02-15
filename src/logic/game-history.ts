import type { Player, Position, Lineup, GameHistoryEntry, PlayerGameSummary, InningAssignment } from '../types/index.ts';
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

/**
 * Compute per-player catcher innings from game history.
 *
 * Returns a map of playerId -> total innings spent at catcher across all
 * history entries. Useful for informing coaches about catcher workload
 * when making pitcher/catcher assignments.
 */
export function computeCatcherInnings(
  history: GameHistoryEntry[],
  presentPlayerIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of presentPlayerIds) {
    counts[id] = 0;
  }

  for (const game of history) {
    for (const summary of game.playerSummaries) {
      if (counts[summary.playerId] === undefined) continue;
      for (const pos of summary.fieldingPositions) {
        if (pos === 'C') {
          counts[summary.playerId]++;
        }
      }
    }
  }

  return counts;
}

// --- Recent P/C History ---

export interface RecentPCRecord {
  pitchedGames: number;
  caughtGames: number;
  pitchedLast2Consecutive: boolean;
}

/**
 * Compute recent pitcher/catcher history from the last 2 games.
 *
 * For each present player, determines how many of the last 2 games they
 * pitched or caught (assigned to P or C in ANY inning of that game).
 * Also flags if a player pitched in both of the last 2 consecutive games.
 */
export function computeRecentPCHistory(
  history: GameHistoryEntry[],
  presentPlayerIds: string[],
): Record<string, RecentPCRecord> {
  const last2 = history.slice(-2);

  // For each game, determine who pitched and who caught
  const gamePitchers: Set<string>[] = [];
  const gameCatchers: Set<string>[] = [];

  for (const game of last2) {
    const pitchers = new Set<string>();
    const catchers = new Set<string>();

    for (let inn = 1; inn <= game.innings; inn++) {
      const inningAssignment: InningAssignment | undefined = game.lineup[inn];
      if (!inningAssignment) continue;

      if (inningAssignment['P']) {
        pitchers.add(inningAssignment['P']);
      }
      if (inningAssignment['C']) {
        catchers.add(inningAssignment['C']);
      }
    }

    gamePitchers.push(pitchers);
    gameCatchers.push(catchers);
  }

  const result: Record<string, RecentPCRecord> = {};

  for (const playerId of presentPlayerIds) {
    let pitchedGames = 0;
    let caughtGames = 0;

    for (let g = 0; g < last2.length; g++) {
      if (gamePitchers[g].has(playerId)) pitchedGames++;
      if (gameCatchers[g].has(playerId)) caughtGames++;
    }

    result[playerId] = {
      pitchedGames,
      caughtGames,
      pitchedLast2Consecutive: pitchedGames === 2 && history.length >= 2,
    };
  }

  return result;
}
