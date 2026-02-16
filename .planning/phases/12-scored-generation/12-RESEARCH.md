# Phase 12: Scored Generation and Batting Order - Research

**Researched:** 2026-02-15
**Domain:** Lineup scoring/ranking algorithm, UI flow integration, batting order auto-generation
**Confidence:** HIGH

## Summary

Phase 12 transforms the lineup generation from "generate one lineup and show it" to "generate ~10 lineups behind the scenes, score them, and present the best one with a visible fairness breakdown." It also removes the separate batting order generation step by auto-generating it alongside the fielding lineup.

The existing codebase already has all the building blocks: `generateMultipleLineups()` can produce N lineups, `computeFieldingFairness()` tracks cross-game bench/position data, `calculateBandCounts()` tracks batting history, and `computeFairnessSummary()` (in ReviewStep) calculates per-player bench and infield counts. What's missing is a **scoring function** that numerically ranks lineups, the "generate best-of-N" orchestration, a **FairnessScoreCard** UI showing the breakdown, and the auto-generation of batting order when the lineup is generated.

**Primary recommendation:** Create a pure `scoreLineup()` function in `src/logic/lineup-scorer.ts` that produces a numeric score from three sub-dimensions (bench equity, infield balance, position variety), use it to rank N generated lineups, surface the best one through the existing `useLineup` hook, and auto-call `generateBattingOrder()` as part of the same generation action. Extract the duplicated Fisher-Yates shuffle into a shared utility module as part of the tech debt cleanup.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI rendering | Already in project |
| TypeScript | ~5.9.3 | Type safety | Already in project |
| Vitest | ^4.0.18 | Unit testing | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/react | ~0.2.4 | Drag-and-drop editing | Already installed, Phase 11 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom scoring | External optimization library | Overkill -- scoring 10 lineups is trivial, no library needed |
| Web Worker for generation | Main thread generation | 10 lineups x 200 attempts max = ~50ms, not worth worker complexity |

**Installation:**
```bash
# No new packages needed -- all functionality built with existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  logic/
    lineup-scorer.ts          # NEW: scoreLineup(), sub-scores, types
    lineup-scorer.test.ts     # NEW: unit tests for scoring
    lineup-generator.ts       # MODIFIED: generateBestLineup() orchestrator
    lineup-generator.test.ts  # MODIFIED: tests for best-of-N
    batting-order.ts           # UNCHANGED (already has generateBattingOrder)
    shuffle.ts                # NEW: shared Fisher-Yates shuffle (tech debt fix)
  hooks/
    useLineup.ts             # MODIFIED: generate() calls best-of-N + auto batting order
  components/
    lineup/
      FairnessScoreCard.tsx   # NEW: visual score breakdown with sub-dimensions
      FairnessScoreCard.module.css
    game-day/
      steps/
        ReviewStep.tsx        # MODIFIED: show FairnessScoreCard, remove manual batting order generation button
```

### Pattern 1: Pure Scoring Function
**What:** A stateless function that takes a lineup + context (player count, innings, game history) and returns a numeric score with sub-dimension breakdown.
**When to use:** Ranking multiple generated lineups to pick the best one.
**Example:**
```typescript
// src/logic/lineup-scorer.ts

export interface LineupScore {
  total: number;           // 0-100, higher is better
  benchEquity: number;     // 0-100, how evenly bench time is distributed
  infieldBalance: number;  // 0-100, how evenly infield positions are distributed
  positionVariety: number; // 0-100, how many unique positions each player gets
}

export function scoreLineup(
  lineup: Lineup,
  input: GenerateLineupInput,
): LineupScore {
  const bench = scoreBenchEquity(lineup, input);
  const infield = scoreInfieldBalance(lineup, input);
  const variety = scorePositionVariety(lineup, input);

  // Weighted average -- bench equity most important for youth baseball
  const total = bench * 0.5 + infield * 0.3 + variety * 0.2;

  return { total, benchEquity: bench, infieldBalance: infield, positionVariety: variety };
}
```

