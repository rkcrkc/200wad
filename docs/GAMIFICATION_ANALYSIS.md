# Gamification Analysis: 200WAD App

An analysis of the gamification mechanics used throughout the app, evaluated against the **Octalysis framework** (Yu-kai Chou). The app has **37 distinct gamification mechanics** across 13 categories.

---

## Octalysis Framework Mapping

The Octalysis framework identifies 8 Core Drives that motivate human behavior. Here's how the app's mechanics map to each.

---

### Core Drive 1: Epic Meaning & Calling

_"I'm part of something bigger than myself"_

**Mechanics found:** None.

**Assessment: ABSENT.** There's no narrative framing, no mission statement, no "why" beyond personal utility. The app treats language learning as a purely transactional exercise. This is the weakest drive in the app.

**Opportunities:**

- Frame the "200 Words a Day" concept as a movement/challenge identity (similar to NaNoWriMo or 75 Hard)
- Show aggregate community stats ("Together we've mastered 2.4 million words")
- Add a "Why I'm learning" prompt during onboarding that gets reflected back during difficult moments
- Cultural connection moments tied to words (e.g., "This word comes from..." or cultural context snippets)

---

### Core Drive 2: Development & Accomplishment

_"I'm making progress and achieving mastery"_

**Mechanics found:** Word mastery state machine, scoring system (0-3 points), milestone scores, progress rings, completion percentages, personal bests, activity heatmap, learning charts, cumulative stats, words-per-day rate, status pills, sub-badges, **score indicator (3-dot streak visualisation)**, **in-session "almost mastered" / "mastered" toasts with confetti**.

**Assessment: VERY STRONG (14+ mechanics).** This is the app's dominant drive and it's well-executed. The four-tier word mastery system (`not-started -> learning -> learned -> mastered`) with floor rules is psychologically sound -- it prevents discouraging regression while maintaining challenge.

**Strengths:**

- The mastery state machine is the app's best gamification design. The floor rules (never dropping below `learned`) protect against loss aversion without removing challenge. The 3-correct-streak requirement for mastery creates a satisfying "earn it" feeling
- Multi-granularity progress (word -> lesson -> course) gives both micro-wins and macro-goals
- The activity heatmap (GitHub-style) leverages proven visual consistency motivation
- Spaced repetition milestones (day -> week -> month -> quarter -> year) provide a long-term progression arc that keeps users coming back
- **The score indicator (`src/components/ui/score-indicator.tsx`) renders the last 3 test attempts as coloured dots and visually marks the mastery threshold with stacked gold stars when the leading streak hits 3.** This surfaces `correct_streak` progress on every word row, detail page, and study action bar — closing the "invisible progress" gap that previously sat at the top of this section
- **In-session post-answer toasts now fire at the mastery transition itself**: an "Almost there! One more perfect answer to master this word." nudge at streak 2, and a "Mastered!" toast with fullscreen confetti at streak 3 (see `TestModeClient.handleSubmit` → `showAchievementToast` + `<ConfettiBurst />`). Both are gated per word per session so Test Twice doesn't double-fire on a single mastery event

**Weaknesses:**

- No leveling system exists. Users have no "level 15 learner" identity. The progression is entirely content-bound (lessons completed) rather than skill-bound
- Personal bests are buried on the community page rather than celebrated when broken

**Opportunities:**

- Add XP/level system that aggregates all activity into a single progression metric
- Celebrate personal bests with a modal/toast when broken, not just a static card
- Add "milestones achieved" badges (e.g., "First 100 words mastered", "All lessons studied")

---

### Core Drive 3: Empowerment of Creativity & Feedback

_"I can experiment, try different strategies, and get meaningful feedback"_

**Mechanics found:** Character-level diff feedback, word tracker dots, clue system (3 levels).

**Assessment: MODERATE.** The feedback quality is high, but creative expression is absent.

**Strengths:**

- The character-level diff with Levenshtein distance is excellent UX -- learners can see exactly which letters they got wrong, which is far more instructive than a binary right/wrong
- The 3-tier clue system (0, 1, 2) creates a meaningful risk/reward trade-off: use a clue to get the answer right, but sacrifice points. This is a good game-like decision

**Weaknesses:**

