# P/C Section Division Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mirror the AA / AAA / Coast division setting from the global Settings page into the Pitcher & Catcher step toolbar as a segmented pill control, so coaches can confirm and switch division without leaving the flow.

**Architecture:** A new presentational `DivisionToggle` component (segmented pill) is shared by `SettingsPanel` and a new `PCToolbar` component. `PCToolbar` is rendered by `PCAssignmentStep` directly (above both the AAA/Coast grid and the AA "coach pitch" note), so the toggle is always visible on the P/C step. `PCTimeline` loses its toolbar; `PCAssignmentStep` orchestrates the toolbar + grid + AA branch. The control is wired to `useGameConfig`'s existing `setDivision`, which already cascades to the inning count.

**Tech Stack:** React 19, TypeScript, Vite, CSS modules. No new dependencies. No new test infrastructure (project's vitest config is `environment: 'node'` and only tests pure functions / hooks; the new component is presentational and verified manually).

**Spec:** [docs/superpowers/specs/2026-05-03-pc-section-division-toggle-design.md](../specs/2026-05-03-pc-section-division-toggle-design.md)

---

## File map

**Created:**
- `src/components/game-setup/DivisionToggle.tsx` — segmented pill control for `Division`
- `src/components/game-setup/DivisionToggle.module.css` — styles for the pill (default + compact)
- `src/components/game-day/pc-timeline/PCToolbar.tsx` — toolbar containing `DivisionToggle`, Auto-fill, Clear all
- `src/components/game-day/pc-timeline/PCToolbar.module.css` — toolbar layout

**Modified:**
- `src/components/game-setup/SettingsPanel.tsx` — replace the division `<select>` with `<DivisionToggle>`
- `src/components/game-day/pc-timeline/PCTimeline.tsx` — drop internal toolbar + the `onAutofill` / `onClearAll` props
- `src/components/game-day/pc-timeline/PCTimeline.module.css` — remove now-unused `.toolbar`, `.autofillBtn`, `.clearBtn` rules
- `src/components/game-day/pc-timeline/index.ts` — export `PCToolbar`
- `src/components/game-day/steps/PCAssignmentStep.tsx` — render `PCToolbar` outside the `playerPitching` branch, pass division props from `useGameConfig`

---

## Task 1: Create the `DivisionToggle` component

**Files:**
- Create: `src/components/game-setup/DivisionToggle.tsx`
- Create: `src/components/game-setup/DivisionToggle.module.css`

- [ ] **Step 1: Create the CSS module**

Write `src/components/game-setup/DivisionToggle.module.css`:

```css
.toggle {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface);
  min-height: 36px;
}

.segment {
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  padding: 0 var(--space-md);
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
  min-width: 48px;
}

.segment + .segment {
  border-left: 1px solid var(--color-border-strong);
}

.segment:hover:not(.active) {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.active {
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  cursor: default;
}

.compact {
  min-height: 30px;
}

.compact .segment {
  font-size: var(--font-size-xs);
  padding: 0 var(--space-sm);
  min-width: 40px;
}
```

- [ ] **Step 2: Create the component**

Write `src/components/game-setup/DivisionToggle.tsx`:

```tsx
import type { Division } from '../../types';
import styles from './DivisionToggle.module.css';

const DIVISIONS: Division[] = ['AA', 'AAA', 'Coast'];

interface DivisionToggleProps {
  division: Division;
  onChange: (value: Division) => void;
  /** Compact variant for inline use in toolbars (smaller font, ~30px tall). */
  compact?: boolean;
}

export function DivisionToggle({ division, onChange, compact = false }: DivisionToggleProps) {
  return (
    <div
      className={`${styles.toggle} ${compact ? styles.compact : ''}`}
      role="radiogroup"
      aria-label="Division"
    >
      {DIVISIONS.map((value) => {
        const active = value === division;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.segment} ${active ? styles.active : ''}`}
            onClick={() => {
              if (!active) onChange(value);
            }}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/game-setup/DivisionToggle.tsx src/components/game-setup/DivisionToggle.module.css
git commit -m "feat(DivisionToggle): add shared segmented pill for division"
```

---

## Task 2: Adopt `DivisionToggle` in `SettingsPanel`

**Files:**
- Modify: `src/components/game-setup/SettingsPanel.tsx`

- [ ] **Step 1: Replace the division select with the toggle**

In `src/components/game-setup/SettingsPanel.tsx`:

1. Add the import:
   ```tsx
   import { DivisionToggle } from './DivisionToggle';
   ```

2. Replace the existing block:
   ```tsx
   <div className={styles.settingRow}>
     <label htmlFor="division-select" className={styles.settingLabel}>
       Division
     </label>
     <select
       id="division-select"
       value={division}
       onChange={(e) => onDivisionChange(e.target.value as Division)}
       className={styles.select}
     >
       <option value="AA">AA</option>
       <option value="AAA">AAA</option>
       <option value="Coast">Coast</option>
     </select>
   </div>
   ```
   With:
   ```tsx
   <div className={styles.settingRow}>
     <DivisionToggle division={division} onChange={onDivisionChange} />
   </div>
   ```

The `Division` type import on line 1 stays — it is still referenced by the props interface.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc -b && npm run lint`
Expected: no errors, no warnings.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open the Settings page. Confirm:
- The three-segment pill renders in place of the dropdown.
- The current division segment is filled with the primary color.
- Clicking a different segment switches the active state and the rules list below updates accordingly.

