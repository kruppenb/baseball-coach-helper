import { describe, it, expect } from 'vitest';
import { createGameHistoryEntry, computeFieldingFairness, computeCatcherInnings } from './game-history.ts';
import type { Player, Position, Lineup } from '../types/index.ts';

// --- Test Helpers ---

function makePlayer(id: string, name: string, isPresent = true): Player {
  return { id, name, isPresent };
}

/** Build a lineup for the given innings with explicit assignments */
function buildLineup(
  assignments: Record<number, Record<string, string>>,
): Lineup {
  const lineup: Lineup = {};
  for (const [inn, posMap] of Object.entries(assignments)) {
    const inning: Record<string, string> = {};
    for (const [pos, playerId] of Object.entries(posMap)) {
      inning[pos] = playerId;
    }
    lineup[Number(inn)] = inning as Record<Position, string>;
  }
  return lineup;
}

// --- 10 players for a 6-inning game (9 field + 1 bench per inning) ---
const players10: Player[] = [
  makePlayer('p1', 'Alex'),
  makePlayer('p2', 'Blake'),
  makePlayer('p3', 'Casey'),
  makePlayer('p4', 'Drew'),
  makePlayer('p5', 'Emery'),
  makePlayer('p6', 'Frankie'),
  makePlayer('p7', 'Gray'),
  makePlayer('p8', 'Harper'),
  makePlayer('p9', 'Indigo'),
  makePlayer('p10', 'Jordan'),
];

/** 6-inning lineup for 10 players: each player sits exactly 1 inning
 *  (rotating the bench slot through p5-p10, p1-p4 never bench) -- wait,
 *  with 10 players and 9 positions, exactly 1 player benched per inning.
 *  Over 6 innings, 6 different players each sit once. The other 4 never sit.
 */
const sixInningLineup: Lineup = buildLineup({
  1: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
  // p10 benched inning 1
  2: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p10', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
  // p5 benched inning 2
  3: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p10', LF: 'p7', CF: 'p8', RF: 'p9' },
  // p6 benched inning 3
  4: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p10', CF: 'p8', RF: 'p9' },
  // p7 benched inning 4
  5: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p10', RF: 'p9' },
  // p8 benched inning 5
  6: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p10' },
  // p9 benched inning 6
});

const battingOrder10 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

// --- createGameHistoryEntry Tests ---

describe('createGameHistoryEntry', () => {
  it('creates an entry with id, gameDate, innings, lineup, and battingOrder', () => {
    const entry = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    expect(entry.id).toBeDefined();
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.gameDate).toBeDefined();
    expect(entry.innings).toBe(6);
    expect(entry.lineup).toBe(sixInningLineup);
    expect(entry.battingOrder).toBe(battingOrder10);
  });

  it('produces correct playerSummaries for 10-player, 6-inning game', () => {
    const entry = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    expect(entry.playerSummaries).toHaveLength(10);

    // p1 plays P every inning, never benched
    const p1 = entry.playerSummaries.find(s => s.playerId === 'p1')!;
    expect(p1.playerName).toBe('Alex');
    expect(p1.battingPosition).toBe(0);
    expect(p1.fieldingPositions).toEqual(['P', 'P', 'P', 'P', 'P', 'P']);
    expect(p1.benchInnings).toBe(0);

    // p10 benched inning 1, plays 3B in 2, SS in 3, LF in 4, CF in 5, RF in 6
    const p10 = entry.playerSummaries.find(s => s.playerId === 'p10')!;
    expect(p10.playerName).toBe('Jordan');
    expect(p10.battingPosition).toBe(9);
    expect(p10.benchInnings).toBe(1);
    expect(p10.fieldingPositions).toEqual(['3B', 'SS', 'LF', 'CF', 'RF']);
  });

  it('tracks correct bench innings for each player', () => {
    const entry = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    // p1 through p4 never benched
    for (const id of ['p1', 'p2', 'p3', 'p4']) {
      const summary = entry.playerSummaries.find(s => s.playerId === id)!;
      expect(summary.benchInnings).toBe(0);
    }

    // p5 benched inning 2 only
    const p5 = entry.playerSummaries.find(s => s.playerId === 'p5')!;
    expect(p5.benchInnings).toBe(1);

    // p10 benched inning 1 only
    const p10 = entry.playerSummaries.find(s => s.playerId === 'p10')!;
    expect(p10.benchInnings).toBe(1);
  });

  it('only includes present players in summaries', () => {
    const playersWithAbsent = [
      ...players10,
      makePlayer('p11', 'Kelly', false), // absent
    ];
    const entry = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, playersWithAbsent);

    expect(entry.playerSummaries).toHaveLength(10);
    expect(entry.playerSummaries.find(s => s.playerId === 'p11')).toBeUndefined();
  });

  it('handles a player assigned P inning 1, SS inning 2, bench inning 3 (3-inning game)', () => {
    const threeInningLineup = buildLineup({
      1: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
      2: { P: 'p2', C: 'p3', '1B': 'p4', '2B': 'p5', '3B': 'p6', SS: 'p1', LF: 'p7', CF: 'p8', RF: 'p9' },
      // p1 benched in inning 3
      3: { P: 'p3', C: 'p4', '1B': 'p5', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p2', RF: 'p10' },
    });

    const entry = createGameHistoryEntry(threeInningLineup, battingOrder10, 3, players10);
    const p1 = entry.playerSummaries.find(s => s.playerId === 'p1')!;

    expect(p1.fieldingPositions).toEqual(['P', 'SS']);
    expect(p1.benchInnings).toBe(1);
  });

  it('stores playerName for robustness against roster deletion', () => {
    const entry = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    for (const summary of entry.playerSummaries) {
      expect(summary.playerName).toBeDefined();
      expect(typeof summary.playerName).toBe('string');
      expect(summary.playerName.length).toBeGreaterThan(0);
    }

    // Verify specific name mapping
    expect(entry.playerSummaries.find(s => s.playerId === 'p3')!.playerName).toBe('Casey');
  });
});

