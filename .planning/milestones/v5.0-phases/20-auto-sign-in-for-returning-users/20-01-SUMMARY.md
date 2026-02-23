---
phase: 20-auto-sign-in-for-returning-users
plan: 01
subsystem: auth
tags: [localStorage, swa-auth, auto-redirect, returning-users]

# Dependency graph
requires:
  - phase: 19-welcome-popup-and-local-mode-onboarding
    provides: Welcome dialog, welcome-dismissed localStorage flag, onboarding useEffect in AppShell
provides:
  - has-authed localStorage flag set on successful Microsoft authentication
  - Auto-redirect to /.auth/login/aad for returning users with expired sessions
  - Silent fallback to unauthenticated mode on auth failure via ?auth=auto URL param detection
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [URL param detection for auth redirect result, localStorage flag for cross-session state]

key-files:
  created: []
  modified:
    - src/auth/AuthContext.tsx
    - src/components/app-shell/AppShell.tsx

key-decisions:
  - "Single redirect attempt with ?auth=auto marker — second identical redirect to expired cookie-based session would also fail, so one round-trip is sufficient"
  - "DEV mode skips auto-redirect entirely since SWA auth endpoints are not available on Vite dev server"
  - "URL cleanup via history.replaceState on failed auth return — removes ?auth=auto without page reload"

patterns-established:
  - "URL param marker pattern: append query param before redirect, check on return to detect success/failure"
  - "localStorage flag layering: has-authed (auth users) vs welcome-dismissed (local-mode users) as distinct signals"

requirements-completed: [ASIG-01, ASIG-02, ASIG-03]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 20 Plan 01: Auto Sign-In for Returning Users Summary

**Auto-redirect returning users to Microsoft login via has-authed localStorage flag with silent fallback on auth failure using ?auth=auto URL param detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T06:04:30Z
- **Completed:** 2026-02-23T06:06:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- AuthContext sets `has-authed` localStorage flag on successful Microsoft authentication, persisting across sessions
- AppShell auto-redirects returning users (has-authed + no active session) to `/.auth/login/aad` with `?auth=auto` marker
- Failed auth attempts detected via `?auth=auto` URL param, cleaned up silently, app loads in unauthenticated mode
- Local-mode users (welcome-dismissed only) and first-time visitors completely unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Set returning-user flag on successful authentication** - `5bcaa43` (feat)
2. **Task 2: Implement auto-redirect with retry and silent fallback in AppShell** - `d636bf4` (feat)

## Files Created/Modified
- `src/auth/AuthContext.tsx` - Sets `has-authed` localStorage flag when clientPrincipal is truthy after successful /.auth/me fetch
- `src/components/app-shell/AppShell.tsx` - Onboarding useEffect rewritten with three-way branching: signed-in users (no-op), returning users (auto-redirect or silent fallback), fresh/local-mode users (welcome popup or no-op)

## Decisions Made
- Single redirect attempt is sufficient: SWA auth is cookie-based, so if the first redirect to Microsoft returns without a session, a second identical request would also fail. The `?auth=auto` return IS the failure signal.
- DEV mode skips auto-redirect entirely since SWA auth endpoints don't exist on the Vite dev server.
- URL cleanup uses `window.history.replaceState` to remove the `?auth=auto` param without triggering a page reload.
- The `has-authed` flag is never cleared on auth failure per user decision -- every future visit will attempt auto-redirect again.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auto sign-in feature complete and ready for production deployment
- No blockers or concerns
- Phase 20 is the final planned phase

## Self-Check: PASSED

All files exist, all commits verified, SUMMARY.md created.

---
*Phase: 20-auto-sign-in-for-returning-users*
*Completed: 2026-02-23*
