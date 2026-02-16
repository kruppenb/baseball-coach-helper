# Roadmap: Baseball Lineup Builder

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-11)
- ✅ **v2.0 Azure Cloud Sync** — Phases 5-9 (shipped 2026-02-14)
- 🚧 **v3.0 UX Overhaul** — Phases 10-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-02-09
- [x] Phase 2: Lineup Engine (5/5 plans) — completed 2026-02-10
- [x] Phase 3: Batting Order (2/2 plans) — completed 2026-02-10
- [x] Phase 3.1: UI Fixes (2/2 plans) — completed 2026-02-10 (INSERTED)
- [x] Phase 4: History & Output (5/5 plans) — completed 2026-02-11

</details>

<details>
<summary>✅ v2.0 Azure Cloud Sync (Phases 5-9) — SHIPPED 2026-02-14</summary>

- [x] Phase 5: Auth Layer (2/2 plans) — completed 2026-02-12
- [x] Phase 6: API + Database (2/2 plans) — completed 2026-02-13
- [x] Phase 7: Sync Engine (2/2 plans) — completed 2026-02-12
- [x] Phase 8: Data Migration (1/1 plan) — completed 2026-02-13
- [x] Phase 9: PWA + Deployment (2/2 plans) — completed 2026-02-13

</details>

### 🚧 v3.0 UX Overhaul (In Progress)

**Milestone Goal:** Streamline the game-day experience with a simplified flow, drag-and-drop editing, best-of-N lineup generation, and user-controlled sync conflict resolution.

- [x] **Phase 10: App Restructuring and Game Day Flow** — Game-day-first tab structure with stepper flow and consolidated Settings page (completed 2026-02-15)
- [x] **Phase 11: Drag-and-Drop Editing** — Drag-and-drop fielding lineup and batting order editing with live validation (completed 2026-02-16)
- [x] **Phase 12: Scored Generation and Batting Order** — Best-of-N lineup generation with fairness scoring and auto batting order (completed 2026-02-16)
- [ ] **Phase 13: Sync Hardening** — ETag-based conflict detection with coach-facing conflict resolution

## Phase Details

### Phase 10: App Restructuring and Game Day Flow
**Goal**: Coach opens the app and lands on a guided game-day stepper with roster/settings consolidated into a separate page
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, SETT-01, SETT-02, SETT-03, SETT-04, SETT-05
**Success Criteria** (what must be TRUE):
  1. App opens to a Game Day tab by default showing a stepper flow (Attendance through Print)
  2. P/C assignment step displays last 2 games' pitcher and catcher history for each player
  3. Absent players are visually greyed out and cannot be selected for P/C assignments
  4. Settings page contains roster management, CSV import/export, position blocks, innings config, and sync status — all functional
  5. Previous game's batting order is visible alongside the current auto-generated order for fairness comparison
**Plans:** 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md — App shell restructure (2-tab bottom nav, stepper hook, Settings page)
- [x] 10-02-PLAN.md — Game Day stepper container, Attendance step, P/C Assignment step with history
- [x] 10-03-PLAN.md — Generate, Review (with batting order comparison), and Print steps

### Phase 11: Drag-and-Drop Editing
**Goal**: Coach can drag players to swap fielding positions and reorder the batting order, with real-time constraint feedback on every edit
**Depends on**: Phase 10 (stepper layout provides the container for DnD interactions)
**Requirements**: DND-01, DND-02, DND-03, DND-04
**Success Criteria** (what must be TRUE):
  1. Coach can drag a player in the fielding grid to swap with another player within the same inning
  2. Coach can drag batting order entries to reorder them
  3. Constraint violations appear in real-time as the coach makes drag edits (no page reload or manual check needed)
  4. Drag-and-drop works on mobile touch devices using visible drag handles without stealing page scroll
**Plans:** 2/2 plans complete

Plans:
- [ ] 11-01-PLAN.md — Install @dnd-kit, useLineupEditor hook, DraggableLineupGrid for fielding swaps
- [ ] 11-02-PLAN.md — SortableBattingOrder, wire DnD into ReviewStep, human verification

### Phase 12: Scored Generation and Batting Order
**Goal**: App generates multiple lineups behind the scenes and presents the best one with a visible fairness score, plus auto-generates batting order without extra steps
**Depends on**: Phase 11 (coach needs DnD to tweak the recommended lineup after generation)
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04
**Success Criteria** (what must be TRUE):
  1. Clicking generate produces a single recommended lineup (best of ~10 generated behind the scenes) without the coach choosing from a list
  2. Coach can regenerate to get a fresh best lineup
  3. Fairness score is visible showing lineup quality breakdown (bench equity, infield balance, position variety)
  4. Batting order is auto-generated as part of the flow without a separate confirmation step
**Plans:** 2/2 plans complete

Plans:
- [ ] 12-01-PLAN.md — Lineup scoring algorithm, best-of-N generation, shared shuffle utility (TDD)
- [ ] 12-02-PLAN.md — FairnessScoreCard UI, auto batting order, live scoring in ReviewStep

### Phase 13: Sync Hardening
**Goal**: Cloud sync detects conflicts and lets the coach choose which version to keep instead of silently overwriting
**Depends on**: Phase 10 (Settings page hosts sync status; sync engine changes are independent of DnD/generation)
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. App detects when cloud data has changed since last pull (ETag mismatch) instead of blindly overwriting
  2. Coach sees a conflict dialog with "this device" vs "cloud" options and timestamps when a conflict is detected
  3. Active in-progress edits are not overwritten by background cloud pulls (dirty flag protection)
  4. API endpoints enforce optimistic concurrency via If-Match headers, returning 412 on conflicts
**Plans:** 2 plans

Plans:
- [ ] 13-01-PLAN.md — API optimistic concurrency (If-Match / accessCondition / 412 on all singleton PUT endpoints)
- [ ] 13-02-PLAN.md — Frontend ETag tracking, dirty flag, ConflictDialog, SyncContext wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-09 |
| 2. Lineup Engine | v1.0 | 5/5 | Complete | 2026-02-10 |
| 3. Batting Order | v1.0 | 2/2 | Complete | 2026-02-10 |
| 3.1 UI Fixes | v1.0 | 2/2 | Complete | 2026-02-10 |
| 4. History & Output | v1.0 | 5/5 | Complete | 2026-02-11 |
| 5. Auth Layer | v2.0 | 2/2 | Complete | 2026-02-12 |
| 6. API + Database | v2.0 | 2/2 | Complete | 2026-02-13 |
| 7. Sync Engine | v2.0 | 2/2 | Complete | 2026-02-12 |
| 8. Data Migration | v2.0 | 1/1 | Complete | 2026-02-13 |
| 9. PWA + Deployment | v2.0 | 2/2 | Complete | 2026-02-13 |
| 10. App Restructuring | v3.0 | 3/3 | Complete | 2026-02-15 |
| 11. Drag-and-Drop | v3.0 | Complete    | 2026-02-16 | - |
| 12. Scored Generation | v3.0 | Complete    | 2026-02-16 | - |
| 13. Sync Hardening | v3.0 | 0/TBD | Not started | - |
