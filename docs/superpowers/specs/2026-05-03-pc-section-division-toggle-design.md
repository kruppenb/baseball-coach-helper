# P/C section division toggle

**Date:** 2026-05-03
**Status:** Approved

## Problem

Division (AA / AAA / Coast) lives only on the global Settings page (`SettingsPanel.tsx`). It impacts the Pitcher & Catcher step the most — AA hides the entire P/C grid (coach pitch), AAA and Coast change the inning count and therefore the number of P/C columns.

Coaches working on the P/C step have no in-context way to confirm or change division without leaving the flow, and the global setting reads as a generic dropdown rather than the rarely-touched configuration switch it actually is.

## Goal

Mirror the division setting in the P/C section so coaches can see and change it without leaving the step. Use a visual treatment that telegraphs "this is a one-time mode switch" rather than "this is part of your flow."

## Design

### New shared component: `DivisionToggle`

`src/components/game-setup/DivisionToggle.tsx` — three-segment pill control.

**Props:**

```ts
interface DivisionToggleProps {
  division: Division;
  onChange: (value: Division) => void;
  /** Compact variant for inline use in toolbars (smaller font, ~30px tall). */
  compact?: boolean;
}
```

**Visual:**

- Single rounded container (`border-radius: var(--radius-sm)`, 1px border using `--color-border-strong`) holding three buttons in a row.
- Active segment: `--color-primary` background, white text, `font-weight: 700`.
- Inactive segments: transparent background, `--color-text-muted`, no internal borders between segments (single divider lines only).
- Default size: ~36px tall, `--font-size-sm`. Compact: ~30px tall, `--font-size-xs`, tighter horizontal padding.
- Buttons render `AA` / `AAA` / `Coast` as labels.
- Standard hover state on inactive segments uses `--color-surface-hover`.

**Co-located CSS module:** `DivisionToggle.module.css`.

### `SettingsPanel.tsx`

Replace the existing `<select id="division-select">` (and its label row) with:

```tsx
<DivisionToggle division={division} onChange={onDivisionChange} />
```

The rules list and the pitchers/catchers-per-game rows below it are unchanged. The "Division" `settingLabel` text is removed — the toggle's segment labels are self-describing.

### `PCTimeline.tsx`

Add two props:

```ts
division: Division;
onDivisionChange: (value: Division) => void;
```

Toolbar JSX becomes:

```tsx
<div className={styles.toolbar}>
  <DivisionToggle
    division={division}
    onChange={onDivisionChange}
    compact
  />
  <button type="button" className={styles.autofillBtn} onClick={onAutofill}>
    Auto-fill
  </button>
  {hasAnyAssignment && (
    <button type="button" className={styles.clearBtn} onClick={onClearAll}>
      Clear all
    </button>
  )}
</div>
```

Layout order: `[ AA | AAA | Coast ]   [Auto-fill]   [Clear all]`. The toolbar's existing `display: flex; gap: var(--space-sm); flex-wrap: wrap` already accommodates this without changes.

### `PCAssignmentStep.tsx`

`useGameConfig()` already returns `setDivision`. Pull it and pass to `PCTimeline`:

```ts
const { config, setDivision } = useGameConfig();
// ...
<PCTimeline
  // ...existing props
  division={config.division}
  onDivisionChange={setDivision}
/>
```

The component must always render the toggle, including when `playerPitching` is false (currently the AA branch shows only an `<aaNote>` paragraph). Restructure so the toolbar with the toggle is always shown; the grid and `LastGamePitchers` are gated on `playerPitching`. When AA is active, the user sees:

```
[ AA | AAA | Coast ]
AA division — coach pitch. No player pitcher or catcher assignment needed.
```

This is what makes the toggle in the P/C section discoverable for coaches who set up AA: they can switch to AAA or Coast directly from this step.

To do this without coupling the toolbar to grid props, split `PCTimeline` so the toolbar (with `DivisionToggle`, Auto-fill, Clear all) is rendered by `PCAssignmentStep` directly, or extract a small `PCToolbar` component. **Choice:** extract `PCToolbar` (`src/components/game-day/pc-timeline/PCToolbar.tsx`) — keeps `PCTimeline` focused on the grid, lets `PCAssignmentStep` render the toolbar above both the AA note and the AAA/Coast grid.

`PCToolbar` props:

```ts
interface PCToolbarProps {
  division: Division;
  onDivisionChange: (value: Division) => void;
  onAutofill?: () => void;     // hidden when playerPitching is false
  onClearAll?: () => void;     // hidden when no assignments
}
```

`PCTimeline` drops `onAutofill` / `onClearAll` from its props (moved to the new toolbar) and no longer renders the toolbar internally.

## Side effects (existing behavior, called out)

`useGameConfig.setDivision` rewrites `innings` (AA=4, AAA=5, Coast=6). When a coach switches division mid-flow:

- AAA/Coast → AA: P/C grid hidden by existing `playerPitching` branch. Stored P/C assignments remain in state but are invisible.
- AA → AAA/Coast: P/C grid appears, empty.
- AAA ↔ Coast: grid grows or shrinks by one inning column. Assignments for inning 6 stay in state when going Coast → AAA but are not rendered.

No new logic. No confirmation dialog before switching — the user explicitly opted out of guarding this.

## Out of scope

- Pitchers-per-game / catchers-per-game stay only in `SettingsPanel`.
- No changes to the Settings page route or game-setup page.
- No telemetry / analytics for the toggle.
- No keyboard shortcut for switching divisions.

## Testing

The project's vitest config uses `environment: 'node'` and has no React Testing Library or JSX component test infrastructure (existing tests under `src/hooks` and `src/logic` test pure functions only). Adding a component-rendering harness is out of scope for this change.

- **Type / build check:** `npm run build` (root) must pass. ESLint via `npm run lint` must pass.
- **Existing tests:** `npm test` must continue to pass — no behavioral change is expected in `usePCAssignment` or any logic module, since `setDivision`'s side effects are unchanged.
- **Manual verification:**
  - Click each segment of the toggle on the global Settings page and on the P/C step; confirm active state matches in both places.
  - Switch AAA → AA on the P/C step: the grid hides, the AA note appears, the toggle stays visible above the note.
  - Switch AA → AAA on the P/C step: the grid appears (empty), the AA note is gone, the toggle stays visible.
  - Switch AAA ↔ Coast on the P/C step: the grid resizes (5 vs 6 inning columns) and previous assignments for inning 6 stay in state but disappear from view when going Coast → AAA.
  - Reload the app after each change and confirm the new division persists (validates the cloud-storage round trip).

## Files touched

- **Add:** `src/components/game-setup/DivisionToggle.tsx`, `src/components/game-setup/DivisionToggle.module.css`
- **Add:** `src/components/game-day/pc-timeline/PCToolbar.tsx`, `src/components/game-day/pc-timeline/PCToolbar.module.css`
- **Edit:** `src/components/game-setup/SettingsPanel.tsx` (replace select with `DivisionToggle`)
- **Edit:** `src/components/game-day/pc-timeline/PCTimeline.tsx` (drop toolbar, drop `onAutofill` / `onClearAll` props)
- **Edit:** `src/components/game-day/pc-timeline/index.ts` (export `PCToolbar`)
- **Edit:** `src/components/game-day/steps/PCAssignmentStep.tsx` (render `PCToolbar` outside the `playerPitching` branch, pass division props)
