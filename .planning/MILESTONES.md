# Milestones

## v1.0 MVP (Shipped: 2026-02-11)

**Phases completed:** 5 phases, 17 plans
**Lines of code:** 5,572 (TypeScript/CSS)
**Timeline:** 3 days (2026-02-09 → 2026-02-11)
**Git range:** ab0c75e → d0dd172

**Delivered:** Fair, constraint-based lineup generator for Little League coaches — roster management, auto-generation with 8 fairness rules, batting order rotation, game history, and printable dugout card.

**Key accomplishments:**
- Constraint-based lineup generation with 8 fairness rules (no consecutive bench, infield minimums, position blocking)
- Three-band batting order rotation with cross-game history fairness
- Printable dugout card — single-page landscape with fielding grid and batting order
- Roster management with CSV import/export for device sharing
- Game history with per-player tracking — auto-balances future lineups based on bench time
- Complete game-day workflow: roster → attendance → generate → finalize → print

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---


## v2.0 Azure Cloud Sync (Shipped: 2026-02-14)

**Phases completed:** 5 phases (5-9), 9 plans, 20 tasks
**Lines of code:** 7,409 (TypeScript/CSS) — up from 5,572
**Timeline:** 2 days (2026-02-12 → 2026-02-13)
**Git range:** 8c988d9 → f0bd7bc

**Delivered:** Azure cloud sync with Microsoft authentication, offline-first storage, automatic data migration, installable PWA, and CI/CD deployment — coaches can now use the app across devices with data syncing in the background.

**Key accomplishments:**
- Microsoft sign-in via SWA EasyAuth with Entra ID and invite-only access control
- Azure Functions API with Cosmos DB for per-coach cloud storage (10 endpoints)
- Offline-first sync engine — localStorage-first writes, background cloud sync
- Automatic one-time data migration from localStorage to cloud on first sign-in
- Installable PWA with offline caching and service worker
- GitHub Actions CI/CD with OIDC deploying to Azure Static Web Apps

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`

---


## v3.0 UX Overhaul (Shipped: 2026-02-16)

**Phases completed:** 5 phases (10-13.1), 10 plans, 21 tasks
**Lines of code:** 10,975 (TypeScript/CSS) — up from 7,409
**Timeline:** 2 days (2026-02-15 → 2026-02-16)
**Git range:** 9a20389 → 0270af4

**Delivered:** Game-day UX overhaul — guided stepper flow, drag-and-drop lineup and batting order editing with live validation, best-of-10 scored lineup generation with fairness breakdown, and ETag-based sync conflict resolution with coach-facing dialog.

**Key accomplishments:**
- Game-day-first app with guided 5-step stepper (Attendance → P/C → Generate → Review → Print)
- Drag-and-drop fielding lineup swaps and batting order reordering with live constraint validation
- Best-of-10 scored lineup generation with visible fairness breakdown (bench equity, infield balance, position variety)
- ETag-based optimistic concurrency with coach-facing conflict dialog (this device vs cloud)
- Offline-to-online data preservation — local edits trigger conflict resolution on login
- Consolidated Settings page with roster, CSV, position blocks, innings, and sync status

**Archive:** `.planning/milestones/v3.0-ROADMAP.md`, `.planning/milestones/v3.0-REQUIREMENTS.md`

---


## v4.0 Desktop UI and Flow (Shipped: 2026-02-17)

**Phases completed:** 5 phases (14-18), 8 plans, 16 tasks
**Lines of code:** 13,103 (TypeScript/CSS) — up from 10,975
**Timeline:** 2 days (2026-02-16 → 2026-02-17)
**Git range:** 9c3acd5 → 79a8d91

**Delivered:** Responsive desktop layout showing all game-day steps at once, streamlined new-game and print-to-save flow, game history management with delete and undo, and polished desktop styling across all components.

**Key accomplishments:**
- Responsive multi-column desktop layout showing all game-day sections simultaneously (attendance, P/C, lineup, batting order)
- Streamlined New Game flow with confirmation dialog and single-action state reset
- Print-as-save flow replacing Finalize step — printing auto-saves lineup to game history with duplicate detection
- Game history management with swipe-to-delete, undo toast, and expandable detail cards
- Desktop DnD edits persist to game history — edited lineups and batting orders save on print via refs
- DELETE API endpoint for cloud-synced game history cleanup

**Archive:** `.planning/milestones/v4.0-ROADMAP.md`, `.planning/milestones/v4.0-REQUIREMENTS.md`

---


## v5.0 Start Experience (Shipped: 2026-02-23)

**Phases completed:** 3 phases (19-20), 3 plans, 6 tasks
**Lines of code:** 13,776 (TypeScript/CSS) — up from 13,103
**Timeline:** 1 day (2026-02-22)
**Git range:** 00cb33d → 122ab90

**Delivered:** First-launch experience improvements — welcome popup for new visitors with sign-in or continue-without choice, local-mode explanation, auto-redirect to Microsoft login for returning users with silent fallback, and PR preview environments for CI/CD.

**Key accomplishments:**
- Welcome popup for first-time visitors with "Sign in with Microsoft" and "Continue without signing in" choices
- Local-mode explanation dialog with device-only data, CSV import/export, and sign-in-later guidance
- Auto-redirect returning users to Microsoft login via localStorage flag with silent fallback on failure
- PR preview environments via SWA — API deployment gated to push-to-main only
- Three-way onboarding branching: signed-in (no-op), returning (auto-redirect), fresh/local (welcome popup)

**Archive:** `.planning/milestones/v5.0-ROADMAP.md`, `.planning/milestones/v5.0-REQUIREMENTS.md`

---

