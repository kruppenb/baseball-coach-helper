import type { Position, Lineup, InningAssignment } from '../types/index.ts';
import { POSITIONS, INFIELD_POSITIONS, OUTFIELD_POSITIONS } from '../types/index.ts';
import type { GenerateLineupInput, GenerateLineupResult } from './lineup-types.ts';
import { validateLineup } from './lineup-validator.ts';

// --- Utility ---

/** Fisher-Yates shuffle (unbiased) */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const NON_BATTERY_INFIELD: Position[] = ['1B', '2B', '3B', 'SS'];

// --- Pre-validation ---

/**
 * Returns coach-friendly error strings for impossible inputs.
 * Empty array means input is valid for generation.
 */
export function preValidate(input: GenerateLineupInput): string[] {
  const errors: string[] = [];
  const { presentPlayers, innings, pitcherAssignments, catcherAssignments, positionBlocks } = input;
  const playerCount = presentPlayers.length;
  const presentIds = new Set(presentPlayers.map(p => p.id));

  // Must have at least 9 players for 9 positions
  if (playerCount < 9) {
    errors.push(
      `Need at least 9 present players to fill all positions. Currently ${playerCount} present.`,
    );
  }

  // Verify all assigned pitchers are present
  for (const [innStr, playerId] of Object.entries(pitcherAssignments)) {
    if (!playerId) continue;
    if (!presentIds.has(playerId)) {
      errors.push(`Pitcher for inning ${innStr} is not in the active roster.`);
    }
  }

  // Verify all assigned catchers are present
  for (const [innStr, playerId] of Object.entries(catcherAssignments)) {
    if (!playerId) continue;
    if (!presentIds.has(playerId)) {
      errors.push(`Catcher for inning ${innStr} is not in the active roster.`);
    }
  }

  // Check for same player as pitcher AND catcher in same inning
  for (let inn = 1; inn <= innings; inn++) {
    const pitcherId = pitcherAssignments[inn];
    const catcherId = catcherAssignments[inn];
    if (pitcherId && catcherId && pitcherId === catcherId) {
      errors.push(
        `Same player assigned as both pitcher and catcher in inning ${inn}.`,
      );
    }
  }

  // Check position blocks don't make a position unfillable
  // For each position, count how many players are NOT blocked from it
  // and are not permanently locked into P/C for ALL innings
  for (const pos of POSITIONS) {
    const blockedFromPos = new Set<string>();
    for (const [playerId, blockedPositions] of Object.entries(positionBlocks)) {
      if (blockedPositions && blockedPositions.includes(pos)) {
        blockedFromPos.add(playerId);
      }
    }

    // For non-P/C positions, check each inning
    if (pos !== 'P' && pos !== 'C') {
      for (let inn = 1; inn <= innings; inn++) {
        // Players available this inning = present, not blocked, not assigned as P or C this inning
        const pitcherId = pitcherAssignments[inn];
        const catcherId = catcherAssignments[inn];
        let eligible = 0;
        for (const player of presentPlayers) {
          if (blockedFromPos.has(player.id)) continue;
          if (player.id === pitcherId || player.id === catcherId) continue;
          eligible++;
        }
        if (eligible === 0) {
          errors.push(
            `Not enough players eligible for ${pos}. Consider removing some ${pos} blocks.`,
          );
          break; // Only report once per position
        }
      }
    }
  }

  return errors;
}

// --- Core Generation ---

/**
 * Retry-based constraint solver adapted from the reference algorithm.
 * Produces a single valid lineup or returns an error result.
 */
export function generateLineup(input: GenerateLineupInput): GenerateLineupResult {
  // Run pre-validation first
  const preErrors = preValidate(input);
  if (preErrors.length > 0) {
    return {
      lineup: {} as Lineup,
      valid: false,
      errors: preErrors.map(msg => ({
        rule: 'GRID_COMPLETE' as const,
        message: msg,
      })),
      attemptCount: 0,
    };
  }

  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lineup = attemptBuild(input);
    if (lineup) {
      const errors = validateLineup(lineup, input);
      if (errors.length === 0) {
        return { lineup, valid: true, errors: [], attemptCount: attempt + 1 };
      }
    }
  }

  return {
    lineup: {} as Lineup,
    valid: false,
    errors: [{
      rule: 'GRID_COMPLETE',
      message: 'Could not generate a valid lineup with these settings. Try adjusting pitcher/catcher assignments or position blocks.',
    }],
    attemptCount: maxAttempts,
  };
}

