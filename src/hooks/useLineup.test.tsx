// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLineup } from './useLineup';

function seedRoster() {
  // 11 present players so generate() produces a complete, valid lineup.
  const players = Array.from({ length: 11 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isPresent: true,
  }));
  localStorage.setItem('roster', JSON.stringify(players));
}

describe('useLineup inning locks', () => {
  beforeEach(() => {
    localStorage.clear();
    seedRoster();
  });

  it('toggleInningLock adds then removes an inning', () => {
    const { result } = renderHook(() => useLineup());
    expect(result.current.lockedInnings).toEqual([]);

    act(() => result.current.toggleInningLock(2));
    expect(result.current.lockedInnings).toEqual([2]);

    act(() => result.current.toggleInningLock(2));
    expect(result.current.lockedInnings).toEqual([]);
  });

  it('drops locked innings beyond the current inning count', () => {
    // Default division AAA => 5 innings. Innings 9 is out of range.
    localStorage.setItem(
      'lineupState',
      JSON.stringify({
        pitcherAssignments: {},
        catcherAssignments: {},
        generatedLineups: [],
        selectedLineupIndex: null,
        lockedInnings: [1, 3, 9],
      }),
    );
    const { result } = renderHook(() => useLineup());
    expect(result.current.lockedInnings).toEqual([1, 3]);
  });

  it('generate() preserves a locked inning end-to-end', () => {
    const { result } = renderHook(() => useLineup());

    act(() => { result.current.generate(); });
    const lockedInning = result.current.selectedLineup![3];
    expect(lockedInning).toBeDefined();

    act(() => { result.current.toggleInningLock(3); });
    act(() => { result.current.generate(); });

    expect(result.current.selectedLineup![3]).toEqual(lockedInning);
  });
});
