# Roadmap: Baseball Lineup Builder

## Overview

Build a fair, constraint-based lineup generator for Little League coaches in 4 phases. Phase 1 establishes roster management foundation. Phase 2 delivers the core auto-generation engine with validation. Phase 3 adds independent batting order generation. Phase 4 completes with game history tracking and printable dugout card output.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Roster management and configuration UI ✓
- [x] **Phase 2: Lineup Engine** - Constraint-based auto-generation with validation ✓
- [x] **Phase 3: Batting Order** - Continuous batting rotation with cross-game fairness ✓
- [ ] **Phase 4: History & Output** - Game tracking and printable dugout card

## Phase Details

### Phase 1: Foundation
**Goal**: Users can manage rosters and configure game settings
**Depends on**: Nothing (first phase)
**Requirements**: ROST-01, ROST-02, ROST-05, ROST-06
**Success Criteria** (what must be TRUE):
  1. User can add players to roster with first name and last initial
  2. User can edit existing player names and remove players
  3. User can configure number of innings (5 or 6) for the game
  4. User can mark players as absent before generating lineup
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold project, types, hooks, design tokens, and app shell with tabbed navigation
- [x] 01-02-PLAN.md — Roster page with quick-add, inline edit, delete confirmation, and player list
- [x] 01-03-PLAN.md — Game Setup page with attendance toggling and inning configuration

### Phase 2: Lineup Engine
**Goal**: Auto-generated lineups respect all fairness constraints
**Depends on**: Phase 1
**Requirements**: LINE-01, LINE-02, LINE-03, LINE-04, LINE-05, LINE-06, LINE-07, LINE-08, VALD-01, VALD-02
**Success Criteria** (what must be TRUE):
  1. User can pre-assign specific pitchers and catchers to inning slots
  2. User can block specific positions for specific players
  3. Auto-generation fills all remaining positions with valid assignments
  4. Generated lineup respects no-consecutive-bench rule
  5. Generated lineup ensures every player gets 2+ infield positions by inning 4
  6. Generated lineup prevents same position in consecutive innings (except P/C)
  7. User can generate 3-5 valid lineup options and choose one
  8. Validation errors display in plain-language, coach-friendly messages
**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Lineup types and validation system (TDD)
- [x] 02-02-PLAN.md — Lineup generation algorithm (TDD)
- [x] 02-03-PLAN.md — Pre-assignment and position blocking UI components
- [x] 02-04-PLAN.md — useLineup hook, lineup grid, and validation panel
- [x] 02-05-PLAN.md — LineupPage container, lineup options, and AppShell wiring

### Phase 3: Batting Order
**Goal**: Continuous batting order rotates fairly across games
**Depends on**: Phase 2
**Requirements**: BATT-01, BATT-02, BATT-03
**Success Criteria** (what must be TRUE):
  1. User can generate a continuous batting order including all rostered players
  2. Batting order is independent of fielding assignments
  3. Batting order generation considers history so kids rotate through lineup positions
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Batting order types and three-band fairness algorithm (TDD)
- [x] 03-02-PLAN.md — useBattingOrder hook, UI components, and LineupPage integration

### Phase 4: History & Output
**Goal**: Lineups are saved to history and printable on single page
**Depends on**: Phase 3
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, OUTP-01, OUTP-02, OUTP-03, ROST-03, ROST-04
**Success Criteria** (what must be TRUE):
  1. After finalizing lineup, game data saves to local history file
  2. History tracks batting order position, fielding positions, and bench time per player per game
  3. Future lineup generation factors in history for cross-game fairness
  4. User can import roster from local CSV file
  5. User can export roster to local CSV file
  6. User can print a single-page dugout card with grid layout (rows=positions, columns=innings)
  7. Dugout card displays batting order alongside fielding grid
  8. Printed dugout card is readable from a few feet away in dugout
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✓ Complete | 2026-02-09 |
| 2. Lineup Engine | 5/5 | ✓ Complete | 2026-02-10 |
| 3. Batting Order | 2/2 | ✓ Complete | 2026-02-10 |
| 4. History & Output | 0/TBD | Not started | - |
