import { describe, it, expect } from 'vitest';
import { scoreLineup } from './lineup-scorer.ts';
import type { LineupScore } from './lineup-scorer.ts';
import { generateLineup } from './lineup-generator.ts';
import type { GenerateLineupInput } from './lineup-types.ts';
import type { Player, Lineup, Position, InningAssignment } from '../types/index.ts';
import { POSITIONS } from '../types/index.ts';

// --- Test Helpers ---

function makePlayer(id: string, name: string): Player {
  return { id, name, isPresent: true };
}

const players9: Player[] = Array.from({ length: 9 }, (_, i) =>
  makePlayer(`p${i + 1}`, `Player${i + 1}`),
);

const players11: Player[] = Array.from({ length: 11 }, (_, i) =>
  makePlayer(`p${i + 1}`, `Player${i + 1}`),
);

function makeDefaultInput(overrides: Partial<GenerateLineupInput> = {}): GenerateLineupInput {
  return {
    presentPlayers: players11,
    innings: 6,
    pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
    catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p6', 6: 'p6' },
    positionBlocks: {},
    ...overrides,
  };
}

/**
 * Build a lineup where every player is assigned to a specific known position each inning.
 * `assignments[inn][pos] = playerId`
 */
function buildLineup(
  assignments: Record<number, Record<string, string>>,
): Lineup {
  const lineup: Lineup = {};
  for (const [innStr, posMap] of Object.entries(assignments)) {
    const inn = Number(innStr);
    lineup[inn] = {} as InningAssignment;
    for (const [pos, playerId] of Object.entries(posMap)) {
      lineup[inn][pos as Position] = playerId;
    }
  }
  return lineup;
}

// --- Tests ---

