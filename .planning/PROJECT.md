# Baseball Lineup Builder

## What This Is

A web app for Little League coaches to build fair, constraint-based inning-by-inning fielding lineups and continuous batting orders. On desktop, all game-day sections (attendance, pitcher/catcher assignment, lineup grid, batting order) appear simultaneously in a multi-column layout with a sticky action bar. On mobile, a guided stepper walks the coach through each step. Coaches can start new games with a single action, print a dugout card (which auto-saves to history), manage game history with swipe-to-delete and undo, and drag-and-drop to edit lineups and batting orders with live validation. Game history tracks batting order, fielding positions, and bench time across games for season-long fairness. First-time visitors see a welcome popup offering Microsoft sign-in or local-only mode; returning users are automatically redirected to Microsoft login. Data syncs to Azure Cosmos DB with ETag-based conflict resolution and works offline at the field via an installable PWA.

## Core Value

Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## Requirements

### Validated

- ✓ ROST-01: User can add players to roster (first name, last initial) — v1.0
- ✓ ROST-02: User can edit and remove players from roster — v1.0
- ✓ ROST-03: User can import roster from a local CSV file — v1.0
- ✓ ROST-04: User can export roster to a local CSV file — v1.0
- ✓ ROST-05: User can configure number of innings (5 or 6) — v1.0
- ✓ ROST-06: User can mark a player as absent for the current game — v1.0
- ✓ LINE-01: User can pre-assign pitchers to inning slots — v1.0
- ✓ LINE-02: User can pre-assign catchers to inning slots — v1.0
- ✓ LINE-03: Auto-generated lineup fills remaining positions respecting all constraints — v1.0
- ✓ LINE-04: No player sits on bench for consecutive innings — v1.0
- ✓ LINE-05: Every player gets 2+ infield positions by end of inning 4 — v1.0
- ✓ LINE-06: No player plays the same position in consecutive innings (except P/C) — v1.0
- ✓ LINE-07: User can block specific positions for specific players — v1.0
- ✓ LINE-08: User can generate multiple valid lineups (3-5) and choose one — v1.0
- ✓ BATT-01: App generates a continuous batting order including all rostered players — v1.0
- ✓ BATT-02: Batting order is independent of fielding — v1.0
- ✓ BATT-03: Batting order generation factors in history for rotation fairness — v1.0
- ✓ HIST-01: After finalizing, game data saved to local history — v1.0
- ✓ HIST-02: History tracks batting order position per player per game — v1.0
- ✓ HIST-03: History tracks fielding positions played per player per game — v1.0
- ✓ HIST-04: History tracks innings sat (bench) per player per game — v1.0
- ✓ HIST-05: Lineup generation factors in history for cross-game fairness — v1.0
- ✓ OUTP-01: User can print single-page dugout card — v1.0
- ✓ OUTP-02: Batting order displayed on dugout card — v1.0
- ✓ OUTP-03: Dugout card readable from a few feet away in dugout — v1.0
- ✓ VALD-01: Lineup validated in real-time against all fairness constraints — v1.0
- ✓ VALD-02: Validation errors use plain-language, coach-friendly messages — v1.0
- ✓ AUTH-01: Coach can sign in with Microsoft account via Azure Entra ID (SWA EasyAuth) — v2.0
- ✓ AUTH-02: Only invited coaches can access the app (assignment-required) — v2.0
- ✓ AUTH-03: Coach sees display name and sign-out button in header — v2.0
- ✓ AUTH-04: App works fully without signing in; signing in unlocks cloud sync — v2.0
- ✓ SYNC-01: Coach data persists to Azure Cosmos DB per-user partition — v2.0
- ✓ SYNC-02: Offline-first; localStorage primary, cloud sync in background — v2.0
- ✓ SYNC-03: Sync status indicator in header (synced/syncing/offline/error) — v2.0
- ✓ SYNC-04: Existing localStorage data auto-migrates on first sign-in — v2.0
- ✓ SYNC-05: Last-write-wins conflict resolution via Cosmos DB etag — v2.0
- ✓ DEPL-01: Hosted on Azure Static Web Apps with CI/CD from GitHub — v2.0
- ✓ DEPL-02: Installable as PWA with "Add to Home Screen" — v2.0
- ✓ DEPL-03: API uses SWA managed Functions; credentials server-side only — v2.0
- ✓ FLOW-01: Game Day is the primary/default tab when app opens — v3.0
- ✓ FLOW-02: Stepper flow guides coach through Attendance → P/C → Generate → Review → Print — v3.0
- ✓ FLOW-03: P/C assignment step shows last 2 games' pitcher and catcher history — v3.0
- ✓ FLOW-04: Absent players greyed out and not selectable for P/C assignment — v3.0
- ✓ FLOW-05: Previous game's batting order shown alongside auto-generated order — v3.0
- ✓ SETT-01: Settings page consolidates roster management — v3.0
- ✓ SETT-02: Settings page includes CSV import/export — v3.0
- ✓ SETT-03: Settings page includes position blocks configuration — v3.0
- ✓ SETT-04: Settings page includes innings configuration — v3.0
- ✓ SETT-05: Settings page includes sync status and settings — v3.0
- ✓ DND-01: Drag-and-drop fielding grid swaps within inning — v3.0
- ✓ DND-02: Drag-and-drop batting order reordering — v3.0
- ✓ DND-03: Live constraint validation on every drag edit — v3.0
- ✓ DND-04: Mobile touch drag handles without stealing scroll — v3.0
- ✓ GEN-01: Best-of-~10 scored lineup generation — v3.0
- ✓ GEN-02: Regenerate produces new best lineup — v3.0
- ✓ GEN-03: Fairness score with sub-dimension breakdown visible — v3.0
- ✓ GEN-04: Batting order auto-generated without separate step — v3.0
- ✓ SYNC-06: ETag-based conflict detection on push (If-Match / 412) — v3.0
- ✓ SYNC-07: Conflict dialog with "this device" vs "cloud" choice — v3.0
- ✓ SYNC-08: Dirty flag prevents cloud pulls from overwriting active edits — v3.0
- ✓ SYNC-09: Pull-time conflict detection for offline-to-online edits — v3.0
- ✓ DESK-01: All game-day sections visible in multi-column layout on desktop — v4.0
- ✓ DESK-02: Attendance/P/C left, lineup/batting right on desktop (3-zone layout) — v4.0
- ✓ DESK-03: Mobile stepper flow unchanged at narrow widths — v4.0
- ✓ DESK-04: Desktop layout adapts fluidly without horizontal scrolling — v4.0
- ✓ GFLW-01: Single New Game action when previous game exists — v4.0
- ✓ GFLW-02: New Game resets state, preserves roster/history — v4.0
- ✓ GFLW-03: Printing dugout card auto-saves lineup to game history — v4.0
- ✓ GFLW-04: No Finalize Game button or step in flow — v4.0
- ✓ HMGT-01: View list of saved game history entries with date/summary — v4.0
- ✓ HMGT-02: Delete individual game history entries — v4.0
- ✓ ONBD-01: Welcome popup on first visit with sign-in or continue-without — v5.0
- ✓ ONBD-02: Local-mode explanation with device-only data and CSV mention — v5.0
- ✓ ONBD-03: Welcome popup not shown again after dismissal — v5.0
- ✓ ONBD-04: Local-mode explanation mentions header sign-in link — v5.0
- ✓ ASIG-01: App remembers previous sign-in via localStorage flag — v5.0
- ✓ ASIG-02: Returning user auto-redirected to Microsoft login — v5.0
- ✓ ASIG-03: Silent fallback to unauthenticated mode on auth failure — v5.0

