# Feature Landscape

**Domain:** Little League Baseball Lineup Builder
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Roster management (add/edit/remove players) | Every lineup tool starts with a roster - coaches need to define who's on the team | Low | Simple name input (first name + last initial per spec). No need for jersey numbers, birthdates, or extensive metadata for MVP. |
| Position assignment by inning | Core value proposition - coaches need to see who plays where each inning | Medium | Grid-based UI showing player-to-position mapping across innings. Must support 9 standard positions. |
| Batting order management | Required for game execution - umpires need the batting lineup | Low | Continuous batting order (all players bat) is the modern youth baseball standard. Simple ordered list. |
| Fair play validation | Youth baseball mandates equal playing time - tools must prevent rule violations | High | Complex constraint checking: no consecutive bench sitting, 2+ infield positions by inning 4, no same position consecutive innings. Must be real-time to prevent invalid lineups. |
| Print/export to single page | Coaches need physical dugout cards - digital-only is insufficient | Medium | PDF export or print-optimized view. Must fit on single page (8.5x11) for clipboard use. All innings visible at-a-glance. |
| Bench rotation tracking | Prevents accidentally benching same player multiple innings in a row | Medium | Visual indicator of who's on bench each inning. Validation prevents consecutive bench assignments. |
| Position rotation rules | Youth leagues require players experience multiple positions | Medium | Constraint: no same position consecutive innings. Helps develop well-rounded players and prevents stacking. |
| Inning configuration | Games vary by league/age (4-7 innings) | Low | Simple numeric input. Project spec targets 5-6 innings (11-12 player rosters). |
| Attendance/absence marking | Late arrivals and no-shows happen every game - lineup must adapt | Medium | Checkbox or toggle to mark player unavailable. Must recalculate lineup without requiring full regeneration. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pre-assignment of pitchers/catchers | Skilled positions require specific players - coaches don't want random rotation here | Low | Lock mechanism for specific innings/positions. Prevents algorithm from auto-assigning unskilled players to pitcher/catcher. Project spec explicitly includes this. |
| Position preference/avoidance | Algorithm respects player strengths and limitations while maintaining fairness | Medium | Per-player config: preferred positions, capable positions, avoid positions. Algorithm balances preferences with fairness constraints. Differentiates from purely random rotation. |
| Playing time transparency (visual bands) | Builds parental trust - shows algorithm is actually fair | Low | Color-coded indicators showing cumulative playing time distribution (Top/Middle/Bottom bands). "Prove fairness" feature reduces parent complaints. |
| Instant regeneration on constraint change | Last-minute roster changes don't force manual rebuild | Medium | Checkbox player out → regenerate affected innings in <30 seconds. GameTime Lineups markets this heavily as differentiator. |
| Multi-game season tracking | Fairness across season, not just single game | High | Persistent storage of playing time by position across all games. Algorithm factors in season totals when generating new lineups. Requires data persistence beyond localStorage. Defer to v2+. |
| Skill-based balancing | Creates competitive lineups by distributing talent across innings | Medium | Per-player skill ratings (contact, fielding, power, speed, throwing). Algorithm balances strong/weak players across innings. GameTime Lineups uses 5-category ratings. More relevant for travel/competitive vs recreational. |
| Mobile-first responsive design | Coaches work from phones in dugout/parking lot, not desktops | Medium | Touch-friendly UI, large tap targets, works on 5" screens. GameTime Lineups emphasizes "mobile-first" as key differentiator. Desktop is secondary use case. |
| Drag-and-drop reordering | Quick manual adjustments without regeneration | Medium | Visual manipulation of player order or position assignments. Faster than form-based editing for minor tweaks. |
| Assistant coach collaboration | Multiple coaches need edit access | High | Multi-user auth, real-time sync, permission levels (edit vs read-only). Requires backend infrastructure. Not viable for localStorage-only v1. |
| Parent read-only access | Transparency reduces "my kid didn't play enough" complaints | High | Shared link or password-protected view. Parents see lineup in advance. Requires hosting/sharing mechanism beyond localhost. Defer to v2+. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Comprehensive stats tracking (batting avg, RBIs, etc.) | Scope creep - this becomes a stats platform, not a lineup builder. GameChanger and TeamSnap own this space. | Focus exclusively on lineup generation. If coaches want stats, they'll use dedicated tools (GameChanger tracks 150+ stats). MVP should do one thing well. |
| Team scheduling/communication | Turns into team management suite. TeamSnap, GameChanger, BenchApp already dominate. | Assume coaches use separate tools for scheduling. Don't compete with established platforms. Lineup builder should integrate/export to them, not replace them. |
| Cloud storage of rosters | Privacy risk with minors' data. Requires COPPA compliance, privacy policy, data breach protocols. | localStorage only for v1. Names never leave browser. Market as privacy feature ("your players' names stay on your device"). If v2 adds cloud, must implement proper compliance. |
| Multi-team management (free tier) | Complexity for single-team coaches who are 90% of users. | Build for one team, one game use case. If coach has multiple teams, they can use separate browser profiles or clear localStorage. Don't optimize for edge case in MVP. |
| Pitch count tracking | Requires live game input, different workflow (in-game vs pre-game). Regulatory compliance varies by state. | Pre-game lineup generation only. GameChanger and GameTime Lineups handle in-game tracking. Pitch count is a separate feature domain. |
| Automated text/email notifications | Requires contact info collection (privacy concern), SMS/email infrastructure (cost), spam/opt-out compliance. | Coaches can copy/screenshot lineup and share manually. Avoid becoming a communication platform. |
| Advanced analytics (sabermetrics, spray charts) | Way beyond youth baseball needs. Coaches want fairness, not OPS+ calculations. | Simple visual fairness indicators only. Leave analytics to high school/college/pro tools. |
| Custom position creation (10+ positions) | Little League uses 9 standard positions. Custom positions add complexity without value for target user. | Hard-code 9 positions (P, C, 1B, 2B, 3B, SS, LF, CF, RF). Bench is not a "position". Don't over-engineer for edge cases. |
| Historical game archives | Becomes a records management system. Requires long-term storage, search, export. | Focus on current game only. If coaches want history, they can save PDFs to their own folders. Avoid building a database. |

