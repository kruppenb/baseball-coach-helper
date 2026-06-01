# Per-Inning Lineup Lock — Design

**Status:** Approved
**Date:** 2026-06-01

## Problem

When a coach is happy with how one inning of the fielding lineup looks but wants
to reshuffle the rest, the only option today is Regenerate, which rebuilds **every**
inning. There's no way to pin an inning and regenerate around it. We want the
coach to "lock" individual innings while editing the lineup; a subsequent
Regenerate must leave locked innings byte-for-byte unchanged and only rework the
unlocked innings.

This is the per-inning analog of the existing batting-order lock
(`BattingOrderState.isLocked` + `LockToggle`, "Regenerate will skip it").

## Scope

- Add per-inning lock state to the fielding lineup, persisted with the rest of
  lineup state.
- Add a lock toggle to each inning column header in `DraggableLineupGrid`
  (shared by the mobile ReviewStep and the GameDayDesktop view, so both get it).
- Make `useLineup.generate()` preserve locked innings exactly, regenerating only
  the unlocked innings.
- Teach the lineup generator to build unlocked innings **around** the locked ones
  so cross-inning fairness rules (bench rotation, no-consecutive-bench) still hold.

## Non-Goals

- Per-cell or per-player locking. Lock granularity is a whole inning (column).
- Disabling manual drag edits inside a locked inning. **Lock blocks Regenerate
  only** — hand-dragging within a locked inning stays allowed, mirroring the
  batting-order lock's behavior.
- Locking the batting order per-row (the batting-order lock is already a single
  boolean and is unchanged here).
- Persisting locks across the New Game flow (they are per-game scratch state).

## Behavior

- A lock toggle (🔒 / 🔓) appears on each inning header. Locked columns get a
  subtle tint + lock badge.
- Locking an inning has no immediate effect on the displayed lineup. It only
  changes what Regenerate does.
- Regenerate: locked innings are reproduced exactly; unlocked innings are rebuilt.
  Manual hand-edits made to a locked inning before Regenerate are preserved (they
  are already persisted into the selected lineup, which is the lock source).
- If **all** innings are locked, Regenerate is a no-op for the fielding lineup. The
  batting order still regenerates if it is unlocked. A small status note tells the
  coach nothing changed.

## Architecture

### Data model — `LineupState`

Add one field:

```ts
export interface LineupState {
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  generatedLineups: Lineup[];
  selectedLineupIndex: number | null;
  lockedInnings: number[];   // NEW — 1-based inning numbers, default []
}
```

`defaultState.lockedInnings = []`. Because the New Game flow calls
`resetState()` (→ `defaultState`), locks clear automatically on a new game.

The existing `cleanState` memo in `useLineup` already strips stale P/C keys when
the innings count shrinks; it gains a parallel step that filters
`lockedInnings` down to `n <= innings`. AA division (no player pitching) does not
affect locks — locks are division-agnostic.

> Note: `lockedInnings` is a new optional-in-practice field on a persisted
> document. Reads must tolerate its absence on older stored state
> (`state.lockedInnings ?? []`), exactly as `isLocked` is read with
> `?? false` in `useBattingOrder`.

### `useLineup` changes

- Expose `lockedInnings: number[]` (via `cleanState`, so it is auto-cleaned).
- New action `toggleInningLock(inning: number)`: adds/removes the inning from
  `lockedInnings`.
- `generate()` builds the locked-inning assignment map from the **currently
  selected lineup** and threads it into the generator input:

  ```ts
  const selected = cleanState.selectedLineupIndex != null
    ? cleanState.generatedLineups[cleanState.selectedLineupIndex]
    : undefined;
  const lockedInningAssignments: Record<number, InningAssignment> = {};
  if (selected) {
    for (const inn of cleanState.lockedInnings) {
      if (selected[inn]) lockedInningAssignments[inn] = selected[inn];
    }
  }
  // passed to generateBestLineup via input.lockedInnings
  ```

  Hand-edits are already flushed into the selected lineup by the
  `updateSelectedLineup` effect in ReviewStep / GameDayDesktop, so this captures
  edits too. If there is no current lineup yet (first generate), the map is empty
  and generation is unchanged.

Because both Regenerate buttons call this same `generate()`, no per-screen logic
is needed.

### Generator — seed locked innings into the builder (Approach B)

Add an optional field to the generation input:

```ts
export interface GenerateLineupInput {
  // …existing…
  /** Innings to preserve verbatim: inning -> assignment. Builder fills only the rest. */
  lockedInnings?: Record<number, InningAssignment>;
}
```

