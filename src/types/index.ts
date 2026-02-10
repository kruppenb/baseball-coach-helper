export interface Player {
  id: string;
  name: string;
  isPresent: boolean;
}

export interface GameConfig {
  innings: 5 | 6;
}

export type TabId = 'roster' | 'game-setup' | 'lineup' | 'history';

// --- Lineup Types ---

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export const POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
export const INFIELD_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];
export const OUTFIELD_POSITIONS: Position[] = ['LF', 'CF', 'RF'];

/** A single inning's assignments: position -> playerId */
export type InningAssignment = Record<Position, string>;

/** Full lineup: inning number (1-based) -> assignments */
export type Lineup = Record<number, InningAssignment>;

/** Pre-assignments for pitcher/catcher: inning -> playerId */
export type BatteryAssignments = Record<number, string>;

/** Position blocks: playerId -> array of blocked positions */
export type PositionBlocks = Record<string, Position[]>;

/** Lineup generation state stored in localStorage */
export interface LineupState {
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  positionBlocks: PositionBlocks;
  generatedLineups: Lineup[];
  selectedLineupIndex: number | null;
}