/**
 * Single build attempt. Returns null if constraints can't be satisfied in this attempt.
 */
function attemptBuild(input: GenerateLineupInput): Lineup | null {
  const { presentPlayers, innings, pitcherAssignments, catcherAssignments, positionBlocks } = input;
  const shuffledPlayers = shuffle(presentPlayers);
  const playerIds = shuffledPlayers.map(p => p.id);
  const lineup: Lineup = {};

  // Phase 1: Determine P/C for each inning
  const pitcherByInning: Record<number, string> = {};
  const catcherByInning: Record<number, string> = {};

  for (let inn = 1; inn <= innings; inn++) {
    pitcherByInning[inn] = pitcherAssignments[inn] || '';
    catcherByInning[inn] = catcherAssignments[inn] || '';
  }

  // For unassigned P/C, pick from available players
  // Track which players are used as P/C per inning
  const pcAssignedInnings: Record<string, number[]> = {};
  for (const p of playerIds) {
    pcAssignedInnings[p] = [];
  }

  for (let inn = 1; inn <= innings; inn++) {
    if (pitcherByInning[inn]) {
      const pid = pitcherByInning[inn];
      if (!pcAssignedInnings[pid]) pcAssignedInnings[pid] = [];
      pcAssignedInnings[pid].push(inn);
    }
    if (catcherByInning[inn]) {
      const cid = catcherByInning[inn];
      if (!pcAssignedInnings[cid]) pcAssignedInnings[cid] = [];
      pcAssignedInnings[cid].push(inn);
    }
  }

  // Fill unassigned pitcher/catcher slots
  for (let inn = 1; inn <= innings; inn++) {
    if (!pitcherByInning[inn]) {
      // Pick a player not already assigned as catcher this inning
      const catcherThisInning = catcherByInning[inn];
      const candidates = shuffle(playerIds.filter(id => {
        if (id === catcherThisInning) return false;
        if (isBlockedFrom(id, 'P', positionBlocks)) return false;
        return true;
      }));
      if (candidates.length === 0) return null;
      pitcherByInning[inn] = candidates[0];
      if (!pcAssignedInnings[candidates[0]]) pcAssignedInnings[candidates[0]] = [];
      pcAssignedInnings[candidates[0]].push(inn);
    }
    if (!catcherByInning[inn]) {
      const pitcherThisInning = pitcherByInning[inn];
      const candidates = shuffle(playerIds.filter(id => {
        if (id === pitcherThisInning) return false;
        if (isBlockedFrom(id, 'C', positionBlocks)) return false;
        return true;
      }));
      if (candidates.length === 0) return null;
      catcherByInning[inn] = candidates[0];
      if (!pcAssignedInnings[candidates[0]]) pcAssignedInnings[candidates[0]] = [];
      pcAssignedInnings[candidates[0]].push(inn);
    }
  }

  // Phase 2: Calculate infield needs per player
  // Each player needs 2 infield positions in innings 1 through min(4, innings)
  const maxInfieldInning = Math.min(4, innings);
  const playerInfieldNeeds: Record<string, number> = {};

  for (const pid of playerIds) {
    playerInfieldNeeds[pid] = 2;
    // Subtract P/C assignments from needed infield positions (P and C are infield)
    for (let inn = 1; inn <= maxInfieldInning; inn++) {
      if (pitcherByInning[inn] === pid || catcherByInning[inn] === pid) {
        playerInfieldNeeds[pid]--;
      }
    }
    if (playerInfieldNeeds[pid] < 0) playerInfieldNeeds[pid] = 0;
  }

  // Phase 3: Pre-assign infield slots for innings 1 through maxInfieldInning
  interface SlotAssignment {
    inn: number;
    pos: Position;
  }

  const slotAssignments: Record<string, SlotAssignment[]> = {};
  for (const pid of playerIds) {
    slotAssignments[pid] = [];
  }

  // Create list of infield slots to fill (excluding P/C positions)
  const infieldSlots: SlotAssignment[] = [];
  for (let inn = 1; inn <= maxInfieldInning; inn++) {
    for (const pos of NON_BATTERY_INFIELD) {
      infieldSlots.push({ inn, pos });
    }
  }

  let availableSlots = [...infieldSlots];

  // Sort players by priority: players with more P/C assignments first
  // (they have fewer opportunities for non-battery infield)
  const playersByPriority = [...playerIds].sort((a, b) => {
    const aPC = countPCInnings(a, pitcherByInning, catcherByInning, maxInfieldInning);
    const bPC = countPCInnings(b, pitcherByInning, catcherByInning, maxInfieldInning);
    if (aPC > bPC) return -1;
    if (bPC > aPC) return 1;
    return 0;
  });

  for (const pid of playersByPriority) {
    while (playerInfieldNeeds[pid] > 0 && availableSlots.length > 0) {
      const validSlots = availableSlots.filter(slot => {
        // Can't play if pitching/catching that inning
        if (pitcherByInning[slot.inn] === pid || catcherByInning[slot.inn] === pid) return false;
        // Can't play blocked position
        if (isBlockedFrom(pid, slot.pos, positionBlocks)) return false;
        // Can't play same position in consecutive innings
        const hasConsecutive = slotAssignments[pid].some(
          prev => prev.pos === slot.pos && Math.abs(prev.inn - slot.inn) === 1,
        );
        if (hasConsecutive) return false;
        // Can't play twice in same inning
        const hasInning = slotAssignments[pid].some(prev => prev.inn === slot.inn);
        if (hasInning) return false;
        return true;
      });

      if (validSlots.length === 0) break;

      const slot = validSlots[Math.floor(Math.random() * validSlots.length)];
      slotAssignments[pid].push(slot);
      playerInfieldNeeds[pid]--;
      availableSlots = availableSlots.filter(s => !(s.inn === slot.inn && s.pos === slot.pos));
    }
  }

  // Phase 4: Build lineup inning by inning
  for (let inn = 1; inn <= innings; inn++) {
    lineup[inn] = {} as InningAssignment;

    // 4a. Set P/C
    lineup[inn]['P'] = pitcherByInning[inn];
    lineup[inn]['C'] = catcherByInning[inn];

    const used = new Set([pitcherByInning[inn], catcherByInning[inn]]);

    // 4b. Fill pre-assigned infield slots (1B, 2B, 3B, SS) for innings 1-4
    if (inn <= maxInfieldInning) {
      for (const pos of NON_BATTERY_INFIELD) {
        let assignedPlayer = '';
        for (const [pid, slots] of Object.entries(slotAssignments)) {
          if (slots.some(s => s.inn === inn && s.pos === pos)) {
            assignedPlayer = pid;
            break;
          }
        }
        if (assignedPlayer && !used.has(assignedPlayer)) {
          lineup[inn][pos] = assignedPlayer;
          used.add(assignedPlayer);
        } else if (assignedPlayer && used.has(assignedPlayer)) {
          // Player already used (as P/C), need fallback
          const eligible = shuffle(playerIds.filter(p => {
            if (used.has(p)) return false;
            if (isBlockedFrom(p, pos, positionBlocks)) return false;
            if (inn > 1 && lineup[inn - 1] && lineup[inn - 1][pos] === p) return false;
            return true;
          }));
          if (eligible.length === 0) return null;
          lineup[inn][pos] = eligible[0];
          used.add(eligible[0]);
        } else {
          // No pre-assignment for this slot, fill from eligible players
          const eligible = shuffle(playerIds.filter(p => {
            if (used.has(p)) return false;
            if (isBlockedFrom(p, pos, positionBlocks)) return false;
            if (inn > 1 && lineup[inn - 1] && lineup[inn - 1][pos] === p) return false;
            return true;
          }));
          if (eligible.length === 0) return null;
          lineup[inn][pos] = eligible[0];
          used.add(eligible[0]);
        }
      }
    } else {
      // Innings beyond maxInfieldInning: fill infield positions freely
      for (const pos of NON_BATTERY_INFIELD) {
        const eligible = shuffle(playerIds.filter(p => {
          if (used.has(p)) return false;
          if (isBlockedFrom(p, pos, positionBlocks)) return false;
          if (inn > 1 && lineup[inn - 1] && lineup[inn - 1][pos] === p) return false;
          return true;
        }));
        if (eligible.length === 0) return null;
        lineup[inn][pos] = eligible[0];
        used.add(eligible[0]);
      }
    }

    // 4c. Fill outfield positions, prioritizing players who sat last inning
    const satLastInning = inn > 1
      ? playerIds.filter(p => !POSITIONS.some(pos => lineup[inn - 1][pos] === p))
      : [];

    for (const pos of OUTFIELD_POSITIONS) {
      // Prefer players who sat last inning
      const eligibleSatOut = satLastInning.filter(p => {
        if (used.has(p)) return false;
        if (isBlockedFrom(p, pos, positionBlocks)) return false;
        if (inn > 1 && lineup[inn - 1] && lineup[inn - 1][pos] === p) return false;
        return true;
      });

      const eligible = eligibleSatOut.length > 0
        ? eligibleSatOut
        : shuffle(playerIds.filter(p => {
            if (used.has(p)) return false;
            if (isBlockedFrom(p, pos, positionBlocks)) return false;
            if (inn > 1 && lineup[inn - 1] && lineup[inn - 1][pos] === p) return false;
            return true;
          }));

      if (eligible.length === 0) return null;
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      lineup[inn][pos] = pick;
      used.add(pick);
    }

    // Remaining players are on the bench (implicitly: they're not in the lineup for this inning)
  }

  return lineup;
}

