# Architecture Research

**Domain:** Little League Lineup Builder (Client-Side Web App)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     UI/Presentation Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Roster  │  │  Lineup  │  │ Dugout   │  │ Battery  │    │
│  │   View   │  │   Grid   │  │   Card   │  │  Config  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
├───────┴─────────────┴─────────────┴─────────────┴───────────┤
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Lineup Generation Engine                    │    │
│  │  (Constraint solver with retry mechanism)           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Validation System                           │    │
│  │  (6-step validation rules)                          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Batting Order Generator                     │    │
│  │  (Rotation logic)                                   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                      State Management Layer                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Roster  │  │  Lineup  │  │ Battery  │  │  Prefs   │    │
│  │  State   │  │  State   │  │  Config  │  │(storage) │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Roster View** | Player selection (active/inactive), display infield counts | React component with checkboxes, reads from roster state |
| **Lineup Grid** | Display/edit 5 innings x 9 positions, show validation errors | React component with dropdowns/inputs per inning/position |
| **Battery Config** | Pitcher/catcher slot assignments (3 slots each) | React component with dropdown selectors |
| **Dugout Card** | Print-friendly single-page layout | React component with print-specific CSS (@media print) |
| **Lineup Engine** | Constraint-based auto-generation with retry logic | Pure function (no UI), takes roster/battery config, returns lineup |
| **Validation System** | 6-step validation (grid check, battery, infield count, consecutive positions, bench rotation) | Pure functions returning error arrays |
| **Batting Order Generator** | Creates continuous batting rotation from roster | Pure function with fairness constraints |
| **Roster State** | Manages active players list | React state or lightweight store (Zustand/Jotai) + localStorage persistence |
| **Lineup State** | Manages 5x9 grid of player assignments | React state (object keyed by inning/position) |
| **Battery Config** | Manages pitcher/catcher slot assignments | React state (3 slots each) |
| **Prefs Storage** | Persists roster names to localStorage | Custom hook wrapping localStorage API |

## Recommended Project Structure

```
src/
├── components/           # Presentational components
│   ├── roster/
│   │   ├── RosterSelector.tsx
│   │   └── PlayerCheckbox.tsx
│   ├── lineup/
│   │   ├── LineupGrid.tsx
│   │   ├── InningBlock.tsx
│   │   └── PositionInput.tsx
│   ├── battery/
│   │   ├── BatteryConfig.tsx
│   │   └── SlotSelector.tsx
│   ├── dugout/
│   │   ├── DugoutCard.tsx
│   │   └── DugoutCard.print.css
│   ├── validation/
│   │   └── ValidationSummary.tsx
│   └── batting/
│       └── BattingOrderView.tsx
├── logic/                # Business logic (pure functions)
│   ├── lineup-generator.ts
│   ├── validation.ts
│   ├── batting-order.ts
│   └── constraints.ts
├── state/                # State management
│   ├── useRoster.ts
│   ├── useLineup.ts
│   ├── useBattery.ts
│   └── useLocalStorage.ts
├── types/                # TypeScript types
│   └── index.ts
└── App.tsx               # Root component (composition)
```

### Structure Rationale

