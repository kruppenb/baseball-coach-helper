# Phase 1: Foundation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Roster management and game configuration UI. Users can add/edit/remove players, configure innings (5 or 6), and mark players as absent before lineup generation. No lineup generation, no batting order, no history tracking.

</domain>

<decisions>
## Implementation Decisions

### Roster entry flow
- Quick-add inline: single text input, coach types "Jake R" and hits enter
- Single input field for full name (first name + last initial together)
- One player at a time — no batch/bulk entry needed (roster is ~12-15 kids)
- Auto-capitalize names and warn on duplicate entries

### Player list & editing
- Click player name to edit inline — name becomes editable in place
- Alphabetical sort by first name, always
- Delete requires confirmation before removing
- Show player count (e.g., "12 players") visible on the roster

### Game-day setup
- Tap a player to toggle present/absent — absent players visually dimmed
- Everyone defaults to present; coach only marks who's absent
- Inning count (5 or 6) is a persistent setting — set once, stays until changed
- Inning config lives in a settings area, not on the main roster page

### App shell & navigation
- Web app running in the browser (no install, works on phone and laptop)
- Tabbed navigation: Roster | Game Setup | (future tabs for Lineup, History)
- Clean and minimal visual style — high contrast, large tap targets, utility-first
- Online-only — no offline support needed

### Claude's Discretion
- Specific CSS framework or component library choice
- Tab styling and transitions
- Empty roster state messaging
- Exact layout spacing and typography
- Settings page structure beyond inning config

</decisions>

<specifics>
## Specific Ideas

- Coach uses this in a dugout, possibly on a phone, possibly in sunlight — readability matters
- Utility-first feel, like a sports scorekeeping app — not flashy, just functional
- Tabs should scale to accommodate future phases (Lineup, History tabs coming later)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-09*
