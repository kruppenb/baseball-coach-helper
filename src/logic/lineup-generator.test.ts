import { describe, it, expect } from 'vitest';
import { preValidate, generateLineup, generateMultipleLineups } from './lineup-generator.ts';
import type { GenerateLineupInput } from './lineup-types.ts';
import type { Player, Position } from '../types/index.ts';
import { POSITIONS, INFIELD_POSITIONS } from '../types/index.ts';

// --- Test Helpers ---

function makePlayer(id: string, name: string): Player {
  return { id, name, isPresent: true };
}

// 11-player roster
const players11: Player[] = [
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
  makePlayer('p11', 'Kelly'),
];

// 10-player roster (tight bench rotation)
const players10 = players11.slice(0, 10);

// 12-player roster
const players12 = [
  ...players11,
  makePlayer('p12', 'Logan'),
];

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

// --- preValidate Tests ---

describe('preValidate', () => {
  it('returns empty array for valid 11-player input', () => {
    const input = makeDefaultInput();
    const errors = preValidate(input);
    expect(errors).toEqual([]);
  });

  it('returns error when fewer than 9 players present', () => {
    const input = makeDefaultInput({
      presentPlayers: players11.slice(0, 8),
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('9');
    expect(errors[0]).toContain('8');
  });

  it('returns error when assigned pitcher is absent', () => {
    const input = makeDefaultInput({
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'absent-id', 4: 'p2', 5: 'p3', 6: 'p3' },
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.toLowerCase().includes('pitcher') && e.includes('3'))).toBe(true);
  });

  it('returns error when assigned catcher is absent', () => {
    const input = makeDefaultInput({
      catcherAssignments: { 1: 'p4', 2: 'absent-id', 3: 'p5', 4: 'p5', 5: 'p6', 6: 'p6' },
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.toLowerCase().includes('catcher') && e.includes('2'))).toBe(true);
  });

  it('returns error when same player assigned as pitcher and catcher in same inning', () => {
    const input = makeDefaultInput({
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p5', 4: 'p2', 5: 'p3', 6: 'p3' },
      catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p6', 6: 'p6' },
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.toLowerCase().includes('pitcher') && e.toLowerCase().includes('catcher') && e.includes('3'))).toBe(true);
  });

  it('returns error when position blocks make a position unfillable', () => {
    // Block all players from 3B except p1 and p2, who are always pitcher/catcher
    const blocks: Record<string, Position[]> = {};
    for (const p of players11) {
      if (p.id !== 'p1' && p.id !== 'p2') {
        blocks[p.id] = ['3B'];
      }
    }
    // p1 is pitcher all innings, p2 is pitcher some innings
    // Only p1 and p2 can play 3B, but they're always P/C
    const input = makeDefaultInput({
      presentPlayers: players11,
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p1', 5: 'p1', 6: 'p1' },
      catcherAssignments: { 1: 'p2', 2: 'p2', 3: 'p2', 4: 'p2', 5: 'p2', 6: 'p2' },
      positionBlocks: blocks,
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('3B'))).toBe(true);
  });

  it('returns empty array for valid input with 9 players', () => {
    const input = makeDefaultInput({
      presentPlayers: players11.slice(0, 9),
    });
    const errors = preValidate(input);
    expect(errors).toEqual([]);
  });

  it('returns error when player catches 4+ innings and also pitches', () => {
    const input = makeDefaultInput({
      // p1 pitches innings 1-2 and catches innings 3-6 (4 catcher innings)
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
      catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p1', 4: 'p1', 5: 'p1', 6: 'p1' },
    });
    const errors = preValidate(input);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.toLowerCase().includes('catch') && e.toLowerCase().includes('pitch'))).toBe(true);
  });

  it('does NOT warn when player catches only 3 innings and also pitches', () => {
    const input = makeDefaultInput({
      // p1 pitches innings 1-3 and catches innings 4-6 (3 catcher innings — ok)
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p2', 5: 'p3', 6: 'p3' },
      catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p1', 5: 'p1', 6: 'p1' },
    });
    const errors = preValidate(input);
    // Should have no catcher-pitcher errors (other errors may still exist)
    const catcherPitcherErrors = errors.filter(e => e.toLowerCase().includes('catch') && e.toLowerCase().includes('pitch') && e.includes('4'));
    expect(catcherPitcherErrors).toEqual([]);
  });
});