- [ ] **Step 4: Commit**

```bash
git add src/components/game-setup/SettingsPanel.tsx
git commit -m "refactor(SettingsPanel): use DivisionToggle for division setting"
```

---

## Task 3: Create the `PCToolbar` component

**Files:**
- Create: `src/components/game-day/pc-timeline/PCToolbar.tsx`
- Create: `src/components/game-day/pc-timeline/PCToolbar.module.css`

- [ ] **Step 1: Create the CSS module**

Write `src/components/game-day/pc-timeline/PCToolbar.module.css`:

```css
.toolbar {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.autofillBtn,
.clearBtn {
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  min-height: 36px;
}

.autofillBtn:hover,
.clearBtn:hover {
  background: var(--color-surface-hover);
}

.clearBtn {
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Create the component**

Write `src/components/game-day/pc-timeline/PCToolbar.tsx`:

```tsx
import type { Division } from '../../../types';
import { DivisionToggle } from '../../game-setup/DivisionToggle';
import styles from './PCToolbar.module.css';

interface PCToolbarProps {
  division: Division;
  onDivisionChange: (value: Division) => void;
  /** Optional — hidden when not provided (e.g. AA division has no autofill). */
  onAutofill?: () => void;
  /** Optional — hidden when no assignments to clear. */
  onClearAll?: () => void;
}

