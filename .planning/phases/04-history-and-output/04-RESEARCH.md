# Phase 4: History & Output - Research

**Researched:** 2026-02-10
**Domain:** Game history persistence, CSV import/export, print CSS for dugout card, cross-game fairness
**Confidence:** HIGH

## Summary

Phase 4 adds four major capabilities to the lineup builder: (1) saving finalized game data (fielding lineup + batting order) to localStorage as a structured history, (2) factoring that history into future lineup generation for cross-game fielding fairness, (3) CSV import/export of the roster, and (4) a printable single-page dugout card showing the fielding grid and batting order.

The existing codebase already has the patterns needed for most of this work. Batting order history (`battingHistory` in localStorage via `useBattingOrder`) demonstrates the append-on-confirm pattern that game history will follow. The `useLocalStorage` hook with custom event sync handles cross-component reactivity. The `LineupGrid` component already renders the exact grid layout (rows=positions, columns=innings) that the dugout card needs -- the print version is essentially a styled, print-optimized version of that same grid plus batting order.

No new dependencies are needed. CSV parsing for a simple `name` column (or `name,isPresent`) is trivial enough to hand-write. Print styling uses CSS `@media print` rules, which have 93.68% global browser support for `@page` (Chrome 15+, Edge 79+, Firefox 95+, Safari 18.2+). The `window.print()` approach with CSS-only hiding is simpler and more maintainable than adding `react-to-print` for this single use case.

**Primary recommendation:** Build all four capabilities using existing patterns (useLocalStorage, pure logic modules with TDD, presentational components). Use CSS `@media print` with a whitelist approach (hide everything except the dugout card) rather than adding a print library. Keep the game history data model flat and append-only.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI components | Already in project |
| TypeScript | ~5.9.3 | Type safety | Already in project |
| Vite | ^7.3.1 | Build tool / CSS Modules | Already in project |
| Vitest | ^4.0.18 | Testing | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Modules | (built-in Vite) | Scoped print styles | All component styling |
| CSS `@media print` | (native CSS) | Print-only layout | Dugout card printing |
| `@page` rule | (native CSS) | Page size/orientation | Landscape dugout card |
| File API / Blob | (native browser) | CSV import/export | Roster file operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS @media print | react-to-print | Adds dependency; overkill for single printable component |
| Hand-written CSV parser | PapaParse | 43KB gzipped dependency for a 1-column CSV; not justified |
| localStorage | IndexedDB | More complex API, not needed for < 100KB of game data |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/
    index.ts              # Add GameHistoryEntry, GameHistory types
  logic/
    game-history.ts       # Pure functions: createHistoryEntry, computeFieldingFairness
    game-history.test.ts  # TDD tests for history logic
    csv.ts                # Pure functions: parseRosterCsv, exportRosterCsv
    csv.test.ts           # TDD tests for CSV parsing/export
    lineup-generator.ts   # Modify: accept history for cross-game fairness
  hooks/
    useGameHistory.ts     # Hook: read/write game history from localStorage
  components/
    history/
      HistoryPage.tsx     # History tab page
      HistoryPage.module.css
      GameHistoryList.tsx  # List of past games
      GameHistoryList.module.css
    lineup/
      DugoutCard.tsx      # Print-optimized fielding grid + batting order
      DugoutCard.module.css  # Contains @media print rules
    roster/
      RosterPage.tsx      # Add import/export buttons
```

### Pattern 1: Unified Game Confirm (Append History on Confirm)
**What:** When the coach confirms the finalized game (both lineup and batting order), a single history entry is appended containing all game data. This follows the existing `useBattingOrder.confirm()` pattern but captures everything in one entry.
**When to use:** When saving game data after lineup finalization.
**Example:**
```typescript
// Types for game history
export interface GameHistoryEntry {
  id: string;
  gameDate: string;                         // ISO string
  innings: number;                          // 5 or 6
  lineup: Lineup;                           // Full fielding grid
  battingOrder: string[];                   // Player IDs in order
  playerSummaries: PlayerGameSummary[];     // Per-player computed data
}

