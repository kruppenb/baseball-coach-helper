# Phase 2: Lineup Engine - Research

**Researched:** 2026-02-10
**Domain:** Constraint-based lineup generation algorithm, validation system, pre-assignment UI, position blocking
**Confidence:** HIGH

## Summary

Phase 2 is the heart of the application -- it delivers the constraint-based auto-generation engine that produces fair, valid fielding lineups. The core challenge is a constraint satisfaction problem (CSP): given N present players, K innings, 9 positions, pre-assigned pitchers/catchers, and position blocks, fill a grid such that (a) no player sits consecutive innings, (b) every player gets 2+ infield positions by inning 4, (c) no player plays the same position in consecutive innings (except P/C), and (d) blocked positions are respected.

The existing reference implementation at `C:\repos\baseball-coach\src\App.tsx` (lines 219-483) provides a proven retry-based random constraint solver. This algorithm works but has three limitations that Phase 2 must address: (1) it hardcodes 5 innings and 3 pitcher/catcher slots, (2) it generates only a single lineup, and (3) it lacks position blocking support. The new implementation must extract this logic into pure functions, generalize for 5 or 6 innings, add position blocking, generate 3-5 valid options, and wrap it all in a coach-friendly UI with real-time validation.

The UI side requires three new capabilities layered onto the existing app shell: (1) a pre-assignment interface where coaches select pitchers and catchers for inning slots, (2) a position blocking interface where coaches mark which positions specific players should never play, and (3) a lineup display showing the generated grid with validation errors in plain language. All lineup state persists via localStorage using the established `useLocalStorage` pattern from Phase 1.

**Primary recommendation:** Extract the lineup generation algorithm into a pure `src/logic/` module, use retry-based random search with backtracking improvements, pre-validate constraints before generation, and generate multiple valid lineups by running the solver 3-5 times with different random seeds. Build the UI as a new `lineup` tab with three sections: pre-assignment, generation controls, and results display.

## Standard Stack

### Core (Already Established in Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already installed. No new dependencies. |
| TypeScript | ~5.9.3 | Type safety | Already installed. Types critical for lineup data structures. |
| Vite | ^7.3.1 | Build tool | Already configured with CSS Modules support. |

### Phase 2 Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | Phase 2 requires zero new npm dependencies. The lineup algorithm is pure TypeScript. The UI uses existing React + CSS Modules. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom retry-based solver | kiwi.js (Cassowary solver) | Cassowary is for continuous constraint solving (layout engines). Our problem is discrete finite-domain assignment -- retry with backtracking is the correct approach for this problem size. |
| Synchronous generation | Web Worker for generation | With 200 max attempts on a 5-6 inning x 9 position grid, generation completes in <100ms. Web Worker adds complexity (message passing, worker bundling) without measurable UX benefit. Only consider if profiling shows >500ms generation time. |
| Manual validation logic | Zod schema validation | Zod validates data shapes, not domain constraints like "no consecutive bench." Our validation rules are custom business logic that must be hand-written regardless. |
| Pure random retry | Backtracking with constraint propagation | Full CSP solver is overkill. The problem space is small (11-12 players, 9 positions, 5-6 innings). Random retry with pre-validation and priority-based assignment converges within 50-200 attempts reliably. |

**Installation:**
```bash
# No new packages needed for Phase 2
# Everything builds on Phase 1 stack
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── logic/                          # NEW: Pure business logic (no React)
│   ├── lineup-generator.ts         # Core generation algorithm
│   ├── lineup-validator.ts         # 6-step validation system
│   ├── lineup-types.ts             # Lineup-specific types (or extend types/index.ts)
│   └── constraint-helpers.ts       # Shared constraint utilities
├── hooks/
│   ├── useLineup.ts                # NEW: Lineup state management
│   ├── usePreAssignments.ts        # NEW: Pitcher/catcher/block state
│   ├── useLocalStorage.ts          # Existing
│   ├── useRoster.ts                # Existing
│   └── useGameConfig.ts            # Existing
├── components/
│   ├── lineup/                     # NEW: Lineup tab components
│   │   ├── LineupPage.tsx          # Tab container (like GameSetupPage)
│   │   ├── LineupPage.module.css
│   │   ├── PreAssignments.tsx      # Pitcher/catcher slot selectors
│   │   ├── PreAssignments.module.css
│   │   ├── PositionBlocks.tsx      # Block positions for players
│   │   ├── PositionBlocks.module.css
│   │   ├── LineupGrid.tsx          # Generated lineup display (innings x positions)
│   │   ├── LineupGrid.module.css
│   │   ├── LineupOptions.tsx       # Multiple lineup cards to choose from
│   │   ├── LineupOptions.module.css
│   │   ├── ValidationPanel.tsx     # Validation errors display
│   │   └── ValidationPanel.module.css
│   ├── app-shell/                  # MODIFIED: Enable lineup tab
│   ├── game-setup/                 # Existing
│   └── roster/                     # Existing
├── types/
│   └── index.ts                    # EXTENDED: Add lineup types
└── styles/
    └── tokens.css                  # EXTENDED: Add lineup-specific tokens
```

