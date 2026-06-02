# Per-Inning Lineup Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach lock individual fielding innings so Regenerate rebuilds only the unlocked innings, leaving locked ones byte-for-byte unchanged.

**Architecture:** Add a `lockedInnings: number[]` field to the persisted `LineupState`. `useLineup.generate()` reads the currently-selected lineup, extracts the assignments for locked innings, and threads them into the generator. The generator (`attemptBuild`) seeds those locked innings directly into the lineup and builds the unlocked innings around them (Approach B), so cross-inning bench fairness still works and the merged lineup is validated as a whole. A per-inning lock toggle is added to the shared `DraggableLineupGrid` header; drag-edits inside a locked inning stay allowed (lock blocks Regenerate only).

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + @testing-library/react (jsdom), cloud-backed `useCloudStorage` (localStorage fallback when unauthenticated).

**Spec:** `docs/superpowers/specs/2026-06-01-lineup-inning-lock-design.md`

---

## File Structure

- `src/logic/lineup-types.ts` — add optional `lockedInnings` to `GenerateLineupInput`.
- `src/logic/lineup-generator.ts` — seed locked innings into `attemptBuild`.
- `src/logic/lineup-generator.test.ts` — generator tests.
- `src/types/index.ts` — add `lockedInnings: number[]` to `LineupState`.
- `src/hooks/useLineup.ts` — lock state, `toggleInningLock`, cleanup, generate threading.
- `src/hooks/useLineup.test.tsx` — new hook test file.
- `src/components/lineup/DraggableLineupGrid.tsx` — per-inning lock toggle + locked styling.
- `src/components/lineup/DraggableCell.tsx` — optional `locked` prop for column tint.
- `src/components/lineup/DraggableLineupGrid.module.css` — lock toggle + locked-cell styles.
- `src/components/lineup/DraggableLineupGrid.test.tsx` — new component test file.
- `src/components/game-day/steps/ReviewStep.tsx` — wire props + all-locked note.
- `src/components/game-day/GameDayDesktop.tsx` — wire props + all-locked status.