- **components/**: Feature-organized (roster, lineup, battery, dugout). Each feature owns its UI components. Makes it easy to find related components.
- **logic/**: Pure functions separated from UI. Enables unit testing without React. The lineup generator (200+ lines) is completely isolated.
- **state/**: Custom hooks encapsulate state management. Makes localStorage persistence transparent. Follows 2026 pattern of "hooks for shared logic."
- **types/**: Centralized TypeScript definitions for Roster, Lineup, Position, etc.

## Architectural Patterns

### Pattern 1: Container/Presentational Separation

**What:** Separate components that manage state/logic (containers) from components that render UI (presentational).

**When to use:** For the lineup grid and roster selector where state management is complex but UI rendering is straightforward.

**Trade-offs:**
- Pros: Enhances reusability, simplifies testing, clear separation of concerns
- Cons: More files to manage, can feel like boilerplate for simple components

**Example:**
```typescript
// Container component (manages state)
function LineupContainer() {
  const { lineup, updatePosition } = useLineup();
  const { activePlayers } = useRoster();

  return (
    <LineupGrid
      lineup={lineup}
      players={activePlayers}
      onChange={updatePosition}
    />
  );
}

// Presentational component (just renders)
function LineupGrid({ lineup, players, onChange }) {
  return (
    <div className="lineup-grid">
      {innings.map(inn => (
        <InningBlock
          key={inn}
          inning={inn}
          lineup={lineup[inn]}
          players={players}
          onChange={(pos, player) => onChange(inn, pos, player)}
        />
      ))}
    </div>
  );
}
```

### Pattern 2: Custom Hooks for Shared Logic

**What:** Encapsulate reusable state logic into custom hooks (useRoster, useLineup, useLocalStorage).

**When to use:** When multiple components need access to the same state or when state has complex update logic.

**Trade-offs:**
- Pros: Single source of truth, easy to test, follows React best practices
- Cons: Can become complex if hook dependencies aren't carefully managed

**Example:**
```typescript
// Custom hook with localStorage persistence
function useRoster() {
  const [fullRoster, setFullRoster] = useLocalStorage<string[]>('roster', []);
  const [activePlayers, setActivePlayers] = useState<string[]>(fullRoster);

  const togglePlayer = (player: string) => {
    setActivePlayers(prev =>
      prev.includes(player)
        ? prev.filter(p => p !== player)
        : [...prev, player]
    );
  };

  return { fullRoster, activePlayers, togglePlayer, setFullRoster };
}

// Custom hook for localStorage (with SSR-safe initialization)
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### Pattern 3: Pure Business Logic Functions

**What:** Separate constraint-solving and validation logic into pure functions outside React components.

**When to use:** For complex algorithms (lineup generator, validation) that don't need React's lifecycle.

**Trade-offs:**
- Pros: Testable without React, reusable across contexts, easier to debug
- Cons: Requires careful interface design to avoid tight coupling

**Example:**
```typescript
// Pure function (no React, no side effects)
export function autoGenerateLineup(
  activePlayers: string[],
  pitchers: { [slot: number]: string },
  catchers: { [slot: number]: string }
): { lineup: Lineup; success: boolean } {
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lineup = attemptLineupGeneration(activePlayers, pitchers, catchers);
    const errors = validateLineup(lineup, activePlayers, pitchers, catchers);

    if (errors.length === 0) {
      return { lineup, success: true };
    }
  }

  return { lineup: {}, success: false };
}

// Can be tested without React:
test('generates valid lineup for 11 players', () => {
  const result = autoGenerateLineup(players, pitchers, catchers);
  expect(result.success).toBe(true);
  expect(validateLineup(result.lineup)).toHaveLength(0);
});
```

### Pattern 4: Validation as Data

**What:** Return validation errors as structured data (arrays of error messages) rather than throwing exceptions or setting flags.

**When to use:** For multi-step validation where you want to show all errors at once, not just the first failure.

**Trade-offs:**
- Pros: Users see all issues, easier to debug, validation logic is pure
- Cons: Requires UI to handle error display consistently

**Example:**
```typescript
type ValidationResult = { step: string; errors: string[] };

function getAllValidationResults(
  lineup: Lineup,
  activePlayers: string[],
  pitchers: BatteryConfig,
  catchers: BatteryConfig
): ValidationResult[] {
  return [
    { step: 'Position Grid Check', errors: validatePositionGrid(lineup, activePlayers) },
    { step: 'Pitching Requirements', errors: validatePitchers(lineup, pitchers) },
    { step: 'Catching Requirements', errors: validateCatchers(lineup, catchers) },
    { step: 'Infield Position Count', errors: validateInfieldCounts(lineup, activePlayers) },
    { step: 'Consecutive Position Rule', errors: validateConsecutivePositions(lineup, activePlayers) },
    { step: 'Bench Rotation', errors: validateBenchRotation(lineup, activePlayers) },
  ];
}

// UI can show all errors grouped by step:
{validationResults.map(res => (
  <div key={res.step}>
    <h3>{res.step}</h3>
    {res.errors.map(err => <li>{err}</li>)}
  </div>
))}
```

### Pattern 5: Component-Scoped Print Styles

**What:** Use `@media print` styles scoped to print-specific components rather than global print stylesheets.

**When to use:** For components like DugoutCard that need different layouts when printed vs displayed on screen.

**Trade-offs:**
- Pros: Styles stay with component, easier to maintain, no global print stylesheet conflicts
- Cons: May duplicate some print rules if multiple components print

**Example:**
```typescript
// DugoutCard.tsx
import './DugoutCard.print.css';

function DugoutCard({ lineup, battingOrder }) {
  return (
    <div className="dugout-card">
      {/* Screen layout */}
      <div className="screen-only">
        <button onClick={window.print}>Print</button>
      </div>

      {/* Print layout */}
      <div className="print-content">
        <h1>Game Day Lineup</h1>
        {/* Single-page layout optimized for printing */}
      </div>
    </div>
  );
}

