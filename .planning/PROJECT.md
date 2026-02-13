# Baseball Lineup Builder

## What This Is

A web app for Little League coaches to build fair, constraint-based inning-by-inning fielding lineups and continuous batting orders. The coach manages their roster, pre-assigns pitchers and catchers, auto-generates the rest with fairness constraints, and prints a single-page dugout card. Game history tracks batting order, fielding positions, and bench time across games to ensure season-long fairness. Coaches sign in with their Microsoft account; data syncs to Azure and works offline at the field.

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

### Active

(Defined in REQUIREMENTS.md for v2.0)

### Out of Scope

- Real-time collaboration — each coach manages their own data independently
- Native mobile app — web app works on phone browser
- Game stats or scorekeeping — this is lineup generation only
- 10-fielder or non-standard position layouts
- Self-service signup — invite-only, controlled by app owner

## Current Milestone: v2.0 Azure Cloud Sync

**Goal:** Move from localStorage-only to Azure-backed storage with Microsoft authentication, so coaches can use the app across devices (including phones at the field) with offline support.

**Target features:**
- Microsoft sign-in via Entra ID (MSAL.js)
- Azure Cosmos DB for cloud persistence (per-coach data isolation)
- Offline-first: localStorage as primary, sync to cloud when connected
- Last-write-wins conflict resolution
- Azure Static Web Apps deployment
- Invite-only access control

## Context

Shipped v1.0 MVP with 5,572 LOC (TypeScript/CSS).
Tech stack: Vite + React 19 + TypeScript, CSS Modules with custom properties.
77 tests passing (vitest). All data persisted via localStorage via custom `useLocalStorage` hook.
Dev server runs on port 5180.

**v2.0 context:**
- User has an existing Azure subscription
- Coaches have Microsoft accounts (work/school or personal)
- Data contains children's names — privacy-sensitive, must stay in controlled Azure subscription
- Offline support needed — cell signal unreliable at ball fields
- Current `useLocalStorage` hook will become the offline cache layer

**Known tech debt:**
- Fisher-Yates shuffle duplicated in lineup-generator.ts and batting-order.ts (independent modules)
- Position blocks UI lives in Lineup tab — should move to Roster section (pending todo)

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
| Unified Finalize Game button | Prevents desync between batting order confirm and game history save | ✓ Good |
| HTML details/summary for collapsibles | Zero JS state, native browser behavior, accessible | ✓ Good |

| Azure Entra ID + MSAL.js for auth | Coaches already have Microsoft accounts, invite-only via app assignment | — Pending |
| Azure Cosmos DB free tier for storage | Document store maps to existing data shapes, free tier sufficient, encrypted at rest | — Pending |
| Azure Static Web Apps for hosting | Free tier, built-in auth support, serverless API functions included | — Pending |
| Offline-first with localStorage cache | Cell signal unreliable at fields, localStorage already works, sync when online | — Pending |
| Last-write-wins conflict resolution | Simple, coaches typically prep on one device, conflicts rare | — Pending |

---
*Last updated: 2026-02-12 after v2.0 milestone start*
