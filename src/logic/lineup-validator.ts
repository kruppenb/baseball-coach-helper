import type { Lineup, Position } from '../types/index.ts';
import { POSITIONS, INFIELD_POSITIONS } from '../types/index.ts';
import type { GenerateLineupInput, ValidationError } from './lineup-types.ts';

/**
 * Validates a lineup against all 8 rules and returns an array of coach-friendly errors.
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
    ...validateInfieldMinimum(lineup, input),
    ...validateNoConsecutivePosition(lineup, input),
    ...validatePositionBlocks(lineup, input),
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

  for (let inn = 1; inn <= input.innings; inn++) {
    const assignment = lineup[inn];
    for (const pos of POSITIONS) {
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
    for (const pos of POSITIONS) {
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
      const isPlaying = assignment && POSITIONS.some(pos => assignment[pos] === player.id);

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
 * INFIELD_MINIMUM: Every player must have 2+ infield positions in innings 1 through min(4, totalInnings).
 */
function validateInfieldMinimum(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const maxCheckInning = Math.min(4, input.innings);

  for (const player of input.presentPlayers) {
    let infieldCount = 0;

    for (let inn = 1; inn <= maxCheckInning; inn++) {
      const assignment = lineup[inn];
      if (!assignment) continue;

      const isInfield = INFIELD_POSITIONS.some(pos => assignment[pos] === player.id);
      if (isInfield) infieldCount++;
    }

    if (infieldCount < 2) {
      errors.push({
        rule: 'INFIELD_MINIMUM',
        message: `${player.name} only has ${infieldCount} infield position${infieldCount === 1 ? '' : 's'} in the first 4 innings. Every player needs at least 2.`,
        playerId: player.id,
      });
    }
  }

  return errors;
}

/**
 * NO_CONSECUTIVE_POSITION: No player should play the same position in consecutive innings,
 * except P and C which are exempt (per LINE-06).
 */
function validateNoConsecutivePosition(
  lineup: Lineup,
  input: GenerateLineupInput,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const exemptPositions: Position[] = ['P', 'C'];

  for (const player of input.presentPlayers) {
    for (let inn = 2; inn <= input.innings; inn++) {
      const prevAssignment = lineup[inn - 1];
      const currAssignment = lineup[inn];
      if (!prevAssignment || !currAssignment) continue;

      for (const pos of POSITIONS) {
        if (exemptPositions.includes(pos)) continue;

        if (prevAssignment[pos] === player.id && currAssignment[pos] === player.id) {
          errors.push({
            rule: 'NO_CONSECUTIVE_POSITION',
            message: `${player.name} plays ${pos} in both innings ${inn - 1} and ${inn}.`,
            inning: inn,
            playerId: player.id,
            position: pos,
          });
        }
      }
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