// DugoutCard.print.css
@media print {
  .screen-only {
    display: none;
  }

  .print-content {
    /* Single-page layout */
    page-break-inside: avoid;
    font-size: 12pt;
  }

  .dugout-card {
    padding: 0.5in;
    width: 100%;
  }
}
```

## Data Flow

### State Flow (Top-Down)

```
User Action (toggle player, select pitcher, click auto-generate)
    ↓
Custom Hook (useRoster, useBattery, useLineup)
    ↓
State Update (setState)
    ↓
Component Re-render (React diffing)
    ↓
localStorage Persistence (useEffect)
```

### Lineup Generation Flow

```
[Auto-Generate Button Click]
    ↓
Read Current State (activePlayers, pitchers, catchers)
    ↓
Call Pure Function (autoGenerateLineup)
    ↓ (iterative retry loop, max 200 attempts)
[Lineup Engine] → [Constraint Solver] → [Validation]
    ↓
Return Result ({ lineup, success })
    ↓
Update State (setLineup)
    ↓
Component Re-render (shows new lineup + validation)
```

### Validation Flow

```
[State Change] (lineup, roster, or battery config)
    ↓
Trigger Validation (getAllValidationResults)
    ↓
Run 6 Validation Steps (each returns string[])
    ↓
Aggregate Results (ValidationResult[])
    ↓
