export interface Player {
  id: string;
  name: string;
  isPresent: boolean;
}

export interface GameConfig {
  innings: 5 | 6;
  pitchersPerGame: number;
  catchersPerGame: number;
}

export type TabId = 'game-day' | 'settings';

// --- Stepper Types ---

export type StepId = 'attendance' | 'pc-assignment' | 'review' | 'print';

export interface StepperState {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  hasCompletedAllOnce: boolean;
  staleWarning: boolean;
}

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

/** A complete snapshot of a finalized game */
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
}
