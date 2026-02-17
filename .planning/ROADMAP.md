# Roadmap: Baseball Lineup Builder

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-11)
- ✅ **v2.0 Azure Cloud Sync** — Phases 5-9 (shipped 2026-02-14)
- ✅ **v3.0 UX Overhaul** — Phases 10-13.1 (shipped 2026-02-16)
- 🚧 **v4.0 Desktop UI and Flow** — Phases 14-16 (in progress)

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

<details>
<summary>✅ v3.0 UX Overhaul (Phases 10-13.1) — SHIPPED 2026-02-16</summary>

- [x] Phase 10: App Restructuring and Game Day Flow (3/3 plans) — completed 2026-02-15
- [x] Phase 11: Drag-and-Drop Editing (2/2 plans) — completed 2026-02-16
- [x] Phase 12: Scored Generation and Batting Order (2/2 plans) — completed 2026-02-16
- [x] Phase 13: Sync Hardening (2/2 plans) — completed 2026-02-16
- [x] Phase 13.1: Offline-to-Online Data Preservation (1/1 plan) — completed 2026-02-16 (INSERTED)

</details>

### 🚧 v4.0 Desktop UI and Flow (In Progress)

**Milestone Goal:** Responsive desktop layout showing all game-day steps at once, streamlined new-game and print-to-save flow, and game history management.

- [x] **Phase 14: Responsive Desktop Layout** - Multi-column game-day layout on wide screens, mobile stepper preserved (**Plans:** 2) (completed 2026-02-17)
- [ ] **Phase 15: Game Flow Streamlining** - New Game action, print-as-save, no Finalize step (**Plans:** 2)
- [ ] **Phase 16: Game History Management** - View and delete saved game history entries

## Phase Details

### Phase 14: Responsive Desktop Layout
**Goal**: Coach sees all game-day sections at once on a desktop screen, eliminating step-by-step navigation on wide viewports
**Depends on**: Phase 13.1 (v3.0 complete)
**Requirements**: DESK-01, DESK-02, DESK-03, DESK-04
**Success Criteria** (what must be TRUE):
  1. On a desktop-width browser, attendance, P/C assignment, lineup grid, and batting order are all visible simultaneously without scrolling between steps
  2. Attendance and P/C sections render in a left column while lineup grid and batting order render in a right column
  3. On a phone-width browser, the existing stepper flow (Attendance -> P/C -> Generate -> Review -> Print) works exactly as before
  4. Resizing the browser between phone and desktop widths transitions fluidly with no horizontal scrollbar appearing
**Plans:** 2/2 plans complete
Plans:
- [ ] 14-01-PLAN.md — Responsive infrastructure + desktop 2-column card layout
- [ ] 14-02-PLAN.md — Sticky action bar, responsive switching, visual verification

### Phase 15: Game Flow Streamlining
**Goal**: Coach can start a fresh game and save it to history without extra steps or buttons
**Depends on**: Phase 14
**Requirements**: GFLW-01, GFLW-02, GFLW-03, GFLW-04
**Success Criteria** (what must be TRUE):
  1. When a previous game's lineup exists, the coach can tap a single "New Game" action to start fresh
  2. After starting a new game, attendance is reset, P/C assignments are cleared, and the generated lineup is cleared -- but the roster and game history remain intact
  3. Printing the dugout card saves the current lineup, batting order, and game metadata to game history automatically
  4. There is no "Finalize Game" button or step anywhere in the app flow
**Plans:** 2
Plans:
- [ ] 15-01-PLAN.md — Data layer: types, save-with-label, dupe detection, reset, remove Finalize
- [ ] 15-02-PLAN.md — UI: New Game dialog, print-as-save flow, game label, toast

### Phase 16: Game History Management
**Goal**: Coach can review and clean up saved game history entries
**Depends on**: Phase 14
**Requirements**: HMGT-01, HMGT-02
**Success Criteria** (what must be TRUE):
  1. Coach can view a list of saved games showing date and a summary (player count, innings) for each entry
  2. Coach can delete an individual game history entry and it is removed from both local storage and cloud sync
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 14 -> 15 -> 16

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
| 11. Drag-and-Drop | v3.0 | 2/2 | Complete | 2026-02-16 |
| 12. Scored Generation | v3.0 | 2/2 | Complete | 2026-02-16 |
| 13. Sync Hardening | v3.0 | 2/2 | Complete | 2026-02-16 |
| 13.1 Offline-to-Online | v3.0 | 1/1 | Complete | 2026-02-16 |
| 14. Desktop Layout | v4.0 | Complete    | 2026-02-17 | - |
| 15. Game Flow | v4.0 | 0/? | Not started | - |
| 16. History Management | v4.0 | 0/? | Not started | - |