Render Validation Summary (grouped by step)
```

### Key Data Flows

1. **Roster Management:** User toggles checkbox → useRoster updates activePlayers → localStorage persists → Lineup grid shows updated player list
2. **Lineup Auto-Generation:** User clicks button → Engine runs constraint solver with retry → Returns valid lineup → State updates → Grid shows positions
3. **Validation:** Any state change → All 6 validation steps run → Errors collected → ValidationSummary displays grouped errors
4. **Print:** User clicks print button → Browser shows print preview → Component-scoped @media print styles apply → Single-page dugout card renders

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 coaches | Current architecture is perfect. Single-page app with localStorage. No backend needed. |
| 100-1K coaches | Consider adding optional cloud sync (Firebase, Supabase) for multi-device access. Still client-side first. |
| 1K-10K coaches | Add analytics (PostHog, Plausible) to understand usage patterns. Consider PWA for offline capability. |
| 10K+ coaches | Consider multiplayer features (share lineups with assistant coaches). May need lightweight backend (Supabase, Firebase). |

### Scaling Priorities

1. **First bottleneck:** localStorage limits (5-10MB per domain). Fix: Compress data or migrate old lineups to cloud storage.
2. **Second bottleneck:** Lineup generation performance (200 attempts can take 1-2 seconds). Fix: Web Worker for background generation + loading spinner.

## Anti-Patterns

### Anti-Pattern 1: Giant Monolithic Component

**What people do:** Put all logic in App.tsx (roster, lineup, battery, validation, generation) like the existing baseball-coach app (700 lines in one file).

**Why it's wrong:** Impossible to test individual pieces, hard to reason about data flow, can't reuse components, merge conflicts in team settings.

**Do this instead:** Separate into components/ (UI), logic/ (pure functions), and state/ (custom hooks). Each file has one clear responsibility.

### Anti-Pattern 2: Mixing UI and Business Logic

**What people do:** Put constraint-solving logic directly in component render functions or event handlers.

**Why it's wrong:** Can't unit test without React, can't reuse logic, makes components slow, hard to debug algorithm issues.

**Do this instead:** Extract to pure functions in logic/ directory. Pass inputs, return outputs. Test without React.

### Anti-Pattern 3: Prop Drilling Through Multiple Levels

**What people do:** Pass `lineup`, `activePlayers`, `pitchers`, `catchers` down through 4-5 component levels to reach leaf components.

**Why it's wrong:** Intermediate components become tightly coupled, refactoring is painful, components can't be reused in different contexts.

**Do this instead:** Use custom hooks (useRoster, useLineup) in leaf components directly. Avoid intermediate prop passing.

### Anti-Pattern 4: Synchronous localStorage Writes on Every Keystroke

**What people do:** Write to localStorage on every state change, including rapid changes like typing in an input.

**Why it's wrong:** localStorage is synchronous and can block the UI thread. Causes input lag and poor performance.

**Do this instead:** Debounce localStorage writes (wait 500ms after last change) or batch updates in useEffect with dependency array.

### Anti-Pattern 5: Printing by Hiding UI Elements

**What people do:** Hide screen-only elements (buttons, nav) with CSS and hope the rest prints well.

**Why it's wrong:** Screen layout rarely works on printed page (page breaks in wrong places, margins off, fonts too small).

**Do this instead:** Create dedicated DugoutCard component with print-specific layout. Use @media print to control page breaks, margins, font sizes for optimal single-page printing.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| localStorage | Custom hook (useLocalStorage) | 5-10MB limit, synchronous API, JSON serialization |
| Browser Print API | window.print() | Triggered by button, uses @media print CSS |
| Clipboard API | navigator.clipboard.writeText() | For "export lineup" feature |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ State | Custom hooks (useRoster, useLineup, useBattery) | Unidirectional data flow |
| State ↔ Logic | Function calls with plain objects | Logic layer is pure (no React) |
| State ↔ localStorage | useEffect hook in useLocalStorage | Automatic persistence |
| Components ↔ Components | Props (when parent/child) or hooks (when siblings) | Avoid prop drilling |

## Build Order Implications

### Phase 1: Core Foundation
**Build first:** Type definitions, localStorage hook, roster state management
**Why:** Everything depends on these. Get state management right from the start.
**Dependencies:** None

### Phase 2: Basic UI
**Build second:** Roster selector, basic lineup grid (read-only)
**Why:** Need to see data before you can edit it.
**Dependencies:** Phase 1 (state hooks)

### Phase 3: Battery Configuration
**Build third:** Pitcher/catcher slot selectors, battery state
**Why:** Required input for lineup generator.
**Dependencies:** Phase 1 (state), Phase 2 (UI patterns established)

### Phase 4: Validation System
**Build fourth:** 6-step validation logic (pure functions) + ValidationSummary component
**Why:** Needed before lineup generator (validates output) and manual editing (validates input).
**Dependencies:** Phase 1 (types), Phase 2 (lineup structure)

### Phase 5: Lineup Generator
**Build fifth:** Constraint-based auto-generation engine with retry mechanism
**Why:** Most complex component, depends on validation to verify output.
**Dependencies:** Phase 1 (state), Phase 3 (battery config), Phase 4 (validation)

### Phase 6: Manual Editing
**Build sixth:** Editable lineup grid with dropdowns/inputs
**Why:** Alternative to auto-generation, uses same validation system.
**Dependencies:** Phase 4 (validation), Phase 2 (grid UI)

### Phase 7: Batting Order
**Build seventh:** Batting order generator + display component
**Why:** Independent feature, can be built in parallel after core lineup works.
**Dependencies:** Phase 1 (roster state)

### Phase 8: Print View
**Build eighth:** DugoutCard component with print-optimized layout
**Why:** Consumes all other features (roster, lineup, batting order).
**Dependencies:** Phase 5 (lineup), Phase 7 (batting order)

## Sources

**React Architecture (2026):**
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/) - Current best practices for React architecture
- [React Architecture Patterns and Best Practices for 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices) - Overview of modern patterns
- [Building Scalable Systems with React Architecture | Feature-Sliced Design](https://feature-sliced.design/blog/scalable-react-architecture) - Component architecture methodology

**State Management & localStorage:**
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Hybrid approach recommendations
- [18 Best React State Management Libraries in 2026](https://fe-tool.com/awesome-react-state-management) - Zustand, Jotai, Redux Toolkit comparison
- [Persisting React State in localStorage • Josh W. Comeau](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) - localStorage patterns

**Form & Validation Architecture:**
- [9 Proven React Component Architecture Patterns for Scalable & Resilient UIs](https://medium.com/@entekumejeffrey/9-proven-react-component-architecture-patterns-for-scalable-resilient-uis-34d79382f9ba) - Container/Presentational pattern
- [React Form Validation with Formik and Yup (2026 Edition)](https://thelinuxcode.com/react-form-validation-with-formik-and-yup-2026-edition/) - Validation separation patterns
- [Top React Form Libraries in 2026: A Strategic Architecture Analysis](https://dev.to/cerge74_cbb3abeb75dde90f5/surveyjs-vs-other-react-form-libraries-a-strategic-architecture-analysis-32ge) - Form architecture analysis

**Print Stylesheets:**
- [Designing for Print in React](https://dev.to/umarlqmn/designing-for-print-in-react-5c9h) - Print-specific component patterns
- [Print CSS with Angular](https://timdeschryver.dev/blog/print-css-with-angular) - Component-scoped print styles (applies to React)

**Existing Codebase:**
- C:\repos\baseball-coach\src\App.tsx (lines 219-483: proven constraint-based lineup generator with retry mechanism)

---
*Architecture research for: Little League Lineup Builder*
*Researched: 2026-02-09*
