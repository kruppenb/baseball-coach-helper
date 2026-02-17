# Requirements: Baseball Lineup Builder

**Defined:** 2026-02-16
**Core Value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## v4.0 Requirements

Requirements for v4.0 Desktop UI and Flow. Each maps to roadmap phases.

### Desktop Layout

- [ ] **DESK-01**: User sees all game-day sections (attendance, P/C assignment, lineup grid, batting order) in a multi-column layout on screens wider than tablet breakpoint
- [ ] **DESK-02**: Attendance and P/C sections appear in a left column while lineup grid and batting order appear in a right column on desktop
- [ ] **DESK-03**: Mobile stepper flow (Attendance → P/C → Generate → Review → Print) is unchanged at narrow screen widths
- [ ] **DESK-04**: Desktop layout adapts fluidly between tablet and large desktop widths without horizontal scrolling

### Game Flow

- [ ] **GFLW-01**: User can start a new game with a single action when a previous game's lineup exists
- [ ] **GFLW-02**: New Game action resets attendance, P/C assignments, and generated lineup while preserving roster and history
- [ ] **GFLW-03**: Printing the dugout card auto-saves the current lineup to game history
- [ ] **GFLW-04**: No separate "Finalize Game" button or step exists in the flow

### History Management

- [ ] **HMGT-01**: User can view a list of saved game history entries with date and summary
- [ ] **HMGT-02**: User can delete individual game history entries

## Future Requirements

### Deferred from v3.0

- **VIZD-01**: Diamond visualization (read-only field view per inning)
- **UNDO-01**: Undo/redo for drag-and-drop edits
- **SCOR-01**: Configurable scoring weights in Settings
- **SWAP-01**: Inline position swap suggestions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Animated lineup transitions (CSS View Transitions) | Deferred from v3.0, not related to layout restructure |
| Sidebar navigation | Bottom tab bar works well for 2-tab app |
| Drag-and-drop between columns on desktop | Existing DnD within inning/batting order is sufficient |
| Game history charts/trends | History management is view + delete, not analytics |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESK-01 | Phase 14 | Pending |
| DESK-02 | Phase 14 | Pending |
| DESK-03 | Phase 14 | Pending |
| DESK-04 | Phase 14 | Pending |
| GFLW-01 | Phase 15, Phase 18 (polish) | Pending |
| GFLW-02 | Phase 15 | Pending |
| GFLW-03 | Phase 17 (gap closure), Phase 18 (polish) | Pending |
| GFLW-04 | Phase 17 (gap closure) | Pending |
| HMGT-01 | Phase 16 | Pending |
| HMGT-02 | Phase 16 | Pending |

**Coverage:**
- v4.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-17 after Phase 18 gap closure assignment*
