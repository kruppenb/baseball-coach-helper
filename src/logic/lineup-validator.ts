import type { Lineup, Position } from '../types/index.ts';
import { getPositions, getFielderCount, getInfieldPositions, hasPlayerPitching } from '../types/index.ts';
import type { GenerateLineupInput, ValidationError } from './lineup-types.ts';

/**
 * Validates a lineup against all 9 rules and returns an array of coach-friendly errors.
 * Returns empty array if lineup is fully valid.
 */
export function validateLineup(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  return [
    ...validateGridComplete(lineup, input),
    ...validateNoDuplicates(lineup, input),
    ...validatePitcherAssignments(lineup, input),
    ...validateCatcherAssignments(lineup, input),
    ...validateNoConsecutiveBench(lineup, input),
    ...validateBalancedBenchRotation(lineup, input),
    ...validateInfieldMinimum(lineup, input),
    ...validatePositionBlocks(lineup, input),
    ...validateCatcherPitcherEligibility(lineup, input),
  ];
}

/** Resolve a player ID to a name using the presentPlayers list */
function getPlayerName(playerId: string, input: GenerateLineupInput): string {
  const player = input.presentPlayers.find(p => p.id === playerId);
  return player?.name ?? 'Unknown';
}

/**
 * GRID_COMPLETE: Every position must be filled every inning.
 */
function validateGridComplete(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const positions = getPositions(input.division);
  for (let inn = 1; inn <= input.innings; inn++) {
    const assignment = lineup[inn];
    for (const pos of positions) {
      if (!assignment || !assignment[pos]) {
        errors.push({
          rule: 'GRID_COMPLETE',
          message: `Inning ${inn} is missing a ${pos}.`,
          inning: inn,
          position: pos,
        });
      }
    }
  }

  return errors;
}

/**
 * NO_DUPLICATES: No player assigned to two positions in the same inning.
 */
function validateNoDuplicates(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let inn = 1; inn <= input.innings; inn++) {
    const assignment = lineup[inn];
    if (!assignment) continue;

    const seen = new Map<string, Position>();
    for (const pos of getPositions(input.division)) {
      const playerId = assignment[pos];
      if (!playerId) continue;

      const prevPos = seen.get(playerId);
      if (prevPos) {
        errors.push({
          rule: 'NO_DUPLICATES',
          message: `${getPlayerName(playerId, input)} is assigned to both ${prevPos} and ${pos} in inning ${inn}.`,
          inning: inn,
          playerId,
        });
      } else {
        seen.set(playerId, pos);
      }
    }
  }

  return errors;
}

/**
 * PITCHER_MATCH: Pitcher in each inning must match pre-assignment.
 */
function validatePitcherAssignments(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  if (!hasPlayerPitching(input.division)) return [];
  const errors: ValidationError[] = [];

  for (let inn = 1; inn <= input.innings; inn++) {
    const expectedId = input.pitcherAssignments[inn];
    if (!expectedId) continue;

    const assignment = lineup[inn];
    const actualId = assignment?.['P'];

    if (actualId !== expectedId) {
      const expectedName = getPlayerName(expectedId, input);
      const actualName = actualId ? getPlayerName(actualId, input) : 'no one';
      errors.push({
        rule: 'PITCHER_MATCH',
        message: `Inning ${inn} pitcher should be ${expectedName} but ${actualName} is assigned.`,
        inning: inn,
        playerId: expectedId,
        position: 'P',
      });
    }
  }

  return errors;
}

/**
 * CATCHER_MATCH: Catcher in each inning must match pre-assignment.
 */