// --- computeFieldingFairness Tests ---

describe('computeFieldingFairness', () => {
  it('returns empty metrics for players with no history', () => {
    const result = computeFieldingFairness([], ['p1', 'p2', 'p3']);

    expect(Object.keys(result)).toHaveLength(3);
    for (const id of ['p1', 'p2', 'p3']) {
      expect(result[id].totalBenchInnings).toBe(0);
      expect(result[id].positionsPlayed).toEqual([]);
    }
  });

  it('sums bench innings across two games', () => {
    const game1 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    // Second game with same lineup -- same bench pattern
    const game2 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    const history = [game1, game2];

    const presentIds = players10.map(p => p.id);
    const result = computeFieldingFairness(history, presentIds);

    // p10 benched 1 per game = 2 total
    expect(result['p10'].totalBenchInnings).toBe(2);
    // p1 never benched = 0 total
    expect(result['p1'].totalBenchInnings).toBe(0);
  });

  it('collects unique positions played across history', () => {
    const game1 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    const presentIds = players10.map(p => p.id);
    const result = computeFieldingFairness([game1], presentIds);

    // p1 plays P every inning
    expect(result['p1'].positionsPlayed).toEqual(['P']);

    // p10 plays 3B, SS, LF, CF, RF (5 unique positions)
    expect(result['p10'].positionsPlayed).toHaveLength(5);
    expect(result['p10'].positionsPlayed).toContain('3B');
    expect(result['p10'].positionsPlayed).toContain('SS');
    expect(result['p10'].positionsPlayed).toContain('LF');
    expect(result['p10'].positionsPlayed).toContain('CF');
    expect(result['p10'].positionsPlayed).toContain('RF');
  });

  it('skips deleted players not in presentPlayerIds', () => {
    const game1 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    // Only p1 and p2 are present now (p3-p10 were "deleted")
    const result = computeFieldingFairness([game1], ['p1', 'p2']);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['p1']).toBeDefined();
    expect(result['p2']).toBeDefined();
    expect(result['p3']).toBeUndefined();
  });

  it('returns zero metrics for new player with no history', () => {
    const game1 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);

    // p_new is a new player not in any history
    const presentIds = [...players10.map(p => p.id), 'p_new'];
    const result = computeFieldingFairness([game1], presentIds);

    expect(result['p_new'].totalBenchInnings).toBe(0);
    expect(result['p_new'].positionsPlayed).toEqual([]);
  });
});

// --- computeCatcherInnings Tests ---

describe('computeCatcherInnings', () => {
  it('returns zero for all players with no history', () => {
    const result = computeCatcherInnings([], ['p1', 'p2', 'p3']);
    expect(Object.keys(result)).toHaveLength(3);
    for (const id of ['p1', 'p2', 'p3']) {
      expect(result[id]).toBe(0);
    }
  });

  it('counts catcher innings correctly from a single game', () => {
    // p2 catches all 6 innings in sixInningLineup
    const game = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    const presentIds = players10.map(p => p.id);
    const result = computeCatcherInnings([game], presentIds);

    expect(result['p2']).toBe(6);
    expect(result['p1']).toBe(0); // p1 pitches, never catches
    expect(result['p3']).toBe(0);
  });

  it('sums catcher innings across multiple games', () => {
    const game1 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    const game2 = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    const presentIds = players10.map(p => p.id);
    const result = computeCatcherInnings([game1, game2], presentIds);

    expect(result['p2']).toBe(12); // 6 per game × 2 games
  });

  it('skips deleted players not in presentPlayerIds', () => {
    const game = createGameHistoryEntry(sixInningLineup, battingOrder10, 6, players10);
    const result = computeCatcherInnings([game], ['p1', 'p2']);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['p2']).toBe(6);
    expect(result['p3']).toBeUndefined();
  });

  it('counts correctly when catcher changes mid-game', () => {
    // p2 catches innings 1-3, p4 catches innings 4-6
    const mixedCatcherLineup = buildLineup({
      1: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
      2: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p4', '3B': 'p10', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
      3: { P: 'p1', C: 'p2', '1B': 'p3', '2B': 'p10', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
      4: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p2', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p9' },
      5: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p10', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p2' },
      6: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p2', '3B': 'p5', SS: 'p6', LF: 'p7', CF: 'p8', RF: 'p10' },
    });
    const game = createGameHistoryEntry(mixedCatcherLineup, battingOrder10, 6, players10);
    const presentIds = players10.map(p => p.id);
    const result = computeCatcherInnings([game], presentIds);

    expect(result['p2']).toBe(3);
    expect(result['p4']).toBe(3);
  });
});
