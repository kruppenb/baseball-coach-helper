# Baseball Lineup Builder

## What This Is

A web app for little league coaches to build fair, constraint-based inning-by-inning fielding lineups and continuous batting orders. The coach enters their roster (first name, last initial) via CSV import, pre-assigns pitchers and catchers, auto-generates the rest, and prints a single-page dugout card. Roster and game history are stored as local CSV files — names never leave the coach's machine. Game history tracks batting order, fielding positions, and bench time across games to ensure season-long fairness.

## Core Value

Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Roster via local CSV import/export (first name, last initial)
- [ ] Configurable innings (5 or 6, default 6)
- [ ] 11-12 player roster, 9 standard fielding positions (P, C, 1B, 2B, 3B, SS, LF, CF, RF)
- [ ] Pre-assign pitcher and catcher slots before generating lineup
- [ ] Auto-generate inning-by-inning fielding lineup with fair rotation constraints
- [ ] Position blocking (prevent specific players from specific positions)
- [ ] Generate multiple valid lineups (3-5) and choose one
- [ ] No player sits consecutive innings
- [ ] Every player gets 2+ infield positions by end of inning 4
- [ ] No same position in consecutive innings (except P/C)
- [ ] Continuous batting order with cross-game rotation fairness
- [ ] Game history tracking (batting order, fielding positions, bench time)
- [ ] Printable single-page dugout card (grid: columns = innings, rows = positions)
- [ ] Batting order displayed on dugout card
- [ ] Privacy: all data stored as local files only, never sent to a server

### Out of Scope

- Real-time collaboration or multi-device sync — single coach, single browser
- Mobile app — web app works on phone browser if needed
- Game stats or scorekeeping — this is lineup generation only
- OAuth or user accounts — no login needed
- 10-fielder or non-standard position layouts

## Context

- Existing app at `C:\repos\baseball-coach` has working lineup generation logic (constraint-based auto-generator with retry mechanism, validation system). That logic should be extracted and adapted.
- Existing app is React 19 + TypeScript, deployed to Azure Static Web Apps. New app can use whatever stack makes sense but the lineup algorithm is proven and should be reused.
- The existing app hardcodes 5 innings and 11 players — new app needs to make these configurable.
- The existing export is clipboard-only tab-separated text. New app needs a proper printable layout.
- Coach generates lineup before the game, prints it, brings it to the field. No need for at-the-field editing or phone-first design.

## Constraints

- **Privacy**: Player names never leave the coach's machine. All data stored as local CSV files. No analytics, no server calls with PII.
- **Printability**: Dugout card must fit one page and be readable from a few feet away in a dugout.
- **Reuse**: Lineup generation logic from `C:\repos\baseball-coach\src\App.tsx` (lines ~219-483) should be adapted, not rewritten from scratch.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local CSV files for roster + history | Privacy-first — files stay on coach's machine, easy to back up, no server | — Pending |
| Continuous batting order | League rules — all kids bat in rotation regardless of fielding status | — Pending |
| Grid by inning for dugout card | Coach's preference — columns = innings, rows = positions, each cell = player name | — Pending |
| Pre-assign P/C, auto-generate rest | Same workflow as existing app, coach knows who's pitching/catching | — Pending |

---
*Last updated: 2026-02-09 after requirements definition*
