import type { Position, Lineup, InningAssignment } from '../types/index.ts';
import { getPositions, getOutfieldPositions, getFielderCount, getInfieldPositions, hasPlayerPitching } from '../types/index.ts';
import type { GenerateLineupInput, GenerateLineupResult } from './lineup-types.ts';
import { validateLineup } from './lineup-validator.ts';
import { shuffle } from './shuffle.ts';
import { scoreLineup } from './lineup-scorer.ts';
import type { LineupScore } from './lineup-scorer.ts';

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

  const playerPitching = hasPlayerPitching(input.division);
  const fielderCount = getFielderCount(input.division);

  // Must have enough players to fill all positions
  if (playerCount < fielderCount) {
    errors.push(
      `Need at least ${fielderCount} present players to fill all positions. Currently ${playerCount} present.`,
    );
  }

  if (playerPitching) {
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

    // LL rule: a player who catches 4+ innings cannot pitch that game
    const catcherCounts: Record<string, number> = {};
    const isPitcher: Record<string, boolean> = {};
    for (let inn = 1; inn <= innings; inn++) {
      const catcherId = catcherAssignments[inn];
      if (catcherId) catcherCounts[catcherId] = (catcherCounts[catcherId] ?? 0) + 1;
      const pitcherId = pitcherAssignments[inn];
      if (pitcherId) isPitcher[pitcherId] = true;
    }
    for (const [playerId, count] of Object.entries(catcherCounts)) {
      if (count >= 4 && isPitcher[playerId]) {
        const player = presentPlayers.find(p => p.id === playerId);
        const name = player?.name ?? 'A player';
        errors.push(
          `${name} catches ${count} innings and also pitches — a player who catches 4+ innings cannot pitch in the same game.`,
        );
      }
    }
  }

  // Check position blocks don't make a position unfillable
  // For each position, count how many players are NOT blocked from it
  // and are not permanently locked into P/C for ALL innings
  for (const pos of getPositions(input.division)) {
    const blockedFromPos = new Set<string>();
    for (const [playerId, blockedPositions] of Object.entries(positionBlocks)) {
      if (blockedPositions && blockedPositions.includes(pos)) {
        blockedFromPos.add(playerId);
      }
    }

    // For non-P/C positions (or all positions in AA), check each inning
    if (!playerPitching || (pos !== 'P' && pos !== 'C')) {
      for (let inn = 1; inn <= innings; inn++) {
        // Players available this inning = present, not blocked, not assigned as P or C this inning
        const pitcherId = playerPitching ? pitcherAssignments[inn] : undefined;
        const catcherId = playerPitching ? catcherAssignments[inn] : undefined;
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
  let shuffledPlayers = shuffle(presentPlayers);
  if (input.benchPriority) {
    const bp = input.benchPriority;
    shuffledPlayers.sort((a, b) => (bp[b.id] ?? 0) - (bp[a.id] ?? 0));
  }
  const playerIds = shuffledPlayers.map(p => p.id);
  const lineup: Lineup = {};
  const positions = getPositions(input.division);
  const outfieldPositions = getOutfieldPositions(input.division);
  const playerPitching = hasPlayerPitching(input.division);
  // For AA, P + 1B-SS (no catcher); for AAA/Coast, only 1B/2B/3B/SS (P/C pre-assigned)
  const infieldToFill = playerPitching ? NON_BATTERY_INFIELD : getInfieldPositions(input.division);

  // Phase 1: Determine P/C for each inning
  const pitcherByInning: Record<number, string> = {};
  const catcherByInning: Record<number, string> = {};
  const pcAssignedInnings: Record<string, number[]> = {};
  for (const p of playerIds) {
    pcAssignedInnings[p] = [];
  }

  if (playerPitching) {
    for (let inn = 1; inn <= innings; inn++) {
      pitcherByInning[inn] = pitcherAssignments[inn] || '';
      catcherByInning[inn] = catcherAssignments[inn] || '';
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
  }

  // Phase 2: Calculate infield needs per player
  // Each player needs 2 infield positions in innings 1 through min(4, innings).
  // With fewer infield positions (e.g. AA has 5), larger rosters may only get 1.
  // Use all infield positions (including P/C) for slot count since P/C give infield credit.
  const maxInfieldInning = Math.min(4, innings);
  const allInfieldPositions = getInfieldPositions(input.division);
  const totalInfieldSlots = allInfieldPositions.length * maxInfieldInning;
  const minInfield = Math.min(2, Math.floor(totalInfieldSlots / playerIds.length));
  const playerInfieldNeeds: Record<string, number> = {};

  for (const pid of playerIds) {
    // Relaxation: any P/C assignment (in or out of window) drops the window
    // minimum by 1. P/C is itself a high-touch infield role — counting it as
    // equivalent to a window-infield slot frees a non-battery slot for a
    // player with no P/C exposure at all.
    let hasPC = false;
    if (playerPitching) {
      for (let inn = 1; inn <= innings; inn++) {
        if (pitcherByInning[inn] === pid || catcherByInning[inn] === pid) {
          hasPC = true;
          break;
        }
      }
    }
    const baseMin = hasPC ? Math.max(1, minInfield - 1) : minInfield;

    playerInfieldNeeds[pid] = baseMin;
    // Subtract P/C assignments from needed infield positions (P and C are infield)
    if (playerPitching) {
      for (let inn = 1; inn <= maxInfieldInning; inn++) {
        if (pitcherByInning[inn] === pid || catcherByInning[inn] === pid) {
          playerInfieldNeeds[pid]--;
        }
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

  // Create list of infield slots to fill (for AA: all 6 infield; for AAA/Coast: 1B-SS only)
  const infieldSlots: SlotAssignment[] = [];
  for (let inn = 1; inn <= maxInfieldInning; inn++) {
    for (const pos of infieldToFill) {
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

  // Helper: find eligible players for a position in a given inning
  function findEligible(pos: Position, _inn: number, used: Set<string>): string[] {
    return shuffle(playerIds.filter(p => {
      if (used.has(p)) return false;
      if (isBlockedFrom(p, pos, positionBlocks)) return false;
      return true;
    }));
  }

  // Track cumulative bench counts per player (for AAA balanced rotation)
  const benchCountSoFar: Record<string, number> = {};
  for (const pid of playerIds) {
    benchCountSoFar[pid] = 0;
  }

  // Phase 4: Build lineup inning by inning
  for (let inn = 1; inn <= innings; inn++) {
    lineup[inn] = {} as InningAssignment;

    // 4a. Set P/C (only for player-pitching divisions)
    const used = new Set<string>();
    if (playerPitching) {
      lineup[inn]['P'] = pitcherByInning[inn];
      lineup[inn]['C'] = catcherByInning[inn];
      used.add(pitcherByInning[inn]);
      used.add(catcherByInning[inn]);
    }

    // 4b. Fill infield positions (for AA: all 6 infield incl P/C; for AAA/Coast: 1B-SS)
    for (const pos of infieldToFill) {
      let placed = false;

      // For innings 1-4, try to use pre-assigned infield slots
      if (inn <= maxInfieldInning) {
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
          placed = true;
        }
      }

      // Fallback: pick from eligible players
      if (!placed) {
        const eligible = findEligible(pos, inn, used);
        if (eligible.length === 0) return null;
        lineup[inn][pos] = eligible[0];
        used.add(eligible[0]);
      }
    }

    // 4c. Fill outfield positions, prioritizing players who sat last inning
    //     For AAA/AA: also factor in total bench counts to enforce balanced rotation
    const satLastInning = inn > 1
      ? playerIds.filter(p => !positions.some(pos => lineup[inn - 1][pos] === p))
      : [];

    for (const pos of outfieldPositions) {
      // Prefer players who sat last inning
      const eligibleSatOut = satLastInning.filter(p => {
        if (used.has(p)) return false;
        if (isBlockedFrom(p, pos, positionBlocks)) return false;
        return true;
      });

      let eligible = eligibleSatOut.length > 0
        ? eligibleSatOut
        : shuffle(playerIds.filter(p => {
            if (used.has(p)) return false;
            if (isBlockedFrom(p, pos, positionBlocks)) return false;
            return true;
          }));

      // For AAA/AA: sort eligible players so those with fewer bench innings play first
      // This helps enforce the "no 3rd bench until all sat 2nd" rule
      if ((input.division === 'AAA' || input.division === 'AA') && eligible.length > 1) {
        eligible = [...eligible].sort((a, b) => {
          const aBench = benchCountSoFar[a] ?? 0;
          const bBench = benchCountSoFar[b] ?? 0;
          return bBench - aBench; // higher bench count = play first (lower index)
        });
      }

      if (eligible.length === 0) return null;
      const pick = eligible[Math.floor(Math.random() * Math.min(eligible.length, eligible.length > 2 ? 2 : eligible.length))];
      lineup[inn][pos] = pick;
      used.add(pick);
    }

    // Remaining players are on the bench — update bench counts
    for (const pid of playerIds) {
      if (!used.has(pid)) {
        benchCountSoFar[pid]++;
      }
    }
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

// --- Best-of-N Scored Generation ---

export interface GenerateBestLineupResult extends GenerateLineupResult {
  score: LineupScore;
}

/**
 * Generates N lineups, scores each, and returns the highest-scoring valid lineup.
 * Falls back to an error result if no valid lineup can be generated.
 */
export function generateBestLineup(
  input: GenerateLineupInput,
  count: number = 10,
): GenerateBestLineupResult {
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
      score: { total: 0, benchEquity: 0, infieldBalance: 0, positionVariety: 0 },
    };
  }

  const scored: GenerateBestLineupResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = generateLineup(input);
    if (result.valid) {
      const score = scoreLineup(result.lineup, input);
      scored.push({ ...result, score });
    }
  }

  if (scored.length === 0) {
    return {
      lineup: {} as Lineup,
      valid: false,
      errors: [{
        rule: 'GRID_COMPLETE',
        message: 'Could not generate a valid lineup with these settings. Try adjusting pitcher/catcher assignments or position blocks.',
      }],
      attemptCount: count * 200,
      score: { total: 0, benchEquity: 0, infieldBalance: 0, positionVariety: 0 },
    };
  }

  scored.sort((a, b) => b.score.total - a.score.total);
  return scored[0];
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
  const positions = getPositions(input.division);
  for (let inn = 1; inn <= input.innings; inn++) {
    // Check bench differs
    const aPlaying = new Set(positions.map(pos => a[inn][pos]));
    const bPlaying = new Set(positions.map(pos => b[inn][pos]));
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

    // Check infield differs
    for (const pos of getInfieldPositions(input.division)) {
      if (a[inn][pos] !== b[inn][pos]) return true;
    }
  }
  return false;
}