### Active

(No active milestone — use `/gsd:new-milestone` to start next)

### Out of Scope

- Real-time collaboration — each coach manages their own data independently
- Native mobile app — PWA works on phone browser
- Game stats or scorekeeping — this is lineup generation only
- 10-fielder or non-standard position layouts
- Self-service signup — invite-only, controlled by app owner
- Social logins (Google, Apple, etc.) — Microsoft-only, Azure-native stack
- Role-based access control — all coaches are equal
- End-to-end encryption — Cosmos DB encryption at rest + HTTPS sufficient
- Direct browser-to-Cosmos-DB — always go through Functions API
- Push notifications — not needed for pre-game planning tool
- Granular per-field conflict resolution — timestamp + device/cloud choice is sufficient
- Animated lineup transitions (CSS View Transitions) — deferred from v3.0
- Diamond visualization (read-only field view) — deferred from v3.0
- Configurable scoring weights in Settings — deferred from v3.0
- Undo/redo for drag-and-drop edits — deferred from v3.0
- Inline position swap suggestions — deferred from v3.0
- Sidebar navigation — bottom tab bar works well for 3-tab app
- Drag-and-drop between columns on desktop — existing DnD within inning is sufficient
- Game history charts/trends — history management is view + delete, not analytics

## Context

Shipped v5.0 with 13,776 LOC (TypeScript/CSS).
Tech stack: Vite + React 19 + TypeScript, CSS Modules, @dnd-kit/react, Azure Static Web Apps, Azure Functions v4, Cosmos DB serverless.
87+ tests passing (vitest). Data persisted via useCloudStorage (localStorage + cloud sync with ETag conflict resolution).
Dev server runs on port 5180. API dev server on port 7071 via SWA CLI.
3-tab app: Game Day (primary), History, Settings.
PR builds create frontend-only SWA preview environments; API deploys only on push to main.