export interface PlayerGameSummary {
  playerId: string;
  playerName: string;
  battingPosition: number;                  // 0-based index in batting order
  fieldingPositions: Position[];            // Positions played (one per inning, 'BENCH' if sat)
  benchInnings: number;                     // Count of innings on bench
}

// Creating history entry (pure function, no hooks)
export function createGameHistoryEntry(
  lineup: Lineup,
  battingOrder: string[],
  innings: number,
  players: Player[],
): GameHistoryEntry {
  const playerMap = new Map(players.map(p => [p.id, p.name]));
  const playerSummaries: PlayerGameSummary[] = players
    .filter(p => p.isPresent)
    .map(player => {
      const fieldingPositions: Position[] = [];
      let benchInnings = 0;
      for (let inn = 1; inn <= innings; inn++) {
        const pos = POSITIONS.find(p => lineup[inn][p] === player.id);
        if (pos) {
          fieldingPositions.push(pos);
        } else {
          benchInnings++;
        }
      }
      return {
        playerId: player.id,
        playerName: playerMap.get(player.id) ?? 'Unknown',
        battingPosition: battingOrder.indexOf(player.id),
        fieldingPositions,
        benchInnings,
      };
    });

  return {
    id: crypto.randomUUID(),
    gameDate: new Date().toISOString(),
    innings,
    lineup,
    battingOrder,
    playerSummaries,
  };
}
```

### Pattern 2: CSS Print Whitelist
**What:** Use `@media print` to hide everything except the dugout card, with absolute positioning to fill the page.
**When to use:** For the print dugout card feature.
**Example:**
```css
/* In a global or high-level print stylesheet */
@media print {
  /* Hide everything by default */
  body * {
    visibility: hidden;
  }

  /* Show only the dugout card and its children */
  .dugoutCard,
  .dugoutCard * {
    visibility: visible;
  }

  .dugoutCard {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  @page {
    size: landscape;
    margin: 0.5in;
  }
}
```

### Pattern 3: CSV Import/Export via File API
**What:** Use native `<input type="file">` for import and `Blob` + `URL.createObjectURL` for export. No library needed for simple roster CSV.
**When to use:** For ROST-03 and ROST-04.
**Example:**
```typescript
// Export: roster to CSV
export function exportRosterCsv(players: Player[]): string {
  const header = 'name';
  const rows = players.map(p => escapeCsvField(p.name));
  return [header, ...rows].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Import: CSV to player names
export function parseRosterCsv(csvText: string): string[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  // Skip header if it looks like a header
  const firstLine = lines[0].trim().toLowerCase();
  const startIndex = (firstLine === 'name' || firstLine === 'player') ? 1 : 0;
  return lines.slice(startIndex)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Browser download trigger
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 4: Cross-Game Fielding Fairness
**What:** Compute cumulative bench-time and position-variety scores from history, then pass them to the lineup generator as soft preferences. Players who have sat more get priority for field time; players who have played fewer position types get priority for new positions.
**When to use:** When HIST-05 requires factoring history into lineup generation.
**Example:**
```typescript
// Compute fairness metrics from history
export function computeFieldingFairness(
  history: GameHistoryEntry[],
  presentPlayerIds: string[],
): Record<string, { totalBenchInnings: number; uniquePositions: Set<Position> }> {
  const metrics: Record<string, { totalBenchInnings: number; uniquePositions: Set<Position> }> = {};

  for (const id of presentPlayerIds) {
    metrics[id] = { totalBenchInnings: 0, uniquePositions: new Set() };
  }

  for (const game of history) {
    for (const summary of game.playerSummaries) {
      if (!metrics[summary.playerId]) continue;
      metrics[summary.playerId].totalBenchInnings += summary.benchInnings;
      for (const pos of summary.fieldingPositions) {
        metrics[summary.playerId].uniquePositions.add(pos);
      }
    }
  }

  return metrics;
}
```

### Anti-Patterns to Avoid
- **Storing computed data as source of truth:** Store the raw lineup and batting order in history, compute summaries on read. Actually, storing pre-computed `playerSummaries` alongside the raw data is acceptable here since it is derived at write time and the source data (lineup, battingOrder) is preserved for re-computation if needed.
- **Mutating history entries:** History is append-only. Never edit or delete past game entries (a coach may want to delete, but start without this).
- **Blocking main thread for CSV:** CSV files for a 12-player roster are tiny. No need for Web Workers or streaming. But always wrap FileReader in a Promise for clean async flow.
- **Using `display: none` for print hiding:** Use `visibility: hidden` instead. `display: none` removes elements from flow and all descendants become invisible with no way to override. `visibility: hidden` allows children to override with `visibility: visible`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing with quoted fields | Custom regex parser | Simple split-based parser with quote handling | Roster CSV is trivially simple (single column of names). A 10-line parser suffices. Full RFC 4180 compliance is overkill. |
| Print layout engine | Custom iframe/popup printing | CSS `@media print` + `window.print()` | Browser print engines handle pagination, margins, scaling. CSS gives full control over what shows. |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Already used throughout the codebase for player IDs and batting history IDs. |
| Date formatting | Manual date string building | `toLocaleDateString()` for display, `toISOString()` for storage | Native Intl API handles localization. ISO strings sort correctly. |

**Key insight:** This phase's complexity is in data model design and print layout CSS, not in needing external libraries. Every tool needed is already in the browser or the existing codebase.

## Common Pitfalls

### Pitfall 1: Print Layout Breaks with CSS Grid
**What goes wrong:** CSS Grid does not always render correctly in print mode across all browsers. Grid items may overflow or collapse.
**Why it happens:** Print rendering engines in browsers (especially older Firefox, Safari) have inconsistent Grid support in `@media print`.
**How to avoid:** Use a simple HTML `<table>` element for the printable dugout card rather than CSS Grid. Tables are the most reliable cross-browser print layout primitive. The on-screen `LineupGrid` can stay as CSS Grid; the `DugoutCard` should use a `<table>`.
**Warning signs:** Card looks correct on screen but breaks when printing.

### Pitfall 2: @page size Not Respected in All Browsers
**What goes wrong:** `@page { size: landscape }` is not supported in older Safari (pre-18.2) and partial in some Firefox versions.
**Why it happens:** CSS Paged Media spec is only 93.68% supported globally. The `size` property specifically has gaps.
**How to avoid:** Design the dugout card to work in both portrait and landscape. Use landscape as a preference but make the grid readable at portrait widths too. Add a note to the user suggesting landscape orientation.
**Warning signs:** User prints in portrait and text is too small.

### Pitfall 3: localStorage Quota for Large History
**What goes wrong:** After many games (50+), the combined localStorage usage could grow, though for this use case it is very unlikely to approach the 5MB limit.
**Why it happens:** Each `GameHistoryEntry` with a 12-player roster and 6 innings is roughly 2-3KB of JSON. Even 100 games = ~300KB, well under 5MB.
**How to avoid:** Not a real risk for this app. But wrap `localStorage.setItem` in try/catch (already done in `useLocalStorage`). Optionally show a warning if history grows beyond a threshold.
**Warning signs:** `QuotaExceededError` thrown on save.

### Pitfall 4: Stale Player IDs in History
**What goes wrong:** History references player IDs that no longer exist in the roster (player was deleted). Fairness computation needs to handle this gracefully.
**Why it happens:** Players can be removed from roster after games have been recorded.
**How to avoid:** Store `playerName` alongside `playerId` in history entries so past data is still readable. When computing cross-game fairness, skip player IDs not in the current present player list (same pattern as `calculateBandCounts` already does).
**Warning signs:** "Unknown" player names in history view, or NaN in fairness calculations.

### Pitfall 5: Confirm Flow Ambiguity (Lineup vs Batting Order vs Game)
**What goes wrong:** Currently batting order has its own confirm flow. Adding game history confirm could create confusion about what "confirm" means.
**Why it happens:** Two separate confirm actions (batting order confirm + game history save) could desync.
**How to avoid:** Unify into a single "Finalize Game" action that confirms both batting order and saves the game history entry. This replaces the current separate batting order confirm. The confirm button should only be enabled when both a lineup is selected AND a batting order exists.
**Warning signs:** History saved without batting order, or batting order confirmed but no history entry created.

### Pitfall 6: CSV Import Overwrites vs Merges
**What goes wrong:** Importing a CSV could either replace the entire roster or merge with existing players. Either behavior can surprise the user.
**Why it happens:** No clear UX pattern established yet.
**How to avoid:** Import should ADD new players (by name match), not replace the roster. Show a preview of what will be added before committing. Skip duplicates silently or warn.
**Warning signs:** User imports CSV and loses existing roster.

## Code Examples

Verified patterns from the existing codebase:

### Append-Only History Pattern (from useBattingOrder)
```typescript
// Source: src/hooks/useBattingOrder.ts lines 43-54
const confirm = useCallback(() => {
  if (!state.currentOrder || state.isConfirmed) return;

  const entry: BattingHistoryEntry = {
    id: crypto.randomUUID(),
    gameDate: new Date().toISOString(),
    order: state.currentOrder,
  };

  setHistory((prev: BattingHistoryEntry[]) => [...prev, entry]);
  setState((prev: BattingOrderState) => ({ ...prev, isConfirmed: true }));
}, [state.currentOrder, state.isConfirmed, setHistory, setState]);
```

### CSS Grid Lineup Display (from LineupGrid)
```typescript
// Source: src/components/lineup/LineupGrid.tsx
// The grid uses style={{ gridTemplateColumns: `auto repeat(${innings}, 1fr)` }}
// Rows are POSITIONS (P, C, 1B, 2B, 3B, SS, LF, CF, RF) + Bench
// This exact layout maps to the dugout card requirement (OUTP-01)
```

### File Download Pattern (browser standard)
```typescript
// Standard browser file download without dependencies
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### File Import Pattern (browser standard)
```typescript
// Standard browser file reading
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
```

### Print-Optimized Table for Dugout Card
```css
/* Dugout card print styles */
@media print {
  .dugoutCard {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    color: #000;
  }

  .dugoutCard table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .dugoutCard th,
  .dugoutCard td {
    border: 2px solid #000;
    padding: 4pt 6pt;
    text-align: center;
    font-size: 13pt;
  }

  .dugoutCard th {
    background: #e0e0e0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `page-break-*` CSS properties | `break-before`, `break-after`, `break-inside` | CSS Fragmentation Level 3 | Old properties still work as aliases, but new ones are standard |
| `window.open()` + write HTML for printing | `@media print` + `window.print()` | Years ago | No popup needed, CSS handles layout |
| Manual FileReader callbacks | Promise-wrapped FileReader | ES2015+ | Cleaner async code |
| `URL.createObjectURL` without revoke | Always `revokeObjectURL` after use | Best practice | Prevents memory leaks |

**Deprecated/outdated:**
- `page-break-before/after/inside`: Still functional but `break-*` properties are the modern replacement. Both work in all target browsers.

## Open Questions

1. **Should "Finalize Game" unify batting order confirm + history save?**
   - What we know: Currently batting order has a separate confirm. Game history needs its own save trigger. The project decision says "Confirm appends new history entry each time -- coach controls when to confirm."
   - What's unclear: Whether the existing batting order confirm should be merged into a unified "Finalize Game" action, or kept separate.
   - Recommendation: Unify them. A single "Finalize Game" button that saves the complete game entry (lineup + batting order) is cleaner UX and prevents desync. This replaces the current batting order confirm button.

2. **Should lineup generation factor in fielding history immediately or as a separate step?**
   - What we know: HIST-05 says "Lineup generation factors in history for cross-game fairness (bench time, position variety)." The batting order already does this via `generateBattingOrder(presentPlayers, history)`.
   - What's unclear: How aggressively to weight history. Too much weighting makes lineups predictable; too little defeats the purpose.
   - Recommendation: Start with bench-time balancing only (players who have sat more get soft priority for field positions). Position variety can be a stretch goal. Pass cumulative bench counts to the generator as a player-ordering preference, similar to how batting order uses band counts.

3. **What is the dugout card's physical layout?**
   - What we know: OUTP-01 says "grid: rows = positions, columns = innings." OUTP-02 says "Batting order is displayed on the dugout card." OUTP-03 says "readable from a few feet away."
   - What's unclear: Exact font sizes, whether batting order goes left/right/below the grid, whether game date/team info is included.
   - Recommendation: Landscape layout. Fielding grid on top (rows=positions, columns=innings). Batting order as a numbered list below or to the right. 13-14pt font size for readability. Game date as header. Use `<table>` for reliable print rendering.

4. **How should CSV import handle existing roster conflicts?**
   - What we know: ROST-03 says "User can import roster from a local CSV file." The roster uses `useRoster.addPlayer()` which already rejects duplicates by name.
   - What's unclear: Whether import should fully replace the roster or merge.
   - Recommendation: Merge (add new, skip duplicates). Show feedback about how many were added and how many were skipped as duplicates.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/types/index.ts`, `src/hooks/useLocalStorage.ts`, `src/hooks/useBattingOrder.ts`, `src/logic/batting-order.ts`, `src/logic/lineup-generator.ts`, `src/components/lineup/LineupGrid.tsx` -- direct inspection of current patterns
- [MDN: CSS @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) -- print stylesheet techniques
- [MDN: FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) -- browser file reading
- [MDN: @page size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page/size) -- page orientation for print
- [Can I Use: CSS Paged Media](https://caniuse.com/css-paged-media) -- 93.68% global support, Chrome 15+, Firefox 95+, Safari 18.2+

### Secondary (MEDIUM confidence)
- [CSS-Tricks: Print Stylesheet Approaches](https://css-tricks.com/print-stylesheet-approaches-blacklist-vs-whitelist/) -- whitelist vs blacklist print hiding
- [SitePoint: Printer-Friendly Pages](https://www.sitepoint.com/css-printer-friendly-pages/) -- print CSS best practices
- [MDN: Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- 5MB localStorage limit per origin
- [GeeksforGeeks: CSV download in JavaScript](https://www.geeksforgeeks.org/javascript/how-to-create-and-download-csv-file-in-javascript/) -- Blob + createObjectURL pattern

### Tertiary (LOW confidence)
- Print layout warning about CSS Grid in print mode -- based on multiple web sources noting inconsistent behavior. Recommendation to use `<table>` for print is a conservative safety measure.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all browser-native APIs
- Architecture: HIGH -- follows established codebase patterns (useLocalStorage, pure logic modules, presentational components)
- History data model: HIGH -- straightforward extension of existing BattingHistoryEntry pattern
- Print layout: MEDIUM -- CSS print is well-documented but browser quirks with Grid in print mode require defensive approach (table fallback)
- Cross-game fairness algorithm: MEDIUM -- bench-time balancing is clear, but the exact weighting/integration with existing generator needs experimentation
- CSV import/export: HIGH -- trivially simple for single-column roster data
- Pitfalls: HIGH -- identified from codebase analysis and documented browser limitations

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days -- stable domain, no fast-moving dependencies)
