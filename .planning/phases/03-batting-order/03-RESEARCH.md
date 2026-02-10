# Phase 3: Batting Order - Research

**Researched:** 2026-02-10
**Domain:** Continuous batting order generation with cross-game fairness rotation
**Confidence:** HIGH

## Summary

Phase 3 adds a continuous batting order that is completely independent of the fielding lineup. In Little League, a "continuous batting order" means all rostered players bat in a fixed rotation order, regardless of whether they are on the bench for fielding. The batting order cycles through the entire roster -- if a player is on the bench for a given inning, they still bat when their turn comes up. This is fundamentally simpler than the fielding lineup generator built in Phase 2 because there are no constraint satisfaction problems to solve: the output is just an ordered list of all present players.

The key challenge in Phase 3 is BATT-03: cross-game fairness. The standard industry approach (used by GameTime Lineups, Coach Joel's Way, and Dugout Edge) divides the batting order into three bands -- Top (leadoff positions), Middle (middle of the order), and Bottom (end of the order) -- and tracks how many times each player has batted in each band across games. The algorithm then rotates players so that a kid who batted leadoff last game moves to the middle or bottom this game. This requires persisting batting order history across sessions.

A critical design decision is that BATT-03 requires history but Phase 4 (History & Output) has not been built yet. The research recommends building a lightweight, purpose-built batting order history store within Phase 3 using the established `useLocalStorage` pattern. This history only tracks batting positions per player per game -- it is not the comprehensive game history of Phase 4 (which also tracks fielding positions, bench time, etc.). Phase 4 can either consume this existing data or migrate it into its broader history system. Building batting order history now keeps Phase 3 self-contained and immediately useful.

**Primary recommendation:** Build the batting order generator as a pure function in `src/logic/batting-order.ts`, create a lightweight `useBattingHistory` hook for cross-game position tracking, add a `useBattingOrder` hook that generates fair orders using history, and display the batting order as a numbered list in a new section on the Lineup page (below the fielding grid), or as a sub-tab within the Lineup tab.

## Standard Stack

### Core (Already Established)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already installed. No new dependencies. |
| TypeScript | ~5.9.3 | Type safety | Already installed. Types for batting order data structures. |
| Vite | ^7.3.1 | Build tool | Already configured. |
| Vitest | ^4.0.18 | Unit testing | Already configured. TDD for batting order logic. |

### Phase 3 Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | Phase 3 requires zero new npm dependencies. The batting order algorithm is pure TypeScript. UI uses existing React + CSS Modules. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom rotation algorithm | Third-party lineup generator | No library exists for this specific domain. Custom is necessary. Algorithm is simple (~50 lines). |
| localStorage for batting history | IndexedDB | IndexedDB is overkill for a small array of game records. localStorage is established in the codebase (useLocalStorage hook) and sufficient for years of game history data. |
| Displaying batting order on Lineup page | Separate "Batting" tab | A separate tab adds navigation complexity. The batting order is a complement to the fielding lineup, not a separate workflow. Display together. |

**Installation:**
```bash
# No new packages needed for Phase 3
```

## Architecture Patterns

### Recommended Project Structure (Phase 3 Additions)
```
src/
├── logic/
│   ├── batting-order.ts           # NEW: Batting order generation algorithm
│   ├── batting-order.test.ts      # NEW: Unit tests for batting order logic
│   ├── lineup-generator.ts        # Existing (unchanged)
│   ├── lineup-types.ts            # Existing (unchanged)
│   └── lineup-validator.ts        # Existing (unchanged)
├── hooks/
│   ├── useBattingOrder.ts         # NEW: Batting order state + generation
│   ├── useLineup.ts               # Existing (unchanged)
│   ├── useLocalStorage.ts         # Existing (unchanged)
│   ├── useRoster.ts               # Existing (unchanged)
│   └── useGameConfig.ts           # Existing (unchanged)
├── components/
│   ├── batting-order/             # NEW: Batting order display components
│   │   ├── BattingOrderList.tsx   # Numbered list of players in batting order
│   │   ├── BattingOrderList.module.css
│   │   ├── BattingOrderSection.tsx # Container with generate button + history info
│   │   └── BattingOrderSection.module.css
│   ├── lineup/                    # MODIFIED: Add batting order section
│   │   └── LineupPage.tsx         # Modified to include BattingOrderSection
│   └── ...                        # Other existing components unchanged
└── types/
    └── index.ts                   # EXTENDED: Add batting order types
```

### Pattern 1: Three-Band Fairness Rotation
**What:** Divide the batting order into three bands (Top, Middle, Bottom) and track cumulative starts per band per player across games. When generating a new order, rotate players so those with the most Top starts move down, and those with the most Bottom starts move up.
**When to use:** Every batting order generation (BATT-03).
**Why this approach:** This is the industry standard used by GameTime Lineups, Coach Joel's Way, and Dugout Edge. It provides measurable, transparent fairness that coaches can verify.
**Example:**
```typescript
// src/logic/batting-order.ts

export type BattingBand = 'top' | 'middle' | 'bottom';

export interface BattingHistoryEntry {
  gameDate: string;        // ISO date string
  order: string[];         // Array of playerIds in batting order
}

export interface PlayerBandCounts {
  playerId: string;
  top: number;
  middle: number;
  bottom: number;
  total: number;
}

/**
 * Categorize a batting position into its band.
 * For N players:
 *   - Top: positions 0 to floor(N/3) - 1
 *   - Middle: positions floor(N/3) to floor(2*N/3) - 1
 *   - Bottom: positions floor(2*N/3) to N - 1
 */
export function getBand(position: number, totalPlayers: number): BattingBand {
  const topEnd = Math.floor(totalPlayers / 3);
  const midEnd = Math.floor((2 * totalPlayers) / 3);
  if (position < topEnd) return 'top';
  if (position < midEnd) return 'middle';
  return 'bottom';
}
```

### Pattern 2: Pure Function Generation with History Input
**What:** The batting order generator is a pure function that takes present players and history, and returns a new order. No React dependencies in the logic layer.
**When to use:** Always. Follows the established pattern from Phase 2's lineup-generator.ts.
**Example:**
```typescript
// src/logic/batting-order.ts

export interface GenerateBattingOrderInput {
  presentPlayers: Player[];    // All present players (BATT-01: all rostered)
  history: BattingHistoryEntry[];  // Past game batting orders
}

export interface GenerateBattingOrderResult {
  order: string[];           // Array of playerIds in generated order
  bandCounts: PlayerBandCounts[];  // Updated band counts for transparency
}

export function generateBattingOrder(
  input: GenerateBattingOrderInput
): GenerateBattingOrderResult {
  // 1. Calculate cumulative band counts from history
  // 2. Sort players by fairness priority (most bottom-heavy first)
  // 3. Assign to bands: under-represented in top get top, etc.
  // 4. Shuffle within bands for variety
  // 5. Return ordered list
}
```

### Pattern 3: Lightweight Batting History in localStorage
**What:** Store a minimal history of past batting orders in localStorage using the existing `useLocalStorage` hook. Each entry is just a date + ordered array of player IDs.
**When to use:** For BATT-03 cross-game rotation.
**Why not wait for Phase 4:** Phase 4's game history (HIST-01 through HIST-05) tracks fielding positions, bench time, and more. Batting order history is a small, self-contained subset. Building it now makes Phase 3 fully functional without Phase 4 dependency. Phase 4 can consume or wrap this data.
**Example:**
```typescript
// In useBattingOrder hook
const [battingHistory, setBattingHistory] = useLocalStorage<BattingHistoryEntry[]>(
  'battingHistory',
  []
);
```

### Pattern 4: Independence from Fielding Lineup (BATT-02)
**What:** The batting order is generated independently of the fielding lineup. The UI makes this clear: the batting order section shows ALL present players (including bench players) in a single ordered list. No reference to innings or positions.
**When to use:** Always. This is a firm requirement (BATT-02).
**Why it matters:** In Little League continuous batting order, a player who is on the bench for fielding still bats when their spot comes up. The batting order never changes during the game -- it is a fixed rotation through all players.

### Anti-Patterns to Avoid
- **Coupling batting order to fielding lineup:** The batting order must not reference or depend on the generated fielding lineup. They are completely independent data structures. Do not try to derive one from the other.
- **Generating batting order only for playing players per inning:** All present players bat, all the time, regardless of bench status. The batting order is a simple list of ALL present players.
- **Over-engineering the history schema:** For Phase 3, batting history needs only `{ gameDate, order[] }`. Do not add fielding positions, bench time, or other Phase 4 data. Keep it minimal.
- **Forgetting to handle roster changes:** If a player was in historical batting orders but has been removed from the roster, the history still references their old player ID. The band calculation must skip/ignore unknown player IDs gracefully.
- **Randomizing without history consideration:** For the first game (no history), a simple shuffle is fine. For subsequent games, the algorithm MUST factor in history. Do not fall back to pure random when history exists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State persistence | Custom file I/O for history | `useLocalStorage` hook (existing) | Already built, tested, and used throughout the app. Batting history is just another localStorage key. |
| Unique ID generation | Custom sequential IDs | `crypto.randomUUID()` | Established pattern. Used for player IDs. Useful if batting history entries need IDs. |
| Shuffling | Custom random shuffle | Fisher-Yates shuffle (already in lineup-generator.ts) | Extract the existing `shuffle()` function to a shared utility, or duplicate it in batting-order.ts. Fisher-Yates is already proven in the codebase. |
| Date formatting | Custom date string building | `new Date().toISOString().split('T')[0]` | ISO date strings (YYYY-MM-DD) are sortable, parseable, and standard. |
| Cross-component state sync | Custom event system | `useLocalStorage` with custom event sync (existing) | The app already has cross-component sync via custom events in useLocalStorage. Batting state will sync automatically. |

**Key insight:** Phase 3 is architecturally simple. The batting order is a sorted list of player IDs, not a constraint satisfaction problem. The only complexity is the fairness algorithm, which is a straightforward sort based on cumulative band counts.

## Common Pitfalls

### Pitfall 1: History References Deleted Players
**What goes wrong:** A player was in the batting order for Game 1. The coach removes them from the roster. Game 2's band calculation crashes or produces incorrect results because the history references a player ID that no longer exists.
**Why it happens:** Player IDs persist in localStorage history after the player is deleted from the roster.
**How to avoid:** When calculating band counts from history, filter to only include players currently in the `presentPlayers` list. Unknown player IDs in historical entries are silently ignored. The history data itself is not cleaned up (it remains accurate for its point in time).
**Warning signs:** Errors when generating batting order after roster changes between games.

### Pitfall 2: Absent Players Included in Batting Order
**What goes wrong:** A player marked as absent for the current game is included in the batting order.
**Why it happens:** Confusing "rostered" with "present." BATT-01 says "all rostered players," but the intent is all PRESENT players for this game (absent players obviously cannot bat).
**How to avoid:** The batting order generator receives `presentPlayers` (already filtered by `isPresent: true`), the same list used by the fielding lineup generator. Use the same source of truth for "who is playing today."
**Warning signs:** Absent players appearing in the batting order list.

### Pitfall 3: Band Calculation Edge Cases with Small Rosters
**What goes wrong:** With 9 players, `floor(9/3) = 3` per band, which works perfectly. With 10 players, bands are 3/3/4 -- the bottom band is larger. With 11 players, bands are 3/4/4 -- middle and bottom are larger than top. This creates inherent unfairness in band sizes.
**Why it happens:** Integer division does not always split evenly.
**How to avoid:** Document the band sizes explicitly. For fairness purposes, what matters is that players ROTATE through bands, not that bands are equal size. The algorithm tracks cumulative band counts, so a player who has been in the larger "bottom" band more often will rotate up. Accept that bands may not be equal and rely on the rotation mechanism to ensure fairness over time.
**Warning signs:** Band count distributions look lopsided when bands are unequal sizes.

### Pitfall 4: First Game Has No History
**What goes wrong:** The coach opens the app for Game 1. There is no batting history. The algorithm tries to access history data that does not exist and either crashes or returns an empty order.
**Why it happens:** No history records in localStorage on first use.
**How to avoid:** When history is empty, fall back to a shuffled order of all present players. The first game's order is random, and subsequent games rotate from there. The algorithm must have an explicit "no history" path that produces a valid random order.
**Warning signs:** Empty or error state on first use of the batting order feature.

### Pitfall 5: Batting Order Not Saved to History
**What goes wrong:** The coach generates a batting order, prints the dugout card, but the batting order is never persisted to history. Next game, the algorithm has no record of the previous order, so it cannot rotate fairly.
**Why it happens:** The save-to-history step is forgotten or only happens during Phase 4's "finalize game" flow.
**How to avoid:** Phase 3 must include a "confirm/save" action for the batting order that appends the current order to `battingHistory` in localStorage. This can be a "Use This Order" button that commits the order to history. Without this, BATT-03 is impossible. Do not defer this to Phase 4.
**Warning signs:** Batting history stays empty across multiple games.

### Pitfall 6: Re-generating Overwrites Previously Saved Order
**What goes wrong:** Coach generates a batting order, confirms it (saved to history), then clicks "Generate" again for a different game. The new order is also saved, creating a duplicate entry for the same game date.
**Why it happens:** No guard against saving multiple orders for the same game session.
**How to avoid:** Use a state flag to track whether the current order has been "confirmed" for this session. Once confirmed, disable re-generation until the coach explicitly starts a new game session, OR allow re-generation but replace the most recent history entry rather than appending a new one. The simplest approach: only save to history when the coach clicks a "Confirm Batting Order" button, and track confirmed status in session state.
**Warning signs:** Multiple history entries for the same game date, or band counts growing faster than number of games played.

### Pitfall 7: Displaying Batting Order Before Fielding Lineup
**What goes wrong:** The coach tries to generate a batting order before generating the fielding lineup. This is technically valid (batting is independent per BATT-02) but may confuse coaches who expect to do fielding first.
**Why it happens:** No workflow guidance in the UI.
**How to avoid:** Allow batting order generation at any time (it IS independent). But place the batting order section BELOW the fielding lineup section on the Lineup page to suggest the natural workflow. Optionally, show a hint: "Batting order is separate from fielding. You can generate it anytime."
**Warning signs:** Coach confusion about the relationship between batting and fielding.

## Code Examples

### Batting Order Type Definitions
```typescript
// src/types/index.ts (additions)

/** Batting order band: top, middle, or bottom of the lineup */
export type BattingBand = 'top' | 'middle' | 'bottom';

/** A single game's batting order record */
export interface BattingHistoryEntry {
  id: string;           // crypto.randomUUID()
  gameDate: string;     // ISO date string (YYYY-MM-DD)
  order: string[];      // Array of playerIds in batting order
}

/** Batting order state stored in localStorage */
export interface BattingOrderState {
  currentOrder: string[] | null;  // Current game's generated order (null = not generated)
  isConfirmed: boolean;           // Whether current order has been saved to history
}
```

### Core Batting Order Algorithm
```typescript
// src/logic/batting-order.ts

import type { Player, BattingBand, BattingHistoryEntry } from '../types/index';

interface PlayerBandCounts {
  playerId: string;
  top: number;
  middle: number;
  bottom: number;
}

/**
 * Determine which band a given 0-based position falls into.
 */
export function getBand(position: number, totalPlayers: number): BattingBand {
  const topEnd = Math.floor(totalPlayers / 3);
  const midEnd = Math.floor((2 * totalPlayers) / 3);
  if (position < topEnd) return 'top';
  if (position < midEnd) return 'middle';
  return 'bottom';
}

/**
 * Calculate cumulative band counts from history for current present players.
 */
export function calculateBandCounts(
  presentPlayerIds: string[],
  history: BattingHistoryEntry[]
): PlayerBandCounts[] {
  const counts: Record<string, PlayerBandCounts> = {};

  // Initialize counts for present players
  for (const id of presentPlayerIds) {
    counts[id] = { playerId: id, top: 0, middle: 0, bottom: 0 };
  }

  // Tally from history
  for (const entry of history) {
    const totalInEntry = entry.order.length;
    entry.order.forEach((playerId, position) => {
      if (!counts[playerId]) return; // Skip players no longer present
      const band = getBand(position, totalInEntry);
      counts[playerId][band]++;
    });
  }

  return presentPlayerIds.map(id => counts[id]);
}

/**
 * Generate a fair batting order based on history.
 * Players with more top-band starts are pushed to bottom bands, and vice versa.
 */
export function generateBattingOrder(
  presentPlayers: Player[],
  history: BattingHistoryEntry[]
): string[] {
  const playerIds = presentPlayers.map(p => p.id);

  // First game: simple shuffle
  if (history.length === 0) {
    return shuffle(playerIds);
  }

  // Calculate band counts
  const bandCounts = calculateBandCounts(playerIds, history);
  const totalPlayers = playerIds.length;
  const topSize = Math.floor(totalPlayers / 3);
  const midSize = Math.floor((2 * totalPlayers) / 3) - topSize;
  const bottomSize = totalPlayers - topSize - midSize;

  // Sort by fairness: prioritize players with fewest top-band starts for top positions
  // Score = (top - bottom) -- higher score means they've been at top more, so push them down
  const sorted = [...bandCounts].sort((a, b) => {
    const aScore = a.top - a.bottom;
    const bScore = b.top - b.bottom;
    if (aScore !== bScore) return aScore - bScore; // Fewer top-heavy get top positions
    // Tiebreaker: randomize
    return Math.random() - 0.5;
  });

  // Assign to bands
  const topBand = sorted.slice(0, topSize).map(p => p.playerId);
  const midBand = sorted.slice(topSize, topSize + midSize).map(p => p.playerId);
  const bottomBand = sorted.slice(topSize + midSize).map(p => p.playerId);

  // Shuffle within each band for variety
  return [...shuffle(topBand), ...shuffle(midBand), ...shuffle(bottomBand)];
}

// Fisher-Yates shuffle (same as lineup-generator.ts)
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### useBattingOrder Hook Pattern
```typescript
// src/hooks/useBattingOrder.ts

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useRoster } from './useRoster';
import { generateBattingOrder, calculateBandCounts } from '../logic/batting-order';
import type { BattingHistoryEntry, BattingOrderState } from '../types/index';

