import type { Lineup, Position } from '../types/index.ts';
import { POSITIONS } from '../types/index.ts';
import type { GenerateLineupInput } from './lineup-types.ts';

// --- Types ---

export interface LineupScore {
  total: number;           // 0-100, weighted average
  benchEquity: number;     // 0-100
  infieldBalance: number;  // 0-100
  positionVariety: number; // 0-100
}

// --- Weights ---

export const BENCH_EQUITY_WEIGHT = 0.5;
export const INFIELD_BALANCE_WEIGHT = 0.3;
export const POSITION_VARIETY_WEIGHT = 0.2;

// --- Non-battery infield positions (exclude P/C) ---

const NON_BATTERY_INFIELD: Position[] = ['1B', '2B', '3B', 'SS'];

// --- Positions excluding P, C (for variety counting) ---

const NON_PC_POSITIONS: Position[] = ['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

// --- Sub-dimension: Bench Equity ---

function scoreBenchEquity(lineup: Lineup, input: GenerateLineupInput): number {
  const { presentPlayers, innings } = input;
  const playerCount = presentPlayers.length;

  // If exactly 9 players for 9 positions, nobody sits — perfect equity
  if (playerCount <= 9) return 100;

  // Count bench innings per player
  const benchCounts: Record<string, number> = {};
  for (const player of presentPlayers) {
    benchCounts[player.id] = 0;
  }

  for (let inn = 1; inn <= innings; inn++) {
    const playing = new Set(POSITIONS.map(pos => lineup[inn]?.[pos]).filter(Boolean));
    for (const player of presentPlayers) {
      if (!playing.has(player.id)) {
        benchCounts[player.id]++;
      }
    }
  }

  const counts = Object.values(benchCounts);
  const maxBench = Math.max(...counts);
  const minBench = Math.min(...counts);

  // If all players sit equally (spread = 0), perfect equity
  if (maxBench === minBench) return 100;

  // Score: 100 * (1 - (maxBench - minBench) / innings). Clamp to 0.
  const score = 100 * (1 - (maxBench - minBench) / innings);
  return Math.max(0, score);
}

// --- Sub-dimension: Infield Balance ---

function scoreInfieldBalance(lineup: Lineup, input: GenerateLineupInput): number {
  const { presentPlayers, innings } = input;
  const playerCount = presentPlayers.length;

  // Count non-battery infield innings per player
  const infieldCounts: Record<string, number> = {};
  for (const player of presentPlayers) {
    infieldCounts[player.id] = 0;
  }

  for (let inn = 1; inn <= innings; inn++) {
    for (const pos of NON_BATTERY_INFIELD) {
      const playerId = lineup[inn]?.[pos];
      if (playerId && infieldCounts[playerId] !== undefined) {
        infieldCounts[playerId]++;
      }
    }
  }

  const counts = Object.values(infieldCounts);
  const n = counts.length;
  if (n === 0) return 100;

  // Compute standard deviation
  const mean = counts.reduce((sum, c) => sum + c, 0) / n;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Max possible stdDev: approximately innings/2 for normal rosters,
  // or innings for exactly 9 players (everyone plays every inning)
  const maxStdDev = playerCount <= 9 ? innings : innings / 2;

  if (maxStdDev === 0) return 100;

  const score = 100 * (1 - stdDev / maxStdDev);
  return Math.max(0, score);
}

// --- Sub-dimension: Position Variety ---

function scorePositionVariety(lineup: Lineup, input: GenerateLineupInput): number {
  const { presentPlayers, innings } = input;

  // For each player, count unique non-P/C positions played
  const uniquePositionCounts: number[] = [];

  for (const player of presentPlayers) {
    const positions = new Set<Position>();
    for (let inn = 1; inn <= innings; inn++) {
      for (const pos of NON_PC_POSITIONS) {
        if (lineup[inn]?.[pos] === player.id) {
          positions.add(pos);
        }
      }
    }
    uniquePositionCounts.push(positions.size);
  }

  if (uniquePositionCounts.length === 0) return 100;

  const averageUnique = uniquePositionCounts.reduce((sum, c) => sum + c, 0) / uniquePositionCounts.length;

  // Max possible unique positions = min(innings, 7) (7 non-P/C positions)
  const maxPossible = Math.min(innings, 7);

  if (maxPossible === 0) return 100;

  const score = 100 * (averageUnique / maxPossible);
  return Math.min(100, Math.max(0, score));
}

// --- Main scoring function ---

export function scoreLineup(lineup: Lineup, input: GenerateLineupInput): LineupScore {
  const benchEquity = scoreBenchEquity(lineup, input);
  const infieldBalance = scoreInfieldBalance(lineup, input);
  const positionVariety = scorePositionVariety(lineup, input);

  const total = Math.round(
    (benchEquity * BENCH_EQUITY_WEIGHT +
     infieldBalance * INFIELD_BALANCE_WEIGHT +
     positionVariety * POSITION_VARIETY_WEIGHT) * 10,
  ) / 10;

  return { total, benchEquity, infieldBalance, positionVariety };
}