- There's no user agency in learning path. Users follow a fixed lesson order with no branching, no choice of focus area, no ability to create custom practice sets
- No "practice mode" exists where users can experiment without consequences (outside the paused tutorial "Demo Mode")

**Existing features of note:**

- Users can add personal notes to any word (stored in `user_word_progress.user_notes`), which partially addresses the annotation/mnemonic need
- A "Worst Words" auto-lesson dynamically collects the user's lowest-scoring words (excluding mastered) for targeted practice, addressing the "problem words" need
- A "Best Words" auto-lesson and "My Notes" auto-lesson provide further user-directed study options

**Opportunities:**

- Add a low-stakes "quick review" mode distinct from scored tests
- Show strategy tips based on error patterns ("You tend to mix up masculine/feminine -- try...")
- Allow users to create fully custom word lists beyond the auto-generated ones

---

### Core Drive 4: Ownership & Possession

_"This is mine, I've built it, I want to protect it"_

**Mechanics found:** Credit system (referrals + weekly rewards), subscription tiers, Dictionary "My Words" tab, user notes on words.

**Assessment: MODERATE.** The dictionary's "My Words" tab gives users a browsable library of vocabulary they've built, and the credit system provides a tangible currency. But the emotional weight of ownership could be stronger.

**Strengths:**

- The credit/referral system creates a tangible currency
- The Dictionary "My Words" tab is a browsable personal vocabulary library that grows as the user studies — this is the core ownership artifact
- Users can add personal notes to words, creating a sense of customization

**Weaknesses:**

- No profile customization beyond avatars
- Credits appear to have limited spending outlets beyond subscription offsets
- The growing vocabulary isn't celebrated visually (no "500 words collected!" moments)

**Opportunities:**

- Create a visual "word garden" or "word wall" that makes the growing vocabulary feel more tangible and rewarding
- Let users customize their profile or learning space
- Add collectible elements tied to milestones (profile frames, badge shelves, theme unlocks)
- Give credits more spending power (streak freezes, cosmetics, bonus content)

---

### Core Drive 5: Social Influence & Relatedness

_"I'm motivated by what others do, and I want to connect/compete"_

**Mechanics found:** Leaderboard (3 metrics, 2 time periods), league system (4 tiers with promotion/relegation), weekly rewards, referrals.

**Assessment: MODERATE-STRONG infrastructure, but likely low engagement.** The systems are well-designed on paper, but several issues reduce effectiveness.

**Strengths:**

- The league system (Bronze -> Diamond with weekly promotion/relegation) is a proven mechanic (borrowed from Duolingo). It segments competition so beginners aren't crushed by power users
- Multiple leaderboard metrics (words/day, words mastered, streak) let different play-styles compete
- The referral system with dual-sided rewards is well-structured

**Weaknesses:**