const defaultState: BattingOrderState = {
  currentOrder: null,
  isConfirmed: false,
};

export function useBattingOrder() {
  const [state, setState] = useLocalStorage<BattingOrderState>(
    'battingOrderState',
    defaultState
  );
  const [history, setHistory] = useLocalStorage<BattingHistoryEntry[]>(
    'battingHistory',
    []
  );
  const { players } = useRoster();

  const presentPlayers = useMemo(
    () => players.filter(p => p.isPresent),
    [players]
  );

  const generate = useCallback(() => {
    const order = generateBattingOrder(presentPlayers, history);
    setState({ currentOrder: order, isConfirmed: false });
    return order;
  }, [presentPlayers, history, setState]);

  const confirm = useCallback(() => {
    if (!state.currentOrder || state.isConfirmed) return;
    const entry: BattingHistoryEntry = {
      id: crypto.randomUUID(),
      gameDate: new Date().toISOString().split('T')[0],
      order: state.currentOrder,
    };
    setHistory([...history, entry]);
    setState({ ...state, isConfirmed: true });
  }, [state, history, setHistory, setState]);

  const clear = useCallback(() => {
    setState(defaultState);
  }, [setState]);

  const bandCounts = useMemo(
    () => calculateBandCounts(
      presentPlayers.map(p => p.id),
      history
    ),
    [presentPlayers, history]
  );

  return {
    currentOrder: state.currentOrder,
    isConfirmed: state.isConfirmed,
    history,
    bandCounts,
    presentPlayers,
    generate,
    confirm,
    clear,
  };
}
```

### BattingOrderList Component Pattern
```typescript
// src/components/batting-order/BattingOrderList.tsx

