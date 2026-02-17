# Phase 14: Responsive Desktop Layout - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-column game-day layout on desktop-width screens showing attendance, P/C assignment, lineup grid, and batting order simultaneously. Mobile stepper flow preserved exactly as-is. Left column: attendance + P/C. Right column: lineup grid + batting order. No new features — layout adaptation only.

</domain>

<decisions>
## Implementation Decisions

### Desktop interaction flow
- No separate Review step on desktop — once generated, lineup + batting order show directly in the right column and coach can print immediately
- When attendance or P/C changes after generating, show a stale warning on the right column (keep old lineup visible, badge/banner indicating inputs changed, coach re-generates when ready)
- Sticky bottom bar with both Generate and Print actions, always accessible without scrolling

### Section presentation
- Cards with subtle shadows and rounded corners for each section (attendance, P/C, lineup grid, batting order)
- Subtle/muted section labels — present but not prominent, content speaks for itself
- Compact spacing — tight gaps between cards, minimize scrolling, fit as much on screen as possible
- Right column wider than left (roughly 40/60 split) since lineup grid and batting order have denser content

### Section sizing & scroll
- Cards grow to natural height — no internal scrolling within cards
- Page scrolls as a whole (normal document flow), no independent column scrolling
- No nested scrollbars — simple, predictable scroll behavior

### Claude's Discretion
- Guided vs free-form interaction model (whether sections are locked/grayed until prerequisites are met, or all editable at once)
- Generate button placement within the sticky bar layout
- Breakpoint threshold for desktop vs mobile switch
- Tablet-sized behavior (between phone and desktop)
- Exact card shadow depth, border radius, and spacing values
- Stale warning visual design (badge vs banner vs overlay)

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

*Phase: 14-responsive-desktop-layout*
*Context gathered: 2026-02-16*