## Feature Dependencies

```
Roster Management (player list)
    └──requires──> Position Assignment by Inning
                       └──requires──> Fair Play Validation
                       └──requires──> Bench Rotation Tracking
    └──requires──> Batting Order Management

Pre-Assignment of Pitchers/Catchers
    └──enhances──> Position Assignment by Inning
    └──conflicts──> Pure Random Rotation

Position Preference/Avoidance
    └──enhances──> Position Assignment by Inning
    └──requires──> Fair Play Validation (to override preferences when fairness demands it)

Attendance/Absence Marking
    └──modifies──> Roster Management
    └──triggers──> Position Assignment Regeneration

Print/Export to Single Page
    └──requires──> Position Assignment by Inning
    └──requires──> Batting Order Management

Skill-Based Balancing
    └──conflicts──> Pure Fair Play (fairness vs competitiveness tradeoff)
    └──requires──> Position Preference/Avoidance (skill ratings inform preferences)

Multi-Game Season Tracking
    └──requires──> Cloud Storage (not viable with localStorage-only constraint)
    └──enhances──> Fair Play Validation (season-level fairness vs game-level)

Assistant Coach Collaboration
    └──requires──> Cloud Storage + Auth (not viable with localStorage-only constraint)
```

## MVP Recommendation

### Launch With (v1)

Prioritize features that deliver core value: **fair, constraint-based lineup generation with dugout-ready output**.

- [x] **Roster management (first name + last initial)** — Foundation for all lineup operations. Keep data model simple.
- [x] **Position assignment by inning** — Core value proposition. Grid showing player-position-inning mapping.
- [x] **Pre-assignment of pitchers/catchers** — Explicitly in project spec. Skilled positions need manual control.
- [x] **Fair play validation (real-time)** — Table stakes for youth baseball. Must prevent: consecutive bench, insufficient infield time, consecutive same position.
- [x] **Batting order (continuous)** — Required for game execution. All players bat in fixed order.
- [x] **Print to single page** — Dugout card is the deliverable. Browser print with CSS optimization for single-page layout.
- [x] **Auto-generation of field positions** — After pre-assigning P/C, algorithm fills remaining 7-9 positions while respecting constraints.
- [x] **localStorage persistence** — Roster survives page reload. No cloud, no login, no privacy risk.
- [x] **Inning configuration (5-6 innings)** — Simple input to match game length.

**Why this MVP:**
- Solves the painful problem: manually building fair lineups takes 20-30 minutes and often violates league rules
- Delivers tangible output: printable dugout card
- Privacy-first: names never leave device
- Feasible for solo developer: no backend, no auth, no infrastructure

### Add After Validation (v1.x)

Features to add once core lineup generation is working and validated with real coaches.

