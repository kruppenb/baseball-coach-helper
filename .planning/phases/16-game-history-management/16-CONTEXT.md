# Phase 16: Game History Management - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Coach can review and clean up saved game history entries. View a list of saved games with summary info, expand entries for detail, and delete individual entries (removed from both local storage and cloud sync). No editing of past games, no re-loading lineups, no bulk operations.

</domain>

<decisions>
## Implementation Decisions

### List presentation
- Summary-level info per entry: date, player count, innings, and game label (e.g., "vs Tigers")
- Date is the primary/prominent text, game label is secondary underneath
- Sorted newest first, flat list (no date grouping headers)
- Tap to expand an entry inline and see more detail (positions, batting order)

### Delete experience
- Swipe-to-delete on mobile, visible delete button on desktop
- No confirmation dialog — immediate delete with a 5-second undo toast
- Single delete only — no multi-select or bulk delete

### Navigation & access
- History lives as a tab on the main page alongside the Game Day view
- Tab labeled "History" — no badge or game count
- On desktop, history uses a single centered list (not two-column layout)

### Claude's Discretion
- Expanded detail layout and content
- Empty state design when no games are saved
- Exact swipe gesture implementation
- Loading and error state handling
- Sync status indicators (if any)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-game-history-management*
*Context gathered: 2026-02-16*
