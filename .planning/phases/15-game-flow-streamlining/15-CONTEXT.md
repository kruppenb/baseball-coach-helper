# Phase 15: Game Flow Streamlining - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Simplify the game lifecycle so a coach can start a fresh game and save it to history without extra steps. A single "New Game" action resets state, printing the dugout card automatically saves to history, and there is no "Finalize Game" button or step. Roster management and game history viewing/deletion are separate phases.

</domain>

<decisions>
## Implementation Decisions

### "New Game" action
- Lives in the header/nav area, accessible from any screen
- Always visible (even on a fresh/empty game)
- Always shows a confirmation dialog before resetting
- Dialog offers three options: "Don't Save" / "Save & New" / "Cancel"
- "Save & New" saves a full lineup snapshot (attendance, P/C, lineup, batting order) to history
- "Save & New" is disabled/grayed out when no generated lineup exists — only "Don't Save" and "Cancel" available

### Reset behavior
- Clears everything: attendance, P/C assignments, generated lineup, batting order
- Roster and game history remain intact
- After reset, attendance defaults to all players present (coach unchecks absent players)
- No data carries over from the previous game

### Print-as-save experience
- Tapping Print opens a quick input field for an optional game label (pre-filled with date, e.g. "Feb 16 Game") before opening the browser print dialog
- Save happens when the print dialog opens (not after print completes)
- Duplicate detection prevents multiple history entries from opening/closing the print dialog repeatedly
- After print dialog closes, a toast notification confirms "Game saved to history"
- Saved metadata: date, player count, innings, P/C assignments, plus the optional game label

### Post-action state
- After printing/saving, coach stays on the current lineup view — can print again or start new game when ready
- Coach can print the same game multiple times freely; dupe protection ensures only one history entry
- If coach modifies inputs (attendance, P/C) after printing, the lineup is invalidated — must re-generate before printing again
- Re-printing after changes overwrites the existing history entry for this game (update, not duplicate)

### Claude's Discretion
- Exact confirmation dialog styling and animation
- Toast notification duration and position
- Game label input field design (inline vs modal)
- How the "stale lineup" invalidation is communicated to the coach

</decisions>

<specifics>
## Specific Ideas

- Confirmation dialog should offer "Save & New" to avoid losing a game the coach forgot to print — like an unsaved-changes dialog in a text editor
- Game label field pre-filled with date so the coach can just tap through quickly, but can type "vs Tigers" if they want
- Print button stays the same after saving — no state change to "Reprint" or "Saved"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-game-flow-streamlining*
*Context gathered: 2026-02-16*
