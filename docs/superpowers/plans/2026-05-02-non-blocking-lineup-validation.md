# Non-blocking Lineup Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validation never fully blocks lineup generation or printing — pre-validation issues become warnings, the solver always returns a populated lineup (with blanks if needed), and Generate / Print buttons are never gated by validator output.

**Architecture:** Two-layer change. (1) `lineup-generator.ts` stops short-circuiting on `preValidate` and `attemptBuild` produces best-effort lineups (empty `''` cells where no eligible player exists). `generateBestLineup` always returns a populated lineup plus a `warnings: string[]` field. (2) `useLineup` propagates warnings; `GameDayDesktop` and `ReviewStep` surface them via the existing `ValidationPanel` and remove the `disabled` gates on Generate buttons. Dead `GenerateStep.tsx` is deleted.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest for tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-02-non-blocking-lineup-validation-design.md`

---

## File Map

- **Modify** `src/logic/lineup-types.ts` — add `warnings: string[]` to `GenerateLineupResult`.
- **Modify** `src/logic/lineup-generator.ts` — `attemptBuild` returns best-effort, `generateLineup` and `generateBestLineup` no longer short-circuit on preValidate, propagate warnings.
- **Modify** `src/logic/lineup-generator.test.ts` — update one existing assertion, add three new tests.
- **Modify** `src/hooks/useLineup.ts` — `generate()` returns `{ success, errors, warnings }`; replace `preAssignmentErrors` with `preValidationWarnings`.
- **Modify** `src/components/game-day/GameDayDesktop.tsx` — drop `disabled={!canGenerate}`, wire `preValidationWarnings` into `<ValidationPanel>`, surface generate-result warnings.
- **Modify** `src/components/game-day/steps/ReviewStep.tsx` — wire `preValidationWarnings` into `<ValidationPanel>`, surface generate-result warnings.
- **Delete** `src/components/game-day/steps/GenerateStep.tsx` and `src/components/game-day/steps/GenerateStep.module.css` (dead code).

---

### Task 1: Add `warnings` field to result types

**Files:**
- Modify: `src/logic/lineup-types.ts`

- [ ] **Step 1: Add `warnings` to `GenerateLineupResult`**

Replace lines 33-38:

```ts
export interface GenerateLineupResult {
  lineup: Lineup;
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  attemptCount: number;
}
```

- [ ] **Step 2: Run typecheck to find call sites**

Run: `npx tsc --noEmit`
Expected: errors in `lineup-generator.ts` (every place that returns a `GenerateLineupResult` literal). These will be fixed in later tasks. Do not commit yet.

- [ ] **Step 3: Add `warnings: []` to every existing return literal in `lineup-generator.ts`**

Open `src/logic/lineup-generator.ts`. There are four return literals shaped like `GenerateLineupResult`:
- Line ~127 (preValidate-failed branch in `generateLineup`) → add `warnings: preErrors,`
- Line ~145 (success branch in `generateLineup`) → add `warnings: [],`
- Line ~150 (max-attempts branch in `generateLineup`) → add `warnings: [],`
- Line ~487 and ~510 (both error branches in `generateBestLineup`) → add `warnings: preErrors,` for the preValidate branch, `warnings: []` for the no-valid-attempts branch.
- Line ~504 inside the loop (`scored.push({ ...result, score });`) — `result` already carries `warnings` from `generateLineup`, no change needed.

Make the minimum edits to satisfy the compiler. Logic changes come in later tasks.

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the existing test suite to confirm no regressions**

Run: `npm test -- --run src/logic/lineup-generator.test.ts`
Expected: all tests pass (behavior unchanged so far).

- [ ] **Step 6: Commit**

```bash
git add src/logic/lineup-types.ts src/logic/lineup-generator.ts
git commit -m "refactor: add warnings field to GenerateLineupResult"
```

---

### Task 2: TDD — `attemptBuild` returns blank cells instead of `null`

**Files:**
- Test: `src/logic/lineup-generator.test.ts`
- Modify: `src/logic/lineup-generator.ts`

- [ ] **Step 1: Write the failing test**

Append this to the bottom of `src/logic/lineup-generator.test.ts` (before the final `});` if any wrapping describe — otherwise at file end). Place it inside a new `describe`:

```ts
// --- Best-effort generation (non-blocking validation) ---

