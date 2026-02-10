# Pitfalls Research

**Domain:** Little League Baseball Lineup Builder
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Retry-Based Algorithm Fails Without Graceful Degradation

**What goes wrong:**
The algorithm attempts to generate a valid lineup through randomized retries (200 attempts in existing code), but when constraints are mathematically impossible or highly constrained, it silently fails or provides no actionable feedback. Users are left with a blank lineup and no understanding of why generation failed.

**Why it happens:**
Randomized constraint satisfaction algorithms can fail for two reasons: (1) constraints are mathematically impossible to satisfy (e.g., 8 players but need 9 positions filled), or (2) the problem space is solvable but requires more attempts than the retry limit allows. Developers often treat retry limits as a "good enough" threshold without considering what happens when the limit is exceeded.

**How to avoid:**
Implement pre-validation before attempting generation: check roster size against required positions, verify pitcher/catcher assignments don't create impossible constraints, and validate that fairness rules are mathematically feasible. When retry limit is reached, detect which constraints are failing most frequently and provide specific feedback ("Not enough players for all positions" vs. "Cannot satisfy infield rotation with current pitcher/catcher assignments"). Consider using constraint satisfaction problem (CSP) techniques with backtracking instead of pure randomization for better determinism.

**Warning signs:**
- Users report "nothing happens" when clicking generate
- Algorithm works with some roster configurations but not others
- Console shows repeated retry attempts without convergence
- Specific roster sizes (odd numbers, edge cases) consistently fail

**Phase to address:**
Phase 1 (Core Algorithm Refactor) - This is foundational and blocks all other features. Pre-validation should happen before any UI work.

---

### Pitfall 2: localStorage Data Loss on Browser Restrictions

**What goes wrong:**
Roster data stored in localStorage disappears or fails to save when users are in private browsing mode, when storage quota is exceeded (5MB limit per origin), or when browsers disable localStorage for security policies. Safari in private mode is particularly problematic: localStorage appears available but throws exceptions on setItem().

**Why it happens:**
Browsers handle private browsing inconsistently. Safari pretends localStorage exists but blocks writes, Firefox/Chrome disable it entirely, and mobile browsers may clear localStorage unpredictably. Developers test in standard browsing mode and miss these edge cases. Additionally, localStorage is synchronous and blocks the main thread, so large roster data or repeated saves can cause UI freezes.

**How to avoid:**
Always wrap localStorage operations in try-catch blocks and detect availability before use. Implement a storage abstraction layer with fallback to in-memory storage. Never assume localStorage.setItem() will succeed. For feature detection, attempt a test write (not just check for existence) before relying on localStorage. Provide clear user feedback when storage is unavailable ("Rosters will not be saved between sessions due to browser restrictions"). Consider implementing export/import functionality as a workaround for users who cannot use localStorage.

**Warning signs:**
- Users report losing roster data between sessions
- Bug reports mentioning "incognito mode" or "private browsing"
- setItem() exceptions in error logs
- QuotaExceededError exceptions when storing large rosters

**Phase to address:**
Phase 2 (Data Persistence) - Must be addressed before adding roster save/load features. Should include comprehensive browser compatibility testing.

---

### Pitfall 3: Fairness Algorithm Breaks with Odd Roster Sizes

**What goes wrong:**
With 9 positions to fill each inning, rosters with 10 players create uneven bench rotation (one player sits every inning). The algorithm may fail to distribute bench time fairly, or worse, violate the "no consecutive innings on bench" rule because mathematically one player must sit twice in a 5-inning game with 10 players.

**Why it happens:**
Round-robin scheduling algorithms typically handle even numbers elegantly but require special "bye" handling for odd scenarios. When positions (9) don't divide evenly into roster size, fairness becomes mathematically impossible to achieve perfectly. Developers focus on the "happy path" (11-12 player rosters) and miss edge cases at roster boundaries.