// --- Multiple Lineup Generation ---

/**
 * Generates multiple distinct valid lineups.
 * Deduplicates by checking for meaningful differences (not just outfield swaps).
 */
export function generateMultipleLineups(
  input: GenerateLineupInput,
  count: number = 3,
): GenerateLineupResult[] {
  // Pre-validate first
  const preErrors = preValidate(input);
  if (preErrors.length > 0) {
    return [];
  }

  const results: GenerateLineupResult[] = [];
  const maxTotalAttempts = count * 300;
  let totalAttempts = 0;

  while (results.length < count && totalAttempts < maxTotalAttempts) {
    const result = generateLineup(input);
    totalAttempts += result.attemptCount;

    if (result.valid) {
      const isDuplicate = results.some(r => !lineupsMeaningfullyDifferent(r.lineup, result.lineup, input));
      if (!isDuplicate) {
        results.push(result);
      }
    }

    // Safety: if we can't generate even 1, break early
    if (totalAttempts > 0 && results.length === 0 && totalAttempts >= maxTotalAttempts / 2) {
      break;
    }
  }

  return results;
}

// --- Helper Functions ---

/** Check if a player is blocked from a position */
function isBlockedFrom(
  playerId: string,
  position: Position,
  positionBlocks: Record<string, Position[]>,
): boolean {
  const blocked = positionBlocks[playerId];
  return blocked ? blocked.includes(position) : false;
}

