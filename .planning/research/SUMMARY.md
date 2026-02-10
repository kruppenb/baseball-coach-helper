# Project Research Summary

**Project:** Little League Baseball Lineup Builder
**Domain:** Youth sports management (client-side web app)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

This is a constraint-based optimization tool for Little League coaches who spend 20-30 minutes manually creating fair lineup cards before each game. The expert approach centers on a retry-based constraint satisfaction algorithm that auto-generates player positions across innings while enforcing fairness rules (no consecutive bench time, required infield rotations, position variety). The recommended technical approach is a React 19 + TypeScript + Vite single-page application with localStorage persistence, pure-function business logic separated from UI components, and CSS-optimized print output for dugout cards.

The core value proposition is automating the tedious 80% (rotating 7-9 field positions fairly) while preserving coach control over the skilled 20% (pitcher/catcher assignments). Research shows successful implementations use a 200-attempt retry mechanism with pre-validation to detect impossible constraints before generation. The product differentiates through privacy-first design (localStorage only, no cloud/accounts), real-time fairness validation that prevents rule violations, and single-page printable output optimized for clipboard use in the dugout.

Key risks include algorithm failure on edge-case roster sizes (particularly 10 players where perfect fairness is mathematically impossible), localStorage data loss in private browsing modes, and print layout overflow when roster size exceeds single-page capacity. Mitigation strategies involve pre-validation before generation attempts, try-catch wrapped storage operations with in-memory fallbacks, and dynamic font scaling with explicit page constraints for print media.

## Key Findings

### Recommended Stack

**Core framework:** React 19.1.x with TypeScript 5.9.x and Vite 7.3.x provides the modern baseline. React 19's stable Actions and new hooks eliminate legacy patterns like forwardRef. Vite delivers 10x faster builds than Create React App with zero-config TypeScript/JSX support. The existing codebase validates this stack works.

**State and persistence:** Built-in React hooks (useState + useEffect) are sufficient for this single-page, client-only app. A custom useLocalStorage hook abstracts persistence with SSR-safe initialization and automatic JSON serialization. No external state library needed (Zustand/Redux would be overkill without server sync or complex shared state).

**Styling and print:** CSS Modules (built into Vite) provide component-scoped styles with zero runtime overhead. Critical for print requirements: native @media print rules in CSS Modules allow fine-grained control over page breaks, margins, and font sizing without utility-framework limitations.

**Testing:** Vitest 4.x (10-20x faster than Jest) with @testing-library/react 16.x for user-centric component testing. Pure business logic functions can be tested without React, separating algorithm validation from UI testing.

**Core technologies:**
- React 19.1.x: UI framework — stable with improved hooks, existing app proven baseline
- TypeScript 5.9.x: Type safety — compile-time error detection, self-documenting code
- Vite 7.3.x: Build tool — instant HMR, 10x faster than CRA, industry standard 2026
- CSS Modules: Styling — zero runtime cost, print media query support, component-scoped
- Vitest 4.x: Testing — 10-20x faster than Jest, native ESM/TS, 95% Jest-compatible

### Expected Features

**Must have (table stakes):**
- Roster management (first name + last initial) — foundation for all operations, privacy-conscious
- Position assignment by inning (9 positions × 5-6 innings) — core value proposition, grid-based UI
- Pre-assignment of pitchers/catchers — skilled positions need manual control, prevents random assignment
- Fair play validation (real-time) — prevents consecutive bench, enforces infield rotations, blocks position repetition
- Batting order (continuous) — required for game execution, all players bat in order
- Print to single page — dugout card is the deliverable, browser print with CSS optimization
- Auto-generation algorithm — constraint-based solver fills 7-9 positions after P/C pre-assignment

**Should have (competitive):**
- Attendance/absence marking — late arrivals and no-shows are common, toggle availability and regenerate
- Position preference/avoidance — "my kid hates right field" feature, balances preferences with fairness
- Bench rotation tracking (visual) — color-coded indicators show who sits each inning at-a-glance
- Drag-and-drop position swaps — manual override for coach intuition adjustments
- Playing time transparency bands — Top/Middle/Bottom visual indicators build parental trust

**Defer (v2+):**
- Multi-game season tracking — requires backend/database for persistent playing time history
- Skill-based balancing — conflicts with pure fairness approach, more relevant for travel ball
- Assistant coach collaboration — requires auth, backend, real-time sync (not viable localStorage-only)
- Parent read-only access — requires hosting/sharing mechanism, privacy implications with minors' names
- Mobile-first redesign — v1 responsive but desktop-optimized, v2 should prioritize mobile UX