export function PCToolbar({
  division,
  onDivisionChange,
  onAutofill,
  onClearAll,
}: PCToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <DivisionToggle division={division} onChange={onDivisionChange} compact />
      {onAutofill && (
        <button
          type="button"
          className={styles.autofillBtn}
          onClick={onAutofill}
        >
          Auto-fill
        </button>
      )}
      {onClearAll && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Export from the package barrel**

In `src/components/game-day/pc-timeline/index.ts`, add the new export. The file should read:

```ts
export { PCTimeline } from './PCTimeline';
export { PCToolbar } from './PCToolbar';
export { LastGamePitchers } from './LastGamePitchers';
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/game-day/pc-timeline/PCToolbar.tsx src/components/game-day/pc-timeline/PCToolbar.module.css src/components/game-day/pc-timeline/index.ts
git commit -m "feat(PCToolbar): extract toolbar with division toggle from PCTimeline"
```

---

## Task 4: Drop the toolbar from `PCTimeline`

**Files:**
- Modify: `src/components/game-day/pc-timeline/PCTimeline.tsx`
- Modify: `src/components/game-day/pc-timeline/PCTimeline.module.css`

- [ ] **Step 1: Remove the toolbar JSX and props from `PCTimeline.tsx`**

Edits to `src/components/game-day/pc-timeline/PCTimeline.tsx`:

1. In the `PCTimelineProps` interface, remove `onAutofill` and `onClearAll`:
   ```ts
   // BEFORE
   onAutofill: () => void;
   onClearAll: () => void;
   /** Compact mode: tighter chips, smaller font (used in desktop card). */
   compact?: boolean;

   // AFTER
   /** Compact mode: tighter chips, smaller font (used in desktop card). */
   compact?: boolean;
   ```

2. In the destructured props on the component, remove `onAutofill` and `onClearAll`:
   ```ts
   // BEFORE
   onPitcherChange,
   onCatcherChange,
   onAutofill,
   onClearAll,
   compact = false,

   // AFTER
   onPitcherChange,
   onCatcherChange,
   compact = false,
   ```

3. Delete the `hasAnyAssignment` computation:
   ```ts
   const hasAnyAssignment =
     Object.keys(pitcherAssignments).length > 0 ||
     Object.keys(catcherAssignments).length > 0;
   ```

4. Remove the entire `<div className={styles.toolbar}>...</div>` block at the top of the returned JSX (lines 86–103 of the current file).

After this, the returned JSX starts directly with the `<div className={styles.grid}>` block.

- [ ] **Step 2: Remove now-unused styles from `PCTimeline.module.css`**

Delete these rules (currently lines 7–35):

```css
.toolbar {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap;
}

.autofillBtn,
.clearBtn {
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  min-height: 36px;
}

.autofillBtn:hover,
.clearBtn:hover {
  background: var(--color-surface-hover);
}

.clearBtn {
  color: var(--color-text-muted);
}
```

The `.timeline`, `.grid`, `.cornerCell`, `.inningHeader`, `.rowLabel`, `.chip*`, `.lastGame*`, `.popover*`, mobile media query, and compact rules below them remain.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: errors at the `<PCTimeline ... onAutofill={...} onClearAll={...}>` call sites — `PCAssignmentStep.tsx` and `GameDayDesktop.tsx` (or wherever else `PCTimeline` is used). These are fixed in the next two tasks. Note the failing call sites here so you remember to address them.

To enumerate them now without waiting for the type-checker, search:

Run: `git grep -n 'onAutofill' -- 'src/**/*.tsx'`

Expected matches: `PCAssignmentStep.tsx`, `PCTimeline.tsx` (now removed), and `GameDayDesktop.tsx`.

- [ ] **Step 4: Do NOT commit yet**

Hold this change uncommitted. The repo doesn't type-check until Task 5 (and Task 6 if `GameDayDesktop` is also a caller). Combine all three into a single commit at the end of Task 6.

---

## Task 5: Update `PCAssignmentStep` to render `PCToolbar`

**Files:**
- Modify: `src/components/game-day/steps/PCAssignmentStep.tsx`

- [ ] **Step 1: Add imports and pull `setDivision`**

In `src/components/game-day/steps/PCAssignmentStep.tsx`:

1. Update the existing pc-timeline import to add `PCToolbar`:
   ```tsx
   // BEFORE
   import { PCTimeline, LastGamePitchers } from '../pc-timeline';

   // AFTER
   import { PCTimeline, PCToolbar, LastGamePitchers } from '../pc-timeline';
   ```

2. Update the `useGameConfig` destructure to also pull `setDivision`:
   ```tsx
   // BEFORE
   const { config } = useGameConfig();

   // AFTER
   const { config, setDivision } = useGameConfig();
   ```

- [ ] **Step 2: Restructure the render to put `PCToolbar` outside the branch**

Replace the current return JSX (lines 61–105) with:

```tsx
const hasAnyAssignment =
  Object.keys(pitcherAssignments).length > 0 ||
  Object.keys(catcherAssignments).length > 0;

return (
  <div className={styles.step}>
    <h2 className={styles.heading}>Pitcher &amp; Catcher</h2>

    <PCToolbar
      division={config.division}
      onDivisionChange={setDivision}
      onAutofill={playerPitching ? autofillDefaults : undefined}
      onClearAll={playerPitching && hasAnyAssignment ? clearAll : undefined}
    />

    {playerPitching ? (
      <>
        <PCTimeline
          innings={innings}
          presentPlayers={presentPlayers}
          pitcherAssignments={pitcherAssignments}
          catcherAssignments={catcherAssignments}
          colorByPlayer={colorByPlayer}
          catcherInningsByPlayer={catcherInningsByPlayer}
          pitcherInningsByPlayer={pitcherInningsByPlayer}
          pitcherOptionsFor={pitcherOptionsFor}
          catcherOptionsFor={catcherOptionsFor}
          onPitcherChange={changeInningPitcher}
          onCatcherChange={changeInningCatcher}
        />

        <LastGamePitchers
          lastGamePitcherIds={lastGamePitcherIds}
          players={presentPlayers}
        />
      </>
    ) : (
      <p className={styles.aaNote}>
        AA division — coach pitch. No player pitcher or catcher assignment needed.
      </p>
    )}

    <div className={styles.footer}>
      <button
        type="button"
        className={styles.nextButton}
        onClick={onComplete}
        disabled={!canAdvance}
      >
        Next
      </button>
    </div>
  </div>
);
```

Note the four changes:
1. `hasAnyAssignment` is computed in `PCAssignmentStep` (moved from `PCTimeline`) so the toolbar can decide whether to show Clear all.
2. `<PCToolbar>` is rendered above the `playerPitching` branch.
3. `<PCTimeline>` no longer receives `onAutofill` / `onClearAll`.
4. The toolbar is visible in both the AAA/Coast branch and the AA "coach pitch" branch.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: any remaining error is from `GameDayDesktop.tsx` if it also uses `PCTimeline` with the dropped props. If no errors here, skip ahead — Task 6's grep will confirm.

- [ ] **Step 4: Do NOT commit yet**

Continue to Task 6.

---

## Task 6: Wire `PCToolbar` into `GameDayDesktop`

**Files:**
- Modify: `src/components/game-day/GameDayDesktop.tsx`

`GameDayDesktop.tsx` renders `<PCTimeline>` at lines 279–294 inside a `<Card label="Pitcher & Catcher">`, only when `playerPitching` is true. In AA mode the layout switches to a different `<Card label="Generate">` — so the desktop P/C card already only exists for AAA/Coast. Scope decision: only add the toolbar inside the AAA/Coast card. On desktop, AA users continue to switch division from the global Settings page (avoids restructuring the AA "Generate" card).

- [ ] **Step 1: Add the `PCToolbar` import and pull `setDivision`**

In `src/components/game-day/GameDayDesktop.tsx`:

1. Update the pc-timeline import on line 10:
   ```tsx
   // BEFORE
   import { PCTimeline, LastGamePitchers } from './pc-timeline';

   // AFTER
   import { PCTimeline, PCToolbar, LastGamePitchers } from './pc-timeline';
   ```

2. Update the `useGameConfig` destructure on line 124 to also pull `setDivision`:
   ```tsx
   // BEFORE
   const { config } = useGameConfig();

   // AFTER
   const { config, setDivision } = useGameConfig();
   ```

- [ ] **Step 2: Render `PCToolbar` inside the P/C card and drop the dropped props from `PCTimeline`**

Replace the existing `<PCTimeline>` block at lines 279–294 with:

```tsx
<PCToolbar
  division={config.division}
  onDivisionChange={setDivision}
  onAutofill={autofillDefaults}
  onClearAll={
    Object.keys(pitcherAssignments).length > 0 ||
    Object.keys(catcherAssignments).length > 0
      ? clearAll
      : undefined
  }
/>
<PCTimeline
  innings={innings}
  presentPlayers={presentPlayers}
  pitcherAssignments={pitcherAssignments}
  catcherAssignments={catcherAssignments}
  colorByPlayer={colorByPlayer}
  catcherInningsByPlayer={catcherInningsByPlayer}
  pitcherInningsByPlayer={pitcherInningsByPlayer}
  pitcherOptionsFor={pitcherOptionsFor}
  catcherOptionsFor={catcherOptionsFor}
  onPitcherChange={changeInningPitcher}
  onCatcherChange={changeInningCatcher}
  compact
/>
```

The `compact` prop on `PCTimeline` stays. `onAutofill` and `onClearAll` are removed from `PCTimeline`. The toolbar inherits `compact` styling on its own (via `<DivisionToggle compact />` inside `PCToolbar`).

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors. The full repo type-checks now.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no warnings. If the type changes left an unused import or variable, remove it before continuing.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all existing tests pass. No tests should change behavior since the cascading effects of `setDivision` (innings rewrite) are unchanged.

- [ ] **Step 6: Commit Tasks 4–6 together**

```bash
git add src/components/game-day/pc-timeline/PCTimeline.tsx \
        src/components/game-day/pc-timeline/PCTimeline.module.css \
        src/components/game-day/steps/PCAssignmentStep.tsx \
        src/components/game-day/GameDayDesktop.tsx
git commit -m "refactor(PCTimeline): move toolbar to PCToolbar, surface division in P/C step"
```

---

## Task 7: Manual verification pass

**Files:** none

- [ ] **Step 1: Build the production bundle**

Run: `npm run build`
Expected: `tsc -b` succeeds and `vite build` produces output without errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Wait for Vite to print the local URL.

- [ ] **Step 3: Verify the global Settings page**

Navigate to the Settings tab. Confirm:
- The division selector renders as a three-segment pill (`AA | AAA | Coast`).
- The active segment is filled with the primary color.
- Hovering over an inactive segment shows the surface-hover background.
- Clicking another segment updates the active state and the rules list below it.

- [ ] **Step 4: Verify the P/C step (AAA)**

With division set to AAA, navigate to the Game Day flow → P/C Assignment step. Confirm:
- The toolbar shows `[ AA | AAA | Coast ]   [Auto-fill]   [Clear all (only after autofill)]`.
- The AAA segment is active.
- The grid below shows 5 inning columns.

- [ ] **Step 5: Verify division switching from the P/C step**

While on the P/C step:
1. Click `Coast` — the grid should redraw with 6 inning columns; toggle stays visible.
2. Click `AAA` — the grid should shrink back to 5 inning columns; previously assigned inning 6 entries disappear from view.
3. Click `AA` — the grid disappears; the "AA division — coach pitch" note appears below the toolbar; the toggle remains visible above the note. Auto-fill and Clear all are hidden.
4. Click `AAA` — the grid reappears, empty.

- [ ] **Step 6: Verify persistence**

Reload the page and confirm the most recently selected division is still active in both the global Settings page and the P/C step.

- [ ] **Step 7: Capture confirmation**

Note in the conversation: "Manual verification complete — toggle works in both surfaces, switching divisions cascades correctly, persistence intact." If anything failed, file a fix task instead of marking complete.

---

## Done

All tasks complete. The division setting now appears as a segmented pill in two surfaces (Settings page + P/C step toolbar), both wired to the same `useGameConfig` hook.
