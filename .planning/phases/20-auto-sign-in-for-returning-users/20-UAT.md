---
status: complete
phase: 20-auto-sign-in-for-returning-users
source: [20-01-SUMMARY.md]
started: 2026-02-22T20:00:00Z
updated: 2026-02-23T07:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Returning user auto-redirects to Microsoft login
expected: Open the deployed app while not signed in but with `has-authed` in localStorage. The app auto-redirects to Microsoft login without showing the welcome popup.
result: pass

### 2. Successful sign-in sets has-authed flag
expected: After signing in via Microsoft, open browser DevTools > Application > Local Storage. A `has-authed` key with value `true` should be present.
result: pass

### 3. Failed auto-redirect falls back silently
expected: Visit the deployed app with `?auth=auto` in the URL while not signed in (simulating a failed auto-redirect return). The app loads normally in unauthenticated mode — no error, no popup, no redirect loop. The `?auth=auto` param is removed from the URL.
result: pass

### 4. Local-mode users are not auto-redirected
expected: In a browser with only `welcome-dismissed` in localStorage (no `has-authed`), visit the app. The app loads normally without redirecting to Microsoft login. No welcome popup shown.
result: pass

### 5. First-time visitors still see welcome popup
expected: In a clean browser (no localStorage flags), visit the deployed app. The welcome popup appears as before, offering Sign In and Continue Local options.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
