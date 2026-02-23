# Phase 20: Auto Sign-In for Returning Users - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Seamless re-authentication for returning users. Users who previously signed in with Microsoft get automatically redirected to the login endpoint without seeing the welcome popup. If auto-redirect fails, the app falls back gracefully. This phase does NOT add new auth providers, account management, or session extension features.

</domain>

<decisions>
## Implementation Decisions

### Returning user detection
- Set a distinct localStorage flag (separate from `welcome-dismissed`) on successful sign-in to mark "has previously authenticated"
- This distinguishes "signed in before" from "dismissed welcome as local user"
- Claude's discretion on the exact key name and value scheme

### Redirect experience
- Claude's discretion on what the user sees during auto-redirect (loading state, brief message, etc.)
- Claude's discretion on timing/delay before redirect

### Fallback triggers
- Use a URL parameter approach: append a query param (e.g., `?auth=auto`) before redirecting to Microsoft login
- On return, if param is present + no valid session = auth failed or was cancelled
- Retry once silently before falling back — if second attempt also fails, give up
- On final failure: show the app directly in unauthenticated mode (no welcome popup, no error message)
- The "previously signed in" flag is never cleared on failure — every future visit will attempt auto-redirect again

### Local-mode users
- Claude's discretion on handling users who previously chose "Continue without signing in"

### Claude's Discretion
- Redirect timing and any loading/transition UI
- localStorage key naming scheme
- Local-mode user handling on return visits
- Retry mechanism implementation details
- URL parameter cleanup after detection

</decisions>

<specifics>
## Specific Ideas

- User clearly wants the fallback to be invisible — if auth fails, just let them use the app, don't show popups or error messages
- The retry should be silent — user shouldn't perceive two separate redirect attempts
- URL parameter is the preferred detection mechanism over sessionStorage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-auto-sign-in-for-returning-users*
*Context gathered: 2026-02-22*
