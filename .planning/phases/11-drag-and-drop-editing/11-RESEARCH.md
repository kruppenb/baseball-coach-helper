# Phase 11: Drag-and-Drop Editing - Research

**Researched:** 2026-02-15
**Domain:** React drag-and-drop, touch interaction, real-time constraint validation
**Confidence:** HIGH

## Summary

Phase 11 adds drag-and-drop editing to two existing components: the fielding LineupGrid (swap players between positions within an inning) and the BattingOrderList (reorder the batting lineup). Both components exist today as read-only displays. The phase also requires real-time constraint validation feedback on every edit and mobile touch support with drag handles that do not conflict with page scrolling.

The recommended library is `@dnd-kit/react` v0.2.4, the new React-first package from the dnd-kit ecosystem. It explicitly supports React 18 and 19 as peer dependencies, is under active development (multiple beta releases daily as of today), and provides a simpler API than the legacy `@dnd-kit/core` + `@dnd-kit/sortable` stack. The two DnD interaction patterns needed are: (1) `useDraggable` + `useDroppable` for grid cell swaps (fielding positions), and (2) `useSortable` for list reordering (batting order). The existing `validateLineup()` function in `lineup-validator.ts` can be called synchronously on every state change to provide real-time constraint feedback -- no new validation logic is needed, just wiring.

**Primary recommendation:** Install `@dnd-kit/react` (v0.2.4) and `@dnd-kit/helpers`. Create DnD-enabled variants of LineupGrid and BattingOrderList. Use drag handles (via `handleRef`) with `touch-action: none` on the handle element only, so page scrolling is preserved. Re-validate the lineup after every swap/reorder by calling the existing `validateLineup()` function.

## Standard Stack

### Core (new dependency)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/react` | 0.2.4 | Drag-and-drop primitives for React | New official React package from dnd-kit ecosystem; explicit React 19 peer dep support; simpler API than legacy `@dnd-kit/core`; actively maintained (published 2026-02-08) |
| `@dnd-kit/helpers` | 0.2.4 | Array move/transfer utilities | Companion to `@dnd-kit/react` for array manipulation during sort operations |

### Already in use (no changes)
| Library | Version | Purpose |
|---------|---------|---------|
| React | ^19.2.0 | UI framework -- `@dnd-kit/react` declares `^18.0.0 \|\| ^19.0.0` as peer dep |
| CSS Modules | (Vite built-in) | Scoped styling -- no change needed |
| Vitest | ^4.0.18 | Testing drag operations and state changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/react` 0.2.4 | `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0 | Legacy stack; last published Dec 2024; peer deps say `>=16.8.0` (technically accepts React 19) but `@dnd-kit/core` is no longer receiving updates. The new `@dnd-kit/react` has official docs, migration guide, and is the future of the ecosystem. |
| `@dnd-kit/react` 0.2.4 | `react-beautiful-dnd` | Abandoned by Atlassian; does not support React 19; uses deprecated `findDOMNode`. Not viable. |
| `@dnd-kit/react` 0.2.4 | HTML5 Drag and Drop API | No touch support; inconsistent mobile behavior; poor accessibility. Unacceptable for DND-04. |
| `@dnd-kit/react` 0.2.4 | `pragmatic-drag-and-drop` (Atlassian) | Newer Atlassian library; headless approach; lacks the sortable primitives that dnd-kit provides. More boilerplate for our use case. |

**Installation:**
```bash
npm install @dnd-kit/react @dnd-kit/helpers
```

### React 19 Compatibility Verification (Research Flag Resolution)

The project note flagged: "Validate @dnd-kit/core v6.3.1 with React 19 before Phase 11 commits."

**Finding:** The original `@dnd-kit/core` v6.3.1 (published Dec 2024) is now legacy. The maintainer has shifted active development to `@dnd-kit/react`, a completely new package built on `@dnd-kit/dom`, `@dnd-kit/state`, and `@dnd-kit/abstract`.

- `@dnd-kit/react` v0.2.4 explicitly declares `"react": "^18.0.0 || ^19.0.0"` as a peer dependency (verified via `npm view`).
- `@dnd-kit/core` v6.3.1 declares `"react": ">=16.8.0"` -- technically compatible but unmaintained.
- `@dnd-kit/core` never used `findDOMNode`, so it would not break at runtime with React 19. However, it is the deprecated path.