describe('best-effort generation', () => {
  it('returns a lineup with blank cells when too few players are present', () => {
    const input = makeDefaultInput({
      presentPlayers: players11.slice(0, 7), // 7 players, need 9 fielders
      pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
      catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p6', 6: 'p6' },
    });
    const result = generateLineup(input);
    expect(result.lineup).toBeTruthy();
    expect(Object.keys(result.lineup).length).toBe(input.innings);
    // Inning 1 should have all positions defined (some may be '')
    for (const pos of POSITIONS) {
      expect(result.lineup[1][pos]).toBeDefined();
    }
    // Some cell somewhere should be '' (we have fewer players than positions)
    let blankCount = 0;
    for (let inn = 1; inn <= input.innings; inn++) {
      for (const pos of POSITIONS) {
        if (result.lineup[inn][pos] === '') blankCount++;
      }
    }
    expect(blankCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "blank cells when too few players"`
Expected: FAIL — the test will likely fail because (a) `preValidate` short-circuits and returns an empty lineup `{}`, so `result.lineup[1]` is undefined.

- [ ] **Step 3: Modify `attemptBuild` to fill blanks instead of returning null**

In `src/logic/lineup-generator.ts`, change `attemptBuild`'s four `return null` sites to assign `''` and continue:

Around line 215 (P fallback when no candidate):
```ts
// before:
if (candidates.length === 0) return null;
pitcherByInning[inn] = candidates[0];
// after:
if (candidates.length === 0) {
  pitcherByInning[inn] = '';
} else {
  pitcherByInning[inn] = candidates[0];
  if (!pcAssignedInnings[candidates[0]]) pcAssignedInnings[candidates[0]] = [];
  pcAssignedInnings[candidates[0]].push(inn);
}
```

Apply the same pattern around line 227 for the C fallback.

Around line 376 (infield fallback):
```ts
// before:
if (eligible.length === 0) return null;
lineup[inn][pos] = eligible[0];
used.add(eligible[0]);
// after:
if (eligible.length === 0) {
  lineup[inn][pos] = '';
} else {
  lineup[inn][pos] = eligible[0];
  used.add(eligible[0]);
}
```

Around line 414 (outfield fallback): same pattern — assign `''` instead of returning null.

Update the function signature: `attemptBuild` now always returns `Lineup`, never `null`. Change the return type from `Lineup | null` to `Lineup`. Remove the `if (lineup)` null-guard at the call site in `generateLineup` (around line 142).

- [ ] **Step 4: Run the new test**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "blank cells when too few players"`
Expected: still FAIL on the `Object.keys(result.lineup).length` assertion — because `generateLineup` itself short-circuits on `preValidate` errors (we haven't fixed that yet). Skip if this passes already.

- [ ] **Step 5: Run the full generator test suite to check for regressions**

Run: `npm test -- --run src/logic/lineup-generator.test.ts`
Expected: existing tests should still pass for valid inputs (the solver still finds eligible players in those cases). The "fails gracefully" test at line ~321 may now expect different behavior — that's fine, we'll fix it in Task 5.

- [ ] **Step 6: Commit (work in progress — test still failing, that's intentional)**

```bash
git add src/logic/lineup-generator.ts src/logic/lineup-generator.test.ts
git commit -m "refactor: attemptBuild fills blank cells instead of aborting"
```

---

### Task 3: TDD — `generateLineup` runs solver despite preValidate errors

**Files:**
- Test: `src/logic/lineup-generator.test.ts`
- Modify: `src/logic/lineup-generator.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe('best-effort generation', ...)` block:

```ts
it('returns a lineup AND surfaces preValidate issues, even when impossible', () => {
  const input = makeDefaultInput({
    presentPlayers: players11.slice(0, 5), // 5 players — clearly impossible
    pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
    catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p1', 6: 'p1' },
  });
  const result = generateLineup(input);
  // valid: false because the lineup will have errors
  expect(result.valid).toBe(false);
  // ...but a lineup object exists
  expect(Object.keys(result.lineup).length).toBe(input.innings);
  // ...and the preValidate "need at least 9 players" message is in warnings
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.warnings.some(w => w.includes('9'))).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "surfaces preValidate issues"`
Expected: FAIL — `generateLineup` short-circuits on preValidate, returns empty lineup with `valid: false`. The lineup-keys assertion fails.

- [ ] **Step 3: Replace the preValidate short-circuit in `generateLineup`**

Around line 123 in `src/logic/lineup-generator.ts`, replace the early-return block:

```ts
// before:
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
      warnings: preErrors,
      attemptCount: 0,
    };
  }

  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lineup = attemptBuild(input);
    if (lineup) {
      const errors = validateLineup(lineup, input);
      if (errors.length === 0) {
        return { lineup, valid: true, errors: [], warnings: [], attemptCount: attempt + 1 };
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
    warnings: [],
    attemptCount: maxAttempts,
  };
}

// after:
export function generateLineup(input: GenerateLineupInput): GenerateLineupResult {
  const warnings = preValidate(input);
  const maxAttempts = 200;

  let bestLineup: Lineup | null = null;
  let bestErrors: ValidationError[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attempts = attempt + 1;
    const lineup = attemptBuild(input);
    const errors = validateLineup(lineup, input);
    if (errors.length === 0) {
      return { lineup, valid: true, errors: [], warnings, attemptCount: attempts };
    }
    if (bestLineup === null || errors.length < bestErrors.length) {
      bestLineup = lineup;
      bestErrors = errors;
    }
  }

  // No fully valid lineup; return best partial.
  return {
    lineup: bestLineup ?? ({} as Lineup),
    valid: false,
    errors: bestErrors,
    warnings,
    attemptCount: attempts,
  };
}
```

You'll need to import `ValidationError` at the top of the file:
```ts
import type { GenerateLineupInput, GenerateLineupResult } from './lineup-types.ts';
import type { ValidationError } from './lineup-types.ts'; // add this
```
(Or merge into the existing import line if cleaner.)

- [ ] **Step 4: Run the new test**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "surfaces preValidate issues"`
Expected: PASS.

- [ ] **Step 5: Run the previously-failing test from Task 2**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "blank cells when too few players"`
Expected: PASS now (the lineup is populated even though preValidate would have flagged it).

- [ ] **Step 6: Run the full generator test suite**

Run: `npm test -- --run src/logic/lineup-generator.test.ts`
Expected: All tests pass EXCEPT the `fails gracefully with coach-friendly error` test at line ~321 — it now gets `valid: false` with errors AND a populated lineup, but its assertions about errors should still pass. If it fails, note it for Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/logic/lineup-generator.ts src/logic/lineup-generator.test.ts
git commit -m "feat: generateLineup returns best-effort lineup + warnings"
```

---

### Task 4: TDD — `generateBestLineup` always returns lineup + warnings

**Files:**
- Test: `src/logic/lineup-generator.test.ts`
- Modify: `src/logic/lineup-generator.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe('best-effort generation', ...)` block:

```ts
it('generateBestLineup returns a lineup even with impossible inputs', () => {
  const input = makeDefaultInput({
    presentPlayers: players11.slice(0, 6), // impossible
    pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
    catcherAssignments: { 1: 'p4', 2: 'p4', 3: 'p5', 4: 'p5', 5: 'p6', 6: 'p6' },
  });
  const result = generateBestLineup(input, 5);
  expect(result.lineup).toBeTruthy();
  expect(Object.keys(result.lineup).length).toBe(input.innings);
  expect(result.warnings.length).toBeGreaterThan(0);
});

it('generateBestLineup includes preValidate warnings even when valid lineup is found', () => {
  // Trigger a soft warning (player catches 4+ and pitches) but with enough players
  // that the solver can still produce a valid-ish lineup. Note: validateLineup
  // may also flag this — that's fine for this test, we only assert warnings exist.
  const input = makeDefaultInput({
    pitcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p2', 4: 'p2', 5: 'p3', 6: 'p3' },
    catcherAssignments: { 1: 'p1', 2: 'p1', 3: 'p1', 4: 'p1', 5: 'p6', 6: 'p6' },
  });
  const result = generateBestLineup(input, 3);
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.warnings.some(w => w.toLowerCase().includes('catch') && w.toLowerCase().includes('pitch'))).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "generateBestLineup returns a lineup even"`
Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "includes preValidate warnings"`
Expected: both FAIL — `generateBestLineup` short-circuits on preValidate.

- [ ] **Step 3: Replace `generateBestLineup` to never short-circuit**

Around line 481 in `src/logic/lineup-generator.ts`, replace the function:

```ts
// after:
export function generateBestLineup(
  input: GenerateLineupInput,
  count: number = 10,
): GenerateBestLineupResult {
  const warnings = preValidate(input);
  const scored: GenerateBestLineupResult[] = [];
  const fallbacks: GenerateBestLineupResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = generateLineup(input);
    const score = scoreLineup(result.lineup, input);
    const enriched: GenerateBestLineupResult = { ...result, warnings, score };
    if (result.valid) {
      scored.push(enriched);
    } else {
      fallbacks.push(enriched);
    }
  }

  if (scored.length > 0) {
    scored.sort((a, b) => b.score.total - a.score.total);
    return scored[0];
  }

  if (fallbacks.length > 0) {
    // No fully valid lineup — pick the one with the fewest errors, breaking ties by score.
    fallbacks.sort((a, b) => {
      const errDiff = a.errors.length - b.errors.length;
      if (errDiff !== 0) return errDiff;
      return b.score.total - a.score.total;
    });
    return fallbacks[0];
  }

  // Defensive fallback — generateLineup always returns something now, so this shouldn't fire.
  return {
    lineup: {} as Lineup,
    valid: false,
    errors: [{
      rule: 'GRID_COMPLETE',
      message: 'Could not generate any lineup. Check player and assignment inputs.',
    }],
    warnings,
    attemptCount: 0,
    score: { total: 0, benchEquity: 0, infieldBalance: 0, positionVariety: 0 },
  };
}
```

- [ ] **Step 4: Run the new tests**

Run: `npm test -- --run src/logic/lineup-generator.test.ts -t "generateBestLineup"`
Expected: both new tests PASS.

- [ ] **Step 5: Run the full generator test suite**

Run: `npm test -- --run src/logic/lineup-generator.test.ts`
Expected: All tests pass except the `fails gracefully` test (Task 5 fixes it).

- [ ] **Step 6: Commit**

```bash
git add src/logic/lineup-generator.ts src/logic/lineup-generator.test.ts
git commit -m "feat: generateBestLineup always returns a lineup + warnings"
```

---

### Task 5: Update the existing `fails gracefully` test for new behavior

**Files:**
- Modify: `src/logic/lineup-generator.test.ts`

- [ ] **Step 1: Update the assertion**

Find the test starting at approximately line 321:

```ts
it('fails gracefully with coach-friendly error for impossible constraints', () => {
  const input = makeDefaultInput({
    presentPlayers: players11.slice(0, 8), // Only 8 players
  });
  const result = generateLineup(input);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  // Should have a meaningful message, not technical jargon
  expect(result.errors[0].message.length).toBeGreaterThan(10);
});
```

Replace with:

```ts
it('surfaces coach-friendly warnings AND returns a lineup for impossible constraints', () => {
  const input = makeDefaultInput({
    presentPlayers: players11.slice(0, 8), // Only 8 players, need 9
  });
  const result = generateLineup(input);
  expect(result.valid).toBe(false);
  // Lineup is populated even though impossible
  expect(Object.keys(result.lineup).length).toBe(input.innings);
  // Pre-validation warning is surfaced
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.warnings.some(w => w.includes('9'))).toBe(true);
});
```

- [ ] **Step 2: Run the full generator test suite**

Run: `npm test -- --run src/logic/lineup-generator.test.ts`
Expected: ALL tests pass.

- [ ] **Step 3: Run the entire frontend test suite**

Run: `npm test -- --run`
Expected: ALL tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/logic/lineup-generator.test.ts
git commit -m "test: update impossible-constraint test for non-blocking behavior"
```

---

### Task 6: Update `useLineup` hook — propagate warnings, replace `preAssignmentErrors`

**Files:**
- Modify: `src/hooks/useLineup.ts`

- [ ] **Step 1: Update the `generate()` action to return warnings and always set the lineup**

Replace the body of the `generate` callback (around line 142):

```ts
const generate = useCallback((): { success: boolean; errors: string[]; warnings: string[] } => {
  const playerPitching = hasPlayerPitching(division);
  const input = {
    presentPlayers,
    innings,
    division,
    pitcherAssignments: playerPitching ? cleanState.pitcherAssignments : {},
    catcherAssignments: playerPitching ? cleanState.catcherAssignments : {},
    positionBlocks: cleanState.positionBlocks,
    benchPriority,
  };

  const result = generateBestLineup(input, 10);

  // Always store the lineup if one was produced.
  if (Object.keys(result.lineup).length > 0) {
    setState((prev: LineupState) => ({
      ...prev,
      generatedLineups: [result.lineup],
      selectedLineupIndex: 0,
    }));
  } else {
    setState((prev: LineupState) => ({
      ...prev,
      generatedLineups: [],
      selectedLineupIndex: null,
    }));
  }

  const errors = result.errors.map(e => e.message);
  const warnings = result.warnings;
  const success = result.valid && warnings.length === 0;
  return { success, errors, warnings };
}, [presentPlayers, innings, division, cleanState, setState, benchPriority]);
```

Remove the now-unused `preValidate` import line if `preValidate` isn't referenced elsewhere in the file. It IS still used in the new `preValidationWarnings` memo below — so keep it.

- [ ] **Step 2: Replace `preAssignmentErrors` with `preValidationWarnings`**

Find the existing `preAssignmentErrors` memo (around line 237) and replace the entire memo + the corresponding entry in the return object.

Replace the memo:

```ts
const preValidationWarnings: string[] = useMemo(() => {
  const playerPitching = hasPlayerPitching(division);
  return preValidate({
    presentPlayers,
    innings,
    division,
    pitcherAssignments: playerPitching ? cleanState.pitcherAssignments : {},
    catcherAssignments: playerPitching ? cleanState.catcherAssignments : {},
    positionBlocks: cleanState.positionBlocks,
  });
}, [presentPlayers, innings, division, cleanState.pitcherAssignments, cleanState.catcherAssignments, cleanState.positionBlocks]);
```

In the returned object (around line 286-312), replace `preAssignmentErrors` with `preValidationWarnings`.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes (no consumer of `preAssignmentErrors` exists per `git grep preAssignmentErrors src/components`).

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLineup.ts
git commit -m "feat(useLineup): propagate generator warnings, expose preValidationWarnings"
```

---

### Task 7: `GameDayDesktop` — drop disabled gate, surface warnings

**Files:**
- Modify: `src/components/game-day/GameDayDesktop.tsx`

- [ ] **Step 1: Pull `preValidationWarnings` from the hook**

Find the `useLineup()` destructure (around line 110):

```ts
const {
  setPitcher,
  setCatcher,
  presentPlayers,
  innings,
  pitcherAssignments,
  catcherAssignments,
  positionBlocks,
  generatedLineups,
  selectedLineup,
  generate,
  preValidationWarnings, // add
} = useLineup();
```

- [ ] **Step 2: Track generate-result warnings in component state**

Add a state hook near the other status state (around line 219):

```ts
const [generateError, setGenerateError] = useState('');
const [generateWarnings, setGenerateWarnings] = useState<string[]>([]);
```

- [ ] **Step 3: Update `handleGenerate` and the auto-generate effect to capture warnings**

The behavior change: generation always produces a lineup, so we always regenerate the batting order and always snapshot. The auto-generate gate on player count is also removed — non-blocking means non-blocking.

Replace the auto-generate effect body (around line 222):

```ts
useEffect(() => {
  if (hasAutoGenerated.current) return;
  if (generatedLineups.length === 0 && presentPlayers.length > 0) {
    hasAutoGenerated.current = true;
    const result = generate();
    setGenerateError(result.errors[0] ?? '');
    setGenerateWarnings(result.warnings);
    generateBattingOrder();
    takeSnapshot();
  }
}, [generatedLineups.length, generate, generateBattingOrder, presentPlayers.length, takeSnapshot]);
```

Replace `handleGenerate` (around line 249):

```ts
const handleGenerate = useCallback(() => {
  setGenerateError('');
  setStatusMessage('');
  setGenerateWarnings([]);
  const result = generate();
  setGenerateError(result.errors[0] ?? '');
  setGenerateWarnings(result.warnings);
  generateBattingOrder();
  takeSnapshot();
  setStaleWarning(false);
  if (result.success) {
    setStatusMessage('Lineup and batting order generated.');
    setTimeout(() => setStatusMessage(''), 3000);
  }
}, [generate, generateBattingOrder, takeSnapshot]);
```

- [ ] **Step 4: Remove the `disabled={!canGenerate}` from both Generate buttons**

Find both Generate buttons (around line 319 and line 343). Change:

```tsx
<button
  type="button"
  className={styles.generateBtn}
  disabled={!canGenerate}
  onClick={handleGenerate}
>
```

to:

```tsx
<button
  type="button"
  className={styles.generateBtn}
  onClick={handleGenerate}
>
```

Apply this to both buttons.

- [ ] **Step 5: Wire warnings into the `<ValidationPanel>`**

Find the `<ValidationPanel>` usage (around line 408):

```tsx
<ValidationPanel
  errors={editor.validationErrors}
  preErrors={[...preValidationWarnings, ...generateWarnings]}
/>
```

Use a `Set`/dedup if needed; for now, dedupe inline:

```tsx
<ValidationPanel
  errors={editor.validationErrors}
  preErrors={Array.from(new Set([...preValidationWarnings, ...generateWarnings]))}
/>
```

- [ ] **Step 6: Run typecheck and tests**

Run: `npx tsc --noEmit`
Run: `npm test -- --run`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/game-day/GameDayDesktop.tsx
git commit -m "feat(GameDayDesktop): non-blocking generate, surface warnings"
```

---

### Task 8: `ReviewStep` — surface warnings in ValidationPanel

**Files:**
- Modify: `src/components/game-day/steps/ReviewStep.tsx`

- [ ] **Step 1: Pull `preValidationWarnings` from the hook**

In the `useLineup()` destructure (around line 73), add `preValidationWarnings`:

```ts
const {
  generatedLineups,
  selectedLineup,
  innings,
  division,
  generate,
  presentPlayers,
  pitcherAssignments,
  catcherAssignments,
  positionBlocks,
  updateSelectedLineup,
  preValidationWarnings,
} = useLineup();
```

- [ ] **Step 2: Track generate-result warnings**

Add a state hook alongside `generateError` (around line 125):

```ts
const [generateError, setGenerateError] = useState('');
const [generateWarnings, setGenerateWarnings] = useState<string[]>([]);
```

- [ ] **Step 3: Update auto-generate effect and `handleRegenerate` to capture warnings**

Replace the auto-generate effect (around line 129):

```ts
useEffect(() => {
  if (hasAutoGenerated.current) return;
  if (generatedLineups.length === 0) {
    hasAutoGenerated.current = true;
    const result = generate();
    setGenerateError(result.errors[0] ?? '');
    setGenerateWarnings(result.warnings);
    // Always generate batting order if we got a lineup back.
    generateBattingOrder();
    setHasGeneratedBatting(true);
  }
}, [generatedLineups.length, generate, generateBattingOrder]);
```

Replace `handleRegenerate` (around line 144):

```ts
const handleRegenerate = () => {
  setGenerateError('');
  setGenerateWarnings([]);
  const result = generate();
  setGenerateError(result.errors[0] ?? '');
  setGenerateWarnings(result.warnings);
  generateBattingOrder();
  setHasGeneratedBatting(true);
};
```

- [ ] **Step 4: Wire warnings into `<ValidationPanel>`**

Find the `<ValidationPanel>` usage (around line 198):

```tsx
<ValidationPanel
  errors={editor.validationErrors}
  preErrors={Array.from(new Set([...preValidationWarnings, ...generateWarnings]))}
/>
```

- [ ] **Step 5: Run typecheck and tests**

Run: `npx tsc --noEmit`
Run: `npm test -- --run`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/game-day/steps/ReviewStep.tsx
git commit -m "feat(ReviewStep): surface generator warnings in validation panel"
```

---

### Task 9: Delete dead `GenerateStep` code

**Files:**
- Delete: `src/components/game-day/steps/GenerateStep.tsx`
- Delete: `src/components/game-day/steps/GenerateStep.module.css`

- [ ] **Step 1: Confirm no references**

Run (Grep tool, not bash): pattern `GenerateStep`, glob `src/**`
Expected: only matches the two files being deleted.

- [ ] **Step 2: Delete the files**

```bash
rm src/components/game-day/steps/GenerateStep.tsx src/components/game-day/steps/GenerateStep.module.css
```

- [ ] **Step 3: Run typecheck and tests**

Run: `npx tsc --noEmit`
Run: `npm test -- --run`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -u src/components/game-day/steps/
git commit -m "chore: remove dead GenerateStep component"
```

---

### Task 10: Final verification — full build, typecheck, dev server smoke test

**Files:**
- None — verification only.

- [ ] **Step 1: Frontend typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: API typecheck (just to be safe — no API changes here)**

Run: `cd api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `npm test -- --run`
Expected: all green.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Manual smoke test (if a browser is available)**

Start dev server: `npm run dev`
- Open the app, set roster to 5 present players, division AAA.
- Confirm the Generate button is **enabled** (not disabled).
- Click Generate. Confirm:
  - A lineup grid renders, with some blank cells.
  - The ValidationPanel shows a warning about needing 9 players.
  - The Print Dugout Card button is available.
- Click Print. Confirm the print preview renders the lineup with blanks where positions couldn't be filled.

If running in a non-browser environment, skip this step and note "no browser available — manual smoke test deferred to user."

- [ ] **Step 6: Final commit (only if any cleanup edits were needed)**

If no edits, no commit. If small fixes, commit with a clear message.
