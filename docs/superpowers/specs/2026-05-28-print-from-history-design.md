# Print Lineup From Game History — Design

**Status:** Approved
**Date:** 2026-05-28

## Problem

Coaches can print a dugout card from the Game Day flow, but once a game is saved to History there is no way to reprint it. Re-creating the lineup is the only workaround. We want a Print button on each history entry that produces the same printed dugout card as the live flow.

## Scope

- Add a Print button inside each expanded game card on the History page.
- Reuse the existing `DugoutCard` component and its `@media print` styles — no new print layout.
- Use the saved entry's snapshot data (lineup, batting order, division, player names) so renamed or deleted players still print correctly.
- The existing on-screen summary inside the expanded card stays as-is.

## Non-Goals

- Reworking the expanded-detail UI (the player position/bench table stays).
- Changes to the Game Day print flow.
- Adding new persisted fields to `GameHistoryEntry` — everything needed is already stored.

## Architecture

### Existing print isolation

`src/index.css` already isolates print output via the `[data-dugout-card]` attribute:

```css
@media print {
  body * { visibility: hidden; height: 0; overflow: hidden; … }
  [data-dugout-card], [data-dugout-card] * { visibility: visible; height: auto; … }
  [data-dugout-card] { position: absolute; left: 0; top: 0; width: 100%; }
}
```

`DugoutCard` already carries `data-dugout-card`. Triggering `window.print()` while a `DugoutCard` is anywhere in the DOM produces the printed output; everything else collapses to zero size and hidden visibility.

### Print-from-history flow

When the user clicks Print on a history entry, `HistoryPage` mounts an offscreen `DugoutCard` populated from the entry, then calls `window.print()`. After the print dialog closes (or is cancelled), the offscreen card unmounts.

```
Print click → setPrintingEntry(entry)
            → re-render with offscreen <DugoutCard … />
useEffect   → window.addEventListener('afterprint', clear, { once: true })
            → requestAnimationFrame(window.print)
afterprint  → setPrintingEntry(null) → offscreen card unmounts
```

Only the History tab mounts this offscreen card, so it cannot collide with the live Game Day `DugoutCard` (Game Day content is conditionally rendered only when its tab is active).

## Component Changes

### `DugoutCard.tsx`

Today the component hardcodes the current date and reads division from the live `useGameConfig()` hook. To replay saved games it needs to accept both:

- New optional prop `gameDate?: Date` — defaults to `new Date()` (preserves Game Day behavior). Used by the header and both scorekeeper strips.
- New optional prop `division?: Division` — defaults to `config.division` from the existing hook. Used to compute `positions = getPositions(...)`.

The existing call site in `PrintStep.tsx` does not pass either prop and behavior is unchanged.

### `HistoryPage.tsx`

Additions:

- State: `const [printingEntry, setPrintingEntry] = useState<GameHistoryEntry | null>(null)`
- `useEffect` keyed on `printingEntry`: when non-null, attaches a one-shot `afterprint` listener that calls `setPrintingEntry(null)`, then schedules `window.print()` via `requestAnimationFrame`. Cleanup returns the listener-remove fn in case of unmount mid-print.
- Print button inside `GameCardDetail` (above the fielding table). On click: `setPrintingEntry(game)`. Stops event propagation so it does not toggle card collapse.
- Offscreen host at the bottom of the page tree:
  ```tsx
  {printingEntry && (
    <div className={styles.printOnly} aria-hidden="true">
      <DugoutCard
        lineup={printingEntry.lineup}
        innings={printingEntry.innings}
        players={synthesizePlayers(printingEntry)}
        battingOrder={printingEntry.battingOrder}
        gameLabel={printingEntry.gameLabel}
        gameDate={new Date(printingEntry.gameDate)}
        division={printingEntry.division ?? 'AAA'}
      />
    </div>
  )}
  ```
- Player synthesis (local helper):
  ```ts
  function synthesizePlayers(entry: GameHistoryEntry): Player[] {
    return entry.playerSummaries.map(s => ({
      id: s.playerId,
      name: s.playerName,
      isPresent: true,
    }));
  }
  ```
  All summary players were present in the saved game, so `isPresent: true` makes the bench-row filter compute correctly.

### `HistoryPage.module.css`

Add:

```css
.printOnly {
  visibility: hidden;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
```

No positioning. During print the global `[data-dugout-card] { position: absolute; left: 0; top: 0 }` rule anchors the card to the body, not to this wrapper.

## Edge Cases

| Case | Handling |
|---|---|
| Legacy entry missing `division` | Fall back to `'AAA'` (matches pre-AA/Coast default). |
| Renamed/deleted players | Use snapshot names from `entry.playerSummaries`. |
| User cancels print dialog | `afterprint` fires anyway → state clears. |
| User clicks Print on a second game before the first finishes | New `setPrintingEntry` triggers re-render; the second `useEffect` schedules another `window.print()`. The first `afterprint` listener (registered `{ once: true }`) clears state on the first close, the second registers on the new render. Acceptable. |
| User switches tabs mid-print | History unmounts; the `afterprint` listener fires on the global window object and the state setter is a no-op on the unmounted component. React will log a warning but no functional issue; cleanup return removes the listener if unmount happens before `afterprint` fires. |

## Testing

Manual:
- Print a saved game from History → printed output matches the Game Day print for that game (same lineup, batting order, date, label).
- Cancel the print dialog → no leftover offscreen card in the DOM.
- Print a legacy entry (no `division` field) → renders with 9-position layout.
- Print after deleting a player who was in the saved game → printed names match the historical snapshot.

No new automated tests required — the new logic is wiring; `DugoutCard` rendering is already covered by its current use.

## Out of Scope

- Persisting a printed-vs-unprinted state.
- Sharing or exporting beyond browser print.