**Recommendation:** Use `@dnd-kit/react` v0.2.4, not `@dnd-kit/core` v6.3.1. The research flag is resolved: React 19 compatibility is confirmed for the new package, and the legacy package should be avoided for new projects.

**Risk assessment for `@dnd-kit/react` v0.2.4 (pre-1.0):**
- The package is pre-1.0, which means API could change.
- A keyboard accessibility regression was introduced in v0.2.0 and fixed in v0.2.2 (Jan 18, 2026). Current v0.2.4 includes the fix.
- The maintainer is publishing 0.3.0 beta releases daily (as of today), indicating active development.
- For this app (youth baseball coaching tool, not an enterprise SaaS), the risk of a pre-1.0 dependency is acceptable. The DnD surface area is limited to two components, making future migration straightforward if needed.
- **Mitigation:** Pin to `~0.2.4` (patch updates only) rather than `^0.2.4` to avoid unexpected breaking changes from minor bumps.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    lineup/
      LineupGrid.tsx              # Existing read-only grid (keep as-is)
      LineupGrid.module.css
      DraggableLineupGrid.tsx     # New: DnD-enabled grid wrapper
      DraggableLineupGrid.module.css
      DraggableCell.tsx           # New: individual draggable grid cell
      ValidationPanel.tsx         # Existing (unchanged)
    batting-order/
      BattingOrderList.tsx        # Existing read-only list (keep as-is)
      BattingOrderList.module.css
      SortableBattingOrder.tsx    # New: DnD-enabled sortable list
      SortableBattingOrder.module.css
      SortableItem.tsx            # New: individual sortable batting item
    game-day/
      steps/
        ReviewStep.tsx            # Modified: swap in DnD components, add edit mode
  hooks/
    useLineupEditor.ts            # New: mutable lineup state + validation on every change
```

### Pattern 1: Fielding Grid Swap (DND-01)
**What:** Coach drags a player name from one cell to another within the same inning column. The two players swap positions.
**When to use:** Fielding position grid in the Review step.
**Interaction model:** Each cell in a given inning is both draggable and droppable. Dragging player A onto player B's cell swaps them. The bench row is also a drop target (benching a player, though this needs to account for the 9-position constraint).

```typescript
// Source: https://dndkit.com/react/quickstart.md
// Fielding swap: each cell is a draggable, each position slot is a droppable
import { DragDropProvider } from '@dnd-kit/react';
import { useDraggable } from '@dnd-kit/react';
import { useDroppable } from '@dnd-kit/react';

// Each cell identified by `${inning}-${position}` compound key
function DraggableCell({ inning, position, playerId, playerName }: Props) {
  const { ref: dragRef, handleRef, isDragSource } = useDraggable({
    id: `${inning}-${position}`,
    data: { inning, position, playerId },
  });

  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `drop-${inning}-${position}`,
    // Only accept drops from the same inning
    accepts: (source) => source.data?.inning === inning,
  });

  return (
    <div ref={dropRef} className={isDropTarget ? styles.dropTarget : styles.cell}>
      <span ref={dragRef}>
        <span ref={handleRef} className={styles.dragHandle}>
          &#x2630; {/* hamburger icon */}
        </span>
        {playerName}
      </span>
    </div>
  );
}

// In the parent DragDropProvider onDragEnd:
function handleSwap(event) {
  if (event.canceled) return;
  const { source, target } = event.operation;
  if (!target) return;

  const sourceData = source.data; // { inning, position, playerId }
  const targetData = target.data;

  // Swap the two players in the lineup state
  updateLineup(prev => {
    const updated = structuredClone(prev);
    const sourcePlayer = updated[sourceData.inning][sourceData.position];
    const targetPlayer = updated[targetData.inning][targetData.position];
    updated[sourceData.inning][sourceData.position] = targetPlayer;
    updated[targetData.inning][targetData.position] = sourcePlayer;
    return updated;
  });
}
```

### Pattern 2: Batting Order Reorder (DND-02)
**What:** Coach drags batting order entries up/down to reorder the lineup.
**When to use:** Batting order list in the Review step.
**Interaction model:** Vertical sortable list. Uses `useSortable` with explicit `index` prop.

```typescript
// Source: https://dndkit.com/react/guides/sortable-state-management.md
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';