### Pattern 1: Pure Logic Separation
**What:** All lineup generation and validation logic lives in `src/logic/` as pure functions with zero React dependencies. Components call these functions and render the results.
**When to use:** Always. The algorithm is the most complex code in the app. It must be testable without React.
**Why critical:** The reference app mixes algorithm code with React state updates and component rendering in a single 700-line file. This makes debugging impossible and testing impractical. Separating logic enables unit testing of the solver independently.
**Example:**
```typescript
// src/logic/lineup-generator.ts
// Pure function: inputs in, lineup out. No React, no state, no DOM.

export interface GenerateLineupInput {
  presentPlayers: Player[];
  innings: number;  // 5 or 6
  pitcherAssignments: Map<number, string>;  // inning -> playerId
  catcherAssignments: Map<number, string>;  // inning -> playerId
  positionBlocks: Map<string, Set<Position>>;  // playerId -> blocked positions
}

export interface GenerateLineupResult {
  lineup: Lineup;
  valid: boolean;
  errors: ValidationError[];
}

export function generateLineup(input: GenerateLineupInput): GenerateLineupResult {
  // Pre-validate feasibility
  // Run retry-based solver
  // Validate result
  // Return structured result
}

export function generateMultipleLineups(
  input: GenerateLineupInput,
  count: number  // 3-5
): GenerateLineupResult[] {
  // Run generateLineup() count times with different shuffles
  // Return only valid results
  // If fewer than count valid results after maxTotalAttempts, return what we have
}
```

### Pattern 2: Pre-Validation Before Generation
**What:** Before running the solver, check that the constraints are mathematically satisfiable. Catch impossible inputs early with specific error messages.
**When to use:** Always, before every generation attempt.
**Why critical:** The reference app's retry loop can burn 200 attempts on impossible inputs (e.g., 8 present players for 9 positions, or all pitchers assigned to the same player). Pre-validation catches these in O(1) and provides instant, specific feedback.
**Example:**
```typescript
// src/logic/lineup-generator.ts

export function preValidate(input: GenerateLineupInput): string[] {
  const errors: string[] = [];
  const { presentPlayers, innings, pitcherAssignments, catcherAssignments, positionBlocks } = input;
  const playerCount = presentPlayers.length;

  // Must have at least 9 players for 9 positions
  if (playerCount < 9) {
    errors.push(
      `Need at least 9 present players to fill all positions. ` +
      `Currently ${playerCount} present.`
    );
  }

  // Verify all assigned pitchers/catchers are present
  for (const [inning, playerId] of pitcherAssignments) {
    const player = presentPlayers.find(p => p.id === playerId);
    if (!player) {
      errors.push(`Pitcher for inning ${inning} is not on the active roster.`);
    }
  }

  // Check for pitcher/catcher conflicts (same player for both in same inning)
  for (const [inning, pitcherId] of pitcherAssignments) {
    const catcherId = catcherAssignments.get(inning);
    if (catcherId === pitcherId) {
      errors.push(
        `Same player assigned as both pitcher and catcher in inning ${inning}.`
      );
    }
  }

  // Verify blocked positions don't make generation impossible
  // (e.g., if all players have position X blocked, that position can't be filled)

  return errors;
}
```

### Pattern 3: Validation as Structured Data
**What:** Validation returns an array of structured error objects (not just strings), each with a rule ID, severity, affected inning/player, and a coach-friendly message.
**When to use:** For real-time validation (VALD-01) and the validation panel (VALD-02).
**Why critical:** The reference app returns flat string arrays. Structured errors enable: (a) grouping by rule, (b) highlighting specific cells in the grid, (c) filtering by severity, and (d) coach-friendly messages that reference player names, not internal identifiers.
**Example:**
```typescript
// src/logic/lineup-validator.ts

export interface ValidationError {
  rule: ValidationRule;
  message: string;           // Coach-friendly: "Jake R sits on the bench in innings 2 and 3"
  inning?: number;           // Which inning is affected
  playerId?: string;         // Which player is affected
  position?: Position;       // Which position is affected
}

export type ValidationRule =
  | 'GRID_COMPLETE'          // All positions filled each inning
  | 'NO_DUPLICATES'          // No player in two positions same inning
  | 'PITCHER_MATCH'          // Pitcher matches pre-assignment
  | 'CATCHER_MATCH'          // Catcher matches pre-assignment
  | 'NO_CONSECUTIVE_BENCH'   // LINE-04
  | 'INFIELD_MINIMUM'        // LINE-05
  | 'NO_CONSECUTIVE_POSITION'// LINE-06
  | 'POSITION_BLOCK'         // LINE-07
  | 'ROSTER_VALID';          // All players are on active roster

export function validateLineup(
  lineup: Lineup,
  input: GenerateLineupInput
): ValidationError[] {
  return [
    ...validateGridComplete(lineup, input),
    ...validateNoDuplicates(lineup, input),
    ...validatePitcherAssignments(lineup, input),
    ...validateCatcherAssignments(lineup, input),
    ...validateNoConsecutiveBench(lineup, input),
    ...validateInfieldMinimum(lineup, input),
    ...validateNoConsecutivePosition(lineup, input),
    ...validatePositionBlocks(lineup, input),
  ];
}
```

