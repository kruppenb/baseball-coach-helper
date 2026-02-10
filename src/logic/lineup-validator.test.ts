import { describe, it, expect } from 'vitest';
import { validateLineup } from './lineup-validator.ts';
import type { GenerateLineupInput } from './lineup-types.ts';
import type { Player, Lineup, InningAssignment, Position } from '../types/index.ts';
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

/** Build a full valid inning assignment from an array of 9 player IDs */
function makeInning(playerIds: string[]): InningAssignment {
  const assignment = {} as InningAssignment;
  POSITIONS.forEach((pos, i) => {
    assignment[pos] = playerIds[i];
  });
  return assignment;
}

/** Build a baseline valid 6-inning lineup for 11 players with good rotation */
function makeValidLineup(): Lineup {
  // Each inning has 9 playing, 2 on bench
  // Rotate bench so no one sits consecutive innings
  // Ensure every player gets 2+ infield positions in innings 1-4
  // No same position consecutively (except P/C)
  return {
    //           P     C     1B    2B    3B    SS    LF    CF    RF
    1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']),   // bench: p10, p11
    2: makeInning(['p1', 'p2', 'p10','p11','p3', 'p4', 'p5', 'p6', 'p7']),   // bench: p8, p9
    3: makeInning(['p1', 'p2', 'p8', 'p9', 'p10','p11','p3', 'p4', 'p5']),   // bench: p6, p7
    4: makeInning(['p1', 'p2', 'p6', 'p7', 'p8', 'p9', 'p10','p11','p3']),   // bench: p4, p5
    5: makeInning(['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10']), // bench: p3, p11
    6: makeInning(['p1', 'p2', 'p11','p3', 'p4', 'p5', 'p6', 'p7', 'p8']),  // bench: p9, p10
  };
}

