import { describe, it, expect } from 'vitest';
import {
  defaultInningCounts,
  buildDefaultAssignments,
  pickAutofillPlayers,
  countByPlayer,
  rotationOrder,
  combinedRotation,
} from './usePCAssignment';
import type { Player } from '../types';

const player = (id: string, name: string, isPresent = true): Player => ({ id, name, isPresent });

describe('defaultInningCounts', () => {
  it('returns empty for zero players', () => {
    expect(defaultInningCounts(0, 6)).toEqual([]);
  });

  it('splits evenly when divisible', () => {
    expect(defaultInningCounts(3, 6)).toEqual([2, 2, 2]);
  });

  it('gives the remainder to the earliest slots', () => {
    expect(defaultInningCounts(4, 6)).toEqual([2, 2, 1, 1]);
  });

  it('handles fewer innings than players', () => {
    expect(defaultInningCounts(4, 3)).toEqual([1, 1, 1, 0]);
  });
});

describe('buildDefaultAssignments', () => {
  it('places players into consecutive inning blocks', () => {
    expect(buildDefaultAssignments(['a', 'b', 'c'], 6)).toEqual({
      1: 'a', 2: 'a', 3: 'b', 4: 'b', 5: 'c', 6: 'c',
    });
  });

  it('handles uneven distribution', () => {
    expect(buildDefaultAssignments(['a', 'b'], 5)).toEqual({
      1: 'a', 2: 'a', 3: 'a', 4: 'b', 5: 'b',
    });
  });

  it('returns empty for zero innings', () => {
    expect(buildDefaultAssignments(['a'], 0)).toEqual({});
  });
});

describe('pickAutofillPlayers', () => {
  const players = [player('1', 'Sam'), player('2', 'Jake'), player('3', 'Mia'), player('4', 'Tom')];

  it('skips excluded players first', () => {
    expect(pickAutofillPlayers(players, 2, new Set(['1', '2']))).toEqual(['3', '4']);
  });

  it('falls back to excluded players when more are needed', () => {
    expect(pickAutofillPlayers(players, 3, new Set(['1', '2']))).toEqual(['3', '4', '1']);
  });

  it('returns fewer than count when strict and exclusions are too tight', () => {
    expect(pickAutofillPlayers(players, 3, new Set(['1', '2']), true)).toEqual(['3', '4']);
  });

  it('honors strict exclusions even when count is satisfiable', () => {
    expect(pickAutofillPlayers(players, 2, new Set(['1', '2']), true)).toEqual(['3', '4']);
  });

  it('returns empty for zero count', () => {
    expect(pickAutofillPlayers(players, 0, new Set())).toEqual([]);
  });

  it('caps at available players', () => {
    expect(pickAutofillPlayers(players, 99, new Set())).toEqual(['1', '2', '3', '4']);
  });
});

describe('countByPlayer', () => {
  it('counts assignments per player', () => {
    const result = countByPlayer({ 1: 'a', 2: 'a', 3: 'b', 4: '', 5: 'a' }, 6);
    expect(result).toEqual({ a: 3, b: 1 });
  });

  it('ignores assignments past the inning count', () => {
    const result = countByPlayer({ 1: 'a', 7: 'b' }, 6);
    expect(result).toEqual({ a: 1 });
  });
});

describe('rotationOrder', () => {
  it('returns unique players ordered by first appearance', () => {
    expect(rotationOrder({ 1: 'a', 2: 'b', 3: 'a', 4: 'c' }, 4)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for empty assignments', () => {
    expect(rotationOrder({}, 6)).toEqual([]);
  });
});

describe('combinedRotation', () => {
  it('orders pitchers first, then new catchers', () => {
    const pitchers = { 1: 'a', 2: 'b' };
    const catchers = { 1: 'c', 2: 'a' };
    expect(combinedRotation(pitchers, catchers, 2)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty inputs', () => {
    expect(combinedRotation({}, {}, 6)).toEqual([]);
  });
});