**v5.0 added:**
- Welcome popup for first-time visitors: "Sign in with Microsoft" or "Continue without signing in"
- Local-mode explanation dialog: device-only data, CSV import/export in Settings, header sign-in link
- Auto-redirect returning users to Microsoft login via `has-authed` localStorage flag
- Silent fallback on auth failure via `?auth=auto` URL param detection
- PR preview environments: API build/deploy gated to push-to-main only

**Known tech debt:**
- TENANT_ID placeholder in staticwebapp.config.json (replaced at deployment)
- DESK-02 accepted deviation: 3-zone layout instead of strict 2-column (approved by user)
- eslint-disable-next-line react-hooks/exhaustive-deps in GameDayDesktop.tsx
- Onboarding flow has complex three-way branching in AppShell useEffect (signed-in / returning / fresh)

## Constraints

- **Privacy**: Player names stored only in coach's browser and their Azure Cosmos DB partition. No third-party analytics. Data encrypted at rest and in transit. Invite-only access.
- **Printability**: Dugout card must fit one page and be readable from a few feet away in a dugout.
- **Cloud provider**: Azure only — user has existing subscription and billing.
- **Offline-first**: App must work without network at the field. Cloud sync is best-effort.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local CSV files for roster import/export | Privacy-first — files stay on coach's machine, easy to share | ✓ Good |
| localStorage for persistence | Simplest solution, no server needed, survives page refresh | ✓ Good |
| Continuous batting order | League rules — all kids bat in rotation regardless of fielding | ✓ Good |
| Grid by inning for dugout card | Coach's preference — columns = innings, rows = positions | ✓ Good |
| Pre-assign P/C, auto-generate rest | Same workflow as existing app, coach knows who's pitching/catching | ✓ Good |
| CSS Modules with custom properties | No build complexity of Tailwind, design tokens via CSS vars | ✓ Good |
| HTML table for print grid | CSS Grid unreliable in print — tables render consistently cross-browser | ✓ Good |
| Fisher-Yates shuffle for randomization | Unbiased, O(n), well-understood algorithm | ✓ Good |
| Three-band fairness for batting order | Simple, effective — top/middle/bottom bands rotate across games | ✓ Good |
| Bench priority via sort-after-shuffle | Soft preference, doesn't break constraints — constraint solver has final say | ✓ Good |
| Print-as-save replacing Finalize | Simpler flow — printing IS saving, no separate step needed | ✓ Good |
| HTML details/summary for collapsibles | Zero JS state, native browser behavior, accessible | ✓ Good |
| SWA EasyAuth over MSAL.js | Zero client library, platform-level auth, simpler implementation | ✓ Good |
| SWA Standard plan ($9/mo) | Required for custom Entra ID tenant restriction | ✓ Good |
| Cosmos DB serverless with /userId partition | Document store maps to existing data shapes, free tier sufficient, encrypted at rest | ✓ Good |
| Per-game documents for game history | Avoid 2MB document limit in Cosmos DB | ✓ Good |
| useCloudStorage wraps useLocalStorage | Identical API signature — all domain hooks migrated without refactoring | ✓ Good |
| Offline-first with localStorage cache | Cell signal unreliable at fields, localStorage already works, sync when online | ✓ Good |
| generateSW over injectManifest for PWA | No custom service worker code needed for app-shell caching | ✓ Good |
| OIDC auth for Azure SWA deployments | No deployment token needed, matches Azure's GitHub deployment source | ✓ Good |
| useReducer for stepper state | Complex state transitions (step nav, attendance, P/C) benefit from reducer pattern | ✓ Good |
| Bottom tab bar with 3 tabs | Game Day primary, History secondary, Settings tertiary — simplest navigation | ✓ Good |
| @dnd-kit/react for drag-and-drop | Lightweight, touch-friendly, accept filter for same-inning constraint | ✓ Good |
| Scoring weights: bench 0.5, infield 0.3, variety 0.2 | Bench fairness most important for youth baseball | ✓ Good |
| scoreLineup as pure function | Enables live recomputation after DnD edits via useMemo | ✓ Good |
| Native HTML dialog for ConflictDialog | No modal library dependency, automatic focus trapping and backdrop | ✓ Good |
| ETag-based optimistic concurrency | Coach-facing conflict resolution instead of silent last-write-wins | ✓ Good |
| Pull-time conflict detection via JSON.stringify | Detects offline-to-online data changes on login, reuses ConflictDialog | ✓ Good |
| 900px desktop breakpoint | Above tablet portrait, below typical laptop — optimal for 3-zone layout | ✓ Good |
| Free-form desktop editing (all sections editable) | Simpler for coach workflow, no locking or graying out sections | ✓ Good |
| Sticky action bar for Generate/Print | Always visible at bottom of desktop layout, single-tap access | ✓ Good |
| Refs for DnD display state (not React state) | Avoids re-renders on every drag — values read only at save time | ✓ Good |
| saveGame with ref-based duplicate detection | Re-printing updates existing history entry instead of creating duplicates | ✓ Good |
| deleteGame returns entry+index for undo | Clean undo pattern — caller can re-insert at original position | ✓ Good |
| Fire-and-forget cloud DELETE | Offline resilience — swallowed errors, local deletion succeeds regardless | ✓ Good |
| Pointer events for swipe-to-delete | No external gesture library needed, works on touch and mouse | ✓ Good |
| printSeq counter for re-print trigger | Forces useEffect to re-fire when game label is unchanged | ✓ Good |
| Ref guard for welcome dialog | Prevents onboarding useEffect from re-triggering on auth state changes | ✓ Good |
| Set welcome-dismissed before auth redirect | Popup won't re-show if auth fails and redirects back | ✓ Good |
| Gate API build+deploy to push-to-main | Saves CI time on PRs; preview environments are frontend-only | ✓ Good |
| Single redirect attempt for auto-sign-in | Cookie-based SWA auth — second redirect would also fail, one round-trip sufficient | ✓ Good |
| has-authed flag never cleared | Permanent flag per user decision — every future visit attempts auto-redirect | ✓ Good |
| DEV mode skips auto-redirect | SWA auth endpoints unavailable on Vite dev server | ✓ Good |
| URL param marker for auth failure | ?auth=auto appended before redirect, detected on return to distinguish success/failure | ✓ Good |

---
*Last updated: 2026-02-23 after v5.0 milestone*