- The leaderboard falls back to mock data when < 5 real users exist, suggesting the community is small. Leaderboards are demotivating in small populations (you're always #1 or competing against fake users)
- No social learning features -- no study groups, no "learning with friends," no ability to see what friends are studying
- No social proof during learning ("1,247 people have mastered this word")
- The league system's weekly reset can be exhausting without enough players to make it feel fair
- No cooperative mechanics at all -- it's pure competition

**Opportunities:**

- Add "learning buddy" or pair challenges
- Show social proof on difficult words ("72% of learners get this right on first try")
- Add cooperative goals ("Our community is trying to master 10,000 words this week")
- Consider "ghost racing" -- compete against your own past performance if community is small
- Add word-of-the-day or shared daily challenges

---

### Core Drive 6: Scarcity & Impatience

_"I want it because I can't have it (yet)"_

**Mechanics found:** Free lesson threshold (10 lessons), locked lesson states, subscription gating.

**Assessment: FUNCTIONAL BUT BASIC.** The monetization gate exists but there's no gamified scarcity.

**Strengths:**

- The 10-lesson free tier is generous enough to demonstrate value before gating

**Weaknesses:**

- Scarcity is only used for monetization, not for engagement. There are no limited-time events, no daily bonuses, no "window closing" mechanics
- No countdown timers for upcoming content or events
- Locked lessons use a simple paywall rather than an earned unlock (e.g., "master lesson 5 to unlock lesson 6")

**Opportunities:**

- Add daily bonus content (bonus word, daily challenge) that's only available that day
- Create "early access" to new courses/lessons for high-performing users
- Add streak-based unlocks ("maintain a 7-day streak to unlock X")
- Time-limited events or themed word packs

---

### Core Drive 7: Unpredictability & Curiosity

_"I want to find out what happens next"_

**Mechanics found:** Essentially none.

**Assessment: ABSENT.** This is a major gap. The app is entirely predictable -- users know exactly what will happen at every step.

**Weaknesses:**

- No variable rewards. Every correct answer gives the same deterministic score
- No surprise elements (bonus questions, hidden achievements, easter eggs)
- No mystery or discovery mechanics
- Test scheduling is transparent and predictable (which is good for SRS but bad for engagement)
- No randomized daily challenges or varied question formats

**Opportunities:**

- Add variable rewards (occasional "bonus point" multipliers, rare word discoveries)
- Introduce varied question types (multiple choice, fill-in-blank, listening, matching) to break monotony
- Add "mystery" achievements that aren't revealed until earned
- Daily random challenges with unpredictable themes
- "Lucky word" mechanic -- random bonus for mastering a specific word today
- Streak reward boxes that get better the longer the streak (a la loot boxes)

---

### Core Drive 8: Loss & Avoidance

_"I don't want to lose what I've built"_

**Mechanics found:** Daily streak (current + longest), floor rules (never drop below `learned`), spaced repetition due dates.

**Assessment: MODERATE.** The streak mechanic is the primary loss-avoidance lever, and the floor rules are a smart counterbalance.

**Strengths:**

- The streak system is the most reliable daily engagement driver. "Don't break the chain" is proven effective
- Floor rules are **excellent** design -- they use loss avoidance to keep users coming back (spaced repetition schedules) without the toxic pattern of actually punishing them by regressing mastery. This is mature gamification design
- Due test badges in the sidebar create gentle urgency without anxiety

**Weaknesses:**

- No streak freeze/protection mechanic. Users who miss one day lose everything -- this is the #1 cause of permanent churn in streak-based apps (the "what the hell" effect)
- No "at risk" warnings ("You haven't studied today -- your 45-day streak expires in 3 hours!")
- The notification system is structurally present but not actively generating alerts, so there's no push-based loss avoidance
- No decay mechanic on mastered words -- once mastered after 3 correct, words are effectively "done" even if the user hasn't seen them in months

**Opportunities:**

- Add streak freeze (purchasable with credits, or earned through performance)
- Implement push/email notifications for streak-at-risk and due tests
- Consider a gentle mastery decay after extended absence (not a punishment, but a "refresh recommended" indicator)
- Show "streak at risk" warnings in the header as the day progresses
- Add "comeback" mechanics that soften the blow of a broken streak ("You lost your 30-day streak, but your words-per-day rate is still strong. Start a new streak!")

---

## Octalysis Shape Summary

| Core Drive | Score | Assessment |
| --- | --- | --- |
| CD1: Epic Meaning & Calling | 0/10 | Absent |
| CD2: Development & Accomplishment | 8/10 | Very strong, dominant drive |
| CD3: Empowerment of Creativity & Feedback | 3/10 | Good feedback, no creativity |
| CD4: Ownership & Possession | 3/10 | Dictionary "My Words" + credits, but not celebrated |
| CD5: Social Influence & Relatedness | 5/10 | Good infrastructure, likely low engagement |
| CD6: Scarcity & Impatience | 2/10 | Monetization-only scarcity |
| CD7: Unpredictability & Curiosity | 0/10 | Absent |
| CD8: Loss & Avoidance | 5/10 | Streaks + floor rules, no safety net |

**Shape diagnosis:** The app is heavily skewed toward Core Drive 2 (Accomplishment) -- a classic "Left Brain" (extrinsic) dominance pattern. The right-brain drives (Creativity, Unpredictability, Epic Meaning) are nearly empty. This creates an app that feels productive but not _fun_ or _meaningful_.

---

## Overall Verdict

### Top 3 Strengths

1. **Mastery state machine with floor rules** -- Psychologically sophisticated. Progression without punishment. This is better than what most language apps do
2. **Spaced repetition as gamification** -- The milestone system (day -> year) naturally creates a long-term return loop. The 20% early window is a clever flexibility mechanism
3. **Anti-gaming integrity** -- Server-side re-scoring, activity flags, and rate limiting show mature design. Many gamified apps are ruined by exploits that devalue achievements

### Top 3 Weaknesses

1. **No unpredictability or surprise** -- The app is entirely deterministic. This makes it feel like homework rather than a game. Variable rewards are the #1 tool for sustained engagement and they're completely missing
2. **No streak safety net** -- No streak freeze, no at-risk warnings, no comeback mechanic. One missed day wipes the longest streak — the classic "what the hell" churn pattern that Duolingo solves with paid/earned freezes
3. **No leveling/identity layer** -- All accomplishment is content-bound (lessons mastered) rather than skill-bound. No "Level 15 learner" title or XP-style cross-activity progression metric

### Top 3 Opportunities (Highest Impact, Lowest Effort)

| Opportunity | Impact | Effort | Core Drives Served |
| --- | --- | --- | --- |
| Add streak freeze purchasable with credits (or a new earned currency) | Very High | Medium | CD4, CD6, CD8 |
| Add variable rewards / mystery achievements (the unpredictability gap) | High | Medium | CD2, CD7 |
| Personal-best break celebrations (toast + animation when records fall) | Medium | Low | CD2, CD4 |

### Recently shipped (was previously in this top-3 list)

- ✅ **Show `correct_streak` progress toward mastery** — already shipped in `src/components/ui/score-indicator.tsx`. Renders the last 3 test attempts as coloured dots and stacks gold stars once the leading streak reaches 3 (the mastery threshold). Used in `WordRow`, `WordDetailActionBar`, `StudyActionBar`.
- ✅ **Celebration animations on mastery** — `CelebrationModal` (end-of-session, modal-scoped confetti) and `ConfettiBurst` (in-session, fullscreen confetti at the moment the word's streak hits 3) are both wired up. The in-session toast pair ("Almost there!" at streak 2, "Mastered!" at streak 3) fires from `TestModeClient.handleSubmit`.

### Strategic Recommendation

The app is built like a **tool** (strong tracking, accurate scoring, honest progress) but wants to be a **game**. The foundation is excellent -- better than most competitors on data integrity and mastery logic. The gap is entirely on the **emotional and experiential** side. The three highest-leverage changes would be:

1. **Make hidden progress visible** (correct_streak, "almost mastered" indicators)
2. **Add variable rewards and surprise** (daily challenges, bonus multipliers, mystery achievements)
3. **Celebrate achievements loudly** (animations, sounds, milestone modals)

The trophies system (currently a placeholder) is the natural home for many of these improvements -- when built, it should address Core Drives 1, 4, and 7 simultaneously.

---

## Mechanics Inventory

39 distinct gamification mechanics were identified across these categories:

| Category | Count | Implementation Status |
| --- | --- | --- |
| Progress Tracking | 4 | Fully implemented |
| Achievements/Badges | 2 | Trophies page still a placeholder; personal bests working; first-time + milestone achievement toasts wired |
| Mastery/Status | 4 | Fully implemented — state machine, score indicator (3 dots → mastery stars), in-session "almost there" + "mastered" toasts |
| Social/Competitive | 4 | Fully implemented |
| Feedback | 3 | Fully implemented |
| Streaks | 2 | Fully implemented (no streak freeze yet) |
| Time-Based | 3 | Fully implemented |
| Unlocking/Gating | 2 | Fully implemented |
| Visual Rewards | 4 | Implemented — `CelebrationModal` (end-of-session, scoped confetti) + `ConfettiBurst` (in-session, fullscreen confetti at the mastery transition) |
| Notifications | 1 | Structurally present, minimally active |
| Tips/Guidance | 2 | Tips working; tutorial paused |
| Stats/Analytics | 5 | Fully implemented |
| Anti-Gaming/Integrity | 3 | Fully implemented |

---

# Round 2 Analysis — Gamification v1 Plan

The first round of analysis (everything above) identified mechanic-by-mechanic gaps against the Octalysis framework. Round 2 takes a concrete v1 product proposal (the **Gamification v1** doc, dated pre-launch) and reviews it against the codebase as it stands today. This round captures three things:

1. The v1 plan as proposed
2. The architectural review of that plan
3. The product decisions the founder made in response (open items vs. locked-in)

## 1. The v1 plan as proposed

### Business goal framing (AARRR)

Gamification is targeted at three of the five AARRR drivers — Acquisition and Activation are handled via other mechanisms:

- **Retention** — increase free-plan engagement (more chance of hitting upgrade frictions like the locked-lesson limit); reduce paid-plan churn; increase enjoyment via dopamine moments and white-hat motivation drivers.
- **Referral** — direct referrals to the app; share positive moments to socials.
- **Revenue** — drive free-to-paid conversion.

### Doing / Earning

1. **Experience Points (XP — provisionally called "coins").** Earned for actions feeding the three growth drivers; spendable on rewards. "Everything feeds through points."
2. **Test points.** Currently earned during a test; proposed conversion: 1 coin per test point earned.
3. **Credits.** Currently earned per referral signup, applied to Stripe customer balance. Plan proposes (a) trigger on **paid conversion**, not signup, to prevent fake-account abuse, and (b) **merge credits into coins**.
4. **Leaderboard.** Social/competitive motivation. Ranked on test points scored, words learned, words mastered, over TBD time windows. Top 3 / consecutive top 3 earn coins and achievement unlocks. Annual standings celebrated at year-end awards. Initially un-cohorted, architected for cohorts later.
5. **Achievements.** Key milestones (first mastery, course progress, etc.) earn coins. Already-shipped "trophies" need a dedicated **achievements page/tab** with full catalogue + unlock status. Certain achievements trigger coin multipliers / bonuses (e.g. 3/5/10 lessons today; X correct test answers in a row).
6. **Streak (usage streak).** Consecutive days with a lesson or test. Already tracked but needs a dedicated page with full calendar and history. Day milestones (3/5/10/15/30/45/60/90) map to achievements. Naming collision with existing word-level `correct_streak` flagged for resolution.
7. **Levels / badges.** Status/seniority within the community. Promoted by coin accumulation. Belt metaphor (white → black) one candidate; needs concept work.
8. **In-app messaging.** Toasts/notifications for coins earned, near-achievements (e.g. "Almost mastered" at streak 2), leaderboard rank changes.

### Spending / Rewards

1. **Shop** (name TBD). Spend coins to unlock:
   a. Freeze streak
   b. Recover streak
   c. % off subscription — **earned via referral conversion**, not coin-purchasable
   d. Coins multiplier
   e. Feedback prioritisation
   f. *[Possible]* Unlock special lessons/courses
   g. *[Possible]* Unlock features like Test Twice Mode, Accelerated Breathing Mode
   h. *[Possible]* Unlock products in wider ecosystem (Grammar course, bootcamp discount, community-dinner invitation)
2. Reward categorisation: **Stuff, Powers, Access, Status**.
3. Some rewards level-gated (e.g. feedback prioritisation only for higher levels).

### Open questions in the v1 doc

- XP and coins: same currency or split? Arguments for/against?
- Any v1 features missing?
- Scalability — feasible v1 or too heavy?
- Notification/toast content gaps?
- Anything from the Round 1 analysis worth pulling into shop catalogue?

## 2. Architectural review of the v1 plan

### Where the plan stands vs. current state

| Plan area | Current state | Notes |
|---|---|---|
| XP / coin balance | **Not started** | No lifetime balance on `users`; no ledger. Needs `coin_transactions` (mirror of `credit_transactions`) and a cached `users.coin_balance`. |
| Test points = 1 coin | Test points shipped with **server-side re-scoring** (`src/lib/mutations/test.ts:1000-1112`) + `activity_flags` for cheat detection. | Coin awards must hang off server-scored values, not client claims. |
| Credits → coins merge | Credits shipped: `credit_transactions`, `referrals`, synced to Stripe customer balance as **real money (cents)**, triggered on first lesson. | Biggest accounting conflict — see inconsistency #2 below. |
| Leaderboard | **Already shipped with leagues**: `weekly_leaderboard_snapshots`, `leaderboard_rewards`, `users.league`, `users.league_points`, RPCs `get_leaderboard()` / `get_user_leaderboard_position()`, admin page, per-rank `reward_cents` payouts. | Snapshots are weekly, not annual. No cohorts. |
| Achievements / trophies | **No persistent trophy table.** Achievements fire as **notifications only** (`src/lib/notifications/achievements.ts`); idempotency in `notifications.data->>template_key`. | Once the bell is dismissed, no user-facing trace. No achievements page. |
| Usage streak | Shipped: `users.current_streak`, `longest_streak`, `last_activity_date`, `user_daily_activity` per-day rows, `update_daily_activity` RPC. | No streak page, no freeze concept, no milestone rewards. Naming conflict with `correct_streak` confirmed. |
| Levels / belts | Not started | Net new system. |
| In-app messaging | Template system shipped (`notification_templates`, channels `[in_app, email, toast]`, `insertFromTemplate`, `fireTemplateToast`, etc.). | All new copy can ship through admin-editable templates. |
| Shop | Not started (credits exist but no catalogue). | Net new. |

### Internal inconsistencies in the plan

1. **1 test point = 1 coin → coin inflation.** A perfect 10-word lesson = 30 coins; Test Twice doubles that to 60. Daily motivated user accumulates 100-300/day. Too generous for the shop items to feel meaningful. Coarser conversion or daily cap recommended.
2. **Credits = real money, coins = soft currency → cannot merge 1:1.** Credits live in Stripe customer balance and apply transparently at checkout. Merging breaks either the Stripe-balance behaviour or creates a real-money liability on every coin earned. The 4(c) reward ("% off subscription") is what credits already do today — that overlap can stay referral-only.
3. **Referral attribution change (signup → paid conversion)** is a real behavioural trade-off, not just config. Today's trigger is `completeReferralIfPending()` on first lesson. Moving to paid conversion delays gratification (paid takes days/weeks), removes incentive to refer free-only users, and requires Stripe webhook integration. Trades volume for quality.
4. **Leaderboard double-reward risk.** `leaderboard_rewards` already pays real cash (`reward_cents`) to top ranks. Adding coins + achievements on top is three streams stacked. Pick one anchor.
5. **Streak Freeze isn't free in the data model.** `update_daily_activity` resets on any gap. Freeze needs either `users.streak_freezes_available` int (decremented on auto-skip) or a freeze-flagged row in `user_daily_activity`.
6. **"Unlock Test Twice in shop" is a regression for existing users.** Test Twice is a free toggle today. Gating post-launch removes a capability. Either grandfather existing users or gate only net-new features (Accelerated Breathing is safer).
7. **Annual leaderboard has no architectural home.** Snapshots are weekly. Needs `leaderboard_seasons` or `season_id` on snapshots.
8. **Cohort-by-signup "prepared for future"** means at minimum a `users.cohort_id` (or computed bucket) + cohort_id in leaderboard RPCs.
9. **Streak naming.** Concrete fix needed across `user_word_progress.correct_streak`, `score-indicator.tsx`, achievement copy, the new "almost mastered" toasts, and types.
10. **Coins multiplier stacking** undefined. Achievement-triggered + shop-purchased + league-tier — multiply? max-of? additive? Decide before launch or exploit chains appear.

### Architectural gaps to fill

| Gap | Concrete change |
|---|---|
| Lifetime coin balance | `users.coin_balance` cached + `coin_transactions` ledger; invariant: balance = SUM(amount) WHERE status='confirmed'. |
| Persistent trophies | New `achievements` catalogue + `user_achievements` unlocks (or extend templates with `is_trophy` + a `user_trophy_unlocks` table). |
| Achievements page | New `/achievements` route reading catalogue + unlocks. |
| Streak page | New `/streak` route with calendar heatmap from `user_daily_activity`. |
| Freeze streak primitive | `users.streak_freezes_available` + RPC change. |
| Levels / belts | `levels` catalogue (level_n, xp_threshold, label, slug, icon) + `users.level` cached. Promotion in the activity RPC. |
| Shop catalogue | `shop_items` (slug, category, cost_coins, required_level, is_active) + `user_inventory` / `user_purchases`. |
| Coin awards | Extend `recordActivity` / `update_daily_activity` to write a `coin_transactions` row using server-scored points + bump `users.coin_balance`. |
| Leaderboard rank-change toast | New `leaderboard.overtaken` template + server-side delta check on snapshot/scoring update. |
| Annual rollup | `leaderboard_seasons` or `season_id` on `weekly_leaderboard_snapshots`. |

### Answers to the plan's open questions

**Q1 — XP and coins: one or two?** Split. XP = lifetime earned, never decreases, drives levels and all-time leaderboards. Coins = spendable, awarded on a coarser subset of XP-earning actions. One-currency UX is simpler but creates a punishing dynamic where every spend de-levels the user; once you separate "lifetime earned" from "current balance" for any reason (leaderboards usually need it), you have two currencies regardless of label.

**Q2 — Missing v1 features (priority order):**

1. **Daily goal** ring/target — biggest engagement lever in the genre, all data available.
2. **Personal-best celebrations** — infra just shipped (ConfettiBurst + templates).
3. **Variable rewards / mystery loot** — fills the CD7 gap.
4. **Activity heatmap on streak page** — `user_daily_activity` data already exists.
5. **Comeback flow** — post-break re-engagement + one-time freeze offer.
6. **Friends / private leaderboards** — synergises with referral.
7. **Profile cosmetics** as a low-stakes coin sink.
8. **Re-mastery acknowledgement** when a word loses then regains mastery.

**Q3 — Scalable / too heavy?** This is two releases, not one. Recommended split:

- **v1a (foundations):** streak rename, streak page with freeze/recover, achievements page surfacing existing trophy firing, coin balance, 5-10 admin-managed achievement templates, daily goal + toast.
- **v1b (economy):** levels/belts, shop with Powers category first, annual leaderboard rollup, leaderboard-overtaken notifications, variable rewards.
- **v2:** Stuff/Access/Status shop categories, feedback prioritisation, friends, cohorts, test-time power-ups.

**Q4 — Notification templates missing** (all admin-editable):

| Key | When |
|---|---|
| `streak.milestone_3/5/10/15/30/45/60/90` | Day-streak milestones |
| `streak.about_to_break` | Cron-driven evening reminder if streak > 3 and no activity yet today |
| `streak.broken` | First login after break — offer freeze |
| `streak.frozen_today` | Freeze auto-applied |
| `goal.daily_complete` / `goal.daily_50_percent` | Daily goal progress |
| `coins.earned` / `coins.multiplier_active` | Coin events |
| `level.up` | Promotion |
| `leaderboard.overtaken` / `.top3_warning` / `.weekly_result` | Leaderboard events |
| `achievement.unlocked` | Generic trophy unlock |
| `personal_best.day` / `.week` / `.session` | PB broken |
| `wordprogress.re_mastered` | Word regained mastery after losing it |

**Q5 — Ideas from Round 1 worth pulling in:** wagering coins on a daily goal (commitment device, CD8), test-time power-ups (skip, 50/50, free clue), end-of-day "almost mastered today" digest, coin gifting between friends (later).

## 3. Founder decisions in response

Captured here so the product direction is on the record before any of v1a is built.

### Locked-in

- **Coarser coin conversion than 1:1.** Exact ratio TBD; design will treat 1 perfect 3/3 answer (not 1 point) as the meaningful unit, with daily caps and achievement bonuses.
- **Referral attribution moves to paid conversion.** Replaces lesson-completion trigger. Requires Stripe webhook hook-in.
- **Leaderboard rewards become coins, not cash.** `leaderboard_rewards.reward_cents` retired from the UI for now; coin-equivalent rewards take over. Cash discounts re-enter the loop only via shop items (coin-purchasable subscription discounts), not direct credits.
- **Referral reward = coins only.** No automatic Stripe credit on referral conversion. Subscription discounts unlock exclusively through the shop. Implication: the existing `credit_transactions` + Stripe-balance referral plumbing is no longer triggered by referral conversion; it remains as an admin-side tool (e.g. customer-service goodwill credits) but is fully hidden from the user. The shop's "% off subscription" item creates a one-time Stripe coupon at purchase time, consuming coins.
- **Annual leaderboard = cumulative YTD to a fixed cut-off (e.g. Dec 24).** Awards on Christmas Day, comms ramp in the run-up. Permanent record of top 3 (or top 10-20) per year retained.
- **Streak naming:** keep `correct_streak` (it's accurate — mastery only fires when streak ≥ 3). The **day-based streak** is the one that needs an explicit name. Going forward use **`day_streak`** in code/UI where there's any ambiguity; the bare word "streak" in user-facing copy refers to the day streak (the more common reading).
- **Coin multiplier ladder:** 1×, 2×, 3×, 5×, 10×, 15×, 20×. **Stacking rules locked in:** (1) max-of, never multiplicative — overlapping multipliers resolve to the highest single value; (2) multipliers apply only to *base earned coins* (per-answer), not to lesson/course/streak completion bonuses; (3) all multipliers are time-windowed, never permanent.
- **Daily goal + personal-best celebrations confirmed for v1.**
- **Test-time power-ups deferred to v2.**
- **Variable rewards in v1 = mystery achievements only.** Coin chests on daily-goal completion, lucky-word, streak chests, random multiplier hours, bonus questions, rare-word discovery, daily deals — **all deferred to v2**. The mystery achievements (Night Owl, Comeback Kid, Perfectionist, etc.) are surfaced in the achievements/trophies page as a **separate section labelled "Special" or "Mystery" achievements**, displayed as "???" placeholders until unlocked. These are the right home for less-structured/behavioural unlocks that don't fit the linear progression catalogue.
- **XP is raw, never multiplied.** Coins are the multiplied currency; XP stays at 1:1 with server-scored test points so levels and all-time leaderboards remain comparable across users.

### v1a implementation decisions — locked in

These close out the open questions from the v1a schema sketch (full sketch lives in `docs/V1A_GAMIFICATION_PLAN.md`):

- **Day-streak naming: no rename.** `users.current_streak` and `users.longest_streak` stay as-is. Disambiguation is already handled by `user_word_progress.correct_streak` being the explicitly-named one. Convention going forward: at the DB / code layer, table context resolves any ambiguity; in user-facing copy, "streak" defaults to the day streak (the more common reading), and the per-word concept is always referred to as "correct streak" or "mastery progress" when surfaced. Avoids a ~20-file search-and-replace with no functional benefit.
- **Daily goal default: 30 XP.** Editable per-user later (Casual/Regular/Serious chooser deferred). Scope is total XP across all languages (simpler for single-language learners, which is most of the userbase).
- **Personal-best scope: total across languages.** Same rationale as daily goal. Per-language PB surfaces deferred to a future "Per-language stats" backlog item — data is already segmented in `user_daily_activity (user_id, language_id, activity_date)` so it's pure UI work when it ships.
- **Streak freeze acquisition: shop-only (v1b) + launch grant of 1.** `users.streak_freezes_available` defaults to 1 on the column, backfilled to 1 for existing users. New shop sales (v1b) increment the same counter. Each freeze = 1 day saved; multi-day gaps consume one per missed day.
- **Coin amounts (base earn + achievement rewards): locked in as starting numbers** from the sketch. All editable via admin dashboard since they live in regular columns.
- **Admin CRUD for achievements** lives at `src/app/admin/achievements/` — new page following the existing `src/app/admin/leaderboard/` pattern.
- **Onboarding for v1a surfaces: minimal.** No full tutorial; rely on natural discovery + the existing `TooltipInit` for first-encounter tooltips. Full tutorial when features settle.
- **Routes: `/achievements` and `/streak` as top-level navigation items.** Not nested under `/profile`.

### Test Twice unlock model — locked in

**Decision: Option A — universal milestone unlock; Test Twice never appears in the shop.**

- Test Twice is a learning aid (runs the full test-word list through twice in the same session — two attempts per word, both contributing to `correct_streak`), not a power-up or premium feature. Gating it behind a paywall or coin spend reframes a pedagogically-sensible feature as a luxury.
- Both paid and free users auto-unlock at the same progress milestone (e.g. first lesson mastered), with a celebration modal + walkthrough at the unlock moment to solve the discovery problem.
- Paid-vs-free differentiation lives elsewhere: existing `free_lessons` cap, course/language scope, future priority feedback / cosmetic exclusives / coin cap differences.
- The shop in v1 narrows to **Powers** (freeze/recover streak, multipliers), **Stuff** (cosmetics — avatar frames, name colours, badge displays), **Status** (level/belt graduation rewards, badges), and a thin **Access** category covering only subscription discount (coin-purchasable, the indirect referral-conversion reward path) plus possibly early access to new courses. Test Twice and Accelerated Breathing Mode are out of v1 shop scope.