### Pattern 4: Pitcher/Catcher Slot Generalization
**What:** The reference app hardcodes 3 slots mapped to specific inning ranges (1-2, 3-4, 5). The new app must support both 5 and 6 innings with a flexible slot system where the coach assigns a pitcher/catcher per individual inning.
**When to use:** For the pre-assignment UI and the generation algorithm.
**Why it matters:** With 6 innings, the 3-slot system (innings 1-2, 3-4, 5-6) still works. But per-inning assignment is simpler to implement and more flexible -- a coach might want the same pitcher for innings 1-3 and a different one for 4-6. Let the coach decide.
**Recommended approach:** Use `Map<number, string>` (inning number -> player ID) for both pitchers and catchers. The UI shows one dropdown per inning. A player can be assigned to consecutive innings (P/C are exempt from the no-consecutive-position rule). Pre-fill slots if the coach has already assigned (e.g., if pitcher for inning 1 is set, auto-fill inning 2 with the same pitcher unless changed).

### Pattern 5: Multiple Lineup Generation
**What:** Generate 3-5 valid lineups by running the solver multiple times with different random shuffles. Present all options to the coach who picks their preferred one.
**When to use:** LINE-08 requires this.
**Implementation:** Call `generateLineup()` in a loop. Each call shuffles the player order differently (the random seed varies naturally). Collect valid results up to the requested count. Set a total attempt ceiling (e.g., 1000 total attempts across all lineups) to prevent excessive computation. Display valid lineups as selectable cards.
**Example:**
```typescript
export function generateMultipleLineups(
  input: GenerateLineupInput,
  count: number = 3
): GenerateLineupResult[] {
  const results: GenerateLineupResult[] = [];
  const maxTotalAttempts = count * 300;
  let totalAttempts = 0;

  while (results.length < count && totalAttempts < maxTotalAttempts) {
    const result = generateLineup(input);
    totalAttempts += result.attemptCount;

    if (result.valid) {
      // Check this lineup is sufficiently different from existing ones
      const isDuplicate = results.some(r => lineupsEqual(r.lineup, result.lineup));
      if (!isDuplicate) {
        results.push(result);
      }
    }
  }

  return results;
}
```

### Anti-Patterns to Avoid
- **Mixing UI state with generation state:** Don't store intermediate solver state in React. The solver runs synchronously, returns a result, and React stores only the final lineup(s). The solver's internal retry loop, shuffles, and backtracking are invisible to React.
- **Validating only after generation:** Validate in real-time as the coach builds pre-assignments. If a coach assigns the same player as pitcher and catcher for the same inning, show the error immediately -- don't wait for them to click "Generate."
- **Hardcoding inning ranges for P/C slots:** The reference app maps slot 1 to innings 1-2, slot 2 to innings 3-4, slot 3 to inning 5. This doesn't generalize well to 6 innings. Use per-inning assignment instead.
- **Generating lineups that differ only in outfield rotation:** Two lineups that are identical except LF and RF are swapped feel like the same lineup to a coach. When generating multiples, check for meaningful difference (different bench patterns or different infield assignments).
- **Exposing algorithm internals in error messages:** "Attempt 147/200 failed constraint 4" is useless to a coach. Translate to: "Couldn't find a valid lineup with these settings. Try changing which innings your pitchers or catchers are assigned to."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full CSP solver | Academic constraint propagation engine | Retry-based random search with pre-validation | Problem space is tiny (max 12 players x 6 innings x 9 positions). A 200-attempt retry loop with good heuristics converges in <100ms. CSP overhead is not justified. |
| Unique ID generation | Custom sequential IDs | `crypto.randomUUID()` | Established pattern from Phase 1. Already used for player IDs. |
| State persistence | Custom file I/O | `useLocalStorage` hook from Phase 1 | Already built and tested. Lineup state, pre-assignments, and position blocks all persist via this hook. |
| Dropdown/select components | Custom dropdown with keyboard nav | Native `<select>` elements | The pre-assignment UI needs player dropdowns per inning. Native selects are accessible, mobile-friendly, and require zero CSS effort. |
| Responsive grid layout | CSS Flexbox hacks | CSS Grid (`display: grid`) | The lineup display is inherently a grid (innings x positions). CSS Grid handles this natively with `grid-template-columns` and `grid-template-rows`. |