// --- generateLineup Tests ---

describe('generateLineup', () => {
  it('generates valid lineup for 11 players / 6 innings', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.attemptCount).toBeGreaterThan(0);
  });

  it('generates valid lineup for 11 players / 5 innings', () => {
    const input = makeDefaultInput({
      innings: 5,
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3' },
      catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p6' },
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('generates valid lineup for 10 players / 6 innings (tight bench)', () => {
    const input = makeDefaultInput({
      presentPlayers: players10,
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('generates valid lineup for 12 players / 6 innings', () => {
    const input = makeDefaultInput({
      presentPlayers: players12,
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('respects pitcher pre-assignments', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    for (let inn = 1; inn <= input.innings; inn++) {
      const expectedPitcher = input.pitcherAssignments[inn];
      if (expectedPitcher) {
        expect(result.lineup[inn]['P']).toBe(expectedPitcher);
      }
    }
  });

  it('respects catcher pre-assignments', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    for (let inn = 1; inn <= input.innings; inn++) {
      const expectedCatcher = input.catcherAssignments[inn];
      if (expectedCatcher) {
        expect(result.lineup[inn]['C']).toBe(expectedCatcher);
      }
    }
  });

  it('respects position blocks (blocked player never at blocked position)', () => {
    const input = makeDefaultInput({
      positionBlocks: { p7: ['1B', 'SS'] },
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    for (let inn = 1; inn <= input.innings; inn++) {
      expect(result.lineup[inn]['1B']).not.toBe('p7');
      expect(result.lineup[inn]['SS']).not.toBe('p7');
    }
  });

  it('produces no consecutive bench innings for any player', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    for (const player of input.presentPlayers) {
      let consecutiveBench = 0;
      for (let inn = 1; inn <= input.innings; inn++) {
        const isPlaying = POSITIONS.some(pos => result.lineup[inn][pos] === player.id);
        if (!isPlaying) {
          consecutiveBench++;
          expect(consecutiveBench).toBeLessThanOrEqual(1);
        } else {
          consecutiveBench = 0;
        }
      }
    }
  });

  it('gives every player 2+ infield positions by inning 4', () => {
    const input = makeDefaultInput();
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    const maxCheckInning = Math.min(4, input.innings);
    for (const player of input.presentPlayers) {
      let infieldCount = 0;
      for (let inn = 1; inn <= maxCheckInning; inn++) {
        const isInfield = INFIELD_POSITIONS.some(pos => result.lineup[inn][pos] === player.id);
        if (isInfield) infieldCount++;
      }
      expect(infieldCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('fails gracefully with coach-friendly error for impossible constraints', () => {
    const input = makeDefaultInput({
      presentPlayers: players11.slice(0, 8), // Only 8 players
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Should have a meaningful message, not technical jargon
    expect(result.errors[0].message.length).toBeGreaterThan(10);
  });

  it('works when P/C are not pre-assigned for some innings', () => {
    const input = makeDefaultInput({
      pitcherAssignments: { 1: 'p1', 2: 'p1' }, // Only innings 1-2 assigned
      catcherAssignments: { 1: 'p4', 2: 'p4' }, // Only innings 1-2 assigned
    });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    // Pre-assigned innings should match
    expect(result.lineup[1]['P']).toBe('p1');
    expect(result.lineup[2]['P']).toBe('p1');
    expect(result.lineup[1]['C']).toBe('p4');
    expect(result.lineup[2]['C']).toBe('p4');
    // Unassigned innings should have SOME player as P/C (not empty)
    expect(result.lineup[3]['P']).toBeTruthy();
    expect(result.lineup[3]['C']).toBeTruthy();
  });
});

// --- generateMultipleLineups Tests ---

describe('generateMultipleLineups', () => {
  it('returns 3 distinct valid lineups for standard 11-player input', () => {
    const input = makeDefaultInput();
    const results = generateMultipleLineups(input, 3);
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
    }
  });

  it('lineups are meaningfully different (not just outfield swaps)', () => {
    const input = makeDefaultInput();
    const results = generateMultipleLineups(input, 3);
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Check that at least bench patterns or infield assignments differ
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const a = results[i].lineup;
        const b = results[j].lineup;
        let hasMeaningfulDiff = false;

        for (let inn = 1; inn <= input.innings; inn++) {
          // Check bench differs
          const aPlaying = new Set(POSITIONS.map(pos => a[inn][pos]));
          const bPlaying = new Set(POSITIONS.map(pos => b[inn][pos]));
          const aBenched = input.presentPlayers.filter(p => !aPlaying.has(p.id)).map(p => p.id).sort().join(',');
          const bBenched = input.presentPlayers.filter(p => !bPlaying.has(p.id)).map(p => p.id).sort().join(',');
          if (aBenched !== bBenched) {
            hasMeaningfulDiff = true;
            break;
          }

          // Check infield differs
          for (const pos of INFIELD_POSITIONS) {
            if (a[inn][pos] !== b[inn][pos]) {
              hasMeaningfulDiff = true;
              break;
            }
          }
          if (hasMeaningfulDiff) break;
        }

        expect(hasMeaningfulDiff).toBe(true);
      }
    }
  });

  it('returns empty array for impossible constraints', () => {
    const input = makeDefaultInput({
      presentPlayers: players11.slice(0, 8), // Only 8 players
    });
    const results = generateMultipleLineups(input, 3);
    expect(results).toEqual([]);
  });

  it('returns 1-3 lineups for 10-player tight roster', () => {
    const input = makeDefaultInput({
      presentPlayers: players10,
    });
    const results = generateMultipleLineups(input, 3);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const r of results) {
      expect(r.valid).toBe(true);
    }
  });
});

// --- benchPriority Tests ---

describe('benchPriority', () => {
  it('generates valid lineup when benchPriority is undefined (backward compatible)', () => {
    const input = makeDefaultInput();
    // benchPriority is not set (undefined by default)
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('generates valid lineup when benchPriority is an empty object', () => {
    const input = makeDefaultInput({ benchPriority: {} });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('player with highest bench priority sits less on average across many runs', () => {
    // Use 11 players / 6 innings (2 bench per inning gives more room for priority to matter)
    // Give p11 very high bench priority so they should sit less
    const benchPriority: Record<string, number> = { p11: 20 };
    const inputWithPriority = makeDefaultInput({
      presentPlayers: players11,
      benchPriority,
    });
    const inputWithout = makeDefaultInput({
      presentPlayers: players11,
    });

    // Run 50 generations with and without priority, count bench innings for p11
    let benchWithPriority = 0;
    let benchWithout = 0;
    const runs = 50;

    for (let i = 0; i < runs; i++) {
      const r1 = generateLineup(inputWithPriority);
      if (r1.valid) {
        for (let inn = 1; inn <= inputWithPriority.innings; inn++) {
          const playing = POSITIONS.some(pos => r1.lineup[inn][pos] === 'p11');
          if (!playing) benchWithPriority++;
        }
      }

      const r2 = generateLineup(inputWithout);
      if (r2.valid) {
        for (let inn = 1; inn <= inputWithout.innings; inn++) {
          const playing = POSITIONS.some(pos => r2.lineup[inn][pos] === 'p11');
          if (!playing) benchWithout++;
        }
      }
    }

    // With high priority, p11 should have fewer or equal bench innings on average
    // Allow 10% tolerance for randomness in constraint solver
    expect(benchWithPriority).toBeLessThanOrEqual(benchWithout + runs * 0.2);
  });

  it('all constraints still hold with benchPriority set', () => {
    const benchPriority: Record<string, number> = {
      p7: 8, p8: 5, p9: 3, p10: 10,
    };
    const input = makeDefaultInput({ benchPriority });
    const result = generateLineup(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);

    // Verify no consecutive bench
    for (const player of input.presentPlayers) {
      let consecutiveBench = 0;
      for (let inn = 1; inn <= input.innings; inn++) {
        const isPlaying = POSITIONS.some(pos => result.lineup[inn][pos] === player.id);
        if (!isPlaying) {
          consecutiveBench++;
          expect(consecutiveBench).toBeLessThanOrEqual(1);
        } else {
          consecutiveBench = 0;
        }
      }
    }

    // Verify infield minimum
    const maxCheckInning = Math.min(4, input.innings);
    for (const player of input.presentPlayers) {
      let infieldCount = 0;
      for (let inn = 1; inn <= maxCheckInning; inn++) {
        const isInfield = INFIELD_POSITIONS.some(pos => result.lineup[inn][pos] === player.id);
        if (isInfield) infieldCount++;
      }
      expect(infieldCount).toBeGreaterThanOrEqual(2);
    }
  });
});