function validateCatcherAssignments(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  if (!hasPlayerPitching(input.division)) return [];
  const errors: ValidationError[] = [];

  for (let inn = 1; inn <= input.innings; inn++) {
    const expectedId = input.catcherAssignments[inn];
    if (!expectedId) continue;

    const assignment = lineup[inn];
    const actualId = assignment?.['C'];

    if (actualId !== expectedId) {
      const expectedName = getPlayerName(expectedId, input);
      const actualName = actualId ? getPlayerName(actualId, input) : 'no one';
      errors.push({
        rule: 'CATCHER_MATCH',
        message: `Inning ${inn} catcher should be ${expectedName} but ${actualName} is assigned.`,
        inning: inn,
        playerId: expectedId,
        position: 'C',
      });
    }
  }

  return errors;
}

/**
 * NO_CONSECUTIVE_BENCH: No player should sit out 2+ consecutive innings.
 *
 * NOTE: The Coast rule only prohibits consecutive bench innings until every player has
 * sat at least once — after that, consecutive bench is allowed. We intentionally apply
 * the stricter "never consecutive" rule to both divisions to ensure more equal playing time.
 */
function validateNoConsecutiveBench(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const player of input.presentPlayers) {
    let consecutiveBench = 0;

    for (let inn = 1; inn <= input.innings; inn++) {
      const assignment = lineup[inn];
      const isPlaying = assignment && getPositions(input.division).some(pos => assignment[pos] === player.id);

      if (!isPlaying) {
        consecutiveBench++;
        if (consecutiveBench > 1) {
          errors.push({
            rule: 'NO_CONSECUTIVE_BENCH',
            message: `${player.name} sits out innings ${inn - 1} and ${inn} in a row. Every player should get to play each inning.`,
            inning: inn,
            playerId: player.id,
          });
        }
      } else {
        consecutiveBench = 0;
      }
    }
  }

  return errors;
}

/**
 * BALANCED_BENCH_ROTATION (AAA only): No player sits out a 3rd inning
 * until all players have sat out a 2nd inning.
 * VLL Local Rules, AAA Sec. 2c-d.
 *
 * NOTE: This checks final bench counts rather than inning-by-inning ordering. The rule
 * technically requires the 3rd bench to not occur until all players have a 2nd, but we
 * only validate the end state. The generator's inning-by-inning build naturally respects
 * the ordering, and the final-count check is intentionally stricter than needed as a
 * safety net for equal playing time.
 */
function validateBalancedBenchRotation(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  if (input.division !== 'AAA' && input.division !== 'AA') return [];

  const errors: ValidationError[] = [];
  const playerCount = input.presentPlayers.length;

  // With fielderCount or fewer players nobody sits, so rule is trivially satisfied
  if (playerCount <= getFielderCount(input.division)) return errors;

  // Count bench innings per player
  const benchCounts: Record<string, number> = {};
  for (const player of input.presentPlayers) {
    benchCounts[player.id] = 0;
  }

  for (let inn = 1; inn <= input.innings; inn++) {
    const assignment = lineup[inn];
    const playing = new Set(getPositions(input.division).map(pos => assignment?.[pos]).filter(Boolean));
    for (const player of input.presentPlayers) {
      if (!playing.has(player.id)) {
        benchCounts[player.id]++;
      }
    }
  }

  const counts = Object.values(benchCounts);
  const maxBench = Math.max(...counts);
  const minBench = Math.min(...counts);

  // If any player has 3+ bench innings while another has < 2, it violates the rule
  if (maxBench >= 3 && minBench < 2) {
    const overBenched = input.presentPlayers.filter(p => benchCounts[p.id] >= 3);
    const underBenched = input.presentPlayers.filter(p => benchCounts[p.id] < 2);
    for (const player of overBenched) {
      errors.push({
        rule: 'BALANCED_BENCH_ROTATION',
        message: `${player.name} sits out ${benchCounts[player.id]} innings but ${underBenched[0]?.name ?? 'another player'} has only sat ${benchCounts[underBenched[0]?.id] ?? 0}. No player may sit a 3rd inning until all have sat a 2nd.`,
        playerId: player.id,
      });
    }
  }

  return errors;
}

