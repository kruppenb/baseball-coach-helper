import { describe, it, expect } from 'vitest';
import { validateLineup } from './lineup-validator.ts';
import type { GenerateLineupInput } from './lineup-types.ts';
import type { Player, Lineup, InningAssignment } from '../types/index.ts';
import { POSITIONS, POSITIONS_10 } from '../types/index.ts';

// --- Test Helpers ---

function makePlayer(id: string, name: string): Player {
  return { id, name, isPresent: true };
}

const players = [
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

/** Build an inning assignment from 9 player IDs (POSITIONS order: P,C,1B,2B,3B,SS,LF,CF,RF) */
function makeInning(playerIds: string[]): InningAssignment {
  const assignment = {} as InningAssignment;
  POSITIONS.forEach((pos, i) => {
    assignment[pos] = playerIds[i];
  });
  return assignment;
}

/**
 * Valid 10-player 6-inning lineup. p1=P, p2=C all innings.
 * Bench: p10 (inn 1,3,5), p9 (inn 2,4,6) -- alternating, non-consecutive.
 * All players get 2+ infield in innings 1-4. No consecutive same position (except P/C).
 */
function makeValidLineup(): Lineup {
  return {
    //           P     C     1B    2B    3B    SS    LF    CF    RF
    1: makeInning(['p1', 'p2', 'p3', 'p4', 'p9', 'p5', 'p6', 'p7', 'p8']),
    2: makeInning(['p1', 'p2', 'p10','p6', 'p3', 'p8', 'p4', 'p5', 'p7']),
    3: makeInning(['p1', 'p2', 'p5', 'p9', 'p7', 'p4', 'p8', 'p3', 'p6']),
    4: makeInning(['p1', 'p2', 'p8', 'p10','p6', 'p7', 'p3', 'p4', 'p5']),
    5: makeInning(['p1', 'p2', 'p9', 'p3', 'p4', 'p8', 'p5', 'p6', 'p7']),
    6: makeInning(['p1', 'p2', 'p10','p8', 'p5', 'p6', 'p3', 'p7', 'p4']),
  };
}

function makeDefaultInput(overrides: Partial<GenerateLineupInput> = {}): GenerateLineupInput {
  return {
    presentPlayers: players.slice(0, 10),
    innings: 6,
    division: 'Coast',
    pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p1', 5: 'p1', 6: 'p1' },
    catcherAssignments: { 1: 'p2', 2: 'p2', 3: 'p2', 4: 'p2', 5: 'p2', 6: 'p2' },
    positionBlocks: {},
    ...overrides,
  };
}

// --- Tests ---

describe('validateLineup', () => {

  describe('valid lineup returns no errors', () => {
    it('returns empty array for a valid 10-player 6-inning lineup', () => {
      const lineup = makeValidLineup();
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      expect(errors).toEqual([]);
    });
  });

  describe('GRID_COMPLETE', () => {
    it('reports missing position in an inning', () => {
      const lineup = makeValidLineup();
      delete (lineup[3] as Record<string, string>)['RF'];
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const gridErrors = errors.filter(e => e.rule === 'GRID_COMPLETE');
      expect(gridErrors.length).toBeGreaterThan(0);
      expect(gridErrors[0].message).toContain('Inning 3');
      expect(gridErrors[0].message).toContain('RF');
      expect(gridErrors[0].inning).toBe(3);
    });
  });

  describe('NO_DUPLICATES', () => {
    it('reports player assigned to two positions in same inning', () => {
      const lineup = makeValidLineup();
      lineup[1]['LF'] = 'p3'; // p3 already at 1B in inning 1
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const dupErrors = errors.filter(e => e.rule === 'NO_DUPLICATES');
      expect(dupErrors.length).toBeGreaterThan(0);
      expect(dupErrors[0].message).toContain('Casey');
      expect(dupErrors[0].inning).toBe(1);
    });
  });

  describe('PITCHER_MATCH', () => {
    it('reports when pitcher does not match pre-assignment', () => {
      const lineup = makeValidLineup();
      lineup[2]['P'] = 'p3';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const pitchErrors = errors.filter(e => e.rule === 'PITCHER_MATCH');
      expect(pitchErrors.length).toBeGreaterThan(0);
      expect(pitchErrors[0].message).toContain('Alex');
      expect(pitchErrors[0].inning).toBe(2);
    });
  });

  describe('CATCHER_MATCH', () => {
    it('reports when catcher does not match pre-assignment', () => {
      const lineup = makeValidLineup();
      lineup[4]['C'] = 'p5';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const catchErrors = errors.filter(e => e.rule === 'CATCHER_MATCH');
      expect(catchErrors.length).toBeGreaterThan(0);
      expect(catchErrors[0].message).toContain('Blake');
      expect(catchErrors[0].inning).toBe(4);
    });
  });

  describe('NO_CONSECUTIVE_BENCH', () => {
    it('reports player sitting out two consecutive innings', () => {
      const lineup = makeValidLineup();
      // p10 is benched in inn1. Replace p10 in inn2 to create consecutive bench.
      lineup[2]['1B'] = 'p6'; // p6 now duplicated, but we filter for bench errors
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const benchErrors = errors.filter(e => e.rule === 'NO_CONSECUTIVE_BENCH');
      const p10Errors = benchErrors.filter(e => e.playerId === 'p10');
      expect(p10Errors.length).toBeGreaterThan(0);
      expect(p10Errors[0].message).toContain('Jordan');
      expect(p10Errors[0].message).toMatch(/innings?\s*1\s*(and|&)\s*2/i);
    });
  });

  describe('BALANCED_BENCH_ROTATION', () => {
    it('does NOT flag for Coast division (rule only applies to AAA)', () => {
      // Even with unbalanced bench, Coast should not trigger this rule
      const lineup = makeValidLineup();
      const input = makeDefaultInput({ division: 'Coast' });
      const errors = validateLineup(lineup, input);
      const balancedErrors = errors.filter(e => e.rule === 'BALANCED_BENCH_ROTATION');
      expect(balancedErrors).toEqual([]);
    });

    it('flags when a player sits 3 innings but another has sat fewer than 2 (AAA)', () => {
      // 11 players, 5 innings (AAA). p11 benched 3 times, p10 benched 0 times.
      const lineup: Lineup = {
        1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p10']),
        // bench: p9, p11
        2: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p9', 'p8', 'p10']),
        // bench: p7, p11
        3: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p7', 'p9', 'p6', 'p10']),
        // bench: p8, p11
        4: makeInning(['p1', 'p2', 'p11','p4', 'p5', 'p6', 'p7', 'p8', 'p10']),
        // bench: p3, p9
        5: makeInning(['p1', 'p2', 'p11','p3', 'p9', 'p6', 'p7', 'p8', 'p10']),
        // bench: p4, p5
      };
      const input = makeDefaultInput({
        presentPlayers: players,
        innings: 5,
        division: 'AAA',
        pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p1', 5: 'p1' },
        catcherAssignments: { 1: 'p2', 2: 'p2', 3: 'p2', 4: 'p2', 5: 'p2' },
      });
      const errors = validateLineup(lineup, input);
      const balancedErrors = errors.filter(e => e.rule === 'BALANCED_BENCH_ROTATION');
      expect(balancedErrors.length).toBeGreaterThan(0);
      expect(balancedErrors[0].message).toContain('Kelly'); // p11
    });
  });

  describe('INFIELD_MINIMUM', () => {
    it('reports player with fewer than 2 infield positions in innings 1-4', () => {
      // Custom lineup where p7 only has 1 infield position in innings 1-4
      const custom: Lineup = {
        1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']),   // p7=LF
        2: makeInning(['p1', 'p2', 'p10','p3', 'p9', 'p4', 'p5', 'p7', 'p6']),   // p7=CF
        3: makeInning(['p1', 'p2', 'p8', 'p9', 'p10','p3', 'p7', 'p6', 'p5']),   // p7=LF
        4: makeInning(['p1', 'p2', 'p6', 'p7', 'p8', 'p9', 'p3', 'p10','p5']),   // p7=2B (only 1 infield)
        5: makeInning(['p1', 'p2', 'p4', 'p5', 'p7', 'p3', 'p8', 'p9', 'p10']),
        6: makeInning(['p1', 'p2', 'p10','p3', 'p7', 'p5', 'p6', 'p4', 'p8']),
      };
      const input = makeDefaultInput({ presentPlayers: players });
      const errors = validateLineup(custom, input);
      const infieldErrors = errors.filter(e => e.rule === 'INFIELD_MINIMUM' && e.playerId === 'p7');
      expect(infieldErrors.length).toBeGreaterThan(0);
      expect(infieldErrors[0].message).toContain('Gray');
      expect(infieldErrors[0].message).toContain('1 infield position');
    });
  });

  describe('POSITION_BLOCK', () => {
    it('reports player assigned to a blocked position', () => {
      const lineup = makeValidLineup();
      const input = makeDefaultInput({
        positionBlocks: { p3: ['1B'] },
      });
      const errors = validateLineup(lineup, input);
      const blockErrors = errors.filter(
        e => e.rule === 'POSITION_BLOCK' && e.playerId === 'p3'
      );
      expect(blockErrors.length).toBeGreaterThan(0);
      expect(blockErrors[0].message).toContain('Casey');
      expect(blockErrors[0].message).toContain('1B');
      expect(blockErrors[0].inning).toBe(1);
    });
  });

  describe('CATCHER_PITCHER_ELIGIBILITY', () => {
    it('reports player who catches 4+ innings and also pitches', () => {
      // p1 pitches inning 1, catches innings 2-6 (5 catcher innings)
      const lineup: Lineup = {
        1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']),
        2: makeInning(['p3', 'p1', 'p10','p4', 'p5', 'p6', 'p7', 'p8', 'p9']),
        3: makeInning(['p3', 'p1', 'p5', 'p10','p9', 'p4', 'p8', 'p6', 'p7']),
        4: makeInning(['p3', 'p1', 'p8', 'p4', 'p10','p7', 'p6', 'p5', 'p9']),
        5: makeInning(['p3', 'p1', 'p9', 'p5', 'p4', 'p8', 'p10','p7', 'p6']),
        6: makeInning(['p3', 'p1', 'p10','p8', 'p6', 'p5', 'p4', 'p9', 'p7']),
      };
      const input = makeDefaultInput({
        presentPlayers: players,
        pitcherAssignments: { 1: 'p1', 2: 'p3', 3: 'p3', 4: 'p3', 5: 'p3', 6: 'p3' },
        catcherAssignments: { 1: 'p2', 2: 'p1', 3: 'p1', 4: 'p1', 5: 'p1', 6: 'p1' },
      });
      const errors = validateLineup(lineup, input);
      const eligErrors = errors.filter(e => e.rule === 'CATCHER_PITCHER_ELIGIBILITY');
      expect(eligErrors.length).toBeGreaterThan(0);
      expect(eligErrors[0].message).toContain('Alex');
      expect(eligErrors[0].message).toContain('catches');
      expect(eligErrors[0].message).toContain('pitch');
    });

    it('does NOT report player who catches only 3 innings and pitches', () => {
      // p1 pitches innings 1-3, catches innings 4-6 (3 catcher innings — under threshold)
      const lineup: Lineup = {
        1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']),
        2: makeInning(['p1', 'p2', 'p10','p3', 'p9', 'p4', 'p5', 'p7', 'p6']),
        3: makeInning(['p1', 'p2', 'p5', 'p9', 'p7', 'p4', 'p8', 'p3', 'p6']),
        4: makeInning(['p3', 'p1', 'p8', 'p10','p6', 'p7', 'p2', 'p4', 'p5']),
        5: makeInning(['p3', 'p1', 'p9', 'p4', 'p2', 'p8', 'p5', 'p6', 'p7']),
        6: makeInning(['p3', 'p1', 'p10','p8', 'p5', 'p6', 'p2', 'p7', 'p4']),
      };
      const input = makeDefaultInput({
        presentPlayers: players,
        pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p3', 5: 'p3', 6: 'p3' },
        catcherAssignments: { 1: 'p2', 2: 'p2', 3: 'p2', 4: 'p1', 5: 'p1', 6: 'p1' },
      });
      const errors = validateLineup(lineup, input);
      const eligErrors = errors.filter(e => e.rule === 'CATCHER_PITCHER_ELIGIBILITY');
      expect(eligErrors).toEqual([]);
    });

    it('does NOT report player who catches 4+ innings but does not pitch', () => {
      // p2 catches all 6 innings, never pitches
      const lineup = makeValidLineup();
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const eligErrors = errors.filter(e => e.rule === 'CATCHER_PITCHER_ELIGIBILITY');
      expect(eligErrors).toEqual([]);
    });
  });

  describe('multiple violations', () => {
    it('returns all errors, not just the first', () => {
      const lineup = makeValidLineup();
      delete (lineup[1] as Record<string, string>)['RF'];
      const input = makeDefaultInput({
        positionBlocks: { p3: ['1B'] },
      });
      const errors = validateLineup(lineup, input);
      const rules = new Set(errors.map(e => e.rule));
      expect(rules.size).toBeGreaterThanOrEqual(2);
      expect(rules.has('GRID_COMPLETE')).toBe(true);
      expect(rules.has('POSITION_BLOCK')).toBe(true);
    });
  });

  describe('error messages use player names', () => {
    it('never contains player IDs in error messages', () => {
      const lineup = makeValidLineup();
      lineup[2]['P'] = 'p3';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      for (const error of errors) {
        expect(error.message).not.toMatch(/\bp\d+\b/);
      }
    });
  });
});

// --- AA Division Validator Tests ---

/** Build an AA inning assignment from 10 player IDs (POSITIONS_10 order: P,C,1B,2B,3B,SS,LF,LC,RC,RF) */
function makeAAInning(playerIds: string[]): InningAssignment {
  const assignment = {} as InningAssignment;
  POSITIONS_10.forEach((pos, i) => {
    assignment[pos] = playerIds[i];
  });
  return assignment;
}

function makeAAInput(overrides: Partial<GenerateLineupInput> = {}): GenerateLineupInput {
  return {
    presentPlayers: players.slice(0, 11),
    innings: 4,
    division: 'AA',
    pitcherAssignments: {},
    catcherAssignments: {},
    positionBlocks: {},
    ...overrides,
  };
}

/**
 * Valid 11-player AA 4-inning lineup. 10 fielders per inning, 1 benched.
 * Bench: p11(inn1), p10(inn2), p11(inn3), p10(inn4)
 * All players get 2+ infield in 4 innings.
 *
 * Infield (P,C,1B,2B,3B,SS) assignments per player:
 *  p1:  P(1), 1B(2)  = 2   p2:  C(1), 2B(2)  = 2   p3: 1B(1), P(2), SS(3) = 3
 *  p4: 2B(1), C(2), 1B(4)  = 3  p5: 3B(1), 3B(2), P(3) = 3  p6: SS(1), SS(2), C(3) = 3
 *  p7: LF(1)→0, P(4)  → we need to ensure infield for 7 too
 * Let me carefully construct this.
 */
function makeValidAALineup(): Lineup {
  return {
    //          P     C     1B    2B    3B    SS    LF    LC    RC    RF
    1: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
    // p11 benched. p1=P, p2=C, p3=1B, p4=2B, p5=3B, p6=SS (6 infield). p7-p10 outfield.
    2: makeAAInning(['p7', 'p8', 'p9', 'p10','p11','p1', 'p3', 'p4', 'p5', 'p6']),
    // p2 benched. p7=P, p8=C, p9=1B, p10=2B, p11=3B, p1=SS (6 infield). p3-p6 outfield.
    3: makeAAInning(['p3', 'p4', 'p11','p9', 'p2', 'p10','p1', 'p6', 'p7', 'p8']),
    // p5 benched. p3=P, p4=C, p11=1B, p9=2B, p2=3B, p10=SS (6 infield). p1,p6,p7,p8 outfield.
    4: makeAAInning(['p5', 'p6', 'p2', 'p7', 'p8', 'p9', 'p10','p11','p3', 'p1']),
    // p4 benched. p5=P, p6=C, p2=1B, p7=2B, p8=3B, p9=SS (6 infield). p10,p11,p3,p1 outfield.
  };
  // Infield counts per player (P,C,1B,2B,3B,SS):
  // p1:  P(1), SS(2) = 2 ✓    p2:  C(1), 3B(3), 1B(4) = 3 ✓   p3:  1B(1), P(3) = 2 ✓
  // p4:  2B(1), C(3) = 2 ✓    p5:  3B(1), P(4) = 2 ✓           p6:  SS(1), C(4) = 2 ✓
  // p7:  P(2), 2B(4) = 2 ✓    p8:  C(2), 3B(4) = 2 ✓           p9:  1B(2), 2B(3), SS(4) = 3 ✓
  // p10: 2B(2), SS(3) = 2 ✓   p11: 3B(2), 1B(3) = 2 ✓
}

describe('validateLineup (AA division)', () => {
  it('returns no errors for a valid AA lineup', () => {
    const lineup = makeValidAALineup();
    const input = makeAAInput();
    const errors = validateLineup(lineup, input);
    expect(errors).toEqual([]);
  });

  it('GRID_COMPLETE checks 10 positions for AA', () => {
    const lineup = makeValidAALineup();
    delete (lineup[2] as Record<string, string>)['LC'];
    const input = makeAAInput();
    const errors = validateLineup(lineup, input);
    const gridErrors = errors.filter(e => e.rule === 'GRID_COMPLETE');
    expect(gridErrors.length).toBeGreaterThan(0);
    expect(gridErrors[0].message).toContain('LC');
  });

  it('skips PITCHER_MATCH validation for AA', () => {
    const lineup = makeValidAALineup();
    // Even if someone "assigns" a pitcher, the validator shouldn't check
    const input = makeAAInput({ pitcherAssignments: { 1: 'p99' } });
    const errors = validateLineup(lineup, input);
    const pitchErrors = errors.filter(e => e.rule === 'PITCHER_MATCH');
    expect(pitchErrors).toEqual([]);
  });

  it('skips CATCHER_MATCH validation for AA', () => {
    const lineup = makeValidAALineup();
    const input = makeAAInput({ catcherAssignments: { 1: 'p99' } });
    const errors = validateLineup(lineup, input);
    const catchErrors = errors.filter(e => e.rule === 'CATCHER_MATCH');
    expect(catchErrors).toEqual([]);
  });

  it('skips CATCHER_PITCHER_ELIGIBILITY for AA', () => {
    const lineup = makeValidAALineup();
    const input = makeAAInput();
    const errors = validateLineup(lineup, input);
    const eligErrors = errors.filter(e => e.rule === 'CATCHER_PITCHER_ELIGIBILITY');
    expect(eligErrors).toEqual([]);
  });

  it('enforces BALANCED_BENCH_ROTATION for AA', () => {
    // Create unbalanced bench: p11 benched 3 times, p10 benched 0
    const lineup: Lineup = {
      1: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
      2: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
      3: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
      4: makeAAInning(['p1', 'p2', 'p11','p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
    };
    const input = makeAAInput();
    const errors = validateLineup(lineup, input);
    const balancedErrors = errors.filter(e => e.rule === 'BALANCED_BENCH_ROTATION');
    expect(balancedErrors.length).toBeGreaterThan(0);
  });

  it('NO_CONSECUTIVE_BENCH uses 10 positions for AA', () => {
    // p11 benched both inning 1 and 2 (consecutive)
    const lineup: Lineup = {
      1: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
      2: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']),
      3: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p11','p7', 'p8', 'p9', 'p10']),
      4: makeAAInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p11','p7', 'p8', 'p9', 'p10']),
    };
    const input = makeAAInput();
    const errors = validateLineup(lineup, input);
    const benchErrors = errors.filter(e => e.rule === 'NO_CONSECUTIVE_BENCH' && e.playerId === 'p11');
    expect(benchErrors.length).toBeGreaterThan(0);
  });
});