### Architecture Approach

**Pattern:** Container/presentational separation with custom hooks for state management and pure functions for business logic. The UI layer (React components) is completely separated from the logic layer (constraint solver, validation) which enables testing algorithms without React and reusing logic across contexts. State management uses custom hooks (useRoster, useLineup, useBattery, useLocalStorage) that encapsulate complexity and provide single-source-of-truth for component access.

**Component structure:** Feature-organized folders (roster/, lineup/, battery/, dugout/, validation/) where each feature owns its UI components. Business logic lives in separate logic/ directory as pure functions. State management abstracted into state/ hooks. TypeScript types centralized in types/. This structure makes related components easy to find and keeps concerns cleanly separated.

**Data flow:** Unidirectional top-down state flow using React hooks. User actions trigger state updates via custom hooks → state changes trigger re-renders → useEffect syncs to localStorage. Lineup generation follows: read state → call pure function → retry loop with validation → return result → update state → component re-render. Validation runs on any state change, aggregating results from 6 parallel validation steps returned as structured data arrays.

**Major components:**
1. Lineup Generation Engine — constraint solver with 200-attempt retry mechanism, takes roster/battery config, returns valid lineup
2. Validation System — 6-step validation (grid check, battery requirements, infield counts, consecutive positions, bench rotation), pure functions returning error arrays
3. State Management Layer — custom hooks (useRoster, useLineup, useBattery) with localStorage persistence via useLocalStorage abstraction
4. Print Layout System — DugoutCard component with component-scoped @media print CSS, single-page optimization with dynamic font scaling

### Critical Pitfalls

1. **Retry-based algorithm fails without graceful degradation** — When constraints are mathematically impossible (8 players for 9 positions) or highly constrained (10-player roster where fairness is impossible), the retry loop reaches 200 attempts and fails silently. Prevention: Implement pre-validation before attempting generation to check roster size, verify pitcher/catcher assignments don't create impossible constraints, detect specific failing constraints, and provide actionable feedback ("Not enough players" vs "Cannot satisfy infield rotation with current P/C assignments"). Use constraint satisfaction problem (CSP) backtracking instead of pure randomization for better determinism.

2. **localStorage data loss on browser restrictions** — Safari private mode pretends localStorage exists but throws exceptions on setItem(). Firefox/Chrome disable it entirely. Mobile browsers clear unpredictably. 5MB storage quota can be exceeded. Prevention: Always wrap localStorage operations in try-catch blocks, implement feature detection with test writes (not just existence checks), use storage abstraction layer with fallback to in-memory storage, provide clear user feedback when storage unavailable, consider export/import functionality as workaround for unsupported browsers.

3. **Fairness algorithm breaks with odd roster sizes** — 9 positions with 10 players creates uneven bench rotation where one player must sit twice in 5 innings, mathematically violating "no consecutive bench" rule. Prevention: Detect roster size edge cases during pre-validation, explicitly inform coaches that perfect fairness is impossible, provide options to designate which player sits twice or adjust roster, block generation entirely for rosters smaller than 9, implement intelligent bye-round logic for 12+ players using modulo arithmetic.

4. **Print layout breaks on single-page requirement** — Content overflows to multiple pages when roster size increases, browsers apply different default margins, font sizes optimized for screen (16px) are too large for print density. Prevention: Use CSS @page with explicit size and margin control, set print-specific font sizes (12pt standard), test with maximum roster size (15 players) across browsers and actual printers, implement dynamic font scaling that reduces incrementally until content fits, use page-break-inside: avoid on critical sections, default to landscape orientation for horizontal space.

5. **JSON serialization loses data on edge cases** — JSON.stringify() silently corrupts undefined (omitted in objects, becomes null in arrays), NaN and Infinity serialize as null, causing data loss when partially filled lineups are saved/reloaded. Prevention: Normalize data before serialization (replace undefined with explicit empty strings), use replacer function with JSON.stringify(), validate data structure before saving, implement versioning in stored data format, add round-trip testing to verify save → load matches original, use schema validation library (Zod, Yup) before serialization.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Foundation & Type System
**Rationale:** Everything depends on type definitions and state management. Getting the data model right from the start prevents costly refactoring later. The architecture research emphasizes pure functions separated from React, which requires well-defined TypeScript interfaces for Roster, Lineup, Position, etc. The localStorage hook is foundational for all persistence.

