# Requirements: Baseball Lineup Builder

**Defined:** 2026-02-09
**Core Value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Roster

- [ ] **ROST-01**: User can add players to roster (first name, last initial)
- [ ] **ROST-02**: User can edit and remove players from roster
- [ ] **ROST-03**: User can import roster from a local CSV file
- [ ] **ROST-04**: User can export roster to a local CSV file
- [ ] **ROST-05**: User can configure number of innings (5 or 6)
- [ ] **ROST-06**: User can mark a player as absent for the current game

### Lineup Generation

- [ ] **LINE-01**: User can pre-assign pitchers to inning slots before generating
- [ ] **LINE-02**: User can pre-assign catchers to inning slots before generating
- [ ] **LINE-03**: Auto-generated lineup fills remaining positions respecting all constraints
- [ ] **LINE-04**: No player sits on bench for consecutive innings
- [ ] **LINE-05**: Every player gets 2+ infield positions by end of inning 4
- [ ] **LINE-06**: No player plays the same position in consecutive innings (except P/C)
- [ ] **LINE-07**: User can block specific positions for specific players
- [ ] **LINE-08**: User can generate multiple valid lineups (3-5) and choose one

### Batting Order

- [ ] **BATT-01**: App generates a continuous batting order including all rostered players
- [ ] **BATT-02**: Batting order is independent of fielding (all kids bat even when on bench)
- [ ] **BATT-03**: Batting order generation factors in history so kids rotate through top/middle/bottom across games

### Game History

- [ ] **HIST-01**: After finalizing a lineup, game data is saved to a local history file
- [ ] **HIST-02**: History tracks batting order position per player per game
- [ ] **HIST-03**: History tracks fielding positions played per player per game
- [ ] **HIST-04**: History tracks innings sat (bench) per player per game
- [ ] **HIST-05**: Lineup generation factors in history for cross-game fairness (bench time, position variety)

### Output

- [ ] **OUTP-01**: User can print a single-page dugout card (grid: rows = positions, columns = innings)
- [ ] **OUTP-02**: Batting order is displayed on the dugout card
- [ ] **OUTP-03**: Dugout card is readable from a few feet away in a dugout

### Validation

- [ ] **VALD-01**: Lineup is validated in real-time against all fairness constraints
- [ ] **VALD-02**: Validation errors use plain-language, coach-friendly messages

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements

- **ENHC-01**: Position preference per player (preferred positions, not just blocks)
- **ENHC-02**: Playing time transparency bands (visual fairness proof for parents)
- **ENHC-03**: Drag-and-drop position swaps for manual adjustments
- **ENHC-04**: Season summary report showing cumulative fairness stats

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud storage / user accounts | Privacy — no kids' names on servers |
| Stats tracking (batting avg, RBIs) | Different product — GameChanger owns this |
| Team scheduling / communication | TeamSnap owns this — stay focused on lineups |
| Mobile native app | Web app works on phone browser |
| Multi-team management | Build for one team, one game at a time |
| Pitch count tracking | In-game feature, not pre-game lineup tool |
| OAuth / social login | No accounts needed |
| 10+ fielder positions | Standard 9-position Little League only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROST-01 | — | Pending |
| ROST-02 | — | Pending |
| ROST-03 | — | Pending |
| ROST-04 | — | Pending |
| ROST-05 | — | Pending |
| ROST-06 | — | Pending |
| LINE-01 | — | Pending |
| LINE-02 | — | Pending |
| LINE-03 | — | Pending |
| LINE-04 | — | Pending |
| LINE-05 | — | Pending |
| LINE-06 | — | Pending |
| LINE-07 | — | Pending |
| LINE-08 | — | Pending |
| BATT-01 | — | Pending |
| BATT-02 | — | Pending |
| BATT-03 | — | Pending |
| HIST-01 | — | Pending |
| HIST-02 | — | Pending |
| HIST-03 | — | Pending |
| HIST-04 | — | Pending |
| HIST-05 | — | Pending |
| OUTP-01 | — | Pending |
| OUTP-02 | — | Pending |
| OUTP-03 | — | Pending |
| VALD-01 | — | Pending |
| VALD-02 | — | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