function SortablePlayer({ id, index, name }: Props) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });

  return (
    <li ref={ref} className={isDragSource ? styles.dragging : styles.item}>
      <span ref={handleRef} className={styles.dragHandle}>&#x2630;</span>
      <span className={styles.position}>{index + 1}</span>
      <span className={styles.name}>{name}</span>
    </li>
  );
}

function SortableBattingOrder({ order, players, onReorder }) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source } = event.operation;
        if (isSortable(source)) {
          const { initialIndex, index } = source;
          if (initialIndex !== index) {
            onReorder(prev => {
              const newOrder = [...prev];
              const [removed] = newOrder.splice(initialIndex, 1);
              newOrder.splice(index, 0, removed);
              return newOrder;
            });
          }
        }
      }}
    >
      <ol className={styles.list}>
        {order.map((playerId, index) => (
          <SortablePlayer
            key={playerId}
            id={playerId}
            index={index}
            name={getPlayerName(playerId, players)}
          />
        ))}
      </ol>
    </DragDropProvider>
  );
}
```

### Pattern 3: Real-Time Validation (DND-03)
**What:** After every drag edit, re-run `validateLineup()` and display updated errors immediately.
**When to use:** Both fielding grid and batting order changes should trigger validation.
**Key insight:** The existing `validateLineup()` function is pure and synchronous. It takes a `Lineup` and `GenerateLineupInput` and returns `ValidationError[]`. This can be called on every state change with zero performance concern (9 positions x 6 innings = 54 cells to check, trivial computation).

```typescript
// useLineupEditor hook pattern
function useLineupEditor(initialLineup: Lineup, input: GenerateLineupInput) {
  const [lineup, setLineup] = useState(initialLineup);

  const validationErrors = useMemo(
    () => validateLineup(lineup, input),
    [lineup, input]
  );

  const swapPositions = useCallback((inning: number, posA: Position, posB: Position) => {
    setLineup(prev => {
      const updated = structuredClone(prev);
      const playerA = updated[inning][posA];
      const playerB = updated[inning][posB];
      updated[inning][posA] = playerB;
      updated[inning][posB] = playerA;
      return updated;
    });
  }, []);

  return { lineup, validationErrors, swapPositions, setLineup };
}
```

### Pattern 4: Mobile Touch with Drag Handles (DND-04)
**What:** Drag handles that activate drag on touch without hijacking page scroll.
**Key rules:**
1. Set `touch-action: none` ONLY on the drag handle element, NOT on the container.
2. The rest of the row/cell remains scrollable via normal touch interaction.
3. The `PointerSensor` (enabled by default in `@dnd-kit/react`) has built-in touch-aware defaults: 250ms delay with 5px tolerance for touch inputs.

```css
/* DragHandle style */
.dragHandle {
  touch-action: none;  /* Critical: prevents scroll on handle only */
  cursor: grab;
  padding: var(--space-sm);
  color: var(--color-text-muted);
  user-select: none;
  display: flex;
  align-items: center;
}