**Key insight:** Phase 2's complexity is in the algorithm, not the UI framework. The algorithm is ~200 lines of pure TypeScript. The UI is straightforward dropdowns, grids, and validation messages. No new libraries are needed.

## Common Pitfalls

### Pitfall 1: Algorithm Hardcodes Inning Count
**What goes wrong:** The reference algorithm hardcodes `for (let inn = 1; inn <= 5; inn++)` and pitcher slot mappings `{1: innings[1,2], 2: innings[3,4], 3: innings[5]}`. Copying this directly means 6-inning games break.
**Why it happens:** The reference app was built for a specific team with 5-inning games.
**How to avoid:** Parameterize everything. The generation function receives `innings: number` and `pitcherAssignments: Map<number, string>`. Loops use `for (let inn = 1; inn <= innings; inn++)`. The P/C slot mapping is derived from the coach's per-inning assignments, not hardcoded.
**Warning signs:** Generation works for 5 innings but fails or produces invalid lineups for 6 innings.

### Pitfall 2: Infield Minimum Rule Misapplied with 6 Innings
**What goes wrong:** LINE-05 says "every player gets 2+ infield positions by end of inning 4." With 6 innings, the algorithm has more flexibility but might front-load outfield assignments in innings 1-4 and fail the constraint.
**Why it happens:** The reference algorithm counts infield positions through inning 4 specifically. This rule is about innings 1-4 regardless of total innings.
**How to avoid:** The infield minimum check always looks at innings 1 through 4 (hardcoded to 4, not to total innings). This is a fairness rule: by the midpoint of a 5-6 inning game, every kid has played infield at least twice. The generation algorithm must prioritize infield assignment in the first 4 innings.
**Warning signs:** Players with mostly outfield assignments in innings 1-4 despite having infield time in innings 5-6.

### Pitfall 3: Position Blocks Create Impossible Constraints
**What goes wrong:** A coach blocks 3B for 8 of 12 players. Only 4 players can play 3B, but with bench rotation, not all of them are available every inning. The algorithm retries 200 times and fails silently.
**Why it happens:** Position blocks reduce the available player pool per position. Aggressive blocking can make certain inning/position combinations impossible to fill.
**How to avoid:** Pre-validation must check that every position has enough eligible players for every inning after accounting for blocks, P/C assignments, and bench rotation. When blocks make generation impossible, report specifically: "Not enough players eligible for 3B. Consider removing some 3B blocks."
**Warning signs:** Generation fails only when position blocks are applied; works fine without them.

### Pitfall 4: Bench Rotation Math with 10 Players
**What goes wrong:** With 10 players and 9 positions, exactly 1 player sits each inning. Over 5 innings, that's 5 bench slots for 10 players -- every other player must sit exactly once, but one player must sit twice OR one sits zero times (if total innings is odd relative to roster size). The "no consecutive bench" rule is satisfiable, but the algorithm may struggle to find solutions because the constraint space is tight.
**Why it happens:** 10 players is the tightest roster size -- only 1 bench slot per inning gives almost no flexibility.
**How to avoid:** Pre-validate roster size. For 10 players: warn the coach that bench rotation is very tight. For 9 players: no one sits (no bench issue). For 11+: comfortable rotation. For <9: generation is impossible (not enough players). The algorithm should handle 10-player rosters by explicitly scheduling bench assignments first (deciding who sits each inning), then filling positions.
**Warning signs:** 10-player rosters take significantly more attempts or time-out entirely.

### Pitfall 5: Pre-Assignment UI Allows Invalid Combinations
**What goes wrong:** Coach assigns the same player as pitcher in inning 1 AND inning 3. The algorithm runs, but now that player pitches innings 1 and 3, which means they must play something else in inning 2. This is fine for the algorithm but confusing if the coach didn't intend it.
**Why it happens:** Per-inning assignment gives maximum flexibility but also maximum opportunity for mistakes.
**How to avoid:** Real-time validation on the pre-assignment UI itself. Flag when: (a) same player is pitcher AND catcher in the same inning, (b) an absent player is assigned to pitch/catch, (c) a player is assigned to a position they have blocked. Show warnings immediately in the pre-assignment section, not just after generation.
**Warning signs:** Coach assigns conflicting pre-assignments and only discovers the problem after clicking "Generate."

### Pitfall 6: Coach-Unfriendly Error Messages
**What goes wrong:** Validation errors say things like "Player 3a7f2... violates constraint NO_CONSECUTIVE_POSITION at inning 4" instead of "Jake R plays shortstop in both innings 3 and 4. Players shouldn't play the same position two innings in a row."
**Why it happens:** Developers write errors for themselves, using IDs and constraint names.
**How to avoid:** The validation system resolves player IDs to names when generating error messages. Use a template approach: `"${playerName} sits on the bench in innings ${inn1} and ${inn2}. Every player should get to play each inning."` Messages should explain the rule, not just state the violation. Use VALD-02's requirement: "plain-language, coach-friendly."
**Warning signs:** Error messages contain UUIDs, camelCase constraint names, or technical jargon.