### Pattern 2: Best-of-N Orchestrator
**What:** Generate N lineups, score each, return the highest-scoring one.
**When to use:** The "Generate" button action.
**Example:**
```typescript
// In lineup-generator.ts

export function generateBestLineup(
  input: GenerateLineupInput,
  count: number = 10,
): GenerateLineupResult & { score: LineupScore } {
  const results: (GenerateLineupResult & { score: LineupScore })[] = [];

  for (let i = 0; i < count; i++) {
    const result = generateLineup(input);
    if (result.valid) {
      const score = scoreLineup(result.lineup, input);
      results.push({ ...result, score });
    }
  }

  if (results.length === 0) {
    // Return error result
  }

  // Sort by total score descending, return best
  results.sort((a, b) => b.score.total - a.score.total);
  return results[0];
}
```

### Pattern 3: Auto Batting Order in Generation Flow
**What:** When `generate()` is called in `useLineup`, it also calls `generateBattingOrder()` and sets both results atomically.
**When to use:** Removing the separate "Generate Batting Order" button from ReviewStep.
**Example:**
```typescript
// In useLineup.ts generate() callback

const result = generateBestLineup(input);
if (result.valid) {
  // Generate batting order in the same action
  const battingOrder = generateBattingOrder(presentPlayers, battingHistory);

  setState(prev => ({
    ...prev,
    generatedLineups: [result.lineup],
    selectedLineupIndex: 0,
  }));
  // Also set batting order state
}
```

### Anti-Patterns to Avoid
- **Scoring on the server:** All scoring runs client-side. No API calls needed -- lineup data is already local.
- **Complex ML-based scoring:** A simple weighted-average of 3 sub-dimensions is sufficient for youth baseball fairness.
- **Generating too many lineups:** ~10 is the sweet spot. Generating 100 would add latency for marginal improvement since the constraint solver already enforces hard rules.
- **Coupling scoring weights to UI:** Keep weights as constants in the scorer module. GEN-05 (configurable weights) is explicitly deferred to post-v3.0.
- **Breaking the existing `LineupState` shape:** The state shape in `useCloudStorage` is persisted. Changing it requires migration. Instead, store the score alongside the lineup without changing the base shape, or accept that score is ephemeral (computed on display, not persisted).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shuffle | Custom random array sort | Fisher-Yates in shared module | Already implemented correctly twice; just deduplicate |
| DnD editing | Custom drag system | @dnd-kit (already installed) | Phase 11 already set this up |
| Lineup validation | New validator | Existing `validateLineup()` | 8 rules already implemented and tested |
| Batting order fairness | New algorithm | Existing `generateBattingOrder()` | Three-band rotation already works |

**Key insight:** This phase is primarily about *composition* -- wiring existing pieces together with a new scoring function and removing a manual step. Almost no new algorithmic work is needed beyond the scorer itself.

## Common Pitfalls

### Pitfall 1: Score Not Updating After DnD Edits
**What goes wrong:** The fairness score is computed at generation time but doesn't update when the coach drags players around in the DnD editor.
**Why it happens:** The score is stored with the generated lineup, not recomputed from the edited lineup.
**How to avoid:** Compute the score as a `useMemo` derived from `editor.lineup`, not from the stored generation result. The `FairnessScoreCard` should accept a lineup and compute the score live.
**Warning signs:** Score stays the same after swapping two players.

### Pitfall 2: Batting Order Not Clearing on Regenerate
**What goes wrong:** Coach clicks "Regenerate" to get a new lineup, but the old batting order persists, creating a mismatch.
**Why it happens:** Batting order state is managed in a separate hook (`useBattingOrder`) from the lineup hook (`useLineup`).
**How to avoid:** When regenerating, also regenerate the batting order. The `generate()` function in `useLineup` should coordinate with `useBattingOrder.generate()` or the batting order should be generated as part of the same action.
**Warning signs:** Batting order shows names that don't match the new lineup's attendance.

### Pitfall 3: Degenerate Scoring with Fewer Than 10 Players
**What goes wrong:** With exactly 9 players (no bench), all lineups score identically on bench equity because nobody sits.
**Why it happens:** Bench equity variance is zero when nobody sits out.
**How to avoid:** Handle the "no bench" case gracefully -- if all players play every inning, bench equity should be 100 (perfect) and not penalize. The score should still differentiate via infield balance and position variety.
**Warning signs:** Score is always 100 or always 0 regardless of lineup quality.