**Delivers:** TypeScript type definitions, useLocalStorage hook (with try-catch error handling per Pitfall 2), useRoster hook, useLineup hook, useBattery hook. Establishes the data model that all other phases depend on.

**Addresses:** Foundation for all features from FEATURES.md. Prevents Pitfall 5 (JSON serialization issues) by building proper serialization from day one.

**Avoids:** Pitfall 2 (localStorage data loss) by implementing try-catch wrappers and private browsing detection immediately. Establishes recovery strategy baseline.

### Phase 2: Basic UI Components
**Rationale:** Need to see data before you can edit it. Simple presentational components establish UI patterns and component structure before adding complex interactions. Architecture research recommends container/presentational separation starting here.

**Delivers:** RosterSelector component (read-only player list), basic LineupGrid (read-only, shows 5×9 grid), BatteryConfig component (pitcher/catcher slot selectors), ValidationSummary component (displays errors grouped by step).

**Addresses:** Roster management (table stakes), Position assignment display (table stakes), Battery configuration UI (table stakes).

**Avoids:** Building editable components before validation exists (prevents building manual editing that violates rules).

### Phase 3: Validation System
**Rationale:** Must validate before generating or editing. The lineup generator needs validation to verify output, and manual editing needs validation to prevent rule violations. Architecture research shows validation as structured data (arrays of errors) enables better UX than exception-throwing. Critical to build before Phase 4.

**Delivers:** Six validation functions (position grid check, pitcher requirements, catcher requirements, infield counts, consecutive positions, bench rotation), getAllValidationResults aggregator, validation types. All pure functions, separately testable.

**Addresses:** Fair play validation (table stakes), real-time constraint checking (table stakes).

**Avoids:** Pitfall 1 (algorithm fails silently) by establishing validation baseline before attempting generation. Pitfall 3 (odd roster sizes) addressed through infield/bench validation logic.

### Phase 4: Lineup Generation Engine
**Rationale:** Most complex component, depends on validation to verify output. Architecture research shows 200-attempt retry mechanism from existing codebase (C:\repos\baseball-coach\src\App.tsx lines 219-483). Building validation first enables testing generation attempts against known-good validation logic.

**Delivers:** autoGenerateLineup function (constraint solver with retry), pre-validation logic (checks impossible constraints before attempting), attemptLineupGeneration helper (single generation attempt), constraint satisfaction logic. Pure functions, no React dependencies.

**Addresses:** Auto-generation algorithm (table stakes), position assignment automation (core value proposition).

**Avoids:** Pitfall 1 (retry without feedback) by implementing pre-validation and specific error detection. Pitfall 3 (odd roster sizes) by detecting edge cases before generation. Uses research flag for deeper algorithm research if 200 attempts proves insufficient.

**Research flag:** Complex constraint satisfaction problem may need deeper algorithm research if retry mechanism proves unreliable. Consider CSP backtracking alternatives.

### Phase 5: Manual Editing & Interactions
**Rationale:** Alternative to auto-generation, uses same validation system. Once generation works, manual editing provides coach override capabilities. Drag-and-drop is enhancement after basic editing works.

**Delivers:** Editable lineup grid (dropdowns/inputs per position), position swap functionality, player availability toggle (marks absent players), live validation feedback in UI.

**Addresses:** Attendance/absence marking (should-have), manual override capabilities (competitive feature), drag-and-drop position swaps (should-have).

**Avoids:** UX pitfall of overwriting manual edits (add "Undo" button or confirmation dialog before regeneration).

### Phase 6: Batting Order Generation
**Rationale:** Independent feature, can be built in parallel after core lineup works. Architecture research shows this as separate pure function (batting-order.ts). Simpler than position assignment (just rotation logic, no complex constraints).

**Delivers:** generateBattingOrder function (continuous batting rotation), BattingOrderView component (displays order), fairness constraints for batting position distribution.

**Addresses:** Batting order management (table stakes), continuous rotation (youth baseball standard).

**Avoids:** No major pitfalls specific to this phase. Relatively straightforward rotation algorithm.

### Phase 7: Print Optimization
**Rationale:** Consumes all other features (roster, lineup, batting order). Architecture research emphasizes component-scoped @media print CSS. Must test with maximum roster size and actual printers, not just print preview.

**Delivers:** DugoutCard component (single-page layout), DugoutCard.print.css (@media print rules), dynamic font scaling (if content overflows), page-break controls, print button with window.print() trigger.