Changes in `attemptBuild` (`src/logic/lineup-generator.ts`):

1. **Infield pre-assignment (Phase 3):** when building `infieldSlots` for innings
   `1..maxInfieldInning`, skip any inning present in `lockedInnings`. A locked
   inning's infield is already decided, so it must not consume slot "need" from
   the unlocked pool.
2. **Main inning loop (Phase 4):** at the top of each iteration, if the inning is
   locked, copy the preserved assignment into `lineup[inn]`, derive the `used` set
   from its player IDs, run the existing end-of-loop bench-count update against
   that `used` set, and `continue`. Everything downstream (`satLastInning`,
   `benchCountSoFar`) reads from `lineup[inn-1]`, so the next inning is built with
   full awareness of the locked inning — cross-boundary bench fairness and the
   no-consecutive-bench rule are satisfied **constructively**, not by retry luck.

`validateLineup` and `scoreLineup` then run over the merged result as they do
today, so a locked inning that itself violates a rule (e.g. a hand-edit that
benched a kid twice via the locked column) is surfaced normally rather than
silently "fixed."

`generateBestLineup` / `generateMultipleLineups` need no changes beyond passing
`input` through (they already do).

### UI — `DraggableLineupGrid`

New props:

```ts
lockedInnings: number[];
onToggleInningLock: (inning: number) => void;
```

- Each inning header cell renders its label plus a small lock button reusing the
  existing `LockToggle` look (🔒 when locked, 🔓 otherwise) with appropriate
  `aria-pressed` / `aria-label` ("Lock inning 1" / "Unlock inning 1").
- Locked columns get a subtle background tint and the header shows the lock badge,
  so the locked state is obvious at a glance.
- Cells in a locked column **remain draggable** — lock affects Regenerate only.

Both `ReviewStep` and `GameDayDesktop` pass `lockedInnings` and
`onToggleInningLock` (from `useLineup`) into the grid. Each screen's Regenerate
handler is otherwise unchanged — the lock logic lives entirely inside
`generate()`.

### Status note when all innings are locked

`generate()` already returns `{ success, errors, warnings }`. The Regenerate
handlers (ReviewStep `handleRegenerate`, GameDayDesktop `handleGenerate`) gain a
small check: if every inning is locked, show a brief status line ("All innings
locked — nothing to regenerate."). GameDayDesktop reuses its existing
`statusMessage` slot. ReviewStep adds a sibling neutral-status line next to its
existing `generateError` paragraph (not the error slot, to avoid red error
styling for a non-error condition).

## Edge Cases

| Case | Handling |
|---|---|
| Lock toggled before any lineup exists | The grid (and thus the toggle) only renders once a lineup exists, so a locked inning always has an assignment to preserve. Defensive: `generate()` skips locked innings with no `selected[inn]`. |
| Innings count reduced below a locked inning | `cleanState` filters `lockedInnings` to `<= innings`, same as P/C cleanup. |
| Locked inning references a now-absent player | Preserved as-is; existing validation flags it. Coach can unlock & regenerate or fix by hand. No special handling. |
| All innings locked + Regenerate | Lineup unchanged; batting order still regenerates if unlocked; status note shown. |
| Older stored `LineupState` without `lockedInnings` | Read as `?? []`. |
| Hand-edit inside a locked inning, then Regenerate | Edit is in the selected lineup → captured as the locked assignment → preserved. |

## Testing (TDD)

**Generator (`lineup-generator.test.ts`):**
- A locked inning's assignment is reproduced exactly across generation; deep-equal
  the locked inning before/after.
- Unlocked innings can still differ across runs (generation is not frozen wholesale).
- With a locked inning that benches a given player, the adjacent unlocked inning
  does not also bench that player → merged lineup passes `validateLineup`
  (no-consecutive-bench) on a representative tight roster.
- Locked innings are not double-counted in infield pre-assignment (unlocked
  innings still satisfy infield-minimum on a representative roster).

**`useLineup`:**
- `toggleInningLock` adds then removes an inning from `lockedInnings`.
- Reducing `innings` cleans out-of-range locked innings.
- `generate()` passes the selected lineup's locked-inning assignments through to
  the generator (locked inning preserved end-to-end).

**Grid (`DraggableLineupGrid`):**
- Renders a lock toggle per inning header and fires `onToggleInningLock` with the
  right inning number; locked column reflects locked styling/`aria-pressed`.

## Out of Scope

- Locking outfield-only or specific positions within an inning.
- Visual diff of which innings changed after a partial regenerate.
- Persisting locks into saved game history.