.dragHandle:active {
  cursor: grabbing;
}
```

### Anti-Patterns to Avoid
- **Setting `touch-action: none` on the entire list/grid:** Kills page scrolling on mobile. Only set it on the drag handle element.
- **Using `onDragStart` for state updates:** State mutations should happen in `onDragEnd` only. During drag, the OptimisticSortingPlugin handles visual reordering.
- **Creating a single DragDropProvider for both the grid and the list:** Use separate providers for the fielding grid and the batting order list, since they are independent interaction zones with different behaviors (swap vs. sort).
- **Mutating the shared `useLineup` state directly during drag:** Create a local `useLineupEditor` hook that works on a mutable copy of the generated lineup. Only persist changes back when the user confirms/finalizes.
- **Placing DragOverlay inside each draggable:** Only one DragOverlay should exist per DragDropProvider. Use the function-children pattern to render context-aware overlays.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop interaction | Custom mousedown/touchstart handlers | `@dnd-kit/react` hooks | Touch normalization, accessibility (keyboard DnD), scroll conflict handling, drop animation -- all handled automatically |
| List reordering | Manual array splice on drag events | `useSortable` + `OptimisticSortingPlugin` | Optimistic visual reordering during drag, proper index tracking, animation between positions |
| Collision detection | Manual hit-testing with getBoundingClientRect | dnd-kit built-in collision detection | Handles edge cases (overlapping targets, fast mouse movement, touch precision) |
| Touch scroll prevention | `preventDefault()` on touchmove | `touch-action: none` on drag handle + PointerSensor defaults | Browser-level touch handling is more reliable than JS prevention; dnd-kit's PointerSensor has built-in touch delay (250ms) |
| Drag overlay/ghost | Cloning DOM nodes manually | `<DragOverlay>` component | Renders in a portal, avoids z-index/overflow issues, customizable drop animation |

**Key insight:** The two DnD patterns in this phase (grid cell swap, list reorder) are the two most common DnD use cases. dnd-kit provides purpose-built primitives for both. Hand-rolling either would take 10x the code and miss accessibility, touch, and animation edge cases.

## Common Pitfalls

### Pitfall 1: Mutable State Ownership During Edit
**What goes wrong:** The `useLineup` hook stores `generatedLineups` as an array of options. DnD edits modify the selected lineup, but if you mutate the array entry directly, regenerating overwrites all edits.
**Why it happens:** The current architecture treats lineups as immutable outputs of the generator. DnD editing introduces mutability.
**How to avoid:** Create a separate `editedLineup` state (via `useLineupEditor`) that takes a copy of `selectedLineup`. The edited copy lives in local React state. When the user finalizes, the edited lineup (not the original generated one) is passed to `finalizeGame()`.
**Warning signs:** Edits disappear when switching tabs or regenerating.

### Pitfall 2: Touch-Action Scope
**What goes wrong:** Setting `touch-action: none` on the wrong element kills page scrolling on mobile.
**Why it happens:** Developers apply it to the sortable item container instead of just the drag handle.
**How to avoid:** ONLY apply `touch-action: none` to the element referenced by `handleRef`. The item container should have default touch-action. The PointerSensor's 250ms touch delay provides the activation differentiation.
**Warning signs:** Cannot scroll page on mobile when touching anywhere near the DnD components.

### Pitfall 3: Forgetting `event.canceled` Check
**What goes wrong:** State updates fire even when the user cancels a drag (e.g., pressing Escape or dropping outside a valid target).
**Why it happens:** The `onDragEnd` event fires for both successful and canceled drags.
**How to avoid:** Always check `if (event.canceled) return;` as the first line of every `onDragEnd` handler.
**Warning signs:** Positions swap when user accidentally starts a drag and releases.

### Pitfall 4: Compound ID Collisions
**What goes wrong:** Draggable IDs must be unique within a DragDropProvider. If fielding grid and batting order share a provider, player IDs could collide.
**Why it happens:** The same player ID appears in both the fielding grid and the batting order.
**How to avoid:** Use separate DragDropProviders for the fielding grid and the batting order. Alternatively, prefix IDs (e.g., `field-${inning}-${position}` and `batting-${playerId}`).
**Warning signs:** Dragging in the batting order causes unexpected changes in the fielding grid.

### Pitfall 5: OptimisticSortingPlugin Misunderstanding
**What goes wrong:** During a sort drag, `source` and `target` refer to the same element because the plugin has already optimistically moved it.
**Why it happens:** The plugin physically reorders DOM elements during drag for smooth visual feedback.
**How to avoid:** Use `source.initialIndex` and `source.index` (not comparing source.id vs target.id) when computing the final state update in `onDragEnd`. The `isSortable()` type guard provides access to these properties.
**Warning signs:** Items jump to wrong positions or duplicate after drag.

### Pitfall 6: Bench Row Complexity in Grid Swap
**What goes wrong:** The bench row shows players not assigned to any position. Swapping a field player with a bench player is more complex than a simple position swap -- it requires clearing one position and filling another.
**Why it happens:** Bench is not a "position" in the data model; it's the absence of a position assignment.
**How to avoid:** For MVP, restrict dragging to field-to-field swaps only (both source and target must have a position). Bench-to-field swaps can be deferred or handled as a separate "assign to bench" action. The `accepts` filter on droppables can enforce this.
**Warning signs:** Undefined player IDs in the lineup after bench interactions.

## Code Examples

### Complete DragDropProvider Setup for Fielding Grid
```typescript
// Source: https://dndkit.com/react/components/drag-drop-provider.md
import { DragDropProvider } from '@dnd-kit/react';
import { DragOverlay } from '@dnd-kit/react';

