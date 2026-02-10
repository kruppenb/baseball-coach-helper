# Phase 1: Foundation - Research

**Researched:** 2026-02-09
**Domain:** Roster management UI, game configuration, React app shell with tabbed navigation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Quick-add inline: single text input, coach types "Jake R" and hits enter
- Single input field for full name (first name + last initial together)
- One player at a time -- no batch/bulk entry needed (roster is ~12-15 kids)
- Auto-capitalize names and warn on duplicate entries
- Click player name to edit inline -- name becomes editable in place
- Alphabetical sort by first name, always
- Delete requires confirmation before removing
- Show player count (e.g., "12 players") visible on the roster
- Tap a player to toggle present/absent -- absent players visually dimmed
- Everyone defaults to present; coach only marks who's absent
- Inning count (5 or 6) is a persistent setting -- set once, stays until changed
- Inning config lives in a settings area, not on the main roster page
- Web app running in the browser (no install, works on phone and laptop)
- Tabbed navigation: Roster | Game Setup | (future tabs for Lineup, History)
- Clean and minimal visual style -- high contrast, large tap targets, utility-first
- Online-only -- no offline support needed

### Claude's Discretion
- Specific CSS framework or component library choice
- Tab styling and transitions
- Empty roster state messaging
- Exact layout spacing and typography
- Settings page structure beyond inning config

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 1 establishes the foundation of a React 19 + TypeScript + Vite web app for Little League coaches. The scope is limited to roster management (add/edit/remove players), game-day attendance (mark absent), inning configuration (5 or 6), and the app shell with tabbed navigation. No lineup generation, no batting order, no history tracking.

The core technical challenges are: (1) setting up the Vite project with proper configuration, (2) building an inline-edit pattern for player names that works well on both phone and laptop, (3) implementing localStorage persistence with proper error handling, (4) creating a tab navigation system that accommodates future phases, and (5) ensuring the UI is usable in bright outdoor conditions on a phone screen with large, easy-to-tap targets.

The existing project-level research (STACK.md, ARCHITECTURE.md) already locks the core stack: React 19, TypeScript 5.9, Vite, CSS Modules. For Claude's discretion areas, this research recommends CSS Modules with a custom design-token system (CSS custom properties) over Tailwind or a component library -- the app is small enough that CSS Modules are simpler and provide better control for the print CSS needed in later phases. No component library is needed; hand-built components will be more maintainable for this project size.

**Primary recommendation:** Use CSS Modules with CSS custom properties for theming (colors, spacing, font sizes). Build tab navigation as a simple custom component with ARIA roles. Build inline editing with the single-input pattern (always an input, styled to look like text when not focused).

## Standard Stack

### Core (from project-level STACK.md, updated versions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.x | UI component framework | Latest stable (19.2.4, Jan 2026). Backwards compatible with 19.1. No breaking changes. |
| TypeScript | 5.9.x | Type safety | Latest stable (5.9.3). Compile-time error detection. |
| Vite | 7.3.x | Build tool & dev server | Latest stable (7.3.1). Instant HMR, native ESM, zero-config TS/JSX. |
| @vitejs/plugin-react | 4.x | React + Vite integration | Enables Fast Refresh, JSX transform. |

### Styling (Claude's Discretion -- Recommendation)
| Library | Version | Purpose | Why Chosen |
|---------|---------|---------|------------|
| CSS Modules | (via Vite) | Component-scoped CSS | Built into Vite with zero config. No runtime overhead. Native CSS features including @media print (needed in Phase 4). Component-scoped by default prevents conflicts. |
| CSS Custom Properties | (native) | Design tokens / theming | Define colors, spacing, font sizes as variables. Easy to adjust for high-contrast outdoor readability. No build step, no library. |

### Phase 1 Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | Phase 1 needs no additional npm dependencies beyond the Vite React template |

