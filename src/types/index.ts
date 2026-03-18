export interface Player {
  id: string;
  name: string;
  isPresent: boolean;
}

export type Division = 'AAA' | 'Coast' | 'AA';

export interface GameConfig {
  division: Division;
  innings: number;
  pitchersPerGame: number;
  catchersPerGame: number;
}

export type TabId = 'game-day' | 'history' | 'settings';

// --- Stepper Types ---

export type StepId = 'attendance' | 'pc-assignment' | 'review' | 'print';

export interface StepperState {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  hasCompletedAllOnce: boolean;
  staleWarning: boolean;
}

// --- Lineup Types ---

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'LC' | 'CF' | 'RC' | 'RF';

export const POSITIONS_9: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
export const POSITIONS_10: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF'];

export const OUTFIELD_POSITIONS_3: Position[] = ['LF', 'CF', 'RF'];
export const OUTFIELD_POSITIONS_4: Position[] = ['LF', 'LC', 'RC', 'RF'];

// Aliases for backward compat (9-position set)
export const POSITIONS = POSITIONS_9;
export const OUTFIELD_POSITIONS = OUTFIELD_POSITIONS_3;
export const INFIELD_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];

export function getPositions(division: Division): Position[] {
  return division === 'AA' ? POSITIONS_10 : POSITIONS_9;
}
export function getOutfieldPositions(division: Division): Position[] {
  return division === 'AA' ? OUTFIELD_POSITIONS_4 : OUTFIELD_POSITIONS_3;
}
export function getFielderCount(division: Division): number {
  return division === 'AA' ? 10 : 9;
}
export function hasPlayerPitching(division: Division): boolean {
  return division !== 'AA';
}

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

// --- Batting Order Types ---

/** Batting order band: top, middle, or bottom of the lineup */
export type BattingBand = 'top' | 'middle' | 'bottom';

/** A single game's batting order record */
export interface BattingHistoryEntry {
  id: string;
  gameDate: string;
  order: string[];
}

/** Batting order state stored in localStorage */
export interface BattingOrderState {
  currentOrder: string[] | null;
  isConfirmed: boolean;
}

// --- Game History Types ---

/** Per-player summary within a single game history entry */
export interface PlayerGameSummary {
  playerId: string;
  playerName: string;
  battingPosition: number;
  fieldingPositions: Position[];
  benchInnings: number;
}

/** A complete snapshot of a saved game */
export interface GameHistoryEntry {
  id: string;
  gameDate: string;
  innings: number;
  lineup: Lineup;
  battingOrder: string[];
  playerSummaries: PlayerGameSummary[];
  gameLabel?: string;
  pitcherAssignments?: Record<number, string>;
  catcherAssignments?: Record<number, string>;
  playerCount?: number;
  division?: Division;
}
