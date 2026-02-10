import { describe, it, expect } from 'vitest';
import { getBand, calculateBandCounts, generateBattingOrder } from './batting-order.ts';
import type { Player, BattingHistoryEntry } from '../types/index.ts';

// --- Test Helpers ---

function makePlayer(id: string, name: string): Player {
  return { id, name, isPresent: true };
}

const players9: Player[] = [
  makePlayer('p1', 'Alex'),
  makePlayer('p2', 'Blake'),
  makePlayer('p3', 'Casey'),
  makePlayer('p4', 'Drew'),
  makePlayer('p5', 'Emery'),
  makePlayer('p6', 'Frankie'),
  makePlayer('p7', 'Gray'),
  makePlayer('p8', 'Harper'),
  makePlayer('p9', 'Indigo'),
];

const players10: Player[] = [
  ...players9,
  makePlayer('p10', 'Jordan'),
];

const players11: Player[] = [
  ...players10,
  makePlayer('p11', 'Kelly'),
];

const players12: Player[] = [
  ...players11,
  makePlayer('p12', 'Logan'),
];

// --- getBand Tests ---

describe('getBand', () => {
  it('categorizes 9 players into 3/3/3 bands', () => {
    // Top: 0, 1, 2
    expect(getBand(0, 9)).toBe('top');
    expect(getBand(1, 9)).toBe('top');
    expect(getBand(2, 9)).toBe('top');
    // Middle: 3, 4, 5
    expect(getBand(3, 9)).toBe('middle');
    expect(getBand(4, 9)).toBe('middle');
    expect(getBand(5, 9)).toBe('middle');
    // Bottom: 6, 7, 8
    expect(getBand(6, 9)).toBe('bottom');
    expect(getBand(7, 9)).toBe('bottom');
    expect(getBand(8, 9)).toBe('bottom');
  });

  it('categorizes 10 players into 3/3/4 bands', () => {
    // Top: 0, 1, 2
    expect(getBand(0, 10)).toBe('top');
    expect(getBand(2, 10)).toBe('top');
    // Middle: 3, 4, 5
    expect(getBand(3, 10)).toBe('middle');
    expect(getBand(5, 10)).toBe('middle');
    // Bottom: 6, 7, 8, 9
    expect(getBand(6, 10)).toBe('bottom');
    expect(getBand(9, 10)).toBe('bottom');
  });

  it('categorizes 11 players into 3/4/4 bands', () => {
    // Top: 0, 1, 2
    expect(getBand(0, 11)).toBe('top');
    expect(getBand(2, 11)).toBe('top');
    // Middle: 3, 4, 5, 6
    expect(getBand(3, 11)).toBe('middle');
    expect(getBand(6, 11)).toBe('middle');
    // Bottom: 7, 8, 9, 10
    expect(getBand(7, 11)).toBe('bottom');
    expect(getBand(10, 11)).toBe('bottom');
  });

  it('categorizes 12 players into 4/4/4 bands', () => {
    // Top: 0, 1, 2, 3
    expect(getBand(0, 12)).toBe('top');
    expect(getBand(3, 12)).toBe('top');
    // Middle: 4, 5, 6, 7
    expect(getBand(4, 12)).toBe('middle');
    expect(getBand(7, 12)).toBe('middle');
    // Bottom: 8, 9, 10, 11
    expect(getBand(8, 12)).toBe('bottom');
    expect(getBand(11, 12)).toBe('bottom');
  });
});

// --- calculateBandCounts Tests ---