### Pitfall 4: Performance with Many Lineups
**What goes wrong:** Generating 10 lineups each with up to 200 attempts could take noticeable time on slower mobile devices.
**Why it happens:** 10 x 200 = 2000 constraint-solving attempts in the worst case.
**How to avoid:** The existing `generateLineup()` typically succeeds in 1-10 attempts (observed in tests). Monitor with `attemptCount`. Consider stopping early if all 10 lineups have been found. The current implementation is already fast enough.
**Warning signs:** UI freezes for more than 100ms on generation.

### Pitfall 5: LineupState Cloud Sync Shape Change
**What goes wrong:** Adding `score` to the persisted `LineupState` type breaks existing cloud data.
**Why it happens:** `useCloudStorage` persists the full state object; old data won't have `score` field.
**How to avoid:** Either (a) keep score ephemeral -- compute it live via `useMemo`, never persist it, or (b) make it optional in the type and handle `undefined` gracefully. Option (a) is strongly preferred since scores are cheap to compute and shouldn't affect cloud sync.
**Warning signs:** Cosmos DB documents have unexpected `null` score fields, or cloud pull drops score data.

### Pitfall 6: Removing Batting Order Step Breaks Finalization
**What goes wrong:** The current `handleFinalize` in ReviewStep requires `editor.battingOrder` to be non-null. If the auto-generation fails or doesn't run, finalization is blocked.
**Why it happens:** Currently the batting order is generated by a separate button click. If auto-generation replaces this, it must always run before finalization is possible.
**How to avoid:** Generate batting order in the same `generate()` call that produces the lineup. Verify `editor.battingOrder` is populated before enabling the Finalize button.
**Warning signs:** Finalize button stays disabled even after successful lineup generation.

## Code Examples

Verified patterns from existing codebase:

### Existing Scoring Data Available in computeFairnessSummary (ReviewStep.tsx)
```typescript
// Source: src/components/game-day/steps/ReviewStep.tsx lines 17-57
// This function already computes per-player bench innings and infield innings
// It can be extracted and enhanced for the scoring function

function computeFairnessSummary(
  lineup: Lineup, innings: number, players: Player[],
): PlayerFairness[] {
  // ... calculates infieldInnings and benchInnings per player
}
```

### Existing Multi-Lineup Generation (lineup-generator.ts)
```typescript
// Source: src/logic/lineup-generator.ts lines 397-429
// Already generates multiple lineups with deduplication
export function generateMultipleLineups(
  input: GenerateLineupInput,
  count: number = 3,
): GenerateLineupResult[] {
  // Calls generateLineup() repeatedly, deduplicates by meaningful difference
}
```

### Existing Batting Order Generation (batting-order.ts)
```typescript
// Source: src/logic/batting-order.ts lines 75-109
// Already generates a fair batting order based on history
export function generateBattingOrder(
  presentPlayers: Player[],
  history: BattingHistoryEntry[],
): string[] {
  // Three-band rotation with history-based fairness
}
```

### Current useLineup.generate() Pattern (useLineup.ts)
```typescript
// Source: src/hooks/useLineup.ts lines 132-165
// Currently generates 1 lineup via generateMultipleLineups(input, 1)
// Phase 12 changes this to generate ~10, score them, pick best, auto batting order
const generate = useCallback((): { success: boolean; count: number; errors: string[] } => {
  const results = generateMultipleLineups(input, 1);
  // ...
}, [presentPlayers, innings, cleanState, setState, benchPriority]);
```

### Current Stepper Flow (GameDayStepper.tsx)
```typescript
// Source: src/components/game-day/GameDayStepper.tsx
// Steps: attendance -> pc-assignment -> review -> print
// The 'review' step auto-generates lineup on mount if none exist (ReviewStep.tsx line 113)
// Phase 12 keeps this flow but makes generation produce best-of-N + auto batting order
```

## Existing Code Inventory for Phase 12

### Must Modify

| File | What Changes | Why |
|------|-------------|-----|
| `src/logic/lineup-generator.ts` | Add `generateBestLineup()` or modify `generateMultipleLineups()` to score and rank | GEN-01: best-of-N scoring |
| `src/hooks/useLineup.ts` | `generate()` calls best-of-N, auto-generates batting order | GEN-01, GEN-02, GEN-04 |
| `src/components/game-day/steps/ReviewStep.tsx` | Add FairnessScoreCard, remove manual batting order button, keep regenerate button | GEN-03, GEN-04 |

