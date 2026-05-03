# Non-blocking lineup validation

**Date:** 2026-05-02
**Status:** Approved

## Problem

Today, validation can fully block lineup generation and printing:

- `preValidate` returns errors for impossible inputs (insufficient players, P=C in same inning, LL 4+ catch rule, position fully blocked); when non-empty, `generateLineup` / `generateBestLineup` short-circuit and return no lineup at all.
- The constraint solver (`attemptBuild`) returns `null` when it can't fill a slot; if all 200 attempts fail, the user gets nothing to print.
- The desktop "Generate" button is disabled when fewer than `minPlayers` are present.

A bug in any of those validators — false positives, off-by-one in eligibility counts, etc. — leaves the coach with no printable lineup minutes before a game. That is unacceptable; coaches need to print *something* and adjust by hand if needed.

## Goal

Validation never fully blocks lineup generation or printing. Errors and warnings are surfaced prominently in the UI but are advisory: the coach can always generate, edit, and print.

## Behavior

- **Generation always returns a lineup object.** Cells the solver can't fill are left as `''` (the grid already renders this as a blank slot — it's how unassigned P/C are handled today).
- **Pre-validation errors become warnings.** They are passed through to the UI alongside any lineup the solver produced, rather than blocking generation.
- **Print is available whenever a lineup exists.** Validation errors don't gate the print button.
- **Generate buttons are never disabled by validation.** The "Need at least N players" hint stays as informational copy.

## Changes

### `src/logic/lineup-generator.ts`

- `attemptBuild` becomes best-effort: when no eligible player is found for a slot (P, C, infield, or outfield), set the cell to `''` and continue rather than returning `null`. Always returns a `Lineup`.
- `generateLineup` no longer short-circuits on `preValidate` errors. It runs the solver, validates the result, and returns `{ lineup, valid, errors, attemptCount }` where `valid` reflects whether validation errors were found but `lineup` is always populated.
- `generateBestLineup`:
  - Stops short-circuiting on `preValidate`.
  - Calls `preValidate` once and stores the result as `warnings`.
  - Runs N attempts; scores each; picks the highest-scoring lineup. If no attempt is fully valid, still returns the best-scoring partial lineup with `valid: false`, the validation `errors` from that lineup, and the `warnings`.
  - Adds `warnings: string[]` to `GenerateBestLineupResult`.

### `src/logic/lineup-types.ts`

- Add `warnings: string[]` to `GenerateLineupResult`. Default to `[]` when not set. `GenerateBestLineupResult` inherits it.

### `src/hooks/useLineup.ts`

- `generate()` returns `{ success: boolean; errors: string[]; warnings: string[] }`. `success === errors.length === 0 && warnings.length === 0`. Always populates `generatedLineups` and `selectedLineupIndex` if a lineup object came back.
- Replace the existing `preAssignmentErrors` field with `preValidationWarnings: string[]`, computed by calling `preValidate` on the current input. (`preAssignmentErrors` is exported but no component consumes it today, so this is a clean rename + scope expansion — the new field covers the same P/C conflicts plus player-count and position-block coverage.)

### `src/components/game-day/GameDayDesktop.tsx`

- Remove `disabled={!canGenerate}` from both Generate buttons (player-pitching card and AA Generate card).
- Pass pre-validation warnings into `<ValidationPanel>` (currently `preErrors={[]}`).
- Surface warnings from the latest `generate()` result alongside `generateError` in the existing status row — same styling as today's pre-assignment errors.

### `src/components/game-day/steps/ReviewStep.tsx`

- Pass pre-validation warnings into `<ValidationPanel>` (currently `preErrors={[]}`).
- Surface warnings from `generate()` in the existing `generateError` slot.

### `src/components/game-day/steps/PrintStep.tsx`

- No code change. Already prints whenever a lineup object exists.

### `src/components/game-day/steps/GenerateStep.tsx`

- Delete. Dead code — only referenced by itself; the stepper uses `ReviewStep` for that role.

### Tests (`src/logic/lineup-generator.test.ts`)

- Update existing assertions: cases that previously expected `valid: false` with no lineup should now expect `valid: false` with a populated lineup and non-empty `warnings`.
- Add new cases:
  - Insufficient players (e.g., 5 present in AAA): generation returns a lineup with blank cells where positions couldn't be filled, plus a warning naming the shortfall.
  - Conflicting P/C in same inning: lineup still populated, warnings include the conflict, validation errors include any downstream issues.
  - All players blocked from a position: lineup populated with that cell blank, warning naming the unfillable position.

## Risks and edge cases

- **Duplicate-player cells.** The solver's `used` set still prevents duplicates within a single inning, so worst case is empty cells — not the same player in two slots.
- **Score-for-best across invalid attempts.** When all attempts are partial, picking by score is fine; ties broken by validation-error count would be nicer but not required for v1.
- **Stale snapshot logic.** Unaffected — the snapshot tracks input identity, not validation status.

## Out of scope

- New UI affordances for filling empty cells beyond what exists (drag-from-bench already works).
- Changes to batting order generation, sync layer, or backend.
- Refactoring `preValidate`'s rule set itself (this change only changes how its output is *used*).