**How to avoid:**
Detect roster size edge cases during pre-validation. For 10-player rosters, explicitly inform coaches that perfect fairness is impossible and show which player will sit twice. Provide options: "Designate which player sits twice" or "Adjust roster (add/remove player)". For rosters smaller than 9, block generation entirely with clear messaging. For larger rosters (12+), implement intelligent bye-round logic that spreads bench time as evenly as possible using modulo arithmetic or weighted rotation.

**Warning signs:**
- Specific roster sizes (10, 13, 16) consistently fail validation
- Parent complaints about unfair bench time with certain roster sizes
- Algorithm succeeds but produces lineups that feel "unfair" to users
- No UI indication that fairness is impossible with current roster

**Phase to address:**
Phase 1 (Core Algorithm Refactor) - Should be part of pre-validation logic. Edge case handling must be built into the core algorithm from the start.

---

### Pitfall 4: Print Layout Breaks on Single-Page Requirement

**What goes wrong:**
Generated lineup must fit on a single printable dugout card, but content overflows to multiple pages when roster size increases, font size is too large for readability, or printer margins vary by device. Coaches arrive at the field with unusable multi-page printouts or text cut off at page boundaries.

**Why it happens:**
Browsers apply different default print margins, and CSS page breaks are notoriously unreliable across browsers. Developers test with small rosters (9-10 players) and don't validate with larger rosters (12+ players). Font sizes optimized for screen readability (16px) are often too large for print density. Landscape vs. portrait orientation significantly affects how much content fits on a single page.

**How to avoid:**
Use CSS @page with explicit size and margin control: `@page { size: landscape; margin: 0.5in; }`. Set print-specific font sizes (12pt is standard for printed content) using @media print rules. Test with maximum expected roster size (15 players) across different browsers and actual printers, not just print preview. Implement dynamic font scaling based on roster size: if content height exceeds page, reduce font size incrementally until it fits. Use CSS Grid or Flexbox with explicit height constraints to prevent overflow. Add "page-break-inside: avoid" to critical sections (inning blocks) to prevent awkward splits. Consider landscape orientation by default for better horizontal space utilization.

**Warning signs:**
- Users report "lineup doesn't fit on one page"
- Content cut off at page bottom in print preview
- Different behavior between Chrome, Firefox, Safari print dialogs
- Font size complaints ("too small to read in dugout")

**Phase to address:**
Phase 3 (Print Layout Optimization) - After core algorithm and UI are functional. Requires extensive real-world testing with actual printers and coaches in field conditions.

---

### Pitfall 5: JSON Serialization Loses Data on Edge Cases

**What goes wrong:**
When saving roster or lineup data to localStorage, JavaScript objects containing undefined, NaN, or Infinity values are silently corrupted during JSON.stringify(). Object properties with undefined values are omitted entirely, while array elements with undefined become null. This causes data loss or unexpected null values when the lineup is reloaded.

**Why it happens:**
JSON.stringify() has asymmetric handling: undefined in objects is omitted, but undefined in arrays becomes null. NaN and Infinity both serialize as null, losing information. Developers rarely test with incomplete data states (partially filled lineups, missing player assignments) where undefined values are common. The localStorage → JSON.stringify() pipeline is often written as a single line without validation or error handling.

**How to avoid:**
Normalize data before serialization: replace undefined with explicit empty strings or null consistently. Use a replacer function with JSON.stringify() to handle edge cases explicitly: `JSON.stringify(data, (key, value) => value === undefined ? '' : value)`. Validate data structure before saving: ensure all expected properties exist. Implement versioning in stored data format to handle schema changes gracefully. Add round-trip testing: save → load → verify data matches original. Consider using a schema validation library (like Zod or Yup) to validate data before serialization.

**Warning signs:**
- Saved lineups load with missing player names (empty strings where names should be)
- Array positions shift unexpectedly after reload
- Console warnings about unexpected null values
- Users report "data corruption" after saving and reloading

