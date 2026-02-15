# Phase 10: App Restructuring and Game Day Flow - Research

**Researched:** 2026-02-15
**Domain:** React app restructuring, multi-step wizard UX, state management
**Confidence:** HIGH

## Summary

This phase reorganizes an existing React + TypeScript app from a 4-tab layout (Roster, Game Setup, Lineup, History) into a 2-tab layout (Game Day, Settings) with a guided 5-step stepper in the Game Day tab. The codebase is well-structured with CSS Modules, custom hooks backed by `useCloudStorage`, and no router library -- navigation is purely `useState`-driven. No new dependencies are needed.

The primary challenge is decomposing the existing `LineupPage` (which contains Setup/Review/Game Day as `<details>` sections) and `GameSetupPage` (attendance + settings + position blocks) into discrete stepper steps, while relocating configuration concerns to a new Settings page. The existing hooks (`useRoster`, `useLineup`, `useBattingOrder`, `useGameConfig`, `useGameHistory`) are well-factored and can be reused directly -- no hook refactoring needed. A new utility function `computePitcherHistory` is needed (analogous to existing `computeCatcherInnings`) plus stepper state management.

**Primary recommendation:** Build a `GameDayStepper` component with a `useStepperState` hook that tracks current step, completion status, and staleness warnings. Reuse all existing sub-components and hooks. The stepper state should live in React state only (not persisted) since it represents a transient session, not user data.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 5 steps in order: Attendance -> P/C Assignment -> Generate -> Review -> Print
- Linear on first pass -- must complete each step before advancing
- After completing all steps once, coach can jump to any step freely
- Going back and changing earlier inputs (e.g., marking someone absent after generating) shows a warning that the lineup may be stale, but does NOT auto-invalidate -- coach can keep existing lineup or regenerate
- Last-2-games pitcher/catcher history shown in a separate column in the player list (not badges or expandable)
- Assignment via two dropdowns at the top of the step: one for Pitcher, one for Catcher -- populated with present players
- Pitcher assignment is required to advance to Generate; Catcher is optional
- If a player pitched the last 2 consecutive games, show a warning icon/message but allow the coach to override -- informational, not blocking
- Absent players are greyed out and excluded from P/C dropdowns and lineup generation
- Bottom tab bar with two tabs: "Game Day" and "Settings" -- persistent, always visible
- App opens to Game Day tab by default
- Settings page: single scrollable page with clear section headers (no tabs or accordions)
- Settings section order: Roster -> CSV Import/Export -> Position Blocks -> Innings Config -> Sync Status
- Purely configuration -- no game-specific context shown on the Settings page
- All existing functionality preserved, just relocated from current layout