### Alternatives Considered (Claude's Discretion)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Modules | Tailwind CSS | Tailwind is faster for prototyping and the user mentioned "utility-first feel". However, CSS Modules gives better control for print media queries (Phase 4), avoids an extra dependency, and the app is small enough (< 10 components in Phase 1) that CSS Modules won't slow development. The "utility-first feel" refers to the visual style (functional, not flashy) -- not the CSS framework. |
| CSS Modules | shadcn/ui + Tailwind | Overkill for this project. shadcn components are designed for complex dashboards. This app has ~3 interactive patterns (text input, toggle, tabs). Building them is faster than configuring shadcn. |
| Custom tabs | react-tabs library | A library adds a dependency for a trivial pattern. Custom tabs are ~30 lines of code with proper ARIA roles. No benefit from a library. |
| Custom useLocalStorage | usehooks-ts | usehooks-ts provides a well-tested useLocalStorage hook. However, the implementation is ~30 lines and we need a specific shape (try-catch error handling, in-memory fallback). Writing our own avoids pulling in an entire hooks library for one hook. |

**Installation:**
```bash
# Create new Vite + React + TypeScript app
npm create vite@latest baseball-coach-helper -- --template react-ts
cd baseball-coach-helper
npm install
```

No additional npm packages needed for Phase 1. The Vite react-ts template includes React 19, TypeScript, and @vitejs/plugin-react.

## Architecture Patterns

### Recommended Project Structure (Phase 1)
```
src/
├── components/
│   ├── app-shell/
│   │   ├── AppShell.tsx          # Tab container and layout
│   │   ├── AppShell.module.css
│   │   ├── TabBar.tsx            # Tab navigation with ARIA roles
│   │   └── TabBar.module.css
│   ├── roster/
│   │   ├── RosterPage.tsx        # Roster tab content (container)
│   │   ├── RosterPage.module.css
│   │   ├── PlayerInput.tsx       # Quick-add input at top
│   │   ├── PlayerInput.module.css
│   │   ├── PlayerList.tsx        # Sorted list with count
│   │   ├── PlayerList.module.css
│   │   ├── PlayerRow.tsx         # Single player: inline edit + delete
│   │   └── PlayerRow.module.css
│   └── game-setup/
│       ├── GameSetupPage.tsx     # Game Setup tab content
│       ├── GameSetupPage.module.css
│       ├── AttendanceList.tsx    # Toggle present/absent
│       ├── AttendanceList.module.css
│       ├── PlayerAttendance.tsx  # Single player attendance toggle
│       ├── PlayerAttendance.module.css
│       ├── SettingsPanel.tsx     # Inning count config
│       └── SettingsPanel.module.css
├── hooks/
│   ├── useLocalStorage.ts       # localStorage abstraction with error handling
│   └── useRoster.ts             # Roster state management (add/edit/remove/sort)
├── types/
│   └── index.ts                 # Player, GameConfig types
├── styles/
│   └── tokens.css               # CSS custom properties (design tokens)
├── App.tsx                      # Root component
├── App.module.css
├── main.tsx                     # Entry point
└── index.css                    # Global reset styles
```

### Pattern 1: Single-Input Inline Edit
**What:** Player names are always rendered as `<input>` elements styled to look like plain text. On hover, a subtle background appears. On focus/click, the input becomes visually editable. On blur or Enter, the value saves. On Escape, the value reverts.
**When to use:** For the PlayerRow component where clicking a player name edits it inline.
**Example:**
```typescript
// Source: https://www.emgoto.com/react-inline-edit/ (verified pattern)
interface PlayerRowProps {
  name: string;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

function PlayerRow({ name, onRename, onDelete }: PlayerRowProps) {
  const [editingValue, setEditingValue] = useState(name);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (trimmed === '') {
      setEditingValue(name); // revert if empty
    } else {
      const capitalized = autoCapitalize(trimmed);
      setEditingValue(capitalized);
      onRename(capitalized);
    }
  };

  return (
    <div className={styles.playerRow}>
      <input
        type="text"
        className={styles.inlineEdit}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        aria-label={`Edit player name: ${name}`}
      />
      <button
        className={styles.deleteButton}
        onClick={onDelete}
        aria-label={`Remove ${name}`}
      >
        Remove
      </button>
    </div>
  );
}
```

CSS for the inline edit pattern:
```css
/* PlayerRow.module.css */
.inlineEdit {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-lg);
  font-family: inherit;
  color: var(--color-text);
  width: 100%;
  min-height: 44px; /* WCAG 2.2 touch target */
  cursor: pointer;
}

.inlineEdit:hover {
  background: var(--color-surface-hover);
}

.inlineEdit:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  background: var(--color-surface);
  border-color: var(--color-border);
  cursor: text;
}
```

