// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBattingOrder } from './useBattingOrder';
import { useRoster } from './useRoster';

function setupRoster() {
  // useBattingOrder uses useRoster() and only generates a batting order when
  // there are present players. Seed localStorage so the hook sees a roster.
  const players = [
    { id: 'p1', name: 'Player 1', isPresent: true },
    { id: 'p2', name: 'Player 2', isPresent: true },
    { id: 'p3', name: 'Player 3', isPresent: true },
  ];
  localStorage.setItem('roster', JSON.stringify(players));
}

describe('useBattingOrder lock state', () => {
  beforeEach(() => {
    localStorage.clear();
    setupRoster();
  });

  it('setLocked(true) sets isLocked to true', () => {
    const { result } = renderHook(() => useBattingOrder());
    expect(result.current.isLocked).toBe(false);

    act(() => {
      result.current.setLocked(true);
    });

    expect(result.current.isLocked).toBe(true);
  });

  it('preserves isLocked when generate() is called (regression for the Regenerate-while-locked path)', () => {
    const { result } = renderHook(() => useBattingOrder());

    act(() => {
      result.current.setLocked(true);
    });
    expect(result.current.isLocked).toBe(true);

    act(() => {
      result.current.generate();
    });

    expect(result.current.isLocked).toBe(true);
    expect(result.current.currentOrder).not.toBeNull();
  });

  it('preserves isLocked when a second hook instance is rendered after locking (cross-instance sync)', () => {
    // Reproduces: lock the batting order on one component, then another
    // component using useBattingOrder mounts (e.g. ReviewStep next to
    // GameDayDesktop). The second instance should also see isLocked=true.
    const first = renderHook(() => useBattingOrder());

    act(() => {
      first.result.current.setLocked(true);
    });
    expect(first.result.current.isLocked).toBe(true);

    const second = renderHook(() => useBattingOrder());
    expect(second.result.current.isLocked).toBe(true);
  });

  it('preserves isLocked through a drag-reorder of the batting order', async () => {
    // Reproduces the user-reported bug: lock the batting order, then drag to
    // reorder a player. The lock icon must stay locked.
    //
    // The reorder path goes through useLineupEditor.reorderBattingOrder, which
    // operates on the editor's *local* batting order. This test renders both
    // hooks together and checks that the cloud-synced lock state in
    // useBattingOrder is preserved across an editor reorder.
    const { useLineupEditor } = await import('./useLineupEditor');

    const { result } = renderHook(() => {
      const batting = useBattingOrder();
      const editor = useLineupEditor(null, {
        presentPlayers: batting.presentPlayers,
        innings: 5,
        division: 'AAA' as const,
        pitcherAssignments: {},
        catcherAssignments: {},
        positionBlocks: {},
      });
      return { batting, editor };
    });

    // Generate a batting order, then lock it.
    act(() => {
      result.current.batting.generate();
    });
    const originalOrder = result.current.batting.currentOrder!;
    expect(originalOrder).not.toBeNull();

    act(() => {
      result.current.batting.setLocked(true);
    });
    expect(result.current.batting.isLocked).toBe(true);

    // Sync the editor's batting order to the cloud value, then drag-reorder.
    act(() => {
      result.current.editor.setBattingOrder(originalOrder);
    });
    const reordered = [originalOrder[1], originalOrder[0], ...originalOrder.slice(2)];
    act(() => {
      result.current.editor.reorderBattingOrder(reordered);
    });
    expect(result.current.editor.battingOrder).toEqual(reordered);

    // The lock must survive the reorder.
    expect(result.current.batting.isLocked).toBe(true);
  });

  it('preserves isLocked when useRoster updates trigger a re-render', () => {
    // Reproduces the user-reported bug: lock the order, then anything that
    // re-renders useBattingOrder's consumer (e.g. the roster/present list
    // updating) must not clobber the lock state.
    const { result, rerender } = renderHook(() => {
      const batting = useBattingOrder();
      // Touch useRoster so a roster change forces this hook to re-evaluate.
      useRoster();
      return batting;
    });

    act(() => {
      result.current.setLocked(true);
    });
    expect(result.current.isLocked).toBe(true);

    // Simulate the roster being touched (e.g. attendance toggled).
    act(() => {
      localStorage.setItem(
        'roster',
        JSON.stringify([
          { id: 'p1', name: 'Player 1', isPresent: true },
          { id: 'p2', name: 'Player 2', isPresent: false },
          { id: 'p3', name: 'Player 3', isPresent: true },
        ]),
      );
      window.dispatchEvent(
        new CustomEvent('local-storage-sync', {
          detail: {
            key: 'roster',
            value: [
              { id: 'p1', name: 'Player 1', isPresent: true },
              { id: 'p2', name: 'Player 2', isPresent: false },
              { id: 'p3', name: 'Player 3', isPresent: true },
            ],
          },
        }),
      );
    });

    rerender();

    expect(result.current.isLocked).toBe(true);
  });
});