**Addresses:** Print to single page (table stakes), dugout card deliverable (core output).

**Avoids:** Pitfall 4 (print layout breaks) by using @page rules with explicit size/margins, testing with 15-player max roster across browsers, implementing dynamic font scaling, defaulting to landscape orientation.

**Research flag:** Needs real-world testing with actual coaches and printers. Print preview testing insufficient per research.

### Phase 8: UX Polish & Error Handling
**Rationale:** Final phase addresses user experience refinements discovered during testing. Pitfalls research shows coaches need plain-language error messages, loading indicators, and clear feedback.

**Delivers:** Loading spinner during generation, plain-language error messages (no "constraint satisfaction failed" jargon), confirmation dialogs before overwriting, "Undo" functionality, visual indicators for constraint violations (red/yellow highlighting), help text for confusing features (slot numbers).

**Addresses:** UX pitfalls from research (no feedback, jargon errors, unclear print button, confusing slot numbers), playing time transparency (should-have).

**Avoids:** UX Pitfall of coaches not understanding failures (implements plain language per research), Pitfall of no indication which constraints violated (highlight specific violations in UI).

### Phase Ordering Rationale

- **Foundation-first:** Phases 1-3 establish the base (types, state, UI, validation) that all other features depend on. Skipping ahead to generation without validation leads to untestable code.
- **Validation before generation:** Phase 3 must precede Phase 4 because the generator needs validation to verify its output. Building them in parallel risks incompatible interfaces.
- **Generation before editing:** Phase 4 before Phase 5 because auto-generation is the primary use case. Manual editing is fallback/override. Validating generated output is easier than validating arbitrary manual input.
- **Print last:** Phase 7 consumes all other features, can't be built until lineup and batting order exist. Requires real-world testing which is time-consuming.
- **Polish last:** Phase 8 refinements only make sense after core functionality works. Can't write plain-language error messages until you know what errors actually occur.

**Dependency chain:**
Types → State Hooks → UI Components → Validation → Generation → Editing → Batting Order → Print → Polish

**Parallel opportunities:**
- Phase 6 (Batting Order) can be built in parallel with Phase 5 (Editing) after Phase 4 completes
- Phase 2 (Basic UI) can build multiple components in parallel once Phase 1 establishes types

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (Lineup Generation Engine):** Complex constraint satisfaction problem. If 200-attempt retry proves unreliable, may need research into CSP backtracking algorithms, simulated annealing, or genetic algorithms. Existing baseball-coach codebase provides starting point but edge cases (10-player rosters, complex battery constraints) may require algorithm refinement.
- **Phase 7 (Print Optimization):** Print CSS behavior varies significantly across browsers and printers. Research shows @page rules inconsistent. May need research into react-to-print library if window.print() insufficient, or PDF generation libraries (jsPDF, pdfmake) if single-page constraint proves impossible with pure CSS.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core Foundation):** TypeScript interfaces and localStorage hooks are well-documented patterns. React custom hooks extensively covered in documentation.
- **Phase 2 (Basic UI):** Presentational React components are standard practice, no novel patterns needed.
- **Phase 3 (Validation System):** Pure functions returning error arrays is established pattern, no research needed.
- **Phase 5 (Manual Editing):** Form inputs and validation in React is well-documented, no research needed.
- **Phase 6 (Batting Order):** Simple rotation algorithm, mathematically straightforward, no research needed.
- **Phase 8 (UX Polish):** Standard UX patterns (loading spinners, error messages, confirmations), no research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified with official sources (React 19 blog, Vite docs, TypeScript releases). Existing app (baseball-coach) validates React 19.1.0 + TypeScript works. Version compatibility confirmed via official docs and npm registry. |
| Features | MEDIUM | Based on competitor analysis (Free Baseball Lineups, GameTime Lineups, Dugout Edge) and Little League rules documentation. Multiple sources confirm table stakes (roster, fairness, print). Differentiators inferred from competitor feature comparison. Should-have list needs user validation with actual coaches. |
| Architecture | HIGH | Architecture research cites official React docs (react.dev), established patterns (Feature-Sliced Design, container/presentational), and existing codebase (C:\repos\baseball-coach\src\App.tsx) as validation. localStorage patterns well-documented. Pure function separation is standard React best practice. |
| Pitfalls | MEDIUM | Critical pitfalls (retry failure, localStorage loss, odd roster sizes, print overflow, JSON serialization) confirmed via multiple sources (MDN, Wikipedia, community blogs). Severity ratings based on existing codebase issues and community pain points. Recovery strategies inferred from best practices. Real-world validation needed with actual coaches in field conditions. |

