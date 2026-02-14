import { z } from 'zod';

const MAX_PAYLOAD_SIZE = 512_000; // 500 KB

// --- Shared primitives ---

const positionSchema = z.enum([
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
]);

const playerSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  isPresent: z.boolean(),
});

// --- Endpoint schemas ---

/** PUT /api/roster */
export const rosterBodySchema = z.object({
  data: z.array(playerSchema).max(30),
});

/** PUT /api/game-config */
export const gameConfigBodySchema = z.object({
  data: z.object({
    innings: z.union([z.literal(5), z.literal(6)]),
  }),
});

/** PUT /api/lineup-state */
const batteryAssignmentsSchema = z.record(
  z.string().regex(/^\d+$/),
  z.string().max(100),
);

const positionBlocksSchema = z.record(
  z.string().max(100),
  z.array(positionSchema),
);

const inningAssignmentSchema = z.record(positionSchema, z.string().max(100));

const lineupSchema = z.record(
  z.string().regex(/^\d+$/),
  inningAssignmentSchema,
);

export const lineupStateBodySchema = z.object({
  data: z.object({
    pitcherAssignments: batteryAssignmentsSchema,
    catcherAssignments: batteryAssignmentsSchema,
    positionBlocks: positionBlocksSchema,
    generatedLineups: z.array(lineupSchema).max(50),
    selectedLineupIndex: z.number().int().min(0).nullable(),
  }).nullable(),
});

/** PUT /api/game-history */
const playerGameSummarySchema = z.object({
  playerId: z.string().max(100),
  playerName: z.string().max(200),
  battingPosition: z.number().int().min(0),
  fieldingPositions: z.array(positionSchema),
  benchInnings: z.number().int().min(0),
});

export const gameHistoryBodySchema = z.object({
  data: z.object({
    id: z.string().max(100),
    gameDate: z.string().max(50),
    innings: z.number().int().min(1).max(20),
    lineup: lineupSchema,
    battingOrder: z.array(z.string().max(100)).max(30),
    playerSummaries: z.array(playerGameSummarySchema).max(30),
  }),
});

/** PUT /api/batting */
const battingOrderStateDataSchema = z.object({
  currentOrder: z.array(z.string().max(100)).max(30).nullable(),
  isConfirmed: z.boolean(),
});

const battingHistoryEntryDataSchema = z.object({
  id: z.string().max(100),
  gameDate: z.string().max(50),
  order: z.array(z.string().max(100)).max(30),
});

export const battingBodySchema = z.discriminatedUnion('docType', [
  z.object({
    docType: z.literal('battingOrderState'),
    data: battingOrderStateDataSchema,
  }),
  z.object({
    docType: z.literal('battingHistory'),
    data: battingHistoryEntryDataSchema,
  }),
]);

/**
 * Validate a request body against a zod schema.
 * Returns the parsed data on success, or an error message string on failure.
 */
export function validateBody<T>(
  rawBody: unknown,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; error: string } {
  // Guard against oversized payloads
  const serialized = JSON.stringify(rawBody);
  if (serialized && serialized.length > MAX_PAYLOAD_SIZE) {
    return { success: false, error: 'Request payload too large' };
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const messages = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { success: false, error: `Validation failed: ${messages}` };
  }

  return { success: true, data: result.data };
}