### Claude's Discretion
- Stepper progress indicator style (horizontal bar, vertical sidebar, etc.)
- Attendance marking interaction design
- Exact visual treatment of absent/greyed-out players
- Error state handling throughout the stepper

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core (already in use -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already in use |
| TypeScript | ~5.9.3 | Type safety | Already in use |
| Vite | ^7.3.1 | Build tool | Already in use |
| CSS Modules | (built-in) | Scoped styling | Already used everywhere |

### Supporting (already in use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.0.18 | Unit testing | Testing stepper logic, pitcher history utility |

### No New Dependencies Needed
This phase is purely a reorganization of existing code. The app does not use a router and should continue with state-driven navigation. A stepper/wizard library would be overkill for 5 steps with simple linear flow -- build it with plain React state.

**Installation:** None required.

## Architecture Patterns

### Current Project Structure
```
src/
  components/
    app-shell/        # AppShell, AppHeader, TabBar, SyncStatusIndicator
    batting-order/    # BattingOrderSection, BattingOrderList
    game-setup/       # GameSetupPage, AttendanceList, PlayerAttendance, SettingsPanel
    history/          # HistoryPage
    lineup/           # LineupPage, PreAssignments, LineupGrid, LineupOptions, etc.
    roster/           # RosterPage, PlayerInput, PlayerList, PlayerRow
  hooks/              # useRoster, useLineup, useBattingOrder, useGameConfig, useGameHistory
  logic/              # lineup-generator, batting-order, game-history, csv
  sync/               # SyncContext, sync-engine, useCloudStorage
  types/              # index.ts (all types)
```

### Recommended New Structure
```
src/
  components/
    app-shell/        # AppShell (modified), AppHeader, TabBar (modified for bottom)
    game-day/         # NEW: GameDayStepper, StepperHeader
      steps/          # NEW: AttendanceStep, PCAssignmentStep, GenerateStep, ReviewStep, PrintStep
    settings/         # NEW: SettingsPage (consolidates roster, CSV, position blocks, innings, sync)
    shared/           # Existing reusable sub-components moved here or left in place
    batting-order/    # (unchanged)
    lineup/           # (mostly unchanged -- sub-components reused by steps)
    roster/           # (mostly unchanged -- sub-components reused by settings)
    history/          # (unchanged -- not directly referenced but data used by P/C history)
  hooks/              # Add useStepperState; existing hooks unchanged
  logic/              # Add computePitcherHistory to game-history.ts
  sync/               # (unchanged)
  types/              # Add StepperState types
```

### Pattern 1: Stepper State Machine
**What:** A custom hook that manages which step is active, which steps are completed, and whether downstream steps are stale.
**When to use:** Multi-step flows with linear-first-then-random-access navigation.
**Example:**
```typescript
// src/hooks/useStepperState.ts
type StepId = 'attendance' | 'pc-assignment' | 'generate' | 'review' | 'print';

interface StepperState {
  currentStep: StepId;
  completedSteps: Set<StepId>;
  hasCompletedAllOnce: boolean;  // Unlocks free navigation
  staleWarning: boolean;         // True when earlier step changed after generate
}

// Step completion conditions (derived, not stored):
// - attendance: at least 9 players present
// - pc-assignment: pitcher assigned (via useLineup pitcherAssignments)
// - generate: generatedLineups.length > 0
// - review: selectedLineupIndex !== null
// - print: (always completable -- terminal step)
```

### Pattern 2: Composition Over Reconstruction
**What:** Each stepper step wraps existing components/hooks rather than rewriting them.
**When to use:** When reorganizing existing functionality.
**Example:**
```typescript
// AttendanceStep wraps the existing AttendanceList component
function AttendanceStep() {
  const { players, togglePresent } = useRoster();
  return (
    <div>
      <AttendanceList players={players} onToggle={togglePresent} />
      {/* Step-specific navigation controls */}
    </div>
  );
}
```

### Pattern 3: Bottom Tab Bar
**What:** Move TabBar from top (current) to bottom, reduce to 2 tabs.
**When to use:** Mobile-first apps where primary navigation should be thumb-reachable.
**Example:**
```typescript
// Modified AppShell -- tab bar moves below content
<div className={styles.shell}>
  <AppHeader />
  <main className={styles.content}>
    {activeTab === 'game-day' && <GameDayStepper />}
    {activeTab === 'settings' && <SettingsPage />}
  </main>
  <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
</div>
```
CSS change: TabBar uses `position: sticky; bottom: 0;` or flex layout puts it at the end.

### Anti-Patterns to Avoid
- **Don't persist stepper step in localStorage/cloud:** The current step is a transient UI concern, not user data. Persisting it would cause confusing behavior when reopening the app.
- **Don't auto-invalidate lineups when attendance changes:** Per user decision, show a stale warning but let the coach decide. This avoids frustrating loss of work.
- **Don't create a new data layer for P/C history:** The existing `GameHistoryEntry.lineup` already contains per-inning position assignments. Extract P/C data from the existing `history` array.
- **Don't split existing hooks:** The hooks (`useRoster`, `useLineup`, etc.) are well-factored. Each stepper step should call the hooks it needs directly, not receive data through props drilling from the stepper container.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step completion logic | Complex state tracking per step | Derive completion from existing hook data | `useLineup().generatedLineups.length > 0` already tells you if Generate is done |
| Pitcher history extraction | New API endpoint | `computePitcherHistory()` utility on client from `useGameHistory().history` | Data is already loaded; history array is small (seasonal data) |
| Tab bar accessibility | Custom keyboard handling | Extend existing `TabBar` component | It already has correct ARIA roles and keyboard navigation |

**Key insight:** Nearly everything needed for the stepper already exists as computed values in hooks. Step completion is a derived concept, not new state.

## Common Pitfalls

### Pitfall 1: Step Completion Conditions Becoming Stale
**What goes wrong:** Step marked "complete" but underlying data changes (e.g., player removed from roster after attendance was marked).
**Why it happens:** Storing completion as a boolean flag disconnected from actual data.
**How to avoid:** Derive step completion from live hook data every render. `isAttendanceComplete = presentCount >= 9`. Never cache completion status.
**Warning signs:** A step shows as "complete" with a green checkmark but the underlying condition no longer holds.

### Pitfall 2: Stepper State vs. Persisted Data Confusion
**What goes wrong:** Mixing transient UI state (current step, stale warning) with persisted data (lineup assignments, batting order).
**Why it happens:** Temptation to put everything in the same state object.
**How to avoid:** Stepper navigation state lives in a `useState`/`useReducer` in `GameDayStepper`. Actual game data continues to live in existing hooks backed by `useCloudStorage`.
**Warning signs:** Reloading the app takes you to step 3 with a half-filled form.

### Pitfall 3: Breaking the Print Flow
**What goes wrong:** Print CSS (`@media print` targeting `[data-dugout-card]`) stops working after restructuring.
**Why it happens:** The `DugoutCard` component gets wrapped in new containers, or print CSS selectors no longer match.
**How to avoid:** Keep `[data-dugout-card]` attribute on `DugoutCard`. Verify print behavior after restructuring by testing `window.print()`.
**Warning signs:** Printing shows blank page or shows the entire app instead of just the dugout card.

### Pitfall 4: Stepper "Stale" Warning Logic
**What goes wrong:** Warning shown incorrectly (false positives/negatives) when coach goes back and changes inputs.
**Why it happens:** Tracking "what changed" is complex; comparing previous vs current state for all upstream steps.
**How to avoid:** Simple approach: track a `generatedAt` timestamp and a `lastUpstreamChangeAt` timestamp. When attendance or P/C changes after generation, bump `lastUpstreamChangeAt`. Show warning when `lastUpstreamChangeAt > generatedAt`.
**Warning signs:** Warning never appears, or appears even when nothing changed.

### Pitfall 5: P/C Assignment Step Mismatch with Existing PreAssignments
**What goes wrong:** The new P/C step uses different data flow than existing `PreAssignments` component, causing assignment drift.
**Why it happens:** The CONTEXT decision says "two dropdowns at the top: one for Pitcher, one for Catcher" which differs from the current per-inning P/C assignment grid in `PreAssignments`.
**How to avoid:** Clarify: the CONTEXT says single Pitcher and Catcher dropdowns. The existing system assigns P/C per-inning. The new P/C step assigns the GAME pitcher and catcher (same person all innings), then the generator handles the per-inning detail. This is a simplification of the current per-inning model. The `useLineup` hook's `setPitcher`/`setCatcher` should be called for ALL innings with the selected player.
**Warning signs:** Pitcher is set for inning 1 but not innings 2-6.

### Pitfall 6: Requirements Mismatch -- Stepper Steps vs. Requirements Doc
**What goes wrong:** The CONTEXT.md says 5 steps (Attendance, P/C Assignment, Generate, Review, Print) but the requirements mention 7 steps (Attendance, P/C, Generate, Edit Lineup, Batting Order, Finalize, Print).
**Why it happens:** Requirements doc and CONTEXT.md were written at different times.
**How to avoid:** CONTEXT.md is the locked decision. Use 5 steps. The "Review" step encompasses what the requirements call "Edit Lineup" + "Batting Order" + "Finalize". The "Print" step is the final output. Map requirements FLOW-02 to the 5-step model.
**Warning signs:** Building 7 steps when user decided on 5.

## Code Examples

### Computing Pitcher/Catcher History from Last 2 Games
```typescript
// Add to src/logic/game-history.ts
// Source: Derived from existing computeCatcherInnings pattern + GameHistoryEntry.lineup structure

interface PCHistoryEntry {
  playerId: string;
  pitched: boolean;   // Did this player pitch in this game?
  caught: boolean;    // Did this player catch in this game?
}

/**
 * Extract pitcher and catcher assignments from the last N game history entries.
 * Returns per-player summary: which of the last N games they pitched/caught.
 */
export function computeRecentPCHistory(
  history: GameHistoryEntry[],
  lastN: number = 2,
): Record<string, { pitchedGames: number; caughtGames: number; pitchedLast2Consecutive: boolean }> {
  const recentGames = history.slice(-lastN);
  const result: Record<string, { pitchedGames: number; caughtGames: number; pitchedLast2Consecutive: boolean }> = {};

  // For each recent game, find who pitched and caught
  const gameResults: { pitchers: Set<string>; catchers: Set<string> }[] = [];
  for (const game of recentGames) {
    const pitchers = new Set<string>();
    const catchers = new Set<string>();
    for (let inn = 1; inn <= game.innings; inn++) {
      const assignment = game.lineup[inn];
      if (assignment) {
        if (assignment['P']) pitchers.add(assignment['P']);
        if (assignment['C']) catchers.add(assignment['C']);
      }
    }
    gameResults.push({ pitchers, catchers });
  }

  // Aggregate per player
  const allPlayerIds = new Set<string>();
  for (const gr of gameResults) {
    gr.pitchers.forEach(id => allPlayerIds.add(id));
    gr.catchers.forEach(id => allPlayerIds.add(id));
  }

  for (const playerId of allPlayerIds) {
    let pitchedGames = 0;
    let caughtGames = 0;
    for (const gr of gameResults) {
      if (gr.pitchers.has(playerId)) pitchedGames++;
      if (gr.catchers.has(playerId)) caughtGames++;
    }
    const pitchedLast2Consecutive = gameResults.length >= 2 &&
      gameResults[gameResults.length - 1].pitchers.has(playerId) &&
      gameResults[gameResults.length - 2].pitchers.has(playerId);

    result[playerId] = { pitchedGames, caughtGames, pitchedLast2Consecutive };
  }

  return result;
}
```

### Stepper State Hook
```typescript
// src/hooks/useStepperState.ts

const STEPS = ['attendance', 'pc-assignment', 'generate', 'review', 'print'] as const;
type StepId = typeof STEPS[number];

interface StepperState {
  currentStep: StepId;
  hasCompletedAllOnce: boolean;
  generatedAtTime: number | null;        // Timestamp when lineup was generated
  lastUpstreamChangeTime: number | null;  // Timestamp when attendance/PC changed post-generation
}

function useStepperState() {
  const [state, setState] = useState<StepperState>({
    currentStep: 'attendance',
    hasCompletedAllOnce: false,
    generatedAtTime: null,
    lastUpstreamChangeTime: null,
  });

  const goToStep = (step: StepId) => {
    const stepIndex = STEPS.indexOf(step);
    const currentIndex = STEPS.indexOf(state.currentStep);
    // Allow forward only if all prior steps complete, or if hasCompletedAllOnce
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const isStale = state.generatedAtTime !== null &&
    state.lastUpstreamChangeTime !== null &&
    state.lastUpstreamChangeTime > state.generatedAtTime;

  return { ...state, goToStep, isStale, steps: STEPS };
}
```

### Bottom Tab Bar CSS
```css
/* Modified TabBar positioning */
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 600px;
  margin: 0 auto;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  /* Account for bottom tab bar height */
  padding-bottom: calc(var(--min-tap-size) + var(--space-xl));
}

.tabBar {
  position: sticky;
  bottom: 0;
  display: flex;
  border-top: 2px solid var(--color-border);
  background: var(--color-bg);
  /* Remove old top border styling */
  border-bottom: none;
  padding: 0;
  z-index: 10;
}

.tab {
  flex: 1;
  text-align: center;
  min-height: var(--min-tap-size);
  /* ... */
}
```

### Stepper Progress Indicator (Recommended: Horizontal Bar)
```typescript
// Compact horizontal step indicator suitable for mobile
// Shows step numbers with current highlighted, completed steps with checkmark

function StepperHeader({ steps, currentStep, completedSteps, onStepClick, canNavigateFreely }) {
  return (
    <div className={styles.stepperHeader}>
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const isClickable = canNavigateFreely || isCompleted || step === currentStep;
        return (
          <button
            key={step}
            className={`${styles.stepDot} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
            disabled={!isClickable}
            onClick={() => onStepClick(step)}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={styles.stepNumber}>
              {isCompleted && !isActive ? '\u2713' : index + 1}
            </span>
            <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Settings Page Composition
```typescript
// src/components/settings/SettingsPage.tsx
// Composes existing components into a single scrollable page

function SettingsPage() {
  const { players, addPlayer, renamePlayer, removePlayer, importPlayers } = useRoster();
  const { config, setInnings } = useGameConfig();
  const { presentPlayers, positionBlocks, togglePositionBlock } = useLineup();

  return (
    <div className={styles.page}>
      <h2>Settings</h2>

      <section>
        <h3>Roster</h3>
        <PlayerInput onAdd={addPlayer} />
        <PlayerList players={players} onRename={renamePlayer} onDelete={removePlayer} />
      </section>

      <section>
        <h3>CSV Import/Export</h3>
        {/* CSV buttons from RosterPage */}
      </section>

      <section>
        <h3>Position Blocks</h3>
        <PositionBlocks presentPlayers={presentPlayers} positionBlocks={positionBlocks} onToggleBlock={togglePositionBlock} />
      </section>

      <section>
        <h3>Innings Configuration</h3>
        <SettingsPanel innings={config.innings} onInningsChange={setInnings} />
      </section>

      <section>
        <h3>Sync Status</h3>
        <SyncStatusIndicator />
      </section>
    </div>
  );
}
```

## Mapping Existing Components to New Structure

| Existing Component | Current Location | New Location | Notes |
|---|---|---|---|
| `AttendanceList` + `PlayerAttendance` | `GameSetupPage` | `AttendanceStep` (Game Day stepper) | Reuse as-is |
| `PreAssignments` | `LineupPage` (Setup details) | `PCAssignmentStep` (Game Day stepper) | Simplify to single P/C dropdown pair; add history column |
| Generate button + status | `LineupPage` (Setup details) | `GenerateStep` (Game Day stepper) | Extract from LineupPage |
| `LineupOptions` + `LineupGrid` + `FairnessSummary` + `ValidationPanel` | `LineupPage` (Review details) | `ReviewStep` (Game Day stepper) | Also add `BattingOrderSection` and Finalize button here |
| `DugoutCard` (with print) | `LineupPage` (Game Day details) | `PrintStep` (Game Day stepper) | Reuse as-is |
| `SettingsPanel` (innings config) | `GameSetupPage` | `SettingsPage` | Move to Settings |
| `PositionBlocks` | `GameSetupPage` | `SettingsPage` | Move to Settings |
| `PlayerInput` + `PlayerList` + `PlayerRow` | `RosterPage` | `SettingsPage` (Roster section) | Move to Settings |
| CSV Import/Export logic | `RosterPage` | `SettingsPage` (CSV section) | Move to Settings |
| `SyncStatusIndicator` | `AppHeader` | `SettingsPage` (Sync section) + keep in header | Keep visible in header; also show details in Settings |
| `HistoryPage` | Standalone tab | Not shown as tab | Data still used via `useGameHistory` for P/C history; page itself could be accessible from Settings or removed from nav |

## Key Data Flows for New Features

### P/C History Display (FLOW-03)
```
useGameHistory().history (existing)
  -> slice(-2) to get last 2 games
  -> For each game: game.lineup[inning]['P'] gives pitcher, ['C'] gives catcher
  -> computeRecentPCHistory() returns { playerId: { pitchedGames, caughtGames, pitchedLast2Consecutive } }
  -> Display in PCAssignmentStep as a column in the player list
```

### P/C Assignment Simplification
The CONTEXT decision says "two dropdowns at the top: one for Pitcher, one for Catcher." The existing system has per-inning P/C assignment. The simplification: a single pitcher for the whole game, a single catcher for the whole game. When the coach selects a pitcher, call `setPitcher(inning, playerId)` for ALL innings. Same for catcher.

**Important nuance:** The existing `useLineup` hook stores `pitcherAssignments` and `catcherAssignments` as `Record<number, string>` (inning -> playerId). The new UI sets a single pitcher/catcher, but the underlying data structure supports per-inning. The step should set all innings to the same value, which is forward-compatible if per-inning assignment is ever re-added.

### Fairness Comparison (FLOW-05)
The success criteria mentions "previous game's batting order visible alongside current auto-generated order." This data is available from:
```
useGameHistory().history[-1].battingOrder  // Last game's batting order
useBattingOrder().currentOrder              // Current auto-generated order
```
Display them side-by-side in the Review step.

### Step Completion Derivation
```
attendance:     useRoster().presentCount >= 9
pc-assignment:  Object.values(useLineup().pitcherAssignments).some(v => v !== '')
                (at least one pitcher assigned -- which means ALL innings assigned since we set all at once)
generate:       useLineup().generatedLineups.length > 0
review:         useLineup().selectedLineupIndex !== null && useBattingOrder().currentOrder !== null
print:          (always available once review is complete -- terminal step)
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 10) | Impact |
|---|---|---|
| 4-tab navigation (Roster, Game Setup, Lineup, History) | 2-tab navigation (Game Day, Settings) | Simpler mental model; game-day-first |
| Tab bar at top | Tab bar at bottom | Better thumb reach on mobile |
| `<details>` sections in LineupPage for progressive disclosure | Stepper with dedicated steps | Guided flow reduces cognitive load |
| Per-inning P/C dropdowns grid | Single Pitcher + Catcher dropdown pair | Simpler for coaches; matches how they think ("who's pitching today?") |
| No pitcher history display | Last-2-games P/C history column | Helps coaches rotate pitchers fairly |
| App opens to Roster tab | App opens to Game Day tab | Matches primary use case (game day) |

## Open Questions

1. **What happens to the History page/tab?**
   - What we know: The CONTEXT says 2 tabs (Game Day, Settings). History is not mentioned.
   - What's unclear: Is history accessible from anywhere? The data is still used for P/C history and fairness.
   - Recommendation: Game history data remains loaded via `useGameHistory()` for P/C history computation. The History page could be a section in Settings, or accessible via a link/button. Since CONTEXT says "All existing functionality preserved, just relocated," add History as a section in Settings below Sync Status.

2. **How does the stepper handle the app being refreshed mid-flow?**
   - What we know: Stepper state is transient (React state). Game data is persisted via `useCloudStorage`.
   - What's unclear: Should the stepper auto-detect what step to start on based on persisted data?
   - Recommendation: On app load, stepper always starts at step 1 (Attendance). But since the underlying data (attendance, P/C assignments, generated lineups) persists, the coach can quickly advance through already-complete steps. The completion checks are derived from live data, so if a lineup was previously generated and is still valid, steps 1-3 will show as complete and the coach can jump ahead (once they advance past each step at least once this session -- or we could be lenient and start `hasCompletedAllOnce: true` if a generated lineup already exists in state).

3. **Clarification on "Previous game's batting order" display**
   - What we know: FLOW-05 requires showing previous batting order alongside current for fairness comparison.
   - What's unclear: Should this be in the Review step or the Print step?
   - Recommendation: Show in Review step since that's where the coach evaluates fairness. The `BattingOrderSection` already generates the order; add a "Previous Game" column next to it.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all source files in `src/` -- component structure, hooks, types, logic, styling
- `src/types/index.ts` -- all TypeScript interfaces and types
- `src/hooks/*.ts` -- all custom hooks with data flow patterns
- `src/logic/game-history.ts` -- existing P/C computation patterns
- `src/components/app-shell/AppShell.tsx` -- current navigation architecture
- `src/components/lineup/LineupPage.tsx` -- current Setup/Review/Game Day flow structure
- `src/styles/tokens.css` -- design tokens and CSS variable system

### Secondary (MEDIUM confidence)
- React 19 documentation for `useState`, `useReducer` patterns -- standard patterns, well-known

### Tertiary (LOW confidence)
- None -- this phase is entirely about reorganizing existing code with well-understood patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries analyzed from source
- Architecture: HIGH -- patterns derived directly from existing codebase structure; stepper is a well-known UI pattern
- Pitfalls: HIGH -- derived from analyzing actual component dependencies and data flows in the codebase
- P/C history implementation: HIGH -- `GameHistoryEntry.lineup` structure verified to contain per-inning position assignments including 'P' and 'C'

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable -- no external dependency changes expected)