import type { Player, BattingBand } from '../../types/index';
import { getBand } from '../../logic/batting-order';
import styles from './BattingOrderList.module.css';

interface BattingOrderListProps {
  order: string[];
  players: Player[];
}

function getPlayerName(playerId: string, players: Player[]): string {
  return players.find(p => p.id === playerId)?.name ?? '';
}

export function BattingOrderList({ order, players }: BattingOrderListProps) {
  return (
    <ol className={styles.list}>
      {order.map((playerId, index) => {
        const band = getBand(index, order.length);
        return (
          <li
            key={playerId}
            className={`${styles.item} ${styles[band]}`}
          >
            <span className={styles.position}>{index + 1}</span>
            <span className={styles.name}>{getPlayerName(playerId, players)}</span>
            <span className={styles.bandLabel}>{band}</span>
          </li>
        );
      })}
    </ol>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed batting order (coach picks manually) | Algorithm-generated with fairness rotation | Standard in youth tools since ~2020 | Ensures cross-game fairness automatically |
| No history tracking | Band-based history tracking (top/middle/bottom) | Industry standard (Coach Joel's Way, GameTime) | Measurable fairness across season |
| Batting order tied to fielding order | Independent batting order (continuous) | Little League rule adoption (2023-2024) | All players bat regardless of bench status |
| 9-player batting order (only fielders bat) | Full roster batting order (all present bat) | Little League continuous batting order rule | Ensures every kid gets at-bats |

**Key domain rule:** Little League continuous batting order means ALL present players bat in a fixed rotation. A player on the bench for fielding still bats when their spot comes up. The batting order does NOT change inning to inning -- it is a single continuous rotation through the entire roster.

## Open Questions

1. **Where to display the batting order on the Lineup page?**
   - What we know: The batting order is independent of fielding (BATT-02). It complements the fielding lineup but is separate data.
   - What's unclear: Should it be below the fielding grid? A collapsible section? A separate sub-section within the same tab?
   - Recommendation: Add a new section below the fielding lineup on the Lineup page, separated by a border. Title it "Batting Order." This keeps everything on one page (the coach will want to see both when printing). The section has its own "Generate" and "Confirm" buttons.

2. **Should the coach be able to manually reorder the batting order?**
   - What we know: BATT-01 says "generate" not "manually create." The algorithm generates the order.
   - What's unclear: Should the coach be able to drag players to adjust after generation?
   - Recommendation: Do NOT add manual reordering in Phase 3. The requirements say "generate" and this keeps scope tight. Manual reordering (drag-and-drop) is listed as a v2 enhancement (ENHC-03). For now, the coach can regenerate to get a different order.

3. **How to handle the "confirm" workflow so history is not accidentally corrupted?**
   - What we know: The batting order must be saved to history for BATT-03 to work. But we do not want to save every generated order -- only the one the coach actually uses.
   - What's unclear: Exact UX for confirming.
   - Recommendation: Use a two-step flow: (1) "Generate Batting Order" creates the order but does NOT save to history. (2) "Confirm Order" saves it to history and locks it. The generate button changes to "Regenerate" after first generation. Once confirmed, the section shows "Batting order confirmed for this game" and disables the generate button. A "Reset" link allows starting over (removes the current order but does not delete history).

4. **Should batting order generation be gated on having a fielding lineup?**
   - What we know: BATT-02 says batting is independent of fielding.
   - What's unclear: Should the UI require a fielding lineup first?
   - Recommendation: Do NOT gate batting order on fielding lineup. Allow generating batting order at any time when there are present players. However, the batting order section should appear on the Lineup page (which is already gated on 9+ present players), so there is a natural minimum player count.

5. **How should Phase 4 consume the batting history built in Phase 3?**
   - What we know: Phase 4 (HIST-01 through HIST-05) builds comprehensive game history. Phase 3 builds batting-only history.
   - What's unclear: Will Phase 4 replace, wrap, or extend the Phase 3 history?
   - Recommendation: Phase 3 stores batting history under the localStorage key `battingHistory`. Phase 4 can read from this key when building its comprehensive history view. When Phase 4 introduces a "finalize game" flow, it can take over the "confirm" step -- but Phase 3's data format should be designed to be forward-compatible (include `id`, `gameDate`, `order[]`).

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/types/index.ts`, `src/logic/lineup-generator.ts`, `src/hooks/useLineup.ts`, `src/hooks/useLocalStorage.ts` -- established patterns for pure logic separation, hook-based state management, and localStorage persistence
- `.planning/REQUIREMENTS.md` -- BATT-01, BATT-02, BATT-03 requirement definitions
- `.planning/research/ARCHITECTURE.md` -- Project architecture showing batting order as pure function in `src/logic/batting-order.ts`
- `.planning/ROADMAP.md` -- Phase 3 success criteria and dependencies
- [Little League: What is a Continuous Batting Order?](https://www.littleleague.org/help-center/what-is-a-continuous-batting-order/) -- Official rules for continuous batting order

### Secondary (MEDIUM confidence)
- [Coach Joel's Way: Batting Lineup Fairness Algorithm](https://www.coachjoelsway.com/batting-lineup-fairness-algorithm) -- Three-band system (Top/Middle/Bottom) with historical rotation, industry standard approach
- [Youth Baseball Edge: How to Optimize Your Lineup](https://www.youthbaseballedge.com/optimize-lineup/) -- "Groups of three" batting order strategy
- [2026 Little League Rulebook Changes](https://www.littleleague.org/playing-rules/rule-changes/) -- Current rule updates including continuous batting order provisions
- [GameTime Lineups](https://gametimelineups.com/) -- Competitor implementing batting order rotation with band tracking

### Tertiary (LOW confidence)
- None -- all claims verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. Entirely built on Phase 1/2 established patterns (React 19 + TypeScript + CSS Modules + useLocalStorage).
- Architecture: HIGH -- Follows established `src/logic/` pure function + `src/hooks/` state management pattern from Phase 2. Architecture research explicitly planned for `batting-order.ts` in `src/logic/`.
- Algorithm approach: HIGH -- Three-band rotation is industry standard, well-documented by Coach Joel's Way and implemented by GameTime Lineups. The algorithm itself is simple (sort by band counts, shuffle within bands).
- Pitfalls: HIGH -- Documented from analysis of existing codebase patterns (roster changes, absent players, first-game edge case), domain understanding (continuous batting order rules), and Phase 4 dependency considerations.
- UI patterns: MEDIUM -- Display placement and confirm workflow are recommendations based on UX analysis. May need adjustment during implementation based on how it feels with real data.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable domain, algorithm is evergreen, no library dependencies to go stale)