### Pitfall 7: Lineup State Lost When Switching Tabs
**What goes wrong:** Coach configures pre-assignments on the Lineup tab, switches to Game Setup to check attendance, switches back, and all pre-assignments are gone.
**Why it happens:** Conditional tab rendering (the pattern used in Phase 1) destroys and recreates components on tab switch. Component state is lost.
**How to avoid:** All lineup-related state (pre-assignments, position blocks, generated lineups) must be stored in localStorage via `useLocalStorage`, not in component-local `useState`. This is the same pattern used for roster and game config in Phase 1. When the Lineup tab mounts, it reads persisted state.
**Warning signs:** Pre-assignments or generated lineups disappear after tab switching.

## Code Examples

### Type Definitions for Lineup

```typescript
// src/types/index.ts (extensions)

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export const POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
export const INFIELD_POSITIONS: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS'];
export const NON_BATTERY_INFIELD: Position[] = ['1B', '2B', '3B', 'SS'];
export const OUTFIELD_POSITIONS: Position[] = ['LF', 'CF', 'RF'];

// A single inning's assignments: position -> playerId
export type InningAssignment = Record<Position, string>;

// Full lineup: inning number (1-based) -> assignments
// e.g., lineup[1] = { P: 'uuid-1', C: 'uuid-2', '1B': 'uuid-3', ... }
export type Lineup = Record<number, InningAssignment>;

// Pre-assignments for pitcher/catcher
export type BatteryAssignments = Record<number, string>;  // inning -> playerId

// Position blocks: playerId -> set of blocked positions
export type PositionBlocks = Record<string, Position[]>;

// Lineup generation state stored in localStorage
export interface LineupState {
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  positionBlocks: PositionBlocks;
  generatedLineups: Lineup[];
  selectedLineupIndex: number | null;
}
```

### Core Generation Algorithm Structure

```typescript
// src/logic/lineup-generator.ts
// Adapted from reference: C:\repos\baseball-coach\src\App.tsx lines 219-483

import type { Player, Position, Lineup, InningAssignment } from '../types';
import { POSITIONS, INFIELD_POSITIONS, NON_BATTERY_INFIELD, OUTFIELD_POSITIONS } from '../types';
import type { GenerateLineupInput, GenerateLineupResult } from './lineup-types';
import { validateLineup } from './lineup-validator';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateLineup(input: GenerateLineupInput): GenerateLineupResult {
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledPlayers = shuffle(input.presentPlayers);
    const lineup = attemptBuild(shuffledPlayers, input);

    if (lineup) {
      const errors = validateLineup(lineup, input);
      if (errors.length === 0) {
        return { lineup, valid: true, errors: [], attemptCount: attempt + 1 };
      }
    }
  }

  // Return best-effort with validation errors
  return {
    lineup: {} as Lineup,
    valid: false,
    errors: [{ rule: 'GENERATION_FAILED', message: 'Could not generate a valid lineup with these settings. Try adjusting pitcher/catcher assignments or position blocks.' }],
    attemptCount: maxAttempts,
  };
}

function attemptBuild(
  shuffledPlayers: Player[],
  input: GenerateLineupInput
): Lineup | null {
  const { innings, pitcherAssignments, catcherAssignments, positionBlocks } = input;
  const lineup: Lineup = {};

  // Phase 1: Pre-compute pitcher/catcher per inning
  // Phase 2: Calculate infield needs (2+ by inning 4)
  // Phase 3: Pre-assign infield slots for innings 1-4
  // Phase 4: Fill remaining positions inning by inning
  //   - Assign P/C from pre-assignments
  //   - Fill infield from pre-computed slots
  //   - Fill remaining infield positions (respecting blocks + no-consecutive)
  //   - Fill outfield (prioritizing players who sat last inning)
  // Phase 5: Verify no-consecutive-bench constraint

  // Return null if any phase fails (triggers retry)
  return lineup;
}
```

### Validation System Structure

