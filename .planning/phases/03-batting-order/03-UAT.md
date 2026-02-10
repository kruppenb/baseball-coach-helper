---
status: complete
phase: 03-batting-order
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-02-10T22:40:00Z
updated: 2026-02-10T22:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Generate Batting Order
expected: On the Lineup tab (with 9+ present players), scroll below the fielding section. Click "Generate Batting Order". A numbered list appears showing ALL present players (one per row) with their name and a colored band badge (top = green, middle = neutral, bottom = orange).
result: issue
reported: "I don't need a top middle bottom flag that's not useful - I would like a where did they bat last game flag but that can't be done without history"
severity: minor

### 2. Band Badge Colors
expected: In the generated batting order list, players near the top show a green "top" badge, players in the middle show a neutral gray "middle" badge, and players near the bottom show an orange "bottom" badge. Badge colors correspond to position in the order.
result: skipped
reason: User wants band badges removed entirely — not useful for coaches. "Last game batting position" indicator preferred but requires history (Phase 4).

### 3. Confirm Batting Order
expected: After generating, click "Confirm Order". The confirm button disappears and a green "Batting order confirmed for this game" message appears. The numbered list stays visible.
result: pass

### 4. Clear Batting Order
expected: After confirming (or generating), click "Clear". The numbered list disappears and you're back to the initial state with just the "Generate Batting Order" button.
result: pass

### 5. Batting Order Independent of Fielding
expected: Without generating any fielding lineup first, the "Batting Order" section is visible and functional below the fielding section. You can generate a batting order independently.
result: pass

### 6. Regenerate After Confirm
expected: After confirming a batting order, click "Regenerate". A new batting order appears (may be a different order). You can confirm again. The previous confirmed order is saved to history for future fairness rotation.
result: pass

## Summary

total: 6
passed: 4
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Band badges (top/middle/bottom) provide useful information to the coach"
  status: failed
  reason: "User reported: band badges not useful, wants 'where did they bat last game' instead"
  severity: minor
  test: 1
  artifacts: []
  missing: []

## Out-of-Scope Issues (Phase 2)

These were reported during Phase 3 testing but belong to Phase 2 (fielding lineup):
- Generated lineup options (3 cards) are visually cut off
- Names on lineup option buttons aren't meaningful to coaches
- Missing infield innings count per player on lineup grid (already tracked as pending todo)