function DraggableLineupGrid({
  lineup,
  inning,
  players,
  errors,
  onSwap,
}: DraggableGridProps) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source, target } = event.operation;
        if (!target) return;

        const srcPos = source.data?.position as Position;
        const tgtPos = target.data?.position as Position;
        if (srcPos && tgtPos && srcPos !== tgtPos) {
          onSwap(inning, srcPos, tgtPos);
        }
      }}
    >
      <div className={styles.grid}>
        {POSITIONS.map(pos => (
          <DraggableCell
            key={`${inning}-${pos}`}
            inning={inning}
            position={pos}
            playerId={lineup[inning]?.[pos] ?? ''}
            playerName={getPlayerName(lineup[inning]?.[pos], players)}
            hasError={hasError(inning, pos, errors)}
          />
        ))}
      </div>
      <DragOverlay>
        {(source) => (
          <div className={styles.overlay}>
            {source?.data?.playerName ?? ''}
          </div>
        )}
      </DragOverlay>
    </DragDropProvider>
  );
}
```

### Sortable Batting Order with Drag Handles
```typescript
// Source: https://dndkit.com/react/hooks/use-sortable.md
import { useSortable } from '@dnd-kit/react/sortable';

function SortableItem({ id, index, name }: { id: string; index: number; name: string }) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });

  return (
    <li
      ref={ref}
      className={`${styles.item} ${isDragSource ? styles.dragging : ''}`}
    >
      <span
        ref={handleRef}
        className={styles.dragHandle}
        aria-label="Drag to reorder"
      >
        &#x2630;
      </span>
      <span className={styles.position}>{index + 1}</span>
      <span className={styles.name}>{name}</span>
    </li>
  );
}
```

### useLineupEditor Hook (Mutable Editing Layer)
```typescript
import { useState, useMemo, useCallback } from 'react';
import { validateLineup } from '../logic/lineup-validator';
import type { Lineup, Position } from '../types';
import type { GenerateLineupInput, ValidationError } from '../logic/lineup-types';