### Must Create

| File | Purpose | Why |
|------|---------|-----|
| `src/logic/lineup-scorer.ts` | `scoreLineup()` pure function with sub-dimensions | GEN-01, GEN-03: scoring algorithm |
| `src/logic/lineup-scorer.test.ts` | Unit tests for scoring function | Test coverage |
| `src/logic/shuffle.ts` | Shared Fisher-Yates shuffle utility | Tech debt: deduplicate from lineup-generator.ts and batting-order.ts |
| `src/components/lineup/FairnessScoreCard.tsx` | Visual score breakdown UI component | GEN-03: visible fairness score |
| `src/components/lineup/FairnessScoreCard.module.css` | Styles for score card | GEN-03 |

### May Modify

| File | What Changes | Why |
|------|-------------|-----|
| `src/logic/lineup-generator.ts` | Import shuffle from shared module | Tech debt fix |
| `src/logic/batting-order.ts` | Import shuffle from shared module | Tech debt fix |
| `src/logic/lineup-types.ts` | Export `LineupScore` type (or put in scorer module) | Type sharing |
| `src/hooks/useBattingOrder.ts` | May need `generate()` called from `useLineup` or ReviewStep coordination | GEN-04: auto batting order |

### Must NOT Change

| File | Why |
|------|-----|
| `src/logic/lineup-validator.ts` | Validation rules are stable; scoring is additive, not a replacement |
| `src/types/index.ts` | Prefer `LineupState` type unchanged to avoid cloud sync migration |
| `src/components/game-day/GameDayStepper.tsx` | Stepper flow stays the same (4 steps) |
| `src/hooks/useStepperState.ts` | Step IDs unchanged |

## Scoring Algorithm Design

### Sub-Dimension 1: Bench Equity (weight: 0.5)

Measures how evenly bench time is distributed across players within this lineup.

**Formula:** If max bench innings across all players = `maxBench` and min = `minBench`:
- If nobody sits (9 players, 9 positions): score = 100
- If spread is 0 (everyone sits equally): score = 100
- Otherwise: score = 100 * (1 - stdDev(benchInnings) / maxPossibleStdDev)

**Simpler approach:** `100 - (maxBench - minBench) * penaltyFactor`. For 11 players / 6 innings, max spread is 6 (one player benched every inning vs one never benched). In practice, the NO_CONSECUTIVE_BENCH constraint limits spread to ~3-4.

### Sub-Dimension 2: Infield Balance (weight: 0.3)

Measures how evenly infield positions (1B, 2B, 3B, SS) are distributed. The INFIELD_MINIMUM constraint ensures 2+ per player in first 4 innings, but scoring rewards going beyond the minimum.

**Formula:** Standard deviation of infield-inning counts per player. Lower stdDev = higher score.

### Sub-Dimension 3: Position Variety (weight: 0.2)

Measures how many unique positions each player gets across all innings.

**Formula:** Average unique positions per player, scaled to 0-100. A player who plays 4 different positions is better than one who plays the same position every inning. P/C assignments are excluded from variety counting since they're pre-assigned by the coach.

### Weight Rationale

- Bench equity at 0.5: Most important for youth baseball -- parents and kids care most about playing time.
- Infield balance at 0.3: Important because kids want to play infield, not just outfield every inning.
- Position variety at 0.2: Nice-to-have -- kids enjoy playing different spots, but it's less critical than equal playing time.

## Stepper Flow Changes

### Current Flow (Post-Phase 11)
```
Attendance -> P/C Assignment -> Review (with manual Generate Batting Order button) -> Print
```

### Phase 12 Flow
```
Attendance -> P/C Assignment -> Review (auto batting order, fairness score visible) -> Print
```

**Key change in ReviewStep:**
1. On mount (or when lineup is missing), auto-generate best-of-10 lineup + batting order together
2. "Regenerate" button regenerates both lineup + batting order
3. FairnessScoreCard shows score breakdown (replaces or augments the existing FairnessSummary table)
4. Manual "Generate Batting Order" button removed -- batting order auto-generated with lineup
5. Coach can still DnD-edit both lineup and batting order before finalizing
6. Score updates live as coach makes DnD edits (computed via useMemo, not persisted)