Tasks are ordered so each commit builds green and its tests pass: Task 1 (generator) → Task 2 (hook, depends on Task 1's type) → Task 3 (grid UI, props optional so callers stay valid) → Task 4 (wiring + status note).

---

## Task 1: Generator preserves locked innings

**Files:**
- Modify: `src/logic/lineup-types.ts` (add field to `GenerateLineupInput`)
- Modify: `src/logic/lineup-generator.ts` (`attemptBuild`)
- Test: `src/logic/lineup-generator.test.ts`

- [ ] **Step 1: Add the input field**

In `src/logic/lineup-types.ts`, add to the `GenerateLineupInput` interface (after `benchPriority`):

```ts
  /** Maps playerId to cumulative bench innings from history. Higher = more field time priority. */
  benchPriority?: Record<string, number>;
  /** Innings to preserve verbatim during generation: inning number -> assignment.
   *  The builder copies these in and fills only the remaining innings around them. */
  lockedInnings?: Record<number, InningAssignment>;
```

Then add `InningAssignment` to the type import at the top of the file:

```ts
import type { Player, Lineup, Position, BatteryAssignments, PositionBlocks, Division, InningAssignment } from '../types/index.ts';
```

- [ ] **Step 2: Write the failing tests**

Append to `src/logic/lineup-generator.test.ts` (the helpers `makePlayer`, `players11`, `players10`, `makeDefaultInput` already exist at the top of the file):

```ts
describe('locked innings', () => {
  it('reproduces a locked inning verbatim', () => {
    const input = makeDefaultInput();
    const first = generateLineup(input);
    const lockedInning = first.lineup[3];

    const result = generateLineup({ ...input, lockedInnings: { 3: lockedInning } });

    expect(result.lineup[3]).toEqual(lockedInning);
  });

  it('does not freeze the unlocked innings (other innings can vary)', () => {
    const input = makeDefaultInput();
    const first = generateLineup(input);
    const lockedInning = first.lineup[3];
    const locked = { ...input, lockedInnings: { 3: lockedInning } };

    // Generate several times; inning 3 must always match, and at least one
    // other inning must differ across runs (generation is not frozen wholesale).
    const inning1Variants = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const r = generateLineup(locked);
      expect(r.lineup[3]).toEqual(lockedInning);
      inning1Variants.add(JSON.stringify(r.lineup[1]));
    }
    expect(inning1Variants.size).toBeGreaterThan(1);
  });

  it('keeps the merged lineup valid on a tight roster with a locked inning', () => {
    // Derive a valid lineup on a 10-player roster (tight bench rotation), lock
    // one of its innings, then regenerate. The merged result must still pass
    // full validation (covers NO_CONSECUTIVE_BENCH across the lock boundary and
    // INFIELD_MINIMUM). Uses the known-good makeDefaultInput shape (Coast / 6
    // innings / P/C for all innings), just with 10 players instead of 11.
    const input = makeDefaultInput({ presentPlayers: players10 });
    const seed = generateBestLineup(input, 10);
    expect(seed.valid).toBe(true);

    const result = generateBestLineup(
      { ...input, lockedInnings: { 2: seed.lineup[2] } },
      10,
    );

    expect(result.lineup[2]).toEqual(seed.lineup[2]);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/logic/lineup-generator.test.ts`
Expected: the three new `locked innings` tests FAIL (inning 3 is regenerated, not preserved — `expect(result.lineup[3]).toEqual(lockedInning)` fails).

- [ ] **Step 4: Seed locked innings into `attemptBuild`**

In `src/logic/lineup-generator.ts`, inside `attemptBuild`, just after the existing destructure line:

```ts
function attemptBuild(input: GenerateLineupInput): Lineup {
  const { presentPlayers, innings, pitcherAssignments, catcherAssignments, positionBlocks } = input;
```

add:

```ts
  const lockedInnings = input.lockedInnings ?? {};
  const isLocked = (inn: number): boolean =>
    Object.prototype.hasOwnProperty.call(lockedInnings, inn);
```

Next, in **Phase 3** where `infieldSlots` is built, skip locked innings so a locked inning's infield does not consume slot "need" from the unlocked pool. Change:

```ts
  const infieldSlots: SlotAssignment[] = [];
  for (let inn = 1; inn <= maxInfieldInning; inn++) {
    for (const pos of infieldToFill) {
      infieldSlots.push({ inn, pos });
    }
  }
```

to:

```ts
  const infieldSlots: SlotAssignment[] = [];
  for (let inn = 1; inn <= maxInfieldInning; inn++) {
    if (isLocked(inn)) continue;
    for (const pos of infieldToFill) {
      infieldSlots.push({ inn, pos });
    }
  }
```

Finally, in **Phase 4** (the `for (let inn = 1; inn <= innings; inn++)` loop), inject the locked inning at the very top of the loop body, before `lineup[inn] = {} as InningAssignment;`:

```ts
  for (let inn = 1; inn <= innings; inn++) {
    // Locked inning: copy the preserved assignment verbatim, update bench
    // tracking from it so the next inning builds around it, and skip generation.
    if (isLocked(inn)) {
      lineup[inn] = { ...lockedInnings[inn] } as InningAssignment;
      const usedLocked = new Set(
        Object.values(lockedInnings[inn]).filter(id => id !== ''),
      );
      for (const pid of playerIds) {
        if (!usedLocked.has(pid)) {
          benchCountSoFar[pid]++;
        }
      }
      continue;
    }

    lineup[inn] = {} as InningAssignment;
```

(The rest of the Phase 4 body is unchanged.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/logic/lineup-generator.test.ts`
Expected: PASS, including all pre-existing generator tests.

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors (the new `lockedInnings` field is optional, so existing call sites are unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/logic/lineup-types.ts src/logic/lineup-generator.ts src/logic/lineup-generator.test.ts
git commit -m "feat(lineup-generator): preserve locked innings during generation"
```

---

## Task 2: `useLineup` lock state, cleanup, and generate threading

**Files:**
- Modify: `src/types/index.ts` (`LineupState`)
- Modify: `src/hooks/useLineup.ts`
- Test: `src/hooks/useLineup.test.tsx` (create)

- [ ] **Step 1: Add the state field**

In `src/types/index.ts`, update the `LineupState` interface:

```ts
/** Lineup generation state stored in localStorage */
export interface LineupState {
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  generatedLineups: Lineup[];
  selectedLineupIndex: number | null;
  lockedInnings: number[];
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/hooks/useLineup.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLineup } from './useLineup';

function seedRoster() {
  // 11 present players so generate() produces a complete, valid lineup.
  const players = Array.from({ length: 11 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    isPresent: true,
  }));
  localStorage.setItem('roster', JSON.stringify(players));
}

describe('useLineup inning locks', () => {
  beforeEach(() => {
    localStorage.clear();
    seedRoster();
  });

  it('toggleInningLock adds then removes an inning', () => {
    const { result } = renderHook(() => useLineup());
    expect(result.current.lockedInnings).toEqual([]);

    act(() => result.current.toggleInningLock(2));
    expect(result.current.lockedInnings).toEqual([2]);

    act(() => result.current.toggleInningLock(2));
    expect(result.current.lockedInnings).toEqual([]);
  });

  it('drops locked innings beyond the current inning count', () => {
    // Default division AAA => 5 innings. Innings 9 is out of range.
    localStorage.setItem(
      'lineupState',
      JSON.stringify({
        pitcherAssignments: {},
        catcherAssignments: {},
        generatedLineups: [],
        selectedLineupIndex: null,
        lockedInnings: [1, 3, 9],
      }),
    );
    const { result } = renderHook(() => useLineup());
    expect(result.current.lockedInnings).toEqual([1, 3]);
  });

  it('generate() preserves a locked inning end-to-end', () => {
    const { result } = renderHook(() => useLineup());

    act(() => { result.current.generate(); });
    const lockedInning = result.current.selectedLineup![3];
    expect(lockedInning).toBeDefined();

    act(() => { result.current.toggleInningLock(3); });
    act(() => { result.current.generate(); });

    expect(result.current.selectedLineup![3]).toEqual(lockedInning);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/hooks/useLineup.test.tsx`
Expected: FAIL — `result.current.lockedInnings` and `result.current.toggleInningLock` are undefined.

- [ ] **Step 4: Update `useLineup`**

In `src/hooks/useLineup.ts`:

1. Add `InningAssignment` to the type import:

```ts
import type { LineupState, Position, Lineup, Player, PositionBlocks, InningAssignment } from '../types/index';
```

2. Add `lockedInnings` to `defaultState`:

```ts
const defaultState: LineupState = {
  pitcherAssignments: {},
  catcherAssignments: {},
  generatedLineups: [],
  selectedLineupIndex: null,
  lockedInnings: [],
};
```

3. In the `cleanState` memo, add locked-inning cleanup. After the existing P/C cleanup block (just before `if (needsCleanup) {`), insert:

```ts
    const currentLocked = state.lockedInnings ?? [];
    const filteredLocked = currentLocked.filter(n => n <= innings);
    let cleanedLocked = currentLocked;
    if (filteredLocked.length !== currentLocked.length) {
      cleanedLocked = filteredLocked;
      needsCleanup = true;
    }
```

and change the `if (needsCleanup)` return to include it:

```ts
    if (needsCleanup) {
      return {
        ...state,
        pitcherAssignments: cleanedPitcher,
        catcherAssignments: cleanedCatcher,
        lockedInnings: cleanedLocked,
      };
    }
```

4. Add the `toggleInningLock` action (place it next to `setCatcher`/`togglePositionBlock`):

```ts
  const toggleInningLock = useCallback((inning: number) => {
    setState((prev: LineupState) => {
      const current = prev.lockedInnings ?? [];
      const has = current.includes(inning);
      return {
        ...prev,
        lockedInnings: has
          ? current.filter(n => n !== inning)
          : [...current, inning],
      };
    });
  }, [setState]);
```

5. Thread locked innings into `generate()`. Inside the `generate` callback, before building `input`, add:

```ts
    const lockedList = cleanState.lockedInnings ?? [];
    const selectedIdx = cleanState.selectedLineupIndex;
    const selected =
      selectedIdx != null ? cleanState.generatedLineups[selectedIdx] : undefined;
    const lockedInnings: Record<number, InningAssignment> = {};
    if (selected) {
      for (const inn of lockedList) {
        if (selected[inn]) lockedInnings[inn] = selected[inn];
      }
    }
```

and add `lockedInnings` to the `input` object:

```ts
    const input = {
      presentPlayers,
      innings,
      division,
      pitcherAssignments: playerPitching ? cleanState.pitcherAssignments : {},
      catcherAssignments: playerPitching ? cleanState.catcherAssignments : {},
      positionBlocks,
      benchPriority,
      lockedInnings,
    };
```

(The `generate` dependency array already lists `cleanState`, which covers `lockedInnings`, `generatedLineups`, and `selectedLineupIndex` — no dep change needed.)

6. Expose the new state and action in the hook's return object. Under the `// State` group add:

```ts
    lockedInnings: cleanState.lockedInnings ?? [],
```

and under `// Actions` add:

```ts
    toggleInningLock,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/hooks/useLineup.test.tsx`
Expected: PASS (all three tests).

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors. (`defaultState` now satisfies the required `lockedInnings` field; `resetState` and `updateSelectedLineup` spread `prev`, so locks survive those paths.)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/hooks/useLineup.ts src/hooks/useLineup.test.tsx
git commit -m "feat(useLineup): add per-inning lock state, cleanup, and generate threading"
```

---

## Task 3: Lock toggle UI in `DraggableLineupGrid`

**Files:**
- Modify: `src/components/lineup/DraggableLineupGrid.tsx`
- Modify: `src/components/lineup/DraggableCell.tsx`
- Modify: `src/components/lineup/DraggableLineupGrid.module.css`
- Test: `src/components/lineup/DraggableLineupGrid.test.tsx` (create)

> Props are added as **optional** (defaulting to `[]` / no-op) so the existing
> ReviewStep and GameDayDesktop call sites keep compiling. Task 4 wires real values.

- [ ] **Step 1: Write the failing test**

Create `src/components/lineup/DraggableLineupGrid.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableLineupGrid } from './DraggableLineupGrid';
import type { Lineup, Player } from '../../types/index';

const players: Player[] = [
  { id: 'p1', name: 'Alex', isPresent: true },
  { id: 'p2', name: 'Blake', isPresent: true },
];

// Minimal two-inning lineup; the grid only needs non-empty inning keys.
const lineup: Lineup = {
  1: { P: 'p1' } as Lineup[number],
  2: { P: 'p2' } as Lineup[number],
};

beforeEach(() => {
  localStorage.clear();
});

describe('DraggableLineupGrid inning locks', () => {
  it('renders a lock toggle per inning and reflects locked state', () => {
    render(
      <DraggableLineupGrid
        lineup={lineup}
        innings={2}
        players={players}
        errors={[]}
        onSwap={vi.fn()}
        onBenchSwap={vi.fn()}
        lockedInnings={[1]}
        onToggleInningLock={vi.fn()}
      />,
    );
    // Inning 1 is locked -> its toggle offers "Unlock"; inning 2 offers "Lock".
    expect(screen.getByLabelText('Unlock inning 1')).toBeTruthy();
    expect(screen.getByLabelText('Lock inning 2')).toBeTruthy();
  });

  it('fires onToggleInningLock with the inning number on click', () => {
    const onToggle = vi.fn();
    render(
      <DraggableLineupGrid
        lineup={lineup}
        innings={2}
        players={players}
        errors={[]}
        onSwap={vi.fn()}
        onBenchSwap={vi.fn()}
        lockedInnings={[]}
        onToggleInningLock={onToggle}
      />,
    );
    fireEvent.click(screen.getByLabelText('Lock inning 2'));
    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/lineup/DraggableLineupGrid.test.tsx`
Expected: FAIL — `lockedInnings`/`onToggleInningLock` are not props yet and the lock buttons don't render (`getByLabelText('Unlock inning 1')` throws).

- [ ] **Step 3: Add the optional `locked` prop to `DraggableCell`**

In `src/components/lineup/DraggableCell.tsx`, add `locked` to the props interface and destructure, then include the locked class:

```ts
interface DraggableCellProps {
  inning: number;
  position: Position;
  playerId: string;
  playerName: string;
  hasError: boolean;
  locked?: boolean;
}

export function DraggableCell({
  inning,
  position,
  playerId,
  playerName,
  hasError,
  locked = false,
}: DraggableCellProps) {
```

and update `cellClass`:

```ts
  const cellClass = [
    styles.cell,
    hasError ? styles.errorCell : '',
    isDropTarget ? styles.dropTarget : '',
    locked ? styles.lockedCell : '',
  ]
    .filter(Boolean)
    .join(' ');
```

- [ ] **Step 4: Add the toggle + props to `DraggableLineupGrid`**

In `src/components/lineup/DraggableLineupGrid.tsx`:

Update the props interface:

```ts
interface DraggableLineupGridProps {
  lineup: Lineup;
  innings: number;
  players: Player[];
  errors: ValidationError[];
  onSwap: (inning: number, posA: Position, posB: Position) => void;
  onBenchSwap: (inning: number, position: Position, benchPlayerId: string) => void;
  lockedInnings?: number[];
  onToggleInningLock?: (inning: number) => void;
}
```

Update the destructure with defaults:

```ts
export function DraggableLineupGrid({
  lineup,
  innings,
  players,
  errors,
  onSwap,
  onBenchSwap,
  lockedInnings = [],
  onToggleInningLock = () => {},
}: DraggableLineupGridProps) {
```

Replace the header-row map:

```tsx
        {inningNumbers.map(inn => (
          <div key={`header-${inn}`} className={styles.headerCell}>
            Inn {inn}
          </div>
        ))}
```

with:

```tsx
        {inningNumbers.map(inn => {
          const locked = lockedInnings.includes(inn);
          return (
            <div
              key={`header-${inn}`}
              className={`${styles.headerCell}${locked ? ` ${styles.lockedHeader}` : ''}`}
            >
              <span className={styles.headerLabel}>Inn {inn}</span>
              <button
                type="button"
                className={`${styles.inningLock}${locked ? ` ${styles.inningLockOn}` : ''}`}
                onClick={() => onToggleInningLock(inn)}
                aria-pressed={locked}
                aria-label={locked ? `Unlock inning ${inn}` : `Lock inning ${inn}`}
                title={locked
                  ? `Inning ${inn} locked — Regenerate will skip it`
                  : `Lock inning ${inn}`}
              >
                <span aria-hidden="true">{locked ? '🔒' : '🔓'}</span>
              </button>
            </div>
          );
        })}
```

Pass `locked` to each `DraggableCell` in the position-row map:

```tsx
              return (
                <DraggableCell
                  key={`cell-${pos}-${inn}`}
                  inning={inn}
                  position={pos}
                  playerId={playerId}
                  playerName={getPlayerName(playerId, players)}
                  hasError={isError}
                  locked={lockedInnings.includes(inn)}
                />
              );
```

- [ ] **Step 5: Add styles**

In `src/components/lineup/DraggableLineupGrid.module.css`, change the existing `.headerCell` rule to stack the label and toggle:

```css
.headerCell {
  background: var(--color-surface-hover);
  padding: var(--space-sm);
  text-align: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
```

Then append:

```css
.headerLabel {
  display: block;
}

.inningLock {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  line-height: 1;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.inningLock:hover {
  background: var(--color-surface);
}

.lockedHeader {
  background: var(--color-accent-bg);
  color: var(--color-text);
}

.lockedCell {
  background: var(--color-accent-bg);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/components/lineup/DraggableLineupGrid.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 7: Type-check**

Run: `npx tsc -b`
Expected: no errors. The new grid props are optional, so the existing ReviewStep and GameDayDesktop call sites still compile (they simply don't render locks yet).

- [ ] **Step 8: Commit**

```bash
git add src/components/lineup/DraggableLineupGrid.tsx src/components/lineup/DraggableCell.tsx src/components/lineup/DraggableLineupGrid.module.css src/components/lineup/DraggableLineupGrid.test.tsx
git commit -m "feat(lineup-grid): add per-inning lock toggle and locked-column styling"
```

---

## Task 4: Wire locks into ReviewStep and GameDayDesktop

**Files:**
- Modify: `src/components/game-day/steps/ReviewStep.tsx`
- Modify: `src/components/game-day/GameDayDesktop.tsx`

> This task is wiring + a small status note. It is verified by `tsc`, the full
> test suite staying green, and the manual checks below — no new unit test
> (rendering either screen requires the full hook/provider tree, and the lock
> logic itself is already covered by Tasks 1–3).

- [ ] **Step 1: Wire ReviewStep**

In `src/components/game-day/steps/ReviewStep.tsx`:

Add `lockedInnings` and `toggleInningLock` to the `useLineup()` destructure:

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
    togglePositionBlock,
    updateSelectedLineup,
    preValidationWarnings,
    lockedInnings,
    toggleInningLock,
  } = useLineup();
```

Add a status-note state alongside `generateError`:

```ts
  const [generateError, setGenerateError] = useState('');
  const [regenNote, setRegenNote] = useState('');
```

Replace `handleRegenerate` with an all-locked guard:

```ts
  const handleRegenerate = () => {
    setGenerateError('');
    setRegenNote('');
    if (innings > 0 && lockedInnings.length >= innings) {
      setRegenNote('All innings locked — nothing to regenerate.');
    } else {
      const result = generate();
      setGenerateError(result.errors[0] ?? '');
    }
    if (!isBattingLocked) {
      generateBattingOrder();
    }
  };
```

Render the note next to the existing error, inside the Regenerate `section`:

```tsx
        {generateError && (
          <p className={styles.generateError}>{generateError}</p>
        )}
        {regenNote && (
          <p className={styles.regenNote}>{regenNote}</p>
        )}
```

Pass the lock props to the grid:

```tsx
          <DraggableLineupGrid
            lineup={editor.lineup}
            innings={innings}
            players={players}
            errors={editor.validationErrors}
            onSwap={editor.swapPositions}
            onBenchSwap={editor.benchSwap}
            lockedInnings={lockedInnings}
            onToggleInningLock={toggleInningLock}
          />
```

- [ ] **Step 2: Add the ReviewStep note style**

In `src/components/game-day/steps/ReviewStep.module.css`, append:

```css
.regenNote {
  margin: var(--space-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Wire GameDayDesktop**

In `src/components/game-day/GameDayDesktop.tsx`:

Add `lockedInnings` and `toggleInningLock` to the `useLineup()` destructure (alongside `generate`, `preValidationWarnings`, etc.):

```ts
    generatedLineups,
    selectedLineup,
    generate,
    preValidationWarnings,
    lockedInnings,
    toggleInningLock,
  } = useLineup();
```

In `handleGenerate`, add an all-locked short-circuit right after `setStatusMessage('')`:

```ts
  const handleGenerate = useCallback(() => {
    setGenerateError('');
    setStatusMessage('');
    if (innings > 0 && lockedInnings.length >= innings) {
      setStatusMessage('All innings locked — nothing to regenerate.');
      setTimeout(() => setStatusMessage(''), 3000);
      if (!isBattingLocked) {
        generateBattingOrder();
      }
      return;
    }
    const result = generate();
    setGenerateError(result.errors[0] ?? '');
    if (!isBattingLocked) {
      generateBattingOrder();
    }
    takeSnapshot();
    setStaleWarning(false);
    if (result.success) {
      setStatusMessage(
        isBattingLocked
          ? 'Lineup regenerated. Batting order locked.'
          : 'Lineup and batting order generated.',
      );
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }, [generate, generateBattingOrder, takeSnapshot, isBattingLocked, innings, lockedInnings]);
```

Pass the lock props to the grid:

```tsx
            <DraggableLineupGrid
              lineup={editor.lineup}
              innings={innings}
              players={players}
              errors={editor.validationErrors}
              onSwap={editor.swapPositions}
              onBenchSwap={editor.benchSwap}
              lockedInnings={lockedInnings}
              onToggleInningLock={toggleInningLock}
            />
```

- [ ] **Step 4: Type-check and run the full suite**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm test`
Expected: PASS — all suites green (Tasks 1–3 plus pre-existing tests).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, then in the browser:
1. Open Game Day, generate a lineup.
2. Click the 🔓 on an inning header → it becomes 🔒 and the column is tinted.
3. Click Regenerate → the locked column is unchanged; other innings reshuffle.
4. Hand-drag a player within the locked column → the drag still works (lock blocks Regenerate only).
5. Lock every inning, click Regenerate → lineup unchanged and the "All innings locked — nothing to regenerate." note appears.
6. Verify the same on the mobile ReviewStep flow.

- [ ] **Step 6: Commit**

```bash
git add src/components/game-day/steps/ReviewStep.tsx src/components/game-day/steps/ReviewStep.module.css src/components/game-day/GameDayDesktop.tsx
git commit -m "feat(game-day): surface per-inning lineup lock in Review and Desktop views"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 2) · `toggleInningLock` + cleanup + generate threading (Task 2) · Approach-B generator seeding (Task 1) · grid toggle with drag still allowed (Task 3) · both call sites wired (Task 4) · all-locked status note (Task 4) · edge cases (innings-shrink cleanup → Task 2 test; lock-before-lineup → grid only renders with a lineup; older state without field → `?? []` in Task 2; absent-player-in-locked-inning → existing validation, unchanged).
- **Type consistency:** `lockedInnings: number[]` (state) vs `lockedInnings?: Record<number, InningAssignment>` (generator input) are intentionally different shapes — the hook converts the number list into an assignment map inside `generate()`. `toggleInningLock(inning: number)` matches the grid's `onToggleInningLock?: (inning: number) => void`.
- **No placeholders:** every code step shows the full change; commands include expected outcomes.