/** Count how many P/C innings a player has in innings 1 through maxInning */
function countPCInnings(
  playerId: string,
  pitcherByInning: Record<number, string>,
  catcherByInning: Record<number, string>,
  maxInning: number,
): number {
  let count = 0;
  for (let inn = 1; inn <= maxInning; inn++) {
    if (pitcherByInning[inn] === playerId || catcherByInning[inn] === playerId) {
      count++;
    }
  }
  return count;
}

/**
 * Check if two lineups are meaningfully different.
 * Difference = different bench patterns OR different infield assignments.
 * (LF/CF/RF swaps alone don't count.)
 */
function lineupsMeaningfullyDifferent(
  a: Lineup,
  b: Lineup,
  input: GenerateLineupInput,
): boolean {
  for (let inn = 1; inn <= input.innings; inn++) {
    // Check bench differs
    const aPlaying = new Set(POSITIONS.map(pos => a[inn][pos]));
    const bPlaying = new Set(POSITIONS.map(pos => b[inn][pos]));
    const aBenched = input.presentPlayers
      .filter(p => !aPlaying.has(p.id))
      .map(p => p.id)
      .sort()
      .join(',');
    const bBenched = input.presentPlayers
      .filter(p => !bPlaying.has(p.id))
      .map(p => p.id)
      .sort()
      .join(',');
    if (aBenched !== bBenched) return true;

    // Check infield differs (P, C, 1B, 2B, 3B, SS)
    for (const pos of INFIELD_POSITIONS) {
      if (a[inn][pos] !== b[inn][pos]) return true;
    }
  }
  return false;
}