```typescript
// src/logic/lineup-validator.ts

import type { Player, Lineup, Position } from '../types';
import { POSITIONS, INFIELD_POSITIONS } from '../types';
import type { GenerateLineupInput, ValidationError, ValidationRule } from './lineup-types';

export function validateLineup(
  lineup: Lineup,
  input: GenerateLineupInput
): ValidationError[] {
  return [
    ...validateGridComplete(lineup, input),
    ...validateNoDuplicates(lineup, input),
    ...validatePitcherAssignments(lineup, input),
    ...validateCatcherAssignments(lineup, input),
    ...validateNoConsecutiveBench(lineup, input),
    ...validateInfieldMinimum(lineup, input),
    ...validateNoConsecutivePosition(lineup, input),
    ...validatePositionBlocks(lineup, input),
  ];
}

// Example: coach-friendly consecutive bench message
function validateNoConsecutiveBench(
  lineup: Lineup,
  input: GenerateLineupInput
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { presentPlayers, innings } = input;

  for (const player of presentPlayers) {
    let consecutiveBench = 0;
    for (let inn = 1; inn <= innings; inn++) {
      const isPlaying = POSITIONS.some(pos => lineup[inn]?.[pos] === player.id);
      if (!isPlaying) {
        consecutiveBench++;
        if (consecutiveBench > 1) {
          errors.push({
            rule: 'NO_CONSECUTIVE_BENCH',
            message: `${player.name} sits out innings ${inn - 1} and ${inn} in a row. Every player should get to play each inning.`,
            inning: inn,
            playerId: player.id,
          });
        }
      } else {
        consecutiveBench = 0;
      }
    }
  }

  return errors;
}

// Example: coach-friendly infield minimum message
function validateInfieldMinimum(
  lineup: Lineup,
  input: GenerateLineupInput
): ValidationError[] {
  const errors: ValidationError[] = [];
  const maxCheckInning = Math.min(4, input.innings);

  for (const player of input.presentPlayers) {
    let infieldCount = 0;
    for (let inn = 1; inn <= maxCheckInning; inn++) {
      const isInfield = INFIELD_POSITIONS.some(
        pos => lineup[inn]?.[pos] === player.id
      );
      if (isInfield) infieldCount++;
    }

    if (infieldCount < 2) {
      errors.push({
        rule: 'INFIELD_MINIMUM',
        message: `${player.name} only has ${infieldCount} infield position${infieldCount === 1 ? '' : 's'} in the first 4 innings. Every player needs at least 2.`,
        playerId: player.id,
      });
    }
  }

  return errors;
}
```

### useLineup Hook

```typescript
// src/hooks/useLineup.ts

import { useLocalStorage } from './useLocalStorage';
import { useRoster } from './useRoster';
import { useGameConfig } from './useGameConfig';
import type { LineupState, Lineup, BatteryAssignments, PositionBlocks } from '../types';
import { generateMultipleLineups, preValidate } from '../logic/lineup-generator';
import { validateLineup } from '../logic/lineup-validator';

const defaultState: LineupState = {
  pitcherAssignments: {},
  catcherAssignments: {},
  positionBlocks: {},
  generatedLineups: [],
  selectedLineupIndex: null,
};

export function useLineup() {
  const [state, setState] = useLocalStorage<LineupState>('lineupState', defaultState);
  const { players } = useRoster();
  const { config } = useGameConfig();

  const presentPlayers = players.filter(p => p.isPresent);

  const setPitcher = (inning: number, playerId: string) => {
    setState(prev => ({
      ...prev,
      pitcherAssignments: { ...prev.pitcherAssignments, [inning]: playerId },
    }));
  };

  const setCatcher = (inning: number, playerId: string) => {
    setState(prev => ({
      ...prev,
      catcherAssignments: { ...prev.catcherAssignments, [inning]: playerId },
    }));
  };

  const setPositionBlock = (playerId: string, positions: Position[]) => {
    setState(prev => ({
      ...prev,
      positionBlocks: { ...prev.positionBlocks, [playerId]: positions },
    }));
  };

  const generate = () => {
    const input = {
      presentPlayers,
      innings: config.innings,
      pitcherAssignments: new Map(Object.entries(state.pitcherAssignments).map(
        ([k, v]) => [Number(k), v]
      )),
      catcherAssignments: new Map(Object.entries(state.catcherAssignments).map(
        ([k, v]) => [Number(k), v]
      )),
      positionBlocks: new Map(Object.entries(state.positionBlocks).map(
        ([k, v]) => [k, new Set(v)]
      )),
    };

    const preErrors = preValidate(input);
    if (preErrors.length > 0) {
      return { success: false, errors: preErrors };
    }

    const results = generateMultipleLineups(input, 3);
    const validLineups = results.filter(r => r.valid).map(r => r.lineup);

    setState(prev => ({
      ...prev,
      generatedLineups: validLineups,
      selectedLineupIndex: validLineups.length > 0 ? 0 : null,
    }));

    return {
      success: validLineups.length > 0,
      count: validLineups.length,
      errors: validLineups.length === 0
        ? ['Could not generate any valid lineups. Try adjusting your settings.']
        : [],
    };
  };

  const selectLineup = (index: number) => {
    setState(prev => ({ ...prev, selectedLineupIndex: index }));
  };

  return {
    ...state,
    presentPlayers,
    innings: config.innings,
    setPitcher,
    setCatcher,
    setPositionBlock,
    generate,
    selectLineup,
  };
}
```

### Pre-Assignment UI Pattern