### What Does NOT Change
- Stepper step IDs: `['attendance', 'pc-assignment', 'review', 'print']`
- Finalize Game flow: still saves edited lineup + batting order to game history
- PrintStep: still reads from game history (no changes needed)
- DugoutCard: unchanged

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generate 1-3 lineups, coach picks | Generate ~10, score, show best | Phase 12 | Coach sees one best lineup, not a confusing list |
| Separate batting order generation step | Auto-generate with lineup | Phase 12 | Fewer clicks, smoother flow |
| Per-player table (infield/bench counts) | Scored fairness breakdown card | Phase 12 | At-a-glance quality indicator |

**Deprecated/outdated:**
- `generateMultipleLineups()` with count=3 for coach selection: Replaced by best-of-N with scoring. The function itself may still be useful internally, but the UI no longer exposes multiple options.
- `GenerateStep` component: Already orphaned (not imported in GameDayStepper). Can be deleted as cleanup.

## Open Questions

1. **Should the existing FairnessSummary table be removed or kept alongside the new FairnessScoreCard?**
   - What we know: FairnessSummary shows per-player bench/infield counts. FairnessScoreCard shows an aggregate score with sub-dimensions.
   - What's unclear: Whether coaches want both views or just the aggregate.
   - Recommendation: Keep both. FairnessScoreCard is the headline, FairnessSummary provides per-player detail below it. No information is lost.

2. **Should we persist the LineupScore in state or compute it on-the-fly?**
   - What we know: Scoring is deterministic and cheap to compute from a lineup. Persisting it changes the LineupState cloud sync shape.
   - What's unclear: Whether score is needed after page refresh (before regeneration).
   - Recommendation: Compute on-the-fly via `useMemo`. Avoids cloud sync migration and keeps score always current (even after DnD edits).

3. **Should the generated batting order persist across regenerate cycles?**
   - What we know: Currently batting order is generated separately. Phase 12 auto-generates it with lineup. When coach hits "Regenerate", a new batting order would be generated too.
   - What's unclear: Whether coach expects batting order to stay stable when only lineup changes.
   - Recommendation: Regenerate both together. The batting order is random-within-bands anyway, so generating a fresh one is fine. Coach can DnD-reorder after if needed.

4. **Should we deduplicate the 10 generated lineups before scoring?**
   - What we know: `generateMultipleLineups()` already deduplicates. But for scoring, duplicate lineups (same score) don't hurt -- we just pick the top one.
   - What's unclear: Whether deduplication is worth the overhead when we're scoring anyway.
   - Recommendation: Generate 10 lineups via simple loop (call `generateLineup()` 10 times), skip deduplication. Score each, pick best. Simpler and faster than `generateMultipleLineups()` with its meaningful-difference check.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/logic/lineup-generator.ts` -- current generation algorithm and constraints
- Existing codebase: `src/logic/lineup-validator.ts` -- 8 validation rules
- Existing codebase: `src/logic/batting-order.ts` -- three-band batting order generation
- Existing codebase: `src/logic/game-history.ts` -- fairness tracking (computeFieldingFairness, computeCatcherInnings)
- Existing codebase: `src/hooks/useLineup.ts` -- generation hook with state management
- Existing codebase: `src/hooks/useBattingOrder.ts` -- batting order state management
- Existing codebase: `src/components/game-day/steps/ReviewStep.tsx` -- current review flow with DnD integration
- Existing codebase: `src/components/lineup/FairnessSummary.tsx` -- existing per-player fairness display
- `.planning/ROADMAP.md` -- Phase 12 requirements and success criteria
- `.planning/REQUIREMENTS.md` -- GEN-01 through GEN-04 specifications
- `.planning/PROJECT.md` -- tech debt inventory (Fisher-Yates duplication)

### Secondary (MEDIUM confidence)
- Phase 11 verification report -- confirms DnD editing is complete and ready for Phase 12 integration

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all existing
- Architecture: HIGH -- clear composition of existing building blocks with one new scoring module
- Pitfalls: HIGH -- identified from direct code analysis of current hook/component interactions
- Scoring algorithm: MEDIUM -- weights (0.5/0.3/0.2) are reasonable defaults but may need tuning after testing

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable -- no external dependencies to change)
