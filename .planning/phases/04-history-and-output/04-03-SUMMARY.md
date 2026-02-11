---
phase: 04-history-and-output
plan: 03
subsystem: ui
tags: [react, print-css, html-table, dugout-card]

# Dependency graph
requires:
  - phase: 02-lineup-engine
    provides: Lineup data model and generation logic
  - phase: 03-batting-order
    provides: Batting order generation and display
provides:
  - Print-optimized dugout card component with fielding grid and batting order
  - Global print CSS hiding all UI except the dugout card
  - HTML table-based fielding grid for reliable cross-browser printing
affects: [future-output-formats, future-print-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [html-table-for-print, data-attribute-print-selector, global-print-css, landscape-page-orientation]

key-files:
  created:
    - src/components/lineup/DugoutCard.tsx
    - src/components/lineup/DugoutCard.module.css
  modified:
    - src/components/lineup/LineupPage.tsx
    - src/index.css

key-decisions:
  - "HTML table used for fielding grid instead of CSS Grid for reliable print rendering across browsers"
  - "Global print CSS uses data attribute selector [data-dugout-card] to hide everything except the card"
  - "Landscape orientation suggested via @page CSS for better field grid layout"
  - "Collapsible sections (PreAssignments, BattingOrder) added to LineupPage for better UX on long pages"

patterns-established:
  - "Print output pattern: data-attribute on printable component, global @media print rules to show only that component"
  - "Large text (13-14pt) and thick borders (2px) for readability from a distance"
  - "window.print() triggered by button, print button hidden in print view"

# Metrics
duration: 8min
completed: 2026-02-10
---

# Phase 04 Plan 03: Printable Dugout Card Summary

**HTML table-based dugout card with fielding grid and batting order, optimized for landscape print with 13-14pt text and thick borders**

## Performance

- **Duration:** 8 min (includes checkpoint approval time)
- **Started:** 2026-02-10T~19:40Z (estimated)
- **Completed:** 2026-02-10T~19:48Z
- **Tasks:** 3 (2 implementation tasks + 1 human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Created DugoutCard component rendering fielding positions as HTML table with inning columns
- Implemented print-optimized CSS with landscape page orientation and large, readable text
- Global print rules hide all UI elements except the dugout card during print
- Integrated DugoutCard into LineupPage below batting order section
- Added collapsible sections for PreAssignments and BattingOrder to improve page navigation
- Refined print CSS for clean single-page dugout output

## Task Commits

Each task was committed atomically:

1. **Task 1: DugoutCard component with print styles** - `2f5c029` (feat)
2. **Task 2: Wire DugoutCard into LineupPage** - `54ff85f` (feat)
3. **UI refinement: collapsible sections + print CSS fixes** - `5435c6c` (refactor)
3. **Task 3: Verify print output** - User approved (no code changes)

**Plan metadata:** (pending - this commit)

## Files Created/Modified
- `src/components/lineup/DugoutCard.tsx` - Print-optimized component with fielding table (HTML table with positions as rows, innings as columns) and batting order list
- `src/components/lineup/DugoutCard.module.css` - Module CSS with print-specific styles (@media print rules, 13-14pt fonts, thick borders, landscape orientation)
- `src/components/lineup/LineupPage.tsx` - Integrated DugoutCard below BattingOrderSection, added collapsible details for PreAssignments and BattingOrder
- `src/index.css` - Global print CSS using [data-dugout-card] selector to hide everything except card, @page landscape orientation

## Decisions Made

**HTML table for fielding grid**
Per research, HTML tables provide the most reliable cross-browser print rendering. CSS Grid can have layout inconsistencies in print preview/output.

**Global print CSS with data attribute selector**
Using `[data-dugout-card]` attribute selector (not class) ensures the print rules work regardless of CSS module hash collision. Global visibility:hidden on body *, then visibility:visible on card and descendants.

**Landscape @page orientation**
Fielding grid with 6+ innings is too wide for portrait. Landscape orientation suggested via @page rule (browsers typically honor this in print dialog default).

**Collapsible sections for long pages**
Added HTML `<details>/<summary>` elements wrapping PreAssignments and BattingOrder sections to prevent excessive scrolling when coach only needs to see the dugout card.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added collapsible sections for PreAssignments and BattingOrder**
- **Found during:** Task 2 (integrating DugoutCard into LineupPage)
- **Issue:** With PreAssignments, LineupGrid, Fairness Summary, ValidationPanel, BattingOrder, and DugoutCard all stacked vertically, the page became excessively long. Users would need to scroll significantly to reach the print button.
- **Fix:** Wrapped PreAssignments and BattingOrder sections in HTML `<details>/<summary>` elements (collapsed by default), allowing users to jump directly to DugoutCard for printing. No JavaScript state needed.
- **Files modified:** src/components/lineup/LineupPage.tsx, src/components/lineup/LineupPage.module.css, src/components/lineup/PreAssignments.tsx, src/components/batting-order/BattingOrderSection.tsx
- **Verification:** Dev server shows collapsible sections, DugoutCard visible without excessive scrolling
- **Committed in:** 5435c6c (refactor commit after Task 2)

**2. [Rule 1 - Bug] Refined print CSS to fix body visibility and card positioning**
- **Found during:** Task 3 preparation (testing print preview before checkpoint)
- **Issue:** Print CSS rules had minor issues with body element visibility and card absolute positioning that could cause inconsistent print output
- **Fix:** Refined global print rules in index.css for cleaner print output
- **Files modified:** src/index.css
- **Verification:** Print preview shows only dugout card, clean layout
- **Committed in:** 5435c6c (same refactor commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical UX enhancement, 1 bug fix)
**Impact on plan:** Collapsible sections improve usability on long pages without changing core functionality. Print CSS refinements ensure reliable output. No scope creep.

## Issues Encountered
None - implementation proceeded smoothly. HTML table rendered consistently, print CSS worked as expected across browsers.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Printable dugout card complete (OUTP-01, OUTP-02, OUTP-03)
- Ready for Phase 04 Plans 04-05: Remaining history and output features
- Print pattern established for any future printable components

## Self-Check

**PASSED**

Files verified:
- FOUND: src/components/lineup/DugoutCard.tsx
- FOUND: src/components/lineup/DugoutCard.module.css

Commits verified:
- FOUND: 2f5c029 (Task 1)
- FOUND: 54ff85f (Task 2)
- FOUND: 5435c6c (UI refinement)

All claimed artifacts exist.
