# Roadmap: Baseball Lineup Builder

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-02-11)
- ✅ **v2.0 Azure Cloud Sync** — Phases 5-9 (shipped 2026-02-14)
- ✅ **v3.0 UX Overhaul** — Phases 10-13.1 (shipped 2026-02-16)
- ✅ **v4.0 Desktop UI and Flow** — Phases 14-18 (shipped 2026-02-17)
- 🚧 **v5.0 Start Experience** — Phases 19-20 (in progress)

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

<details>
<summary>✅ v4.0 Desktop UI and Flow (Phases 14-18) — SHIPPED 2026-02-17</summary>

- [x] Phase 14: Responsive Desktop Layout (2/2 plans) — completed 2026-02-17
- [x] Phase 15: Game Flow Streamlining (2/2 plans) — completed 2026-02-17
- [x] Phase 16: Game History Management (2/2 plans) — completed 2026-02-17
- [x] Phase 17: Game Flow Gap Closure (1/1 plan) — completed 2026-02-17 (Gap Closure)
- [x] Phase 18: v4.0 Polish and Closeout (1/1 plan) — completed 2026-02-17 (Gap Closure)

</details>

### v5.0 Start Experience (In Progress)

- [x] **Phase 19: Welcome Popup and Local-Mode Onboarding** — First-time visitor sees welcome dialog with sign-in or continue-without, plus local-mode explanation (completed 2026-02-23)
- [x] **Phase 19.1: Staging Environment and Deployment Slot Swap** — PR builds create frontend-only preview environments; API deploys only on push to main (completed 2026-02-23) (INSERTED)
- [ ] **Phase 20: Auto Sign-In for Returning Users** — Returning users auto-redirect to Microsoft login; fallback to welcome popup on failure

## Phase Details

### Phase 19: Welcome Popup and Local-Mode Onboarding
**Goal**: First-time visitors understand their options (sign in for cloud sync or continue locally) and make an informed choice
**Depends on**: Phase 18 (v4.0 complete)
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04
**Success Criteria** (what must be TRUE):
  1. First-time visitor sees a welcome popup offering "Sign in with Microsoft" or "Continue without signing in"
  2. Choosing "Continue without signing in" shows a one-time explanation that data stays on this device and mentions CSV import/export in Settings
  3. The local-mode explanation mentions the existing header link for signing in later
  4. Returning to the app after dismissing the welcome popup does not show it again
**Plans**: 1 plan

Plans:
- [ ] 19-01-PLAN.md — Welcome popup and local-mode onboarding dialogs with localStorage-based first-visit detection

### Phase 19.1: Staging environment and deployment slot swap (INSERTED)

**Goal:** PR branches get automatic preview environments so changes can be reviewed in a live staging URL before merging to main
**Depends on:** Phase 19
**Plans:** 1/1 plans complete

Plans:
- [x] 19.1-01-PLAN.md — Gate API deployment to main-only and document SWA preview environments

### Phase 20: Auto Sign-In for Returning Users
**Goal**: Returning users who previously signed in get seamlessly redirected to Microsoft login without friction
**Depends on**: Phase 19
**Requirements**: ASIG-01, ASIG-02, ASIG-03
**Success Criteria** (what must be TRUE):
  1. After a successful sign-in, the app sets a localStorage flag so it remembers the user has authenticated before
  2. A returning user with an expired session is automatically redirected to Microsoft login without seeing the welcome popup
  3. If auto-redirect fails or auth returns no valid session, the app falls back to showing the welcome popup
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 19 → 20

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
| 14. Desktop Layout | v4.0 | 2/2 | Complete | 2026-02-17 |
| 15. Game Flow | v4.0 | 2/2 | Complete | 2026-02-17 |
| 16. History Management | v4.0 | 2/2 | Complete | 2026-02-17 |
| 17. Gap Closure | v4.0 | 1/1 | Complete | 2026-02-17 |
| 18. Polish & Closeout | v4.0 | 1/1 | Complete | 2026-02-17 |
| 19. Welcome Popup | v5.0 | 1/1 | Complete | 2026-02-23 |
| 19.1 Staging & Preview | v5.0 | Complete    | 2026-02-23 | 2026-02-23 |
| 20. Auto Sign-In | v5.0 | 0/? | Not started | - |
