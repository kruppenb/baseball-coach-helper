# Requirements: Baseball Lineup Builder

**Defined:** 2026-02-15
**Core Value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## v3 Requirements

Requirements for v3.0 UX Overhaul. Each maps to roadmap phases.

### Game Day Flow

- [ ] **FLOW-01**: Game Day is the primary/default tab when app opens
- [ ] **FLOW-02**: Stepper flow guides coach through: Attendance → P/C → Generate → Edit Lineup → Batting Order → Finalize → Print
- [ ] **FLOW-03**: P/C assignment step shows last 2 games' pitcher and catcher history
- [ ] **FLOW-04**: Absent players greyed out and not selectable for P/C assignment
- [ ] **FLOW-05**: Previous game's batting order shown alongside auto-generated order for fairness comparison

### Drag and Drop

- [ ] **DND-01**: User can drag-and-drop players in fielding grid to swap positions within an inning
- [ ] **DND-02**: User can drag-and-drop batting order to reorder players
- [ ] **DND-03**: Live constraint validation on every drag edit — shows violations in real-time
- [ ] **DND-04**: Drag-and-drop works on mobile touch devices via drag handles

### Lineup Generation

- [ ] **GEN-01**: App generates ~10 lineups behind the scenes and presents the best one based on fairness scoring
- [ ] **GEN-02**: User can regenerate to get a new best lineup
- [ ] **GEN-03**: Fairness score displayed showing lineup quality (bench equity, infield balance, position variety)
- [ ] **GEN-04**: Batting order auto-generated without separate confirmation step

### Sync Conflict Resolution

- [ ] **SYNC-01**: App detects sync conflicts using Cosmos DB ETags (If-Match / 412)
- [ ] **SYNC-02**: Conflict dialog shows "this device" vs "cloud" with timestamps — coach picks
- [ ] **SYNC-03**: Dirty flag prevents cloud pulls from overwriting active in-progress edits
- [ ] **SYNC-04**: API endpoints use If-Match headers for optimistic concurrency

### Settings Page

- [ ] **SETT-01**: Settings page consolidates roster management (add/edit/remove players)
- [ ] **SETT-02**: Settings page includes CSV import/export
- [ ] **SETT-03**: Settings page includes position blocks configuration
- [ ] **SETT-04**: Settings page includes innings configuration (5 or 6)
- [ ] **SETT-05**: Settings page includes sync status and settings

## Future Requirements

### Deferred from v3.0

- **VIZ-01**: Animated lineup transitions (CSS View Transitions)
- **VIZ-02**: Diamond visualization (read-only field view)
- **GEN-05**: Configurable scoring weights in Settings
- **DND-05**: Undo/redo for drag-and-drop edits
- **DND-06**: Inline position swap suggestions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Free-form diamond diagram editing | Too slow for 54 cells, not practical for game-day |
| Per-field merge conflict resolution | CRDT overkill for single-user app |
| Cross-inning drag-and-drop | Confusing semantics — swap within inning only |
| Auto-save on every drag operation | Would cause sync storm |
| Multi-coach real-time collaboration | WebSocket complexity, out of scope for single-coach app |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 10 | Pending |
| FLOW-02 | Phase 10 | Pending |
| FLOW-03 | Phase 10 | Pending |
| FLOW-04 | Phase 10 | Pending |
| FLOW-05 | Phase 10 | Pending |
| DND-01 | Phase 11 | Pending |
| DND-02 | Phase 11 | Pending |
| DND-03 | Phase 11 | Pending |
| DND-04 | Phase 11 | Pending |
| GEN-01 | Phase 12 | Pending |
| GEN-02 | Phase 12 | Pending |
| GEN-03 | Phase 12 | Pending |
| GEN-04 | Phase 12 | Pending |
| SYNC-01 | Phase 13 | Pending |
| SYNC-02 | Phase 13 | Pending |
| SYNC-03 | Phase 13 | Pending |
| SYNC-04 | Phase 13 | Pending |
| SETT-01 | Phase 10 | Pending |
| SETT-02 | Phase 10 | Pending |
| SETT-03 | Phase 10 | Pending |
| SETT-04 | Phase 10 | Pending |
| SETT-05 | Phase 10 | Pending |

**Coverage:**
- v3 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after v3.0 roadmap creation*
