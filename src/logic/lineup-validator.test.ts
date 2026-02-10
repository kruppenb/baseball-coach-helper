import { describe, it, expect } from 'vitest';
import { validateLineup } from './lineup-validator.ts';
import type { GenerateLineupInput } from './lineup-types.ts';
import type { Player, Lineup, InningAssignment } from '../types/index.ts';
import { POSITIONS } from '../types/index.ts';

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

  describe('NO_CONSECUTIVE_POSITION', () => {
    it('reports player at same non-P/C position in consecutive innings', () => {
      const lineup = makeValidLineup();
      lineup[3]['SS'] = 'p5';
      lineup[4]['SS'] = 'p5';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const consecErrors = errors.filter(
        e => e.rule === 'NO_CONSECUTIVE_POSITION' && e.playerId === 'p5'
      );
      expect(consecErrors.length).toBeGreaterThan(0);
      expect(consecErrors[0].message).toContain('Emery');
      expect(consecErrors[0].message).toContain('SS');
    });

    it('does NOT report P playing pitcher in consecutive innings', () => {
      const lineup = makeValidLineup();
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const pErrors = errors.filter(
        e => e.rule === 'NO_CONSECUTIVE_POSITION' && e.position === 'P'
      );
      expect(pErrors).toEqual([]);
    });

    it('does NOT report C playing catcher in consecutive innings', () => {
      const lineup = makeValidLineup();
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const cErrors = errors.filter(
        e => e.rule === 'NO_CONSECUTIVE_POSITION' && e.position === 'C'
      );
      expect(cErrors).toEqual([]);
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