export function useLineupEditor(
  initialLineup: Lineup | null,
  validationInput: GenerateLineupInput,
) {
  const [editedLineup, setEditedLineup] = useState<Lineup | null>(initialLineup);

  // Re-initialize when a new lineup is selected
  // (caller should pass updated initialLineup when selection changes)

  const validationErrors: ValidationError[] = useMemo(() => {
    if (!editedLineup) return [];
    return validateLineup(editedLineup, validationInput);
  }, [editedLineup, validationInput]);

  const swapPositions = useCallback((inning: number, posA: Position, posB: Position) => {
    setEditedLineup(prev => {
      if (!prev) return prev;
      const updated = structuredClone(prev);
      const playerA = updated[inning][posA];
      const playerB = updated[inning][posB];
      updated[inning][posA] = playerB;
      updated[inning][posB] = playerA;
      return updated;
    });
  }, []);

  const hasEdits = editedLineup !== initialLineup;

  return {
    lineup: editedLineup,
    validationErrors,
    swapPositions,
    setEditedLineup,
    hasEdits,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | `@dnd-kit/react` + `@dnd-kit/helpers` | Active since mid-2024, stable releases from early 2025 | New API is simpler (ref-based instead of setNodeRef + listeners + attributes), better TypeScript support |
| `DndContext` provider | `DragDropProvider` | With `@dnd-kit/react` | Event handlers receive `(event)` with `event.operation.source`/`target` instead of `active`/`over` |
| `useSortable` from `@dnd-kit/sortable` | `useSortable` from `@dnd-kit/react/sortable` | With `@dnd-kit/react` | Returns `ref` + `handleRef` instead of `setNodeRef` + `listeners` + `attributes` + `transform` |
| Separate `TouchSensor` + `PointerSensor` | Unified `PointerSensor` | With `@dnd-kit/react` | Single sensor handles mouse, touch, and pen with context-aware defaults (250ms touch delay built-in) |
| `react-beautiful-dnd` | Abandoned (2024) | N/A | Not maintained, does not support React 19, uses deprecated `findDOMNode` |
| `react-dnd` | Maintenance mode | N/A | Open issue for React 19 support; HTML5 backend has mobile limitations |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Abandoned by Atlassian. Not compatible with React 19.
- `react-sortable-hoc`: Deprecated by author in favor of dnd-kit.
- `@dnd-kit/core` + `@dnd-kit/sortable`: Still functional but legacy. All active development is on `@dnd-kit/react`.

## Open Questions

1. **Bench-to-field drag interaction**
   - What we know: DND-01 says "swap positions within an inning." Bench is not a position in the data model.
   - What's unclear: Should bench players be draggable into field positions (replacing someone who goes to bench)? Or is bench display-only?
   - Recommendation: For MVP, restrict swaps to field-to-field only. If bench interaction is needed, it can be a follow-up task since it requires different logic (assign vs. swap).

2. **Edit persistence across stepper navigation**
   - What we know: The stepper allows navigating back after completing all steps. DnD edits modify the lineup locally.
   - What's unclear: If the coach goes back to Attendance and marks someone absent, should DnD edits be discarded?
   - Recommendation: Treat DnD edits like the generated lineup -- the stale warning system already handles this. If attendance changes, show the stale warning. Coach can keep edited lineup or regenerate (which discards edits).

3. **Per-inning vs. full-grid DragDropProvider scope**
   - What we know: DND-01 says "swap within the same inning." Cross-inning swaps are not in scope.
   - What's unclear: Should the DragDropProvider wrap each inning column separately, or the whole grid with an `accepts` filter?
   - Recommendation: Single provider for the whole grid with `accepts` filtering by inning. This is simpler to implement and allows future cross-inning support if needed. The `accepts` function on droppable targets can restrict drops to same-inning only.

## Sources

### Primary (HIGH confidence)
- `@dnd-kit/react` npm registry -- verified peer dependencies, versions, publish dates via `npm view`
- https://dndkit.com/react/quickstart.md -- Official quickstart with DragDropProvider, useDraggable, useDroppable examples
- https://dndkit.com/react/hooks/use-draggable.md -- Official useDraggable API: ref, handleRef, isDragSource, data, feedback
- https://dndkit.com/react/hooks/use-droppable.md -- Official useDroppable API: ref, isDropTarget, accepts, collisionDetector
- https://dndkit.com/react/hooks/use-sortable.md -- Official useSortable API: id, index, group, transition, handleRef
- https://dndkit.com/react/guides/sortable-state-management.md -- State management patterns with isSortable type guard
- https://dndkit.com/react/components/drag-drop-provider.md -- Event handlers: onDragStart, onDragEnd, onDragOver
- https://dndkit.com/react/components/drag-overlay.md -- DragOverlay with function children pattern
- https://dndkit.com/extend/sensors/pointer-sensor.md -- Touch defaults (250ms delay, 5px tolerance)
- https://dndkit.com/react/guides/migration.md -- Migration guide from @dnd-kit/core to @dnd-kit/react

### Secondary (MEDIUM confidence)
- https://github.com/clauderic/dnd-kit/issues/1859 -- Keyboard bug (v0.2.0/v0.2.1), confirmed fixed
- https://github.com/clauderic/dnd-kit/discussions/1842 -- Roadmap discussion (no maintainer response as of Nov 2025)
- https://github.com/clauderic/dnd-kit/issues/1194 -- Future of library discussion

### Tertiary (LOW confidence)
- Version stability assessment for pre-1.0 package based on publish frequency patterns (not official stability guarantee)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Peer dependencies verified via npm; official docs consulted; React 19 compatibility confirmed
- Architecture: HIGH - Patterns verified against official documentation examples; existing codebase thoroughly analyzed
- Pitfalls: HIGH - Touch-action pattern, OptimisticSortingPlugin behavior, and event.canceled check all documented in official sources
- React 19 compatibility: HIGH - Explicit `^18.0.0 || ^19.0.0` peer dependency verified

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- library is actively evolving but core API patterns are stable)