- [ ] **Attendance/absence marking** — Late arrivals and no-shows happen frequently. Toggle player availability and regenerate. Wait until v1 algorithm is solid before adding dynamic roster changes.
- [ ] **Position preference/avoidance** — Coaches requested feature from research. "My kid hates playing right field" or "Player X is strong at shortstop". Requires algorithm enhancements to balance preferences with fairness. Add after baseline fairness algorithm works.
- [ ] **Bench rotation tracking (visual)** — Show which players are benched each inning with clear visual indicator. Helps coaches verify fairness at a glance. Relatively simple UI enhancement.
- [ ] **Drag-and-drop position swaps** — Manual override for "coach intuition" adjustments. Maintain validation but allow position swaps within same inning. Add after core generation proves reliable.
- [ ] **Multiple lineup comparison** — Generate 3-5 different valid lineups, let coach choose preferred. Algorithm randomness means multiple solutions exist. Helps coaches feel in control.

### Future Consideration (v2+)

Features that require significant infrastructure or serve narrow use cases. Defer until product-market fit established.

- [ ] **Multi-game season tracking** — Fairness across 15-game season, not just single game. Requires database to persist playing time history. HIGH value but HIGH complexity. Backend + cloud storage needed.
- [ ] **Skill-based balancing** — Distribute talent to create competitive innings. More relevant for travel ball than recreational Little League. Risk: conflicts with pure fairness approach. Requires user research to determine if coaches want competitive vs fair.
- [ ] **Assistant coach collaboration** — Real-time multi-user editing. Requires auth, backend, sync. Small % of coaches have assistant coaches with tech access. Not viable for localStorage-only architecture.
- [ ] **Parent read-only access** — Share lineup link with parents. Reduces "playing time" complaints via transparency. Requires hosting/sharing mechanism. Privacy implications with minors' names.
- [ ] **Mobile-first redesign** — Research shows coaches use phones in dugout. V1 can be responsive but desktop-optimized. V2 should prioritize mobile UX with large touch targets.
- [ ] **CSV import/export** — Integrate with TeamSnap/GameChanger rosters. Avoid manual re-entry of 12-player roster. Requires parsing external formats. Add if users complain about re-entry friction.
- [ ] **Playing time transparency (visual bands)** — Color-coded "Top/Middle/Bottom" cumulative playing time indicators. Builds parental trust. Requires tracking which innings qualify as premium vs less desirable positions. Complex fairness scoring.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Roster management | HIGH | LOW | P1 |
| Position assignment by inning | HIGH | MEDIUM | P1 |
| Pre-assignment P/C | HIGH | LOW | P1 |
| Fair play validation | HIGH | HIGH | P1 |
| Batting order (continuous) | HIGH | LOW | P1 |
| Print to single page | HIGH | MEDIUM | P1 |
| Auto-generation algorithm | HIGH | HIGH | P1 |
| localStorage persistence | HIGH | LOW | P1 |
| Inning configuration | MEDIUM | LOW | P1 |
| Attendance/absence marking | HIGH | MEDIUM | P2 |
| Position preference/avoidance | MEDIUM | MEDIUM | P2 |
| Bench rotation visual | MEDIUM | LOW | P2 |
| Drag-and-drop swaps | MEDIUM | MEDIUM | P2 |
| Multiple lineup comparison | MEDIUM | MEDIUM | P2 |
| Multi-game season tracking | HIGH | HIGH | P3 |
| Skill-based balancing | MEDIUM | MEDIUM | P3 |
| Assistant coach collaboration | LOW | HIGH | P3 |
| Parent read-only access | MEDIUM | HIGH | P3 |
| Mobile-first redesign | HIGH | MEDIUM | P3 |
| CSV import/export | MEDIUM | MEDIUM | P3 |
| Playing time transparency bands | MEDIUM | MEDIUM | P3 |

**Priority key:**
- **P1: Must have for launch** — Core lineup generation + print output + fairness validation
- **P2: Should have, add when possible** — Enhancements that improve usability after core works
- **P3: Nice to have, future consideration** — Requires infrastructure (backend, auth) or serves narrow use case

## Competitor Feature Analysis