**Overall confidence:** HIGH

The stack and architecture are rock-solid with official documentation and proven implementations. Feature prioritization is medium confidence because it's based on competitor analysis and rules documentation rather than direct user research with Little League coaches. Pitfall severity is medium confidence because it's based on technical documentation and community reports, not field testing. The recommended approach is validated by the existing baseball-coach codebase which proves the core constraint satisfaction algorithm works in practice.

### Gaps to Address

**Gap 1: Roster size edge cases** — Research identifies 10-player rosters as problematic (perfect fairness is mathematically impossible), but doesn't provide tested solution. Algorithm must explicitly detect and communicate this to coaches. Need to validate acceptable UX: does coach want to designate which player sits twice, or add/remove player from roster? User research needed during Phase 4 planning.

**Gap 2: Print quality threshold** — Research emphasizes single-page requirement but doesn't specify minimum acceptable font size for dugout readability. Coaches need to read lineup cards in bright sunlight at field. What's the minimum readable font size? Does dynamic scaling work below 10pt? Requires real-world testing with actual coaches during Phase 7. May need to define hard limit: "Rosters above 14 players require two-page print."

**Gap 3: Generation performance on low-end devices** — 200-attempt retry loop performance not tested on mobile devices or older computers. May need Web Worker for background generation if UI freezes on low-end hardware. Monitor during Phase 4 testing. If performance issues arise, research Web Workers or consider reducing retry limit with better constraint heuristics.

**Gap 4: Private browsing detection reliability** — localStorage abstraction includes try-catch but research shows inconsistent browser behavior. Safari private mode especially problematic (appears available but throws on write). Need comprehensive cross-browser testing during Phase 1. May require browser-specific feature detection beyond simple try-catch. Test matrix: Chrome/Firefox/Safari/Edge × (normal/private) × (desktop/mobile).

**Gap 5: Multi-game season fairness** — Deferred to v2+ but coaches may expect this in v1. If user testing reveals season tracking is table-stakes (not nice-to-have), architecture needs fundamental rethinking (localStorage insufficient for multi-game history). Validate during early user testing: do recreational Little League coaches actually track across games, or is single-game fairness sufficient?

## Sources

### Primary (HIGH confidence)
- [React v19 Official Release](https://react.dev/blog/2024/12/05/react-19) — React 19 stable features
- [Vite Official Site](https://vite.dev/) — Vite 7.3.1 documentation
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) — TypeScript version compatibility
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4) — Testing framework capabilities
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) — localStorage quotas and restrictions
- [MDN: Printing with CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) — Print media queries
- [Little League Rules, Regulations, and Policies](https://www.littleleague.org/playing-rules/rules-regulations-policies/) — Fair play requirements
- [Little League: Continuous Batting Order](https://www.littleleague.org/help-center/what-is-a-continuous-batting-order/) — Batting order rules

### Secondary (MEDIUM confidence)
- [React Architecture Patterns 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices) — Component structure patterns
- [Feature-Sliced Design](https://feature-sliced.design/blog/scalable-react-architecture) — Architecture methodology
- [React State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) — Hybrid approach recommendations
- [Free Baseball Lineups](https://freebaseballlineups.com/lineups.html) — Competitor feature analysis
- [GameTime Lineups](https://gametimelineups.com/) — Feature comparison baseline
- [Dugout Edge](https://www.dugoutedge.com/lineup-generator) — Competitor capabilities
- [Constraint Satisfaction Problems - Wikipedia](https://en.wikipedia.org/wiki/Constraint_satisfaction_problem) — Algorithm background
- [Round-robin scheduling - Wikipedia](https://en.wikipedia.org/wiki/Round-robin_scheduling) — Fairness algorithm theory
- [localStorage with React Hooks](https://blog.logrocket.com/using-localstorage-react-hooks/) — Storage patterns
- [Designing for Print in React](https://dev.to/umarlqmn/designing-for-print-in-react-5c9h) — Print component patterns

### Tertiary (LOW confidence — needs validation)
- C:\repos\baseball-coach\src\App.tsx (lines 219-483) — Existing constraint-based lineup generator with 200-attempt retry mechanism. Proves algorithm works but needs refactoring for edge cases. Validates React 19 + TypeScript stack.

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
