# Position blocks popover in lineup section

**Date:** 2026-05-03
**Status:** Approved

## Problem

Position blocks (per-player constraints like "Jimmy can't catch") live behind a `<details>` toggle on the Settings page (SETT-04). The lineup generator already consumes `positionBlocks` from `useLineup`, but coaches rarely visit Settings during game prep, so blocks go unset and the generator produces lineups that violate constraints the coach has in their head.

## Goal

Surface position-block editing inside the Lineup section so it's discoverable at the moment of generation, taking minimal vertical space. Make the existing logic produce more accurate lineups by getting blocks set in the first place.

## Design

### New component: `PositionBlocksPopover`

`src/components/lineup/PositionBlocksPopover.tsx` + `PositionBlocksPopover.module.css` — self-contained trigger + modal-style popover.

**Props:**

```ts
interface PositionBlocksPopoverProps {
  presentPlayers: Player[];
  positionBlocks: PositionBlocksType;
  onToggleBlock: (playerId: string, position: Position) => void;
}
```

**Trigger:**

- Inline button. Label: `Position Blocks` (always). When `totalBlocked > 0`, append a count chip — e.g., `Position Blocks · 3`.
- Compact size, fits next to the `Edited` badge inside the Lineup card header area.
- Muted color when count is 0; standard accent when count > 0.

**Popover:**

- Reuses the `PCChipPopover` pattern: backdrop overlay (`role="presentation"`), centered dialog (`role="dialog"`), Esc and click-outside dismiss, internal close button.
- Title: `Position Blocks`.
- Body: vertical list of present players, each row showing player name + position chips. Tapping a chip toggles the block. This is the same markup currently inside `PositionBlocks.tsx`.
- Empty state: when no players are present, show "Mark players as present on the Game Setup tab first."
- Dimensions: max-height with internal scroll so the popover never exceeds the viewport (mobile-safe).

### Insertion points

**`GameDayDesktop.tsx`** — inside `<Card label="Lineup">`, render `<PositionBlocksPopover>` in a header row alongside the existing `Edited` badge. Wire props from existing `useLineup` destructuring (`presentPlayers`, `positionBlocks`, `togglePositionBlock` — currently not destructured here, so add them).

**`ReviewStep.tsx`** — inside the lineup `<div className={styles.section}>` that wraps `DraggableLineupGrid`, render the popover trigger above the grid. Same hook source (`useLineup`).

### Behavior on edit

No regenerate, no stale warning. Block edits take effect via the existing `validateLineup` pipeline:

- If a player is now blocked from a position they're currently in, that cell goes red and the `ValidationPanel` shows the violation.
- Coach can drag-fix the cell or click `Regenerate` to rebuild from scratch.

This reuses existing machinery; no new state.

### Removals

- **Delete** `src/components/lineup/PositionBlocks.tsx` and `PositionBlocks.module.css` — the only consumer is `SettingsPage`, which is being trimmed.
- **Edit** `src/components/settings/SettingsPage.tsx` — remove SETT-04 (heading + `<PositionBlocks>`), remove `import { PositionBlocks }`, and drop the now-unused `useLineup()` destructuring (`presentPlayers`, `positionBlocks`, `togglePositionBlock`). Keep `useLineup` import only if other destructuring uses it; otherwise drop it.

## Non-goals

- No changes to `lineup-generator.ts`, `lineup-validator.ts`, or `useLineup`. The generator already handles `positionBlocks`.
- No auto-regeneration on block change.
- No per-player popover (single popover with full roster).
- No introduction of a separate popover library — reuse the existing CSS pattern from `PCTimeline.module.css` / `PCChipPopover`.

## Testing

- New component: render test verifying trigger + open/close + chip toggle propagation. Co-located: `src/components/lineup/PositionBlocksPopover.test.tsx` (vitest + RTL).
- Existing `lineup-generator.test.ts` and `lineup-validator.test.ts` already cover the block-aware logic — no changes needed.
- Manual smoke: open Lineup tab → click Position Blocks → toggle a chip → confirm grid validation reflects the change → confirm Regenerate respects new block.

## Alternatives considered

- **Per-player trigger on lineup grid cells.** Rejected — conflicts with drag-and-drop hit targets.
- **Auto-regenerate on popover close.** Rejected — would discard manual grid edits silently.
- **Stale-warning treatment for block changes.** Rejected — soft validation via existing `ValidationPanel` is enough; no extra banner.
- **Player-first compact popover (drill into one player at a time).** Rejected — predominant action is "scan everyone" pre-generation; full grid is faster.
- **Keep the Settings page section as a second entry point.** Rejected — single source of truth in the UI is cleaner.