function makeDefaultInput(overrides: Partial<GenerateLineupInput> = {}): GenerateLineupInput {
  return {
    presentPlayers: players,
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
    it('returns empty array for a valid 11-player 6-inning lineup', () => {
      const lineup = makeValidLineup();
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      expect(errors).toEqual([]);
    });
  });

  describe('GRID_COMPLETE', () => {
    it('reports missing position in an inning', () => {
      const lineup = makeValidLineup();
      // Remove RF from inning 3
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
      // Put p3 in both 1B and LF in inning 1
      lineup[1]['LF'] = 'p3';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const dupErrors = errors.filter(e => e.rule === 'NO_DUPLICATES');
      expect(dupErrors.length).toBeGreaterThan(0);
      expect(dupErrors[0].message).toContain('Casey'); // player name, not ID
      expect(dupErrors[0].inning).toBe(1);
    });
  });

  describe('PITCHER_MATCH', () => {
    it('reports when pitcher does not match pre-assignment', () => {
      const lineup = makeValidLineup();
      // Swap pitcher in inning 2 to p3 instead of p1
      lineup[2]['P'] = 'p3';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const pitchErrors = errors.filter(e => e.rule === 'PITCHER_MATCH');
      expect(pitchErrors.length).toBeGreaterThan(0);
      expect(pitchErrors[0].message).toContain('Alex'); // expected pitcher name
      expect(pitchErrors[0].inning).toBe(2);
    });
  });

  describe('CATCHER_MATCH', () => {
    it('reports when catcher does not match pre-assignment', () => {
      const lineup = makeValidLineup();
      // Swap catcher in inning 4 to p5 instead of p2
      lineup[4]['C'] = 'p5';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const catchErrors = errors.filter(e => e.rule === 'CATCHER_MATCH');
      expect(catchErrors.length).toBeGreaterThan(0);
      expect(catchErrors[0].message).toContain('Blake'); // expected catcher name
      expect(catchErrors[0].inning).toBe(4);
    });
  });

  describe('NO_CONSECUTIVE_BENCH', () => {
    it('reports player sitting out two consecutive innings', () => {
      const lineup = makeValidLineup();
      // Make p3 sit out innings 2 and 3 by removing from both
      // In inning 2: p3 is at position 3B (index 4). Replace with p8 (who is benched in inning 2)
      // Actually, let's just swap p3 out of inning 2 and inning 3
      // Inning 2 has p3 at 3B (position index 4). Replace with someone not in inning 2.
      // p8 is benched in inning 2, put p8 there
      lineup[2]['3B'] = 'p8';
      // Inning 3 has p3 at LF (position index 6). Replace with p6 (benched in inning 3)
      lineup[3]['LF'] = 'p6';
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const benchErrors = errors.filter(e => e.rule === 'NO_CONSECUTIVE_BENCH');
      const p3Errors = benchErrors.filter(e => e.playerId === 'p3');
      expect(p3Errors.length).toBeGreaterThan(0);
      expect(p3Errors[0].message).toContain('Casey');
      expect(p3Errors[0].message).toMatch(/innings?\s*2\s*(and|&)\s*3/i);
    });
  });

  describe('INFIELD_MINIMUM', () => {
    it('reports player with fewer than 2 infield positions in innings 1-4', () => {
      // Create a lineup where p7 only has outfield in innings 1-4
      const lineup = makeValidLineup();
      // In the valid lineup, check what p7 has in innings 1-4:
      // Inn 1: p7 = LF (outfield)
      // Inn 2: p7 = LF (outfield) -> wait, that is consecutive position...
      // Let me make a targeted lineup where p7 is only in outfield for innings 1-4
      // but has infield in innings 5-6 (shouldn't count)

      // Custom lineup just for this test
      const custom: Lineup = {
        1: makeInning(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9']),   // p7=LF
        2: makeInning(['p1', 'p2', 'p10','p11','p3', 'p4', 'p9', 'p7', 'p5']),   // p7=CF
        3: makeInning(['p1', 'p2', 'p8', 'p9', 'p10','p11','p5', 'p6', 'p7']),   // p7=RF
        4: makeInning(['p1', 'p2', 'p6', 'p7', 'p8', 'p9', 'p3', 'p11','p10']), // p7=2B -- only 1 infield
        5: makeInning(['p1', 'p2', 'p4', 'p5', 'p7', 'p3', 'p8', 'p9', 'p10']), // p7=3B
        6: makeInning(['p1', 'p2', 'p11','p3', 'p7', 'p5', 'p6', 'p4', 'p8']),  // p7=3B
      };
      // p7 infield in innings 1-4: only inning 4 (2B) = 1 infield position
      const input = makeDefaultInput();
      const errors = validateLineup(custom, input);
      const infieldErrors = errors.filter(e => e.rule === 'INFIELD_MINIMUM' && e.playerId === 'p7');
      expect(infieldErrors.length).toBeGreaterThan(0);
      expect(infieldErrors[0].message).toContain('Gray'); // p7 = Gray
      expect(infieldErrors[0].message).toContain('1 infield position');
    });
  });

  describe('NO_CONSECUTIVE_POSITION', () => {
    it('reports player at same non-P/C position in consecutive innings', () => {
      const lineup = makeValidLineup();
      // Put p5 at SS in both innings 3 and 4
      lineup[3]['SS'] = 'p5';
      lineup[4]['SS'] = 'p5';
      // Need to move previous SS holders elsewhere
      // Inn 3 had p11 at SS, inn 4 had p9 at SS
      lineup[3]['3B'] = 'p11'; // move p11 from where p10 was.. let me swap properly
      // Actually let me just set the positions directly. The other validation rules
      // may also fire but we're testing for this specific one.
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const consecErrors = errors.filter(
        e => e.rule === 'NO_CONSECUTIVE_POSITION' && e.playerId === 'p5'
      );
      expect(consecErrors.length).toBeGreaterThan(0);
      expect(consecErrors[0].message).toContain('Emery'); // p5 = Emery
      expect(consecErrors[0].message).toContain('SS');
    });

    it('does NOT report P playing pitcher in consecutive innings', () => {
      const lineup = makeValidLineup();
      // p1 is pitcher in all innings -- this should be fine
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      const pErrors = errors.filter(
        e => e.rule === 'NO_CONSECUTIVE_POSITION' && e.position === 'P'
      );
      expect(pErrors).toEqual([]);
    });

    it('does NOT report C playing catcher in consecutive innings', () => {
      const lineup = makeValidLineup();
      // p2 is catcher in all innings -- this should be fine
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
      // Block p3 from 1B. In inning 1, p3 plays 1B.
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
      // Create multiple violations:
      // 1. Missing RF in inning 1
      delete (lineup[1] as Record<string, string>)['RF'];
      // 2. Block p3 from 1B (p3 at 1B in inning 1)
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
      // Create a violation
      lineup[2]['P'] = 'p3'; // wrong pitcher
      const input = makeDefaultInput();
      const errors = validateLineup(lineup, input);
      for (const error of errors) {
        // Should not contain raw player IDs like p1, p2, etc.
        expect(error.message).not.toMatch(/\bp\d+\b/);
      }
    });
  });
});
