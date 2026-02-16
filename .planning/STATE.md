# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.
**Current focus:** v3.0 UX Overhaul — Phase 13.1 (Offline-to-Online Data Preservation) COMPLETE

## Current Position

Milestone: v3.0 UX Overhaul
Phase: 13.1 (Offline-to-Online Data Preservation) -- COMPLETE
Plan: 1 of 1 in current phase (done)
Status: Phase 13.1 complete -- pull-time conflict detection shipped
Last activity: 2026-02-15 — Completed 13.1-01 (Offline-to-Online Data Preservation)

Progress: [████████████████████████████████████] 36/36 plans (v1+v2+v3.0 all phases + 13.1 complete)

## Performance Metrics

**Velocity (from v1.0 + v2.0 + v3.0):**
- Total plans completed: 36
- Average duration: 4 min
- Total execution time: 142 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 10 | 01 | 3min | 2 | 7 |
| 10 | 02 | 3min | 2 | 10 |
| 10 | 03 | 2min | 2 | 8 |
| 11 | 01 | 3min | 2 | 6 |
| 11 | 02 | 4min | 3 | 7 |
| 12 | 01 | 5min | 2 | 6 |
| 12 | 02 | 3min | 2 | 5 |
| 13 | 01 | 2min | 2 | 4 |
| 13 | 02 | 4min | 2 | 6 |
| 13.1 | 01 | 1min | 2 | 2 |

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table (21 decisions, all validated).
Recent decisions affecting current work:

- [v3.0 roadmap]: Merged scoring logic into Phase 12 (Scored Generation) rather than a separate foundation phase — depth "quick" favors fewer phases, and scoring logic is not user-observable on its own
- [v3.0 roadmap]: Phase 13 (Sync Hardening) depends only on Phase 10, not on DnD/generation — sync changes are independent of UX features
- [10-01]: Stepper uses useReducer instead of useState for complex state transitions
- [10-01]: Tab bar active indicator changed from bottom-border to top-border for bottom positioning
- [10-01]: SettingsPage reuses all existing child components without modification
- [10-02]: PCAssignmentStep uses single pitcher/catcher dropdown applied to all innings (simplified vs per-inning)
- [10-02]: Auto-clear catcher when selected pitcher was the catcher to prevent same-player P/C conflict
- [10-02]: Absent players shown greyed at bottom of P/C history table but excluded from dropdowns
- [10-03]: ReviewStep inlines computeFairnessSummary rather than extracting to shared util
- [10-03]: Previous batting order comparison uses side-by-side flex layout
- [10-03]: PrintStep is terminal step with no onComplete prop
- [11-01]: Pin @dnd-kit packages to tilde (~0.2.4) for patch-only updates since pre-1.0
- [11-01]: Single DragDropProvider for entire grid with accept filter rather than per-inning providers
- [11-01]: useLineupEditor uses JSON.stringify comparison for hasEdits (sufficient for small lineup objects)
- [11-02]: PrintStep reads from last game history entry (finalized edited data) instead of original context hooks
- [11-02]: useBattingOrder.confirm accepts optional orderOverride for edited batting order to batting history
- [11-02]: SortableBattingOrder uses isSortable type guard with initialIndex/index for reorder
- [12-01]: Scoring weights: bench equity 0.5, infield balance 0.3, position variety 0.2 -- bench fairness most important for youth baseball
- [12-01]: scoreLineup is a pure function (no side effects) -- enables live recomputation after DnD edits via useMemo
- [12-01]: generateBestLineup uses simple loop without deduplication since scoring handles ranking
- [12-02]: FairnessScoreCard is presentational-only -- score computed ephemerally via useMemo, never persisted
- [12-02]: Batting order auto-generates on mount and regenerate -- manual button removed entirely
- [12-02]: LineupState type unchanged -- generatedLineups still holds [bestLineup] array for cloud sync stability
- [13-01]: accessCondition only on singleton doc upserts -- collection-mode endpoints (gameHistory, battingHistory) remain unconditional
- [13-01]: 412 response includes cloudData/cloudEtag/cloudUpdatedAt so frontend can resolve conflicts without extra GET
- [13-01]: If-Match header is optional -- omitting it allows unconditional upsert for backward compatibility
- [13-02]: ConflictDialog uses native HTML dialog with showModal() -- no modal library dependency, automatic focus trapping and backdrop
- [13-02]: Escape key blocked on conflict dialog to force deliberate choice between local and cloud
- [13-02]: Keep This Device updates stored ETag to cloud's current value then re-pushes -- ensures next upsert wins
- [13-02]: retryPendingPushes does not pass onConflict -- offline-to-online retries fail silently on 412, next manual edit triggers proper handling
- [13.1-01]: JSON.stringify comparison for pull-time conflict detection (matches existing codebase pattern in useLineupEditor)
- [13.1-01]: Conflict check only for singleton mode -- collection-mode keys (gameHistory, battingHistory) unaffected
- [13.1-01]: pulledKeys.add on conflict to prevent duplicate conflict dialogs on re-render

### Pending Todos

None.

### Roadmap Evolution

- Phase 13.1 inserted after Phase 13: Offline-to-Online Data Preservation (URGENT) — Local changes made while logged out are overwritten when logging in instead of showing a conflict dialog. Discovered during Phase 13 UAT.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-15 (Phase 13.1 complete -- Offline-to-Online Data Preservation)
Stopped at: Completed 13.1-01-PLAN.md — Offline-to-Online Data Preservation
Resume file: .planning/phases/13.1-offline-to-online-data-preservation/13.1-01-SUMMARY.md