describe('scoreLineup', () => {
  it('scores a perfect 9-player lineup (no bench) with benchEquity = 100', () => {
    // 9 players, 6 innings, everyone plays every inning — benchEquity should be 100
    const input = makeDefaultInput({
      presentPlayers: players9,
    });

    // Build a lineup where all 9 play every inning in different positions
    const lineup = buildLineup({
      1: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p5', '3B': 'p6', SS: 'p7', LF: 'p8', CF: 'p9', RF: 'p2' },
      2: { P: 'p1', C: 'p4', '1B': 'p5', '2B': 'p6', '3B': 'p7', SS: 'p3', LF: 'p9', CF: 'p2', RF: 'p8' },
      3: { P: 'p2', C: 'p5', '1B': 'p6', '2B': 'p7', '3B': 'p3', SS: 'p8', LF: 'p1', CF: 'p4', RF: 'p9' },
      4: { P: 'p2', C: 'p5', '1B': 'p7', '2B': 'p3', '3B': 'p8', SS: 'p9', LF: 'p4', CF: 'p1', RF: 'p6' },
      5: { P: 'p3', C: 'p6', '1B': 'p8', '2B': 'p9', '3B': 'p1', SS: 'p4', LF: 'p2', CF: 'p5', RF: 'p7' },
      6: { P: 'p3', C: 'p6', '1B': 'p9', '2B': 'p1', '3B': 'p4', SS: 'p2', LF: 'p5', CF: 'p7', RF: 'p8' },
    });

    const score = scoreLineup(lineup, input);
    expect(score.benchEquity).toBe(100);
    expect(score.total).toBeGreaterThan(50);
  });

  it('scores benchEquity = 100 when all bench is evenly distributed (11 players, 6 innings)', () => {
    // 11 players, 6 innings -> 2 players bench each inning
    // Perfect distribution: each player benches exactly floor(12/11)=1 inning (except 1 player benches 2)
    // With perfectly even bench, max-min = 0, so benchEquity = 100
    // Build: each of the 11 players benches exactly once in some inning,
    // with the remaining bench slot cycling
    // Actually, with 6 innings * 2 benched = 12 bench slots among 11 players,
    // perfectly even is impossible. But if max-min = 1, it's still close.
    // Let's make 10 players bench 1 inning and 1 player bench 2 innings => max-min=1
    // benchEquity = 100 * (1 - 1/6) = 83.3

    // Instead, for a true 100 score, let's make 10 players, 5 innings, 1 bench/inning = 5 bench slots
    // With 10 players and 5 bench slots, we can have 5 players bench once, 5 never.
    // max-min = 1, score = 100*(1-1/5) = 80. Still not 100.

    // For true benchEquity=100 with bench: need all players to bench equally.
    // 12 players, 6 innings, 3 bench/inning = 18 bench slots.
    // 18/12 = 1.5, not even. Let's try 10 players, 6 innings, 1 bench/inning = 6 slots.
    // 10 players, 6 bench slots. Can't be even.

    // Actually the simplest way: 11 players, 11 innings (hypothetical), 2 bench/inning = 22 slots.
    // 22/11 = 2 each. Each benches exactly 2. max-min = 0. benchEquity = 100.
    // But innings is normally 5 or 6. Let's just use a setup where max-min=0.

    // Simplest: 11 players, 6 innings. For max-min=0, each must bench same count.
    // 6 innings * (11-9) = 12 bench slots. 12/11 is not integer. So it's impossible for 11 players.

    // Use 12 players, 6 innings: 12*(6) slots = 72, 9*6=54 playing slots, 18 bench slots.
    // 18/12 = 1.5, not even.

    // Use 10 players, 5 innings: 10*(5)=50, 9*5=45 playing, 5 bench slots. 5/10=0.5. Not even.

    // The only way to get max-min=0 with bench is playerCount * benchPerPlayer = innings * (playerCount - 9).
    // e.g., 12 players, 6 innings: need 18/12 = must be integer. Not 1.5.
    // 12 players, 4 innings: 12 bench slots. 12/12=1. Each benches once. That works!

    const players12: Player[] = Array.from({ length: 12 }, (_, i) =>
      makePlayer(`p${i + 1}`, `Player${i + 1}`),
    );
    const input = makeDefaultInput({
      presentPlayers: players12,
      innings: 4,
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2' },
      catcherAssignments: { 1: 'p3', 2: 'p3', 3: 'p4', 4: 'p4' },
    });

    // Each player benches exactly 1 inning out of 4
    // Inning 1: bench p5, p6, p7 (3 benched). Wait, 12-9=3 bench per inning * 4 innings = 12 slots. 12/12=1. Each benches once!
    const lineup = buildLineup({
      1: { P: 'p1', C: 'p3', '1B': 'p5', '2B': 'p8', '3B': 'p9', SS: 'p10', LF: 'p11', CF: 'p12', RF: 'p2' },
      // bench: p4, p6, p7
      2: { P: 'p1', C: 'p3', '1B': 'p4', '2B': 'p6', '3B': 'p7', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p2' },
      // bench: p5, p8, p12
      3: { P: 'p2', C: 'p4', '1B': 'p5', '2B': 'p8', '3B': 'p12', SS: 'p6', LF: 'p7', CF: 'p1', RF: 'p3' },
      // bench: p9, p10, p11
      4: { P: 'p2', C: 'p4', '1B': 'p9', '2B': 'p10', '3B': 'p11', SS: 'p5', LF: 'p8', CF: 'p12', RF: 'p3' },
      // bench: p1, p6, p7  -- wait, p1 is pitcher. Let me redo.
      // Actually p2 is pitcher inn 4. So bench can't include p2 or p4.
    });

    // Let me verify bench per player. This is getting complex. Let me just verify the simpler property:
    // verify each of the 12 players appears in exactly 3 out of 4 innings.
    // Actually let me just build it correctly:
    // Inn 1: play p1,p3,p2,p5,p8,p9,p10,p11,p12 -> bench p4,p6,p7
    // Inn 2: play p1,p3,p2,p4,p6,p7,p9,p10,p11 -> bench p5,p8,p12
    // Inn 3: play p2,p4,p1,p3,p5,p8,p12,p6,p7 -> bench p9,p10,p11
    // Inn 4: play p2,p4,p3,p9,p10,p11,p5,p8,p12 -> bench p1,p6,p7
    // p1: bench inn4 (1 time)
    // p2: bench never (0 times) -- p2 is always playing (pitcher inn 3,4 or field inn 1,2)
    // Hmm, p2 plays inn1 (RF), inn2 (RF), inn3 (P), inn4 (P) -- plays all 4. benches 0.
    // That breaks even distribution. Let me fix it.

    // With p1 pitching inn 1,2 and p2 pitching inn 3,4, and p3 catching inn 1,2 and p4 catching inn 3,4:
    // p1 plays inn 1 (P), inn 2 (P) -- must bench inn 3 or 4
    // p3 plays inn 1 (C), inn 2 (C) -- must bench inn 3 or 4
    // p2 plays inn 3 (P), inn 4 (P) -- must bench inn 1 or 2
    // p4 plays inn 3 (C), inn 4 (C) -- must bench inn 1 or 2

    // Good, now let's distribute evenly: each player benches exactly 1 inning.
    // Bench per inning: 3 players. 4 innings * 3 = 12 slots for 12 players = 1 each.

    const lineup2 = buildLineup({
      1: { P: 'p1', C: 'p3', '1B': 'p5', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p11' },
      // bench: p2, p4, p12
      2: { P: 'p1', C: 'p3', '1B': 'p2', '2B': 'p4', '3B': 'p12', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p6' },
      // bench: p5, p7, p8
      3: { P: 'p2', C: 'p4', '1B': 'p1', '2B': 'p3', '3B': 'p5', SS: 'p7', LF: 'p8', CF: 'p12', RF: 'p11' },
      // bench: p6, p9, p10
      4: { P: 'p2', C: 'p4', '1B': 'p6', '2B': 'p9', '3B': 'p10', SS: 'p3', LF: 'p1', CF: 'p5', RF: 'p12' },
      // bench: p7, p8, p11
    });

    // Verify: p1 benches inn (none of 1,2 since P; inn 3 plays 1B; inn 4 plays LF) -> benches 0 times.
    // Hmm, p1 plays all 4 innings. That doesn't work.
    // The issue: p1 is pitcher inn 1,2 and also plays inn 3,4. So p1 benches 0.
    // We need to force p1 to bench once. But p1 is pitcher in inn 1,2 so we can't bench p1 then.
    // We CAN bench p1 in inn 3 or 4.

    const lineup3 = buildLineup({
      1: { P: 'p1', C: 'p3', '1B': 'p5', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p11' },
      // bench: p2, p4, p12
      2: { P: 'p1', C: 'p3', '1B': 'p2', '2B': 'p12', '3B': 'p4', SS: 'p9', LF: 'p10', CF: 'p6', RF: 'p8' },
      // bench: p5, p7, p11
      3: { P: 'p2', C: 'p4', '1B': 'p5', '2B': 'p7', '3B': 'p11', SS: 'p12', LF: 'p6', CF: 'p8', RF: 'p10' },
      // bench: p1, p3, p9
      4: { P: 'p2', C: 'p4', '1B': 'p1', '2B': 'p3', '3B': 'p9', SS: 'p5', LF: 'p7', CF: 'p11', RF: 'p12' },
      // bench: p6, p8, p10
    });

    // Verify bench counts:
    // p1:  plays 1(P),2(P),4(1B) -> bench 3 -> 1 time
    // p2:  plays 2(1B),3(P),4(P) -> bench 1 -> 1 time
    // p3:  plays 1(C),2(C),4(2B) -> bench 3 -> 1 time
    // p4:  plays 2(3B),3(C),4(C) -> bench 1 -> 1 time
    // p5:  plays 1(1B),3(1B),4(SS) -> bench 2 -> 1 time
    // p6:  plays 1(2B),2(CF),3(LF) -> bench 4 -> 1 time
    // p7:  plays 1(3B),3(2B),4(LF) -> bench 2 -> 1 time
    // p8:  plays 1(SS),2(RF),3(CF) -> bench 4 -> 1 time
    // p9:  plays 1(LF),2(SS),4(3B) -> bench 3 -> 1 time
    // p10: plays 1(CF),2(LF),3(RF) -> bench 4 -> 1 time
    // p11: plays 1(RF),3(3B),4(CF) -> bench 2 -> 1 time
    // p12: plays 2(2B),3(SS),4(RF) -> bench 1 -> 1 time
    // All bench exactly 1 time! max-min = 0. benchEquity = 100.

    const score = scoreLineup(lineup3, input);
    expect(score.benchEquity).toBe(100);
  });

  it('penalizes uneven bench distribution (benchEquity < 70)', () => {
    // One player benched 4 innings, another benched 0
    const input = makeDefaultInput({
      presentPlayers: players11,
      innings: 6,
    });

    // Build lineup where p11 is benched innings 1,2,3,4 and p10 is never benched
    // 11 players, 9 play per inning -> 2 benched per inning -> 12 total bench slots
    // p11 benched 4 times, p10 benched 0 times -> max-min = 4
    // benchEquity = 100 * (1 - 4/6) = 33.3

    const lineup = buildLineup({
      1: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p5', '3B': 'p6', SS: 'p7', LF: 'p8', CF: 'p9', RF: 'p10' },
      // bench: p2, p11
      2: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p5', '3B': 'p6', SS: 'p7', LF: 'p8', CF: 'p9', RF: 'p10' },
      // bench: p2, p11
      3: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p4' },
      // bench: p1, p11
      4: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p4' },
      // bench: p1, p11
      5: { P: 'p3', C: 'p6', '1B': 'p1', '2B': 'p2', '3B': 'p4', SS: 'p5', LF: 'p7', CF: 'p8', RF: 'p10' },
      // bench: p9, p11 -- actually that's 5 bench for p11. Let me make it 4.
      5: { P: 'p3', C: 'p6', '1B': 'p1', '2B': 'p2', '3B': 'p11', SS: 'p5', LF: 'p7', CF: 'p8', RF: 'p10' },
      // bench: p4, p9
      6: { P: 'p3', C: 'p6', '1B': 'p1', '2B': 'p2', '3B': 'p4', SS: 'p5', LF: 'p7', CF: 'p8', RF: 'p10' },
      // bench: p9, p11
    });

    // Bench counts: p11=4 (inn 1,2,3,4... wait let me recount)
    // inn 1: bench p2, p11
    // inn 2: bench p2, p11
    // inn 3: bench p1, p11
    // inn 4: bench p1, p11
    // inn 5: bench p4, p9
    // inn 6: bench p9, p11
    // p11 benched: 1,2,3,4,6 = 5 times. Oops. Need to fix.
    // Let me bench p11 exactly 4 times:
    // inn 5 already doesn't bench p11 (p11 plays 3B in inn 5).
    // inn 6: let's put p11 in the lineup.

    const lineup2 = buildLineup({
      1: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p5', '3B': 'p6', SS: 'p7', LF: 'p8', CF: 'p9', RF: 'p10' },
      // bench: p2, p11
      2: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p5', '3B': 'p6', SS: 'p7', LF: 'p8', CF: 'p9', RF: 'p10' },
      // bench: p2, p11
      3: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p4' },
      // bench: p1, p11
      4: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p6', '3B': 'p7', SS: 'p8', LF: 'p9', CF: 'p10', RF: 'p4' },
      // bench: p1, p11
      5: { P: 'p3', C: 'p6', '1B': 'p11', '2B': 'p2', '3B': 'p4', SS: 'p5', LF: 'p7', CF: 'p8', RF: 'p10' },
      // bench: p1, p9
      6: { P: 'p3', C: 'p6', '1B': 'p11', '2B': 'p2', '3B': 'p4', SS: 'p5', LF: 'p7', CF: 'p8', RF: 'p10' },
      // bench: p1, p9
    });

    // Bench counts:
    // p1: inn 3,4,5,6 = 4
    // p2: inn 1,2 = 2
    // p3: 0
    // p4: 0  (plays 1,2 as C, 5,6 as 3B, 3,4 as RF)
    // p5: 0  (plays 1,2 as 2B, 3,4 as C, 5,6 as SS)
    // p6: 0  (plays 1,2 as 3B, 3,4 as 2B, 5,6 as C)
    // p7: 0  (plays 1,2 as SS, 3,4 as 3B, 5,6 as LF)
    // p8: 0  (plays 1,2 as LF, 3,4 as SS, 5,6 as CF)
    // p9: inn 5,6 = 2  (plays 1,2 as CF, 3,4 as LF)
    // p10: 0 (plays all innings as RF or CF)
    // p11: inn 1,2,3,4 = 4
    // max=4, min=0, spread=4
    // benchEquity = 100 * (1 - 4/6) = 33.3

    const score = scoreLineup(lineup2, input);
    expect(score.benchEquity).toBeLessThan(70);
    expect(score.benchEquity).toBeGreaterThanOrEqual(0);
  });

  it('scores high infieldBalance when infield innings are evenly distributed', () => {
    // Use a generated valid lineup — the generator distributes infield fairly
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);

    const score = scoreLineup(result.lineup, input);
    // Generator enforces infield minimum, so balance should be reasonable (> 30)
    // The random nature of the generator means infield distribution can vary
    expect(score.infieldBalance).toBeGreaterThan(30);
  });

  it('scores low positionVariety when every player plays the same position each inning', () => {
    // Build a lineup where non-P/C players always play the same position
    const input = makeDefaultInput({
      presentPlayers: players11,
      innings: 6,
    });

    // p3 always 1B, p7 always 2B, p8 always 3B, p9 always SS, p10 always LF, p11 always CF
    // p2 always RF when not benched
    const lineup = buildLineup({
      1: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p2' },
      // bench: p5, p6
      2: { P: 'p1', C: 'p4', '1B': 'p3', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p5' },
      // bench: p2, p6
      3: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p6' },
      // bench: p1, p4
      4: { P: 'p2', C: 'p5', '1B': 'p3', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p4' },
      // bench: p1, p6
      5: { P: 'p3', C: 'p6', '1B': 'p1', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p2' },
      // bench: p4, p5
      6: { P: 'p3', C: 'p6', '1B': 'p4', '2B': 'p7', '3B': 'p8', SS: 'p9', LF: 'p10', CF: 'p11', RF: 'p5' },
      // bench: p1, p2
    });

    const score = scoreLineup(lineup, input);
    // Most players play only 1 unique non-P/C position. Max possible = min(6, 7) = 6.
    // p7: only 2B = 1 unique. p8: only 3B = 1. p9: only SS = 1. p10: only LF = 1. p11: only CF = 1.
    // p1: 1B(inn5) = 1. p2: RF(inn1,5) = 1. p3: 1B(inn1-4) = 1. p4: 1B(inn6) + RF(inn4) = 2.
    // p5: RF(inn2,6) = 1. p6: RF(inn3) = 1.
    // Average ~= (1+1+1+2+1+1+1+1+1+1+1)/11 = 12/11 ~= 1.09
    // Score ~= 100 * (1.09 / 6) ~= 18.2
    expect(score.positionVariety).toBeLessThan(30);
  });

  it('returns scores between 0 and 100 inclusive for a generated lineup', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);

    const score = scoreLineup(result.lineup, input);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.benchEquity).toBeGreaterThanOrEqual(0);
    expect(score.benchEquity).toBeLessThanOrEqual(100);
    expect(score.infieldBalance).toBeGreaterThanOrEqual(0);
    expect(score.infieldBalance).toBeLessThanOrEqual(100);
    expect(score.positionVariety).toBeGreaterThanOrEqual(0);
    expect(score.positionVariety).toBeLessThanOrEqual(100);
  });

  it('total is weighted average of sub-scores', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);

    const score = scoreLineup(result.lineup, input);
    const expected = Math.round(
      (score.benchEquity * 0.5 + score.infieldBalance * 0.3 + score.positionVariety * 0.2) * 10,
    ) / 10;
    expect(score.total).toBeCloseTo(expected, 1);
  });

  it('scores consistently across multiple generated lineups (all within 0-100)', () => {
    const input = makeDefaultInput();
    for (let i = 0; i < 10; i++) {
      const result = generateLineup(input);
      if (result.valid) {
        const score = scoreLineup(result.lineup, input);
        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(100);
      }
    }
  });
});