describe('calculateBandCounts', () => {
  it('returns zero counts for empty history', () => {
    const ids = players9.map(p => p.id);
    const counts = calculateBandCounts(ids, []);
    expect(counts).toHaveLength(9);
    for (const c of counts) {
      expect(c.top).toBe(0);
      expect(c.middle).toBe(0);
      expect(c.bottom).toBe(0);
    }
  });

  it('tallies band counts from single game history', () => {
    const ids = players9.map(p => p.id);
    const history: BattingHistoryEntry[] = [{
      id: 'g1',
      gameDate: '2026-01-01',
      order: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
    }];
    const counts = calculateBandCounts(ids, history);
    // p1 was position 0 -> top
    const p1 = counts.find(c => c.playerId === 'p1')!;
    expect(p1.top).toBe(1);
    expect(p1.middle).toBe(0);
    expect(p1.bottom).toBe(0);
    // p4 was position 3 -> middle
    const p4 = counts.find(c => c.playerId === 'p4')!;
    expect(p4.top).toBe(0);
    expect(p4.middle).toBe(1);
    expect(p4.bottom).toBe(0);
    // p9 was position 8 -> bottom
    const p9 = counts.find(c => c.playerId === 'p9')!;
    expect(p9.top).toBe(0);
    expect(p9.middle).toBe(0);
    expect(p9.bottom).toBe(1);
  });

  it('accumulates counts from multiple game history', () => {
    const ids = ['p1', 'p2', 'p3'];
    const history: BattingHistoryEntry[] = [
      { id: 'g1', gameDate: '2026-01-01', order: ['p1', 'p2', 'p3'] },
      { id: 'g2', gameDate: '2026-01-08', order: ['p1', 'p2', 'p3'] },
      { id: 'g3', gameDate: '2026-01-15', order: ['p3', 'p2', 'p1'] },
    ];
    const counts = calculateBandCounts(ids, history);
    // p1: top 2 times (g1, g2), bottom 1 time (g3)
    const p1 = counts.find(c => c.playerId === 'p1')!;
    expect(p1.top).toBe(2);
    expect(p1.bottom).toBe(1);
    // p3: bottom 2 times (g1, g2), top 1 time (g3)
    const p3 = counts.find(c => c.playerId === 'p3')!;
    expect(p3.bottom).toBe(2);
    expect(p3.top).toBe(1);
  });

  it('silently skips deleted players in history', () => {
    // Only p1 and p2 are present, but history has p3 (deleted)
    const ids = ['p1', 'p2'];
    const history: BattingHistoryEntry[] = [{
      id: 'g1',
      gameDate: '2026-01-01',
      order: ['p1', 'p2', 'p3'],
    }];
    const counts = calculateBandCounts(ids, history);
    expect(counts).toHaveLength(2);
    // p3 not in result at all
    expect(counts.find(c => c.playerId === 'p3')).toBeUndefined();
    // p1 still counted correctly
    const p1 = counts.find(c => c.playerId === 'p1')!;
    expect(p1.top).toBe(1);
  });

  it('returns zero counts for present player not in history', () => {
    const ids = ['p1', 'p2', 'p_new'];
    const history: BattingHistoryEntry[] = [{
      id: 'g1',
      gameDate: '2026-01-01',
      order: ['p1', 'p2'],
    }];
    const counts = calculateBandCounts(ids, history);
    const pNew = counts.find(c => c.playerId === 'p_new')!;
    expect(pNew.top).toBe(0);
    expect(pNew.middle).toBe(0);
    expect(pNew.bottom).toBe(0);
  });
});

// --- generateBattingOrder Tests ---

describe('generateBattingOrder', () => {
  it('returns shuffled order of correct length when no history', () => {
    const order = generateBattingOrder(players9, []);
    expect(order).toHaveLength(9);
    // Every player appears exactly once
    const unique = new Set(order);
    expect(unique.size).toBe(9);
    for (const p of players9) {
      expect(order).toContain(p.id);
    }
  });

  it('returns all present players exactly once with history', () => {
    const history: BattingHistoryEntry[] = [{
      id: 'g1',
      gameDate: '2026-01-01',
      order: players9.map(p => p.id),
    }];
    const order = generateBattingOrder(players9, history);
    expect(order).toHaveLength(9);
    const unique = new Set(order);
    expect(unique.size).toBe(9);
    for (const p of players9) {
      expect(order).toContain(p.id);
    }
  });

  it('does not include absent players', () => {
    const presentPlayers = players9.slice(0, 7);
    const order = generateBattingOrder(presentPlayers, []);
    expect(order).toHaveLength(7);
    expect(order).not.toContain('p8');
    expect(order).not.toContain('p9');
  });

  it('rotates top-heavy players toward bottom with history', () => {
    // p1 has been in top 3 times; should NOT be in top band after rotation
    const history: BattingHistoryEntry[] = [
      { id: 'g1', gameDate: '2026-01-01', order: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'] },
      { id: 'g2', gameDate: '2026-01-08', order: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'] },
      { id: 'g3', gameDate: '2026-01-15', order: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'] },
    ];
    // Run multiple times to account for shuffle-within-band randomness
    let p1NeverInTop = true;
    for (let i = 0; i < 20; i++) {
      const order = generateBattingOrder(players9, history);
      const p1Pos = order.indexOf('p1');
      const band = getBand(p1Pos, 9);
      if (band === 'top') {
        p1NeverInTop = false;
        break;
      }
    }
    expect(p1NeverInTop).toBe(true);
  });

  it('works correctly with 10 players', () => {
    const order = generateBattingOrder(players10, []);
    expect(order).toHaveLength(10);
    const unique = new Set(order);
    expect(unique.size).toBe(10);
  });

  it('works correctly with 11 players', () => {
    const order = generateBattingOrder(players11, []);
    expect(order).toHaveLength(11);
    const unique = new Set(order);
    expect(unique.size).toBe(11);
  });

  it('works correctly with 12 players', () => {
    const order = generateBattingOrder(players12, []);
    expect(order).toHaveLength(12);
    const unique = new Set(order);
    expect(unique.size).toBe(12);
  });
});