```typescript
// src/components/lineup/PreAssignments.tsx

interface PreAssignmentsProps {
  innings: number;
  presentPlayers: Player[];
  pitcherAssignments: BatteryAssignments;
  catcherAssignments: BatteryAssignments;
  onPitcherChange: (inning: number, playerId: string) => void;
  onCatcherChange: (inning: number, playerId: string) => void;
}

function PreAssignments({
  innings,
  presentPlayers,
  pitcherAssignments,
  catcherAssignments,
  onPitcherChange,
  onCatcherChange,
}: PreAssignmentsProps) {
  return (
    <div className={styles.preAssignments}>
      <h3 className={styles.sectionTitle}>Pitchers & Catchers</h3>
      <p className={styles.hint}>
        Assign who pitches and catches each inning. Leave blank to let the generator decide.
      </p>
      <div className={styles.grid}>
        {Array.from({ length: innings }, (_, i) => i + 1).map(inning => (
          <div key={inning} className={styles.inningRow}>
            <span className={styles.inningLabel}>Inning {inning}</span>
            <label className={styles.selectLabel}>
              P:
              <select
                value={pitcherAssignments[inning] ?? ''}
                onChange={e => onPitcherChange(inning, e.target.value)}
                className={styles.playerSelect}
              >
                <option value="">--</option>
                {presentPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.selectLabel}>
              C:
              <select
                value={catcherAssignments[inning] ?? ''}
                onChange={e => onCatcherChange(inning, e.target.value)}
                className={styles.playerSelect}
              >
                <option value="">--</option>
                {presentPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Lineup Grid Display

```typescript
// src/components/lineup/LineupGrid.tsx

interface LineupGridProps {
  lineup: Lineup;
  innings: number;
  players: Player[];
  errors: ValidationError[];
}

function LineupGrid({ lineup, innings, players, errors }: LineupGridProps) {
  const getPlayerName = (playerId: string): string => {
    return players.find(p => p.id === playerId)?.name ?? '';
  };

  const hasError = (inning: number, position: Position): boolean => {
    return errors.some(e => e.inning === inning && e.position === position);
  };

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `auto repeat(${innings}, 1fr)`,
      }}
    >
      {/* Header row: inning numbers */}
      <div className={styles.cornerCell} />
      {Array.from({ length: innings }, (_, i) => (
        <div key={i + 1} className={styles.headerCell}>
          Inn {i + 1}
        </div>
      ))}

      {/* Position rows */}
      {POSITIONS.map(pos => (
        <React.Fragment key={pos}>
          <div className={styles.positionLabel}>{pos}</div>
          {Array.from({ length: innings }, (_, i) => {
            const inning = i + 1;
            const playerId = lineup[inning]?.[pos] ?? '';
            return (
              <div
                key={`${pos}-${inning}`}
                className={`${styles.cell} ${hasError(inning, pos) ? styles.errorCell : ''}`}
              >
                {getPlayerName(playerId)}
              </div>
            );
          })}
        </React.Fragment>
      ))}

      {/* Bench row */}
      <div className={styles.positionLabel}>Bench</div>
      {Array.from({ length: innings }, (_, i) => {
        const inning = i + 1;
        const assignedIds = new Set(POSITIONS.map(pos => lineup[inning]?.[pos]).filter(Boolean));
        const benchPlayers = players
          .filter(p => p.isPresent && !assignedIds.has(p.id))
          .map(p => p.name);
        return (
          <div key={`bench-${inning}`} className={styles.benchCell}>
            {benchPlayers.join(', ')}
          </div>
        );
      })}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All logic in single component (reference app) | Pure functions in `src/logic/` + hooks for state | Phase 2 (new) | Testable algorithm, maintainable code, reusable validation |
| Hardcoded 5 innings, 3 P/C slots | Configurable innings, per-inning P/C assignment | Phase 2 (new) | Supports both 5 and 6 inning games |
| Single lineup generation | Multiple lineup generation (3-5 options) | Phase 2 (new) | Coach can choose preferred lineup |
| No position blocking | Position blocking per player | Phase 2 (new) | Coaches can prevent specific player/position combos |
| String-based player references | UUID-based player references | Phase 1 (already done) | Stable references across renames |
| Flat error string arrays | Structured ValidationError objects | Phase 2 (new) | Enables per-cell highlighting, grouped display, coach-friendly messages |

**Deprecated/outdated from reference app:**
- Using player names as keys (now uses UUIDs)
- `eslint-disable no-loop-func` workarounds (extract to pure functions instead)
- Console.log-based debugging (use structured error returns)
- Inline styles (use CSS Modules, per Phase 1 decision)

## Open Questions

