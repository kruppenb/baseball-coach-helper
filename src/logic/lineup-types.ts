import type { Player, Lineup, Position, BatteryAssignments, PositionBlocks, Division } from '../types/index.ts';

export type ValidationRule =
  | 'GRID_COMPLETE'
  | 'NO_DUPLICATES'
  | 'PITCHER_MATCH'
  | 'CATCHER_MATCH'
  | 'NO_CONSECUTIVE_BENCH'
  | 'BALANCED_BENCH_ROTATION'
  | 'INFIELD_MINIMUM'
  | 'POSITION_BLOCK'
  | 'CATCHER_PITCHER_ELIGIBILITY';

export interface ValidationError {
  rule: ValidationRule;
  message: string;
  inning?: number;
  playerId?: string;
  position?: Position;
}

export interface GenerateLineupInput {
  presentPlayers: Player[];
  innings: number;
  division: Division;
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  positionBlocks: PositionBlocks;
  /** Maps playerId to cumulative bench innings from history. Higher = more field time priority. */
  benchPriority?: Record<string, number>;
}

export interface GenerateLineupResult {
  lineup: Lineup;
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  attemptCount: number;
}
