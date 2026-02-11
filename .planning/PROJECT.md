# Baseball Lineup Builder

## What This Is

A web app for Little League coaches to build fair, constraint-based inning-by-inning fielding lineups and continuous batting orders. The coach manages their roster, pre-assigns pitchers and catchers, auto-generates the rest with fairness constraints, and prints a single-page dugout card. Game history tracks batting order, fielding positions, and bench time across games to ensure season-long fairness. All data stored in localStorage — names never leave the coach's machine.

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

(None — define new requirements in next milestone)

### Out of Scope

- Real-time collaboration or multi-device sync — single coach, single browser
- Mobile app — web app works on phone browser if needed
- Game stats or scorekeeping — this is lineup generation only
- OAuth or user accounts — no login needed
- 10-fielder or non-standard position layouts
- Cloud storage — privacy-first, localStorage only

## Context

Shipped v1.0 MVP with 5,572 LOC (TypeScript/CSS).
Tech stack: Vite + React 19 + TypeScript, CSS Modules with custom properties.
77 tests passing (vitest). All data persisted via localStorage.
Dev server runs on port 5180.

**Known tech debt:**
- Fisher-Yates shuffle duplicated in lineup-generator.ts and batting-order.ts (independent modules)
- Position blocks UI lives in Lineup tab — should move to Roster section (pending todo)

## Constraints

- **Privacy**: Player names never leave the coach's machine. All data in localStorage. No analytics, no server calls with PII.
- **Printability**: Dugout card must fit one page and be readable from a few feet away in a dugout.

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

---
*Last updated: 2026-02-11 after v1.0 milestone*