| Feature | Free Baseball Lineups | Dugout Edge | GameTime Lineups | Our Approach (v1) |
|---------|---------------------|-------------|------------------|-------------------|
| **Roster management** | First name only | Full names + skill levels | Full names + 5-category ratings | First + last initial (privacy-conscious) |
| **Position assignment** | Auto-rotation every 1-3 innings | Auto with preferences | Auto with skill balancing | Auto with P/C pre-assignment |
| **Fair play rules** | Basic rotation, position lockouts | Equal playing time, no consecutive bench | Balanced across season | Real-time validation: consecutive bench, infield requirement, position repetition |
| **Batting order** | Add to any lineup | Included | Standard or continuous | Continuous only (youth standard) |
| **Print/export** | Member feature (paid) | Free PDF | Free PDF | Free browser print (CSS-optimized) |
| **Data persistence** | Member feature (paid) | Unknown | Cloud-based (account required) | localStorage only (no account, no cloud) |
| **Inning flexibility** | 3-7 innings | Configurable | Configurable | 5-6 innings (project spec) |
| **Player count** | Up to 20 (18 play) | Configurable | Tee ball to high school | 11-12 players (project spec) |
| **Mobile access** | iOS/Android apps | Web only | Mobile-first web + apps | Responsive web (v1), mobile-first (v2) |
| **Multi-team** | Member feature (paid) | Premium feature | Pro plan ($5/mo) | Single team only (v1) |
| **Season tracking** | No | No | Yes (playing time across games) | No (v1), Yes (v2+) |
| **Collaboration** | No | No | Yes (assistant coach + parent access) | No (v1), potential (v2+) |
| **Pricing** | Free basic, paid member | Free | Free (1 team, 25 lineups), $5/mo Pro | Free, no account, no paywall |

**Our Differentiation:**
1. **Privacy-first:** localStorage only, names never leave device. No account creation, no data collection. Market to privacy-conscious parents.
2. **Fair play focus:** Real-time constraint validation prevents rule violations. Competitors assume coaches know the rules; we enforce them.
3. **Single-game simplicity:** No cloud complexity, no team management bloat. Does one thing exceptionally well.
4. **Pre-assignment control:** Coaches retain authority over skilled positions (P/C) while automating the tedious part (7-9 field positions).

**Where we lose:**
- No mobile apps (v1 is web only)
- No season tracking (v1 is per-game)
- No collaboration features (single coach workflow)
- No skill-based balancing (pure fairness, not competitiveness)

**Strategic decision:** Serve recreational Little League coaches who want fair, rules-compliant lineups quickly. Let competitive travel ball coaches use GameTime Lineups with skill ratings and season tracking.

## Sources

**Competitor Analysis:**
- [Free Youth Baseball Fielding Lineups](https://freebaseballlineups.com/lineups.html)
- [Dugout Edge Lineup Generator](https://www.dugoutedge.com/lineup-generator)
- [GameTime Lineups](https://gametimelineups.com/)
- [Fair Play Lineup Card - Coach Joel's Way](https://www.coachjoelsway.com/)
- [Baseball Fielding Rotation App (iOS)](https://apps.apple.com/us/app/baseball-fielding-rotation-app/id1355733523)
- [Baseball Fielding Rotation App (Android)](https://play.google.com/store/apps/details?id=com.freebaseballlineups.testapp&hl=en_US&gl=US)

**Fair Play Rules & Constraints:**
- [Little League Rules, Regulations, and Policies](https://www.littleleague.org/playing-rules/rules-regulations-policies/)
- [What is a Continuous Batting Order? - Little League](https://www.littleleague.org/help-center/what-is-a-continuous-batting-order/)
- [Regular Season Pitching Rules - Little League](https://www.littleleague.org/playing-rules/pitch-count/)

**Feature Research:**
- [How to optimize your youth baseball lineup](https://www.youthbaseballedge.com/optimize-lineup/)
- [Coaching 102: Little League Batting Orders](https://oldmenplayingbaseball.com/2022/01/18/coaching-102-little-league-batting-orders/)
- [Best Baseball Management Software in the US (2026 Guide)](https://sportskey.com/post/best-baseball-management-software-us/)
- [TeamSnap Baseball Features](https://www.teamsnap.com/teams/sports/baseball)

**Print/Export Capabilities:**
- [Printable Baseball Lineup Card - FREE](https://www.printyourbrackets.com/printable-baseball-lineup-card.html)
- [Free Baseball Roster and Lineup Template](https://www.vertex42.com/ExcelTemplates/baseball-roster.html)

**Privacy Considerations:**
- [Gauging Professional Sport Biometric Data Privacy Concerns](https://www.foley.com/insights/publications/2025/05/gauging-professional-sport-biometric-data-privacy-concerns/)

---
*Feature research for: Little League Baseball Lineup Builder*
*Researched: 2026-02-09*
*Confidence: MEDIUM (based on competitor analysis, Little League rules documentation, and coaching community patterns)*