**Phase to address:**
Phase 2 (Data Persistence) - Must be addressed when implementing save/load functionality. Should include comprehensive unit tests for edge cases.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded roster in code instead of localStorage | Faster initial development, no storage issues | Cannot customize rosters, requires code changes for each team | Never - blocks primary use case |
| Retry-based randomization without pre-validation | Simple to implement, works for "normal" cases | Fails silently on edge cases, no user feedback | Only for prototypes, must be replaced for production |
| Clipboard-only export instead of PDF/print | Avoids CSS print complexity | Poor UX for coaches at field, requires paste into separate app | Acceptable for MVP, but must add print in Phase 3 |
| Inline styles instead of @media print CSS | Quick to implement, works in development | Doesn't optimize for print, causes multi-page overflow | Acceptable for Phase 1-2, must refactor before print optimization |
| Direct localStorage.setItem() without try-catch | Fewer lines of code, works in standard browsing | Crashes in private browsing, no error handling | Never - always wrap in try-catch |
| Fixed innings (5) instead of configurable | Simpler algorithm, fewer edge cases | Cannot adapt to modified game rules or different leagues | Acceptable for MVP, must make configurable by Phase 4 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Browser Print API | Assuming @page rules work consistently across browsers | Test on Chrome, Firefox, Safari with actual printers; provide fallback export to PDF |
| localStorage API | Using localStorage without checking availability | Wrap all operations in try-catch, detect private browsing, implement in-memory fallback |
| window.print() | Calling print() without ensuring CSS @media print rules are loaded | Use @media print for all print styles, test in print preview before calling print() |
| Clipboard API | Assuming navigator.clipboard is always available | Check for clipboard API support, provide fallback message if unavailable (older browsers, HTTP contexts) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous localStorage operations block UI | UI freezes when saving/loading large roster data | Use async wrapper or debounce save operations | Rosters with 15+ players or frequent autosave |
| N-attempt retry loop without timeout | Browser becomes unresponsive during lineup generation | Add maximum time limit (5 seconds) in addition to attempt limit | Impossible constraints cause infinite-feeling loops |
| Re-validating entire lineup on every keystroke | Input lag when manually editing lineup positions | Debounce validation or only validate on blur/generate | Lineups with 12+ players × 5 innings = 60+ fields |
| Deep object cloning during retry attempts | Memory bloat from creating 200+ lineup copies | Reuse lineup object, only clone on success | Rosters with 15 players × 200 attempts = high memory usage |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing player full names in localStorage | Privacy violation if device is shared or compromised | Store only first name + last initial as per requirements, clear data after season |
| No data sanitization before display | XSS vulnerability if player names contain malicious scripts | Sanitize all user input, use React's built-in XSS protection (don't use dangerouslySetInnerHTML) |
| Allowing arbitrary roster sizes without limit | Memory exhaustion from malicious 1000+ player rosters | Cap roster size at reasonable maximum (20 players), validate before processing |
| Not clearing old lineups from localStorage | Accumulates sensitive data over seasons | Implement data cleanup: clear rosters older than 6 months, or provide "clear all data" button |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when generation fails | Coach doesn't know if they should wait or if something broke | Show loading indicator during generation, clear error message on failure with specific reason |
| Jargon in error messages ("constraint satisfaction failed") | Non-technical coaches don't understand what went wrong | Use plain language: "Not enough players to fill all positions. Add more players to your roster." |
| No undo after auto-generation overwrites manual edits | Coach loses 10 minutes of manual lineup work | Warn before overwriting, or save previous version with "Undo" button |
| Print button hidden or unclear | Coaches don't realize they can print, use inefficient clipboard export | Make print button prominent, label as "Print Dugout Card" not just "Print" |
| No indication of which constraints are violated | Coach doesn't know which player assignments need fixing | Highlight specific violations in UI: red background on duplicate players, yellow for unfair bench time |
| No player availability toggle | Coach must manually delete players from lineup when player is absent | Provide checkbox to mark players as "Not playing today" that excludes them from generation |
| Confusing pitcher/catcher slot numbers | Coaches think "Slot 1" means "Inning 1" but it covers innings 1-2 | Label slots clearly: "Slot 1 (Innings 1-2)", "Slot 2 (Innings 3-4)", "Slot 3 (Inning 5)" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Lineup generation:** Often missing pre-validation that checks for impossible constraints before attempting randomization — verify roster size, pitcher/catcher conflicts, and mathematical feasibility before first retry attempt
- [ ] **Print functionality:** Often missing @media print CSS rules, resulting in multi-page overflow — verify single-page layout with maximum roster size across Chrome, Firefox, Safari print previews and actual printers
- [ ] **localStorage save:** Often missing try-catch error handling and private browsing detection — verify saves work in incognito/private mode with graceful fallback to in-memory storage
- [ ] **Fairness validation:** Often missing edge case handling for odd roster sizes (10, 13 players) — verify algorithm handles or explicitly rejects impossible fairness scenarios
- [ ] **Player name input:** Often missing sanitization and validation — verify XSS protection and handling of special characters, empty strings, duplicate names
- [ ] **Clipboard export:** Often missing format optimization for pasting into spreadsheets — verify tab-separated values work correctly in Excel, Google Sheets
- [ ] **Responsive design:** Often missing mobile optimization for coaches using phones at field — verify lineup is readable and editable on mobile screens, buttons are touch-friendly
- [ ] **Innings configuration:** Often hardcoded at 5 innings instead of configurable — verify games with modified innings (4, 6) work correctly if configurability is claimed

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Algorithm fails after 200 retries | LOW | Relax one constraint temporarily (e.g., allow one consecutive position violation), regenerate with relaxed rules, highlight the violation for manual fix |
| localStorage data corrupted | MEDIUM | Implement data recovery from backup (previous save state), or provide import from clipboard to restore from coach's backup |
| Print layout overflows one page | LOW | Dynamically reduce font size by 10% increments until content fits, or split into "Innings 1-3" and "Innings 4-5" separate prints |
| Odd roster size makes fairness impossible | LOW | Show explicit message, let coach choose which player sits twice, or suggest roster adjustment (add/remove player) |
| Private browsing blocks localStorage | LOW | Detect on page load, show warning banner, automatically fall back to in-memory storage with "Data will not persist" notice |
| JSON deserialization fails | HIGH | Catch parsing errors, attempt data migration from old format, worst case: clear corrupted data and start fresh with user notification |
| Constraint violation undetected until field | HIGH | No runtime recovery — requires algorithm fix in next version. Provide manual override in emergency: "Skip validation and print anyway" button |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Retry algorithm fails without feedback | Phase 1: Core Algorithm Refactor | Unit tests with impossible constraints, manual testing with edge case rosters (8, 10, 13 players) |
| localStorage data loss on browser restrictions | Phase 2: Data Persistence | Cross-browser testing in private/incognito mode, QuotaExceeded simulation |
| Fairness breaks with odd roster sizes | Phase 1: Core Algorithm Refactor | Unit tests with roster sizes 8-16, validation that 10-player roster shows explicit fairness warning |
| Print layout breaks on single-page requirement | Phase 3: Print Layout Optimization | Print testing with max roster size on Chrome/Firefox/Safari, actual printer output verification |
| JSON serialization loses data | Phase 2: Data Persistence | Round-trip testing: save with undefined/NaN → load → verify no data loss |
| No feedback during generation | Phase 4: UX Polish | Manual testing: does UI show loading? Does failure show clear message? |
| Coaches don't understand error messages | Phase 4: UX Polish | User testing with actual coaches (not developers), verify messages are plain language |
| Manual edits overwritten by auto-generation | Phase 4: UX Polish | Add confirmation dialog or undo feature, manual testing of overwrite scenarios |