### Pattern 2: Custom Hook for Roster State
**What:** A `useRoster` hook encapsulates all roster operations (add, rename, remove, sort) and persists to localStorage. Components consume the hook directly.
**When to use:** Any component that needs roster data or operations.
**Example:**
```typescript
// hooks/useRoster.ts
import { useLocalStorage } from './useLocalStorage';
import type { Player } from '../types';

export function useRoster() {
  const [players, setPlayers] = useLocalStorage<Player[]>('roster', []);

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const addPlayer = (name: string): { success: boolean; error?: string } => {
    const capitalized = autoCapitalize(name.trim());
    if (capitalized === '') return { success: false, error: 'Name cannot be empty' };

    const isDuplicate = players.some(
      (p) => p.name.toLowerCase() === capitalized.toLowerCase()
    );
    if (isDuplicate) return { success: false, error: `${capitalized} is already on the roster` };

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: capitalized,
      isPresent: true,
    };
    setPlayers([...players, newPlayer]);
    return { success: true };
  };

  const renamePlayer = (id: string, newName: string) => {
    const capitalized = autoCapitalize(newName.trim());
    setPlayers(players.map((p) => (p.id === id ? { ...p, name: capitalized } : p)));
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const togglePresent = (id: string) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, isPresent: !p.isPresent } : p))
    );
  };

  const resetAttendance = () => {
    setPlayers(players.map((p) => ({ ...p, isPresent: true })));
  };

  return {
    players: sortedPlayers,
    playerCount: players.length,
    presentCount: players.filter((p) => p.isPresent).length,
    addPlayer,
    renamePlayer,
    removePlayer,
    togglePresent,
    resetAttendance,
  };
}

function autoCapitalize(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### Pattern 3: Accessible Tab Navigation
**What:** A simple tab bar with proper ARIA roles (tablist, tab, tabpanel) and keyboard navigation (arrow keys). Tabs render content conditionally.
**When to use:** The main app navigation: Roster | Game Setup | (future: Lineup | History).
**Example:**
```typescript
// components/app-shell/TabBar.tsx
interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);

    let newIndex = currentIndex;
    if (e.key === 'ArrowRight') newIndex = (currentIndex + 1) % enabledTabs.length;
    if (e.key === 'ArrowLeft') newIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;

    if (newIndex !== currentIndex) {
      e.preventDefault();
      onTabChange(enabledTabs[newIndex].id);
    }
  };

  return (
    <div role="tablist" className={styles.tabBar}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          disabled={tab.disabled}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Pattern 4: useLocalStorage with Error Handling
**What:** A custom hook that wraps localStorage with try-catch, JSON serialization, and an in-memory fallback for when localStorage is unavailable (private browsing).
**When to use:** For persisting roster data and game settings.
**Example:**
```typescript
// hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react';

function canUseLocalStorage(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = canUseLocalStorage();

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!storageAvailable) return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Failed to save to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      return nextValue;
    });
  }, []);

  return [storedValue, setValue];
}
```

### Pattern 5: Design Tokens via CSS Custom Properties
**What:** Define all colors, spacing, font sizes, and border radii as CSS custom properties in a single file. Components reference tokens, not raw values.
**When to use:** Every CSS Module file references these tokens for consistent styling.
**Example:**
```css
/* styles/tokens.css */
:root {
  /* Colors -- high contrast for outdoor readability */
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-surface-hover: #e9ecef;
  --color-text: #1a1a1a;
  --color-text-muted: #6c757d;
  --color-text-dimmed: #adb5bd;   /* absent players */
  --color-primary: #0d6efd;
  --color-danger: #dc3545;
  --color-focus: #0d6efd;
  --color-border: #dee2e6;
  --color-border-strong: #adb5bd;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */

  /* Touch targets */
  --min-tap-size: 44px;         /* WCAG 2.2 recommended minimum */

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

### Anti-Patterns to Avoid
- **Prop drilling roster state through tabs:** Don't pass roster data as props from AppShell down through TabBar into page components. Instead, use `useRoster()` hook directly in components that need it. The hook handles localStorage persistence transparently.
- **Swapping between label and input for inline edit:** Don't use conditional rendering to switch between a `<span>` and an `<input>`. This causes focus management issues and layout shifts. Use a single `<input>` styled to look like text when not focused.
- **Storing player names as a plain string array:** Use objects with IDs (`{ id, name, isPresent }`) from the start. Plain string arrays make rename and attendance tracking impossible without fragile index-based operations. `crypto.randomUUID()` provides stable IDs.
- **Hardcoding tab content inside the tab component:** Keep tab navigation generic. The TabBar component should not know about roster or game setup. It receives tab definitions and fires onChange. Content rendering happens in the parent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique player IDs | Custom counter or timestamp-based IDs | `crypto.randomUUID()` | Built into all modern browsers. Guaranteed uniqueness. No collision handling needed. |
| Name capitalization | Regex-based capitalization | Simple `split(' ').map()` function | Names like "Jake R" just need first-letter capitalization per word. Don't handle complex cases (O'Brien, McDonald) -- coaches type names as they want. |
| CSS reset / normalization | Custom reset stylesheet | Vite's default `index.css` + minimal reset | Vite template includes sensible defaults. Add `box-sizing: border-box` and basic body styles. Don't pull in normalize.css for this small app. |
| Form validation | Custom validation framework | Return `{ success, error }` objects from hook functions | The only input validation is "not empty" and "not duplicate". This does not need a form library. |

**Key insight:** Phase 1 has extremely simple requirements -- a text input, a list, toggles, and a settings dropdown. Every "library" consideration adds more complexity than the problem warrants. The correct approach is small, focused custom code.

## Common Pitfalls

### Pitfall 1: localStorage Fails in Private Browsing
**What goes wrong:** Safari private mode pretends localStorage exists but throws on `setItem()`. Other browsers may disable it entirely.
**Why it happens:** Browsers handle private browsing inconsistently. Developers test in standard mode and miss this.
**How to avoid:** The `useLocalStorage` hook above includes a `canUseLocalStorage()` test that attempts a real write. If it fails, the hook falls back to in-memory state. Data won't persist between sessions but the app won't crash.
**Warning signs:** Users report losing roster data after closing and reopening the browser.

### Pitfall 2: Inline Edit Loses Focus on Re-render
**What goes wrong:** If the player list re-sorts while a player name is being edited, the component unmounts and remounts, losing focus and the user's in-progress edit.
**Why it happens:** Sorting alphabetically means renaming "Alex" to "Zach" would move the item to the bottom of the list mid-edit.
**How to avoid:** Use the player's stable `id` as the React `key` (not the player's name and not the array index). This ensures React preserves the component across sorts. Also: defer re-sorting until the blur event (after edit completes), not on every keystroke.
**Warning signs:** Input field "jumps" or loses focus while typing a new name.

### Pitfall 3: Duplicate Detection is Case-Sensitive
**What goes wrong:** Coach adds "Jake R" and then "jake r" -- both are accepted despite being the same player.
**Why it happens:** String comparison is case-sensitive by default.
**How to avoid:** Normalize to lowercase for comparison: `players.some(p => p.name.toLowerCase() === newName.toLowerCase())`. Still store the auto-capitalized version.
**Warning signs:** Duplicate player names appear in the roster.

### Pitfall 4: Tab Content Remounts on Tab Switch
**What goes wrong:** Switching from Game Setup back to Roster causes the roster page to fully remount, losing any unsaved state (like a partially typed player name in the input).
**Why it happens:** Conditional rendering with `{activeTab === 'roster' && <RosterPage />}` destroys and recreates the component.
**How to avoid:** Render all tab panels always, hide inactive ones with CSS (`display: none`). This preserves component state across tab switches. OR: since roster data is in localStorage, component state for the input field is minimal and re-mounting is acceptable.
**Warning signs:** Quick-add input clears when switching tabs and back.

### Pitfall 5: Touch Targets Too Small on Phone
**What goes wrong:** Coach in a dugout, possibly wearing gloves, can't tap the correct player or the delete button. Taps register on wrong element.
**Why it happens:** Default browser UI element sizes (especially links and small buttons) are under 44px. Developers test on desktop with precise mouse cursors.
**How to avoid:** Set `min-height: var(--min-tap-size)` (44px) on all interactive elements. Use generous padding. The design tokens define `--min-tap-size: 44px` per WCAG 2.2 recommendation. Test on actual phone hardware.
**Warning signs:** Coach reports accidentally deleting players or toggling the wrong player's attendance.

### Pitfall 6: No Confirmation on Delete Causes Data Loss
**What goes wrong:** Coach accidentally taps "Remove" on a player and the player is instantly deleted with no way to recover.
**Why it happens:** Delete handlers fire immediately without confirmation step.
**How to avoid:** The user explicitly requires delete confirmation. Implement a two-step pattern: first tap shows "Confirm?" / "Cancel" replacing the delete button, second tap on "Confirm?" actually removes the player. This avoids modal dialogs (bad on mobile) while preventing accidents.
**Warning signs:** Coach requests "undo" functionality.

## Code Examples

Verified patterns from official sources:

### Player Type Definitions
```typescript
// types/index.ts
export interface Player {
  id: string;          // crypto.randomUUID()
  name: string;        // "Jake R" -- first name + last initial
  isPresent: boolean;  // defaults to true, toggled for game day
}

export interface GameConfig {
  innings: 5 | 6;     // persistent setting
}

export type TabId = 'roster' | 'game-setup' | 'lineup' | 'history';
```

### Quick-Add Player Input
```typescript
// components/roster/PlayerInput.tsx
interface PlayerInputProps {
  onAdd: (name: string) => { success: boolean; error?: string };
}

function PlayerInput({ onAdd }: PlayerInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onAdd(value);
    if (result.success) {
      setValue('');
      setError(null);
      inputRef.current?.focus(); // keep focus for next entry
    } else {
      setError(result.error ?? 'Could not add player');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Add player (e.g. Jake R)"
        className={styles.addInput}
        aria-label="Player name"
        autoComplete="off"
      />
      <button type="submit" className={styles.addButton}>
        Add
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
```

### Delete Confirmation Pattern
```typescript
// Inside PlayerRow component
const [confirmingDelete, setConfirmingDelete] = useState(false);

// In the JSX:
{confirmingDelete ? (
  <div className={styles.confirmGroup}>
    <button
      className={styles.confirmButton}
      onClick={() => { onDelete(); setConfirmingDelete(false); }}
    >
      Confirm
    </button>
    <button
      className={styles.cancelButton}
      onClick={() => setConfirmingDelete(false)}
    >
      Cancel
    </button>
  </div>
) : (
  <button
    className={styles.deleteButton}
    onClick={() => setConfirmingDelete(true)}
    aria-label={`Remove ${name}`}
  >
    Remove
  </button>
)}
```

### Attendance Toggle (Game Setup)
```typescript
// components/game-setup/PlayerAttendance.tsx
interface PlayerAttendanceProps {
  player: Player;
  onToggle: () => void;
}

function PlayerAttendance({ player, onToggle }: PlayerAttendanceProps) {
  return (
    <button
      className={`${styles.attendanceRow} ${!player.isPresent ? styles.absent : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={player.isPresent}
      aria-label={`${player.name}: ${player.isPresent ? 'present' : 'absent'}`}
    >
      <span className={styles.playerName}>{player.name}</span>
      <span className={styles.status}>
        {player.isPresent ? 'Present' : 'Absent'}
      </span>
    </button>
  );
}
```

CSS for the absent/dimmed state:
```css
/* PlayerAttendance.module.css */
.attendanceRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: var(--min-tap-size);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-lg);
  color: var(--color-text);
  transition: opacity 0.15s ease;
}

.attendanceRow.absent {
  opacity: 0.45;
  text-decoration: line-through;
}

.attendanceRow:active {
  background: var(--color-surface-hover);
}
```

### Inning Configuration (Settings)
```typescript
// components/game-setup/SettingsPanel.tsx
interface SettingsPanelProps {
  innings: 5 | 6;
  onInningsChange: (value: 5 | 6) => void;
}

function SettingsPanel({ innings, onInningsChange }: SettingsPanelProps) {
  return (
    <div className={styles.settings}>
      <h3 className={styles.settingsTitle}>Settings</h3>
      <div className={styles.settingRow}>
        <label htmlFor="innings-select" className={styles.settingLabel}>
          Innings per game
        </label>
        <select
          id="innings-select"
          value={innings}
          onChange={(e) => onInningsChange(Number(e.target.value) as 5 | 6)}
          className={styles.select}
        >
          <option value={5}>5 innings</option>
          <option value={6}>6 innings</option>
        </select>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App (CRA) | Vite | CRA deprecated ~2023 | Use `npm create vite@latest` with `react-ts` template |
| React.forwardRef | Pass ref as regular prop | React 19 (Dec 2024) | No forwardRef wrapper needed |
| defaultProps on function components | Default parameter syntax | React 19 (Dec 2024) | Use `function Comp({ value = 'default' })` |
| Jest for testing | Vitest | Vitest 1.0 (Dec 2023) | 10-20x faster, native ESM, same API |
| react 19.1.x | react 19.2.x | Oct 2025 | Backwards compatible, adds Activity component and useEffectEvent (neither needed in Phase 1) |
| useId prefix `:r:` | useId prefix `_r_` | React 19.2 | Better CSS selector compatibility |

**Deprecated/outdated:**
- Create React App: Effectively deprecated since React team stopped recommending it. Use Vite.
- Class components: Use function components with hooks exclusively.
- forwardRef: No longer needed in React 19+.
- defaultProps: Deprecated on function components in React 19.

## Open Questions

1. **Whether to render all tab panels or conditionally**
   - What we know: Conditional rendering is simpler. Always-rendered preserves state.
   - What's unclear: Whether the quick-add input state loss on tab switch matters enough to justify always-rendered.
   - Recommendation: Start with conditional rendering (simpler). If state preservation becomes a UX issue, switch to always-rendered with CSS `display: none`. Since roster data persists in localStorage, the only transient state is an in-progress text input, which is low cost to lose.

2. **Empty roster state messaging**
   - What we know: New users will see an empty roster on first visit.
   - What's unclear: Exact copy for empty states.
   - Recommendation: Show a brief, encouraging message: "No players yet. Add your first player above." No illustrations or complex onboarding -- keep it utility-first.

3. **Whether player IDs should use crypto.randomUUID() or a simpler scheme**
   - What we know: `crypto.randomUUID()` is supported in all modern browsers and provides guaranteed uniqueness.
   - What's unclear: Whether the existing baseball-coach app's approach (name-as-key) should be preserved for compatibility.
   - Recommendation: Use `crypto.randomUUID()`. This is a new app with no migration path from the old app. IDs enable stable React keys and reliable rename/delete operations.

## Sources

### Primary (HIGH confidence)
- [React 19.2 Release Blog](https://react.dev/blog/2025/10/01/react-19-2) -- Verified current React version is 19.2.4
- [Vite Official Releases](https://vite.dev/releases) -- Verified Vite 7.3.1 is latest stable
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) -- Verified 5.9.3 is latest
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4) -- Verified 4.0.18 is latest
- [WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) -- 24px minimum, 44px recommended
- [Smashing Magazine: Accessible Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) -- 44x44px best practice

### Secondary (MEDIUM confidence)
- [React Inline Edit Pattern](https://www.emgoto.com/react-inline-edit/) -- Single-input approach verified and widely adopted
- [usehooks-ts useLocalStorage](https://usehooks-ts.com/react-hook/use-local-storage) -- API shape and error handling patterns verified
- [Accessible Tabs Pattern](https://medium.com/@andreasmcd/creating-an-accessible-tab-component-with-react-24ed30fde86a) -- ARIA roles and keyboard navigation
- [LogRocket: Inline Editable UI](https://blog.logrocket.com/build-inline-editable-ui-react/) -- Alternative inline edit approaches
- [Vite + React Setup Guide 2026](https://oneuptime.com/blog/post/2026-01-08-react-typescript-vite-production-setup/view) -- Project structure patterns

### Tertiary (LOW confidence)
- None -- all claims verified with at least two sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Versions verified against npm registry and official release pages. React 19.2.4, Vite 7.3.1, TS 5.9.3, Vitest 4.0.18 all confirmed as latest stable.
- Architecture: HIGH -- Project structure follows established React patterns from multiple verified sources and project-level ARCHITECTURE.md. Inline edit pattern verified with multiple tutorials and the emgoto.com implementation.
- Pitfalls: HIGH -- localStorage private browsing issue confirmed via MDN and multiple GitHub issues. Inline edit focus loss is a well-documented React pattern issue. Touch target sizes backed by WCAG 2.2 specification.
- CSS/Styling recommendation: MEDIUM -- CSS Modules recommendation is sound (built into Vite, zero config, good for print). The decision not to use Tailwind is a judgment call based on project size and Phase 4 print requirements. Both would work.

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days -- stable technologies, no fast-moving dependencies)