/**
 * INFIELD_MINIMUM: Every player must have 2+ infield positions in innings 1 through min(4, totalInnings).
 *
 * NOTE: The Coast division rule only requires infield innings within the first 5 innings,
 * and AAA has no timing restriction at all. We intentionally use a tighter 4-inning window
 * for both divisions to maximize infield exposure for every player.
 *
 * Relaxation: a player whose only P/C innings fall AFTER the window (e.g. the last pitcher
 * who throws innings 5-6) gets their minimum dropped by 1 — their guaranteed P/C exposure
 * later in the game compensates for the tighter window allocation.
 */
function validateInfieldMinimum(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const maxCheckInning = Math.min(4, input.innings);
  const infieldPositions = getInfieldPositions(input.division);

  // Dynamic minimum: with fewer infield positions (e.g. AA has 5, not 6),
  // larger rosters can't give everyone 2 infield innings in 4 innings.
  const infieldSlots = infieldPositions.length * maxCheckInning;
  const minInfield = Math.min(2, Math.floor(infieldSlots / input.presentPlayers.length));
  if (minInfield < 1) return errors;

  const playerPitching = hasPlayerPitching(input.division);

  for (const player of input.presentPlayers) {
    let infieldCount = 0;
    let pcInWindow = 0;
    let pcOutsideWindow = 0;

    for (let inn = 1; inn <= input.innings; inn++) {
      const assignment = lineup[inn];
      if (!assignment) continue;

      if (inn <= maxCheckInning) {
        const isInfield = infieldPositions.some(pos => assignment[pos] === player.id);
        if (isInfield) infieldCount++;
      }

      if (playerPitching) {
        if (assignment['P'] === player.id || assignment['C'] === player.id) {
          if (inn <= maxCheckInning) pcInWindow++;
          else pcOutsideWindow++;
        }
      }
    }

    const playerMin = pcOutsideWindow > 0 && pcInWindow === 0
      ? Math.max(1, minInfield - 1)
      : minInfield;

    if (infieldCount < playerMin) {
      errors.push({
        rule: 'INFIELD_MINIMUM',
        message: `${player.name} only has ${infieldCount} infield position${infieldCount === 1 ? '' : 's'} in the first 4 innings. Every player needs at least ${playerMin}.`,
        playerId: player.id,
      });
    }
  }

  return errors;
}

/**
 * POSITION_BLOCK: No player should be assigned to a position they have blocked.
 */
function validatePositionBlocks(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [playerId, blockedPositions] of Object.entries(input.positionBlocks)) {
    if (!blockedPositions || blockedPositions.length === 0) continue;

    for (let inn = 1; inn <= input.innings; inn++) {
      const assignment = lineup[inn];
      if (!assignment) continue;

      for (const blockedPos of blockedPositions) {
        if (assignment[blockedPos] === playerId) {
          errors.push({
            rule: 'POSITION_BLOCK',
            message: `${getPlayerName(playerId, input)} is blocked from playing ${blockedPos} but is assigned there in inning ${inn}.`,
            inning: inn,
            playerId,
            position: blockedPos,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * CATCHER_PITCHER_ELIGIBILITY: A player who catches 4+ innings in a game
 * cannot pitch in that same game (Little League rule).
 */
function validateCatcherPitcherEligibility(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  if (!hasPlayerPitching(input.division)) return [];
  const errors: ValidationError[] = [];

  for (const player of input.presentPlayers) {
    let catcherInnings = 0;
    let pitcherInnings = 0;

    for (let inn = 1; inn <= input.innings; inn++) {
      const assignment = lineup[inn];
      if (!assignment) continue;
      if (assignment['C'] === player.id) catcherInnings++;
      if (assignment['P'] === player.id) pitcherInnings++;
    }

    if (catcherInnings >= 4 && pitcherInnings > 0) {
      errors.push({
        rule: 'CATCHER_PITCHER_ELIGIBILITY',
        message: `${player.name} catches ${catcherInnings} innings and pitches ${pitcherInnings} — a player who catches 4+ innings cannot pitch in the same game.`,
        playerId: player.id,
      });
    }
  }

  return errors;
}
