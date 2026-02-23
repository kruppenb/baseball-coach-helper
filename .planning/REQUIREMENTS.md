# Requirements: Baseball Lineup Builder

**Defined:** 2026-02-22
**Core Value:** Every kid gets fair playing time with a valid, printable lineup the coach can generate before the game and hang in the dugout.

## v5.0 Requirements

Requirements for v5.0 Start Experience. Each maps to roadmap phases.

### Onboarding

- [x] **ONBD-01**: User sees a welcome popup on first visit offering "Sign in with Microsoft" or "Continue without signing in"
- [x] **ONBD-02**: User who chooses "Continue without signing in" sees a one-time explanation that data stays on this browser/device and CSV import/export is available in Settings
- [x] **ONBD-03**: User who dismisses the welcome popup does not see it again on subsequent visits
- [x] **ONBD-04**: Local-mode explanation mentions the existing header link for signing in later

### Auto Sign-In

- [ ] **ASIG-01**: App remembers when a user has previously signed in (localStorage flag set on successful auth)
- [ ] **ASIG-02**: Returning user with expired session is auto-redirected to Microsoft login without seeing the welcome popup
- [ ] **ASIG-03**: If auto-redirect fails or auth returns no session, app falls back to showing the welcome popup

## Future Requirements

None deferred for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sign-in added to Settings page | Existing header link is sufficient for discovering sign-in |
| OAuth providers beyond Microsoft | Azure-native stack, Microsoft-only per project constraints |
| Onboarding tutorial/tour | Scope limited to auth flow — app is already intuitive |
| Account creation / self-service signup | Invite-only access model unchanged |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 19 | Complete |
| ONBD-02 | Phase 19 | Complete |
| ONBD-03 | Phase 19 | Complete |
| ONBD-04 | Phase 19 | Complete |
| ASIG-01 | Phase 20 | Pending |
| ASIG-02 | Phase 20 | Pending |
| ASIG-03 | Phase 20 | Pending |

**Coverage:**
- v5.0 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after roadmap creation*