## Sources

### Constraint Satisfaction and Algorithm Failures
- [Constraint satisfaction problem - Wikipedia](https://en.wikipedia.org/wiki/Constraint_satisfaction_problem)
- [Constraint Satisfaction Problems (CSP) in Artificial Intelligence - GeeksforGeeks](https://www.geeksforgeeks.org/artificial-intelligence/constraint-satisfaction-problems-csp-in-artificial-intelligence/)
- [Better Retries with Exponential Backoff and Jitter - Baeldung](https://www.baeldung.com/resilience4j-backoff-jitter)
- [Retries Strategies in Distributed Systems - GeeksforGeeks](https://www.geeksforgeeks.org/system-design/retries-strategies-in-distributed-systems/)
- [Best practices for retry pattern - Medium](https://harish-bhattbhatt.medium.com/best-practices-for-retry-pattern-f29d47cd5117)

### localStorage Pitfalls and Data Loss
- [Storage quotas and eviction criteria - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Using localStorage in Modern Applications - RxDB](https://rxdb.info/articles/localstorage.html)
- [Please Stop Using Local Storage - Randall Degges](https://www.rdegges.com/2018/please-stop-using-local-storage/)
- [What is the max size of localStorage values? - GeeksforGeeks](https://www.geeksforgeeks.org/javascript/what-is-the-max-size-of-localstorage-values/)
- [How to fix 'Failed to execute setItem on Storage' - TrackJS](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/)
- [Why using localStorage directly is a bad idea - Michal Zalecki](https://michalzalecki.com/why-using-localStorage-directly-is-a-bad-idea/)

### Private Browsing Mode Detection
- [Private browsing issue in Firefox - GitHub Issue](https://github.com/cyrilletuzi/angular-async-local-storage/issues/26)
- [Safari Private browsing mode appears to support localStorage, but doesn't - GitHub Issue](https://github.com/marcuswestin/store.js/issues/42)
- [localStorage not available in Chrome incognito mode - GitHub Issue](https://github.com/fluid-player/fluid-player/issues/667)

### Fairness Algorithms and Odd Roster Sizes
- [Round-robin scheduling - Wikipedia](https://en.wikipedia.org/wiki/Round-robin_scheduling)
- [Optimizing Game Scheduling With Round-Robin Algorithms - Diamond Scheduler](https://cactusware.com/blog/round-robin-scheduling-algorithms)
- [Sports Scheduling Simplified: The Power of the Rotation Algorithm - Medium](https://medium.com/coinmonks/sports-scheduling-simplified-the-power-of-the-rotation-algorithm-in-round-robin-tournament-eedfbd3fee8e)
- [Fairness in Scheduling - Caltech](https://users.cms.caltech.edu/~schulman/Papers/fair-sched98.pdf)

### JSON Serialization Edge Cases
- [JavaScript JSON.stringify() Method: Practical Guide, Edge Cases - TheLinuxCode](https://thelinuxcode.com/javascript-jsonstringify-method-practical-guide-edge-cases-and-production-patterns/)
- [How Does JavaScript Handle NaN in JSON Serialization? - Medium](https://medium.com/@conboys111/how-does-javascript-handle-nan-in-json-serialization-7d7e3ff77a91)
- [JSON.stringify() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [Null-ifying the Void: When undefined Ghosts Your JSON - Rohit Nandi](https://www.rohitnandi.com/blog/null-and-undefined)

### CSS Print Media and Layout
- [Print CSS Cheatsheet: HTML & CSS Tips for Better PDFs](https://www.customjs.space/blog/print-css-cheatsheet/)
- [CSS: The Perfect Print Stylesheet - Jotform Blog](https://www.jotform.com/blog/css-perfect-print-stylesheet-98272/)
- [Designing For Print With CSS - Smashing Magazine](https://www.smashingmagazine.com/2015/01/designing-for-print-with-css/)
- [Print Styles Gone Wrong: Avoiding Pitfalls in Media Print CSS](https://blog.pixelfreestudio.com/print-styles-gone-wrong-avoiding-pitfalls-in-media-print-css/)
- [page-orientation - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page/page-orientation)

### Sports Lineup Generator UX
- [The Ultimate Baseball Lineup Generator - GameTime Lineups](https://baseballlineupgenerator.com/)
- [Youth Sports Coaching Tools - SubTime](https://www.subtimeapp.com/)

---
*Pitfalls research for: Little League Baseball Lineup Builder*
*Researched: 2026-02-09*