1. **Should pre-assignments be required or optional?**
   - What we know: LINE-01 and LINE-02 say "user CAN pre-assign" -- they're optional. The reference app requires them (3 slots must be filled). The new app should make P/C assignment optional for maximum flexibility.
   - What's unclear: If no pitcher is assigned for an inning, should the algorithm pick one randomly? Or should P/C always be required?
   - Recommendation: Make P/C assignments optional. If not set for an inning, the algorithm assigns from the available player pool. This is more flexible and simpler for the coach. Show a hint: "Leave blank to let the generator choose."

2. **How to handle the transition from disabled to enabled Lineup tab?**
   - What we know: Phase 1 shows the Lineup tab as disabled. Phase 2 enables it. The tab should become active when roster has enough players (9+).
   - What's unclear: Should it require present players specifically, or just total roster size?
   - Recommendation: Enable the Lineup tab when there are 9+ present players (checked via `useRoster().presentCount >= 9`). Show a helpful message on the Lineup page if fewer than 9 are present.

3. **Position block UI: per-player modal or inline checkboxes?**
   - What we know: LINE-07 says "user can block specific positions for specific players." The UI needs to be simple for a coach.
   - What's unclear: Best interaction pattern. Modal per player? Inline checkboxes? A table?
   - Recommendation: Use a collapsible section on the Lineup page. Show each present player's name with a row of small toggleable position chips (P, C, 1B, etc.). Tapping a chip toggles the block. Red/crossed-out means blocked. This is compact, visible, and doesn't require navigation away from the page.

4. **How many lineups to show, and how to present them?**
   - What we know: LINE-08 says "3-5 valid lineups." The coach picks one.
   - What's unclear: UI layout for comparing multiple lineups.
   - Recommendation: Generate 3 by default (adjustable up to 5). Show as horizontally scrollable cards, each showing a compact lineup grid. The selected card expands to full size. Each card shows a "differences" badge (e.g., "Option 2: Alex B catches inning 3-4 instead of Jake R"). Keep it simple.

5. **Should the algorithm reference the existing code directly or be rewritten?**
   - What we know: PROJECT.md says "Lineup generation logic from `C:\repos\baseball-coach` should be adapted, not rewritten from scratch."
   - Recommendation: Adapt the reference algorithm's strategy (retry-based, priority-based infield assignment, outfield fill with bench preference) but rewrite the implementation for cleanliness. The reference code has `eslint-disable` comments, uses names instead of IDs, hardcodes values, and mixes UI logic. The strategy is proven; the code needs to be rewritten as clean, typed, pure functions.

## Sources

### Primary (HIGH confidence)
- `C:\repos\baseball-coach\src\App.tsx` (lines 219-483) -- Reference lineup generation algorithm (proven with real usage)
- `C:\repos\baseball-coach-helper\src\types\index.ts` -- Existing type definitions
- `C:\repos\baseball-coach-helper\src\hooks/useLocalStorage.ts` -- Existing persistence pattern
- `.planning/research/ARCHITECTURE.md` -- Project-level architecture decisions
- `.planning/research/PITFALLS.md` -- Pre-identified pitfalls for lineup generation
- [React useMemo documentation](https://react.dev/reference/react/useMemo) -- Memoization patterns for validation
- [MDN: crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) -- UUID generation

### Secondary (MEDIUM confidence)
- [Constraint Satisfaction Problems - Baeldung](https://www.baeldung.com/cs/csp) -- CSP theory and backtracking approaches
- [GeeksforGeeks - CSP in AI](https://www.geeksforgeeks.org/artificial-intelligence/constraint-satisfaction-problems-csp-in-artificial-intelligence/) -- CSP solving techniques
- [Coach Joel's Way - Fair Play Algorithm](https://www.coachjoelsway.com/auto-generated-fair-play-defensive-lineups) -- Industry approach to fair lineup generation
- [Free Baseball Lineups](https://freebaseballlineups.com/lineups.html) -- Competitor constraint handling
- [Smashing Magazine - Web Workers in React](https://www.smashingmagazine.com/2020/10/tasks-react-app-web-workers/) -- Web Worker patterns (concluded not needed for this problem size)

### Tertiary (LOW confidence)
- None -- all claims verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies. All built on Phase 1's established React 19 + TypeScript + Vite + CSS Modules stack.
- Architecture: HIGH -- Logic separation pattern verified via project ARCHITECTURE.md. Pure function approach validated by reference app's complexity issues (700-line monolithic component).
- Algorithm approach: HIGH -- Reference algorithm is proven with real usage. Retry-based approach is standard for small CSP problems. Pre-validation and parameterization are straightforward extensions.
- Pitfalls: HIGH -- Documented from direct analysis of reference code limitations, roster size math, and Phase 1 patterns. Infield rule behavior verified against reference implementation.
- UI patterns: MEDIUM -- Pre-assignment and position blocking UI recommendations are based on coaching tool conventions (GameTime Lineups, Coach Joel's Way) and established React patterns. Specific layout decisions may need adjustment during implementation.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable technologies, algorithm domain is evergreen)
