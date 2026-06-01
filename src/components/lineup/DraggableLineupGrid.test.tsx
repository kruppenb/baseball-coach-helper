// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableLineupGrid } from './DraggableLineupGrid';
import type { Lineup, Player } from '../../types/index';

const players: Player[] = [
  { id: 'p1', name: 'Alex', isPresent: true },
  { id: 'p2', name: 'Blake', isPresent: true },
];

// Minimal two-inning lineup; the grid only needs non-empty inning keys.
const lineup: Lineup = {
  1: { P: 'p1' } as Lineup[number],
  2: { P: 'p2' } as Lineup[number],
};

beforeEach(() => {
  localStorage.clear();
});

describe('DraggableLineupGrid inning locks', () => {
  it('renders a lock toggle per inning and reflects locked state', () => {
    render(
      <DraggableLineupGrid
        lineup={lineup}
        innings={2}
        players={players}
        errors={[]}
        onSwap={vi.fn()}
        onBenchSwap={vi.fn()}
        lockedInnings={[1]}
        onToggleInningLock={vi.fn()}
      />,
    );
    // Inning 1 is locked -> its toggle offers "Unlock"; inning 2 offers "Lock".
    expect(screen.getByLabelText('Unlock inning 1')).toBeTruthy();
    expect(screen.getByLabelText('Lock inning 2')).toBeTruthy();
  });

  it('fires onToggleInningLock with the inning number on click', () => {
    const onToggle = vi.fn();
    render(
      <DraggableLineupGrid
        lineup={lineup}
        innings={2}
        players={players}
        errors={[]}
        onSwap={vi.fn()}
        onBenchSwap={vi.fn()}
        lockedInnings={[]}
        onToggleInningLock={onToggle}
      />,
    );
    fireEvent.click(screen.getByLabelText('Lock inning 2'));
    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
