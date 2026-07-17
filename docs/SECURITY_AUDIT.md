# Security & Compliance Audit

_Last updated: 2026-07-10_

Audit of the 200WAD app's data-security posture and regulatory (UK/EU GDPR) compliance.
Covers auth, RLS, privileged operations, secrets, storage, and compliance paperwork.

This doc is a **living checklist** — we work through the items below one by one and tick
them off. Findings are graded by severity, not alarm.

---

## TL;DR — Overall position

Fundamentals are solid. Database-enforced access control (RLS), server-only privileged
operations, and verified payment webhooks are all correctly in place. This is **not** a
"secrets leaked / anyone can read the database" situation.

The outstanding work is mostly **hardening** and **compliance paperwork**, plus one class
of database function that needs verifying for a potential cross-user (IDOR) bug.

### Corrected non-issue
An initial automated scan claimed production secrets (`STRIPE_SECRET_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) were committed to git. **This is false — verified directly:**
- `.env.local` is untracked (`git ls-files` reports no match).
- It is matched by `.gitignore:41` (`.env*`).
- No `.env` file appears anywhere in git history.

Secrets exist only in the local/hosting environment. No rotation required on these grounds.

---

## Outstanding — owner-only (start here on return)

**All S1–S6 and C1–C6 engineering work is complete and shipped.** Nothing in the codebase
is blocking. Everything left needs dashboard access, company/legal facts, or a decision —
none of it is code. Full context for each lives in its item below and in the progress log.

**Supabase dashboard (S3):**
- [ ] Enable **leaked-password protection** — Auth → Attack Protection. **Pro-plan gated**
      (shows DISABLED + "Configure in email provider" on Free); enable after upgrading. App-layer
      min-8 policy is the fallback until then.
- [ ] Confirm **server-side minimum password length = 8** — Auth → Providers → Email.

**Fill the facts in `src/lib/legal/company.ts` (every `[PLACEHOLDER]`):**
- [ ] Legal entity name, registered address, HK Business Registration number.
- [ ] Privacy + support inbox addresses.
- [ ] `BACKUP_RETENTION` — the real Supabase backup/PITR window.

**Decisions / confirmations:**
- [ ] **Art. 27 UK/EU representative** — appoint + set `UK_EU_REPRESENTATIVE`, or record why not.
- [ ] Confirm **PostHog** project data-retention period.
- [ ] Confirm **support-correspondence** retention (once an email provider is chosen).

**Review:**
- [ ] Have the legal pages (`/privacy`, `/terms`, `/refunds`) + `DATA_PROTECTION_RECORDS.md`
      **reviewed by a qualified adviser** (HK PDPO + UK/EU GDPR). All shipped copy is a good-faith
      template, explicitly not legal advice.

**Deferred (not blocking):**
- [ ] C4 email-embedded one-click unsubscribe link — build with the promotional-email system
      (doesn't exist yet). Settings toggle is the working unsubscribe until then.

_Resolved this pass: Stripe customer deletion on account erasure; billing/tax retention decided
(Option A — rely on Stripe); marketing opt-in popup removed. See progress log._

---

## What's genuinely strong (no action needed)

- **RLS is comprehensive and correct.** Every user-owned table
  (`user_word_progress`, `user_lesson_progress`, `study_sessions`, `notifications`, etc.)
  is scoped to `auth.uid() = user_id`. The public anon key cannot read other users' data.
- **Privileged operations are server-only.** The service-role key (bypasses RLS) is used
  only in server actions / API routes / webhooks (Stripe sync, account deletion, billing).
  Never shipped to the browser.
- **Admin access is double-gated** — middleware blocks `/admin/*` for non-admins, and every
  admin mutation re-checks `requireAdmin()` server-side. Role lives in `user_metadata`.
- **Stripe webhooks verify signatures** (`stripe.webhooks.constructEvent`).
- **Card data never touches the DB** — only a `stripe_customer_id`; PCI scope stays with Stripe.
- **Account deletion + progress-reset flows exist** — a real GDPR advantage.

---

## Action items

Severity: 🔴 High · 🟠 Medium · 🟡 Low

### Security

- [x] **S1 · 🔴 Verify `SECURITY DEFINER` functions that take a `p_user_id` argument.** ✅ **FIXED 2026-07-09**
  ~20 definer functions were callable by any signed-in (or anon) user and ran *above* RLS.
  Several accepted a user ID as a parameter rather than reading `auth.uid()`:
  `purchase_shop_item`, `recover_streak`, `update_daily_activity`, `set_streak_freeze_auto`,
  `get_league_achievement_stats`, `get_user_leaderboard_position`, etc.
  **Risk (confirmed real):** these functions did not internally assert `p_user_id = auth.uid()`
  and were directly callable via the PostgREST `/rpc/` endpoint, so a signed-in user could pass
  someone else's ID to spend their coins or alter their streak/stats (classic IDOR — RLS won't
  catch it for definer functions). `update_daily_activity` was even anon-callable (self-cheating
  XP/streak/coin inflation).
  **Fix (both layers, applied to live DB — migration `20260709000000_secure_definer_functions.sql`):**
  1. *Mutations* (`update_daily_activity` ×2 overloads, `purchase_shop_item`, `recover_streak`,
     `set_streak_freeze_auto`) — `REVOKE EXECUTE` from `PUBLIC`/`anon`/`authenticated`; now only
     `service_role` can call them. App server actions (`src/lib/mutations/{activity,shop,streak}.ts`)
     were routed through `createAdminClient()` (service-role), passing the authenticated user's own id.
  2. *Reads* (`get_course_vocab_count`, `get_distinct_lessons_tested`, `get_league_achievement_stats`,
     `get_user_leaderboard_position`, `get_or_create_league_room`) — added an ownership guard
     `IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN RAISE …`; `REVOKE`
     from `anon`, keep `authenticated`/`service_role`. Permissive form (`auth.uid() IS NOT NULL`)
     so service-role callers in `notifications/achievements.ts` still work. `get_users_levels`
     (multi-user by design) only had `anon` revoked. Also added `SET search_path` (partial S5).
  **Verified on live DB:** ACLs correct (mutations = service_role only; reads = authenticated +
  service_role, anon revoked) and all 5 read functions contain the guard.

- [x] **S2 · 🟠 Public storage buckets allow file listing.** ✅ **FIXED 2026-07-09**
  `avatars`, `word-images`, `word-videos`, `audio` had broad SELECT policies (`bucket_id = 'x'`
  for the `public` role) letting any client — including anon — *enumerate* every file via the
  storage list API (not just fetch by URL). `avatars` leaked all users' ids (filenames are
  `<auth.uid()>/avatar.ext`).
  **Fix (migration `20260709000001_restrict_storage_listing.sql`, applied to live DB):** dropped
  the four broad public SELECT policies and replaced them with least-privilege listing that
  matches actual app usage:
  - `avatars` — owner may list only their own folder (`(storage.foldername(name))[1] = auth.uid()`);
    needed by `avatar.ts` (`.list(user.id)`).
  - `word-images` / `word-videos` / `audio` — `authenticated AND is_admin()` only; needed by
    `deleteEntityFiles()` via the admin-gated `deleteWord()`. Music deletion uses the service-role
    client (bypasses RLS).
  Buckets stay `public = true`, so fetch/render/playback by URL is unaffected (all consumers use
  `/storage/v1/object/public/...`; `word-audio` already ran this way with no SELECT policy).
  **Note (accepted, by design):** public buckets remain fetchable by anyone who has the URL —
  required for `<img>`/`<audio>` to load without auth. S2 closes *enumeration*, not URL access.
  **Verified on live DB:** only the four scoped SELECT policies remain; no `public`/anon listing.

- [~] **S3 · 🟠 Auth hardening.** ⏳ **Code shipped 2026-07-09 — 2 dashboard toggles remain (owner action).**
  Findings: password min was **6**, client-side only and duplicated across 5 forms; the 2FA
  toggle was a **no-op stub** (flipped a DB flag and told the user "2FA is enabled" while nothing
  protected the account); no app-level rate limiting.
  - [x] **Password minimum raised 6 → 8, centralised.** New `src/lib/validations/auth.ts`
    (`PASSWORD_MIN_LENGTH = 8`, `getPasswordError()`), wired into all 5 client checks
    (signup page, reset-password page, `SignupModal`, `OnboardingModal`, `SecuritySection`)
    **and** enforced server-side in the `updatePassword` action (client checks are bypassable).
    Length-based per NIST/OWASP; breach screening handled by leaked-password protection, not
    composition rules.
  - [x] **2FA stub fixed (deferred, per decision).** Removed the misleading interactive toggle and
    the dead `toggleTwoFactor` no-op action (+ barrel export + prop threading); the Security page
    now shows a clear "Coming soon" state so no one is falsely told 2FA is on. Real TOTP
    enrolment is a tracked follow-up (see below). DB column `two_factor_enabled` left in place for
    the eventual real implementation.
  - [x] **Rate limiting: rely on Supabase built-in + monitor (per decision).** GoTrue already
    rate-limits sign-in / sign-up / OTP / reset server-side. **Detecting abuse:** Supabase → Logs
    → **Auth logs** record every attempt with `remote_addr` (IP), `path` (`/token`, `/signup`,
    `/recover`) and `status`; brute force shows up as bursts of `400/403` on `/token` or `429`
    rate-limit responses from one IP/for one email. Reviewed the last 24h at implementation time —
    all `200`, no failed-login or 429 pattern. Revisit app-level throttling only if the logs show
    sustained abuse.
  - [ ] **Enable leaked-password protection** (owner): Dashboard → Authentication → **Attack
    Protection** → **"Prevent use of leaked passwords"** (HaveIBeenPwned check). Not exposed to the
    MCP tooling, so it must be flipped in the dashboard. **Note (2026-07-10):** verified in the
    dashboard this shows **DISABLED** with a "Configure in email provider" button rather than a plain
    toggle — it's **gated behind the Pro plan**. On Free it can't be enabled; on Pro, enable + Save.
    Until then the app-layer min-8 policy is the fallback, so this becomes a "turn on after upgrading"
    item, not a blocker.
  - [ ] **Set server-side minimum password length = 8** (owner, ~1 click): Dashboard →
    Authentication → Providers → Email → **Minimum password length → 8** (closes the direct
    `/auth` API path; our app layers already enforce 8).
  - [ ] **(Follow-up, not this pass) Real MFA/TOTP** — implement Supabase MFA enrol + challenge/
    verify (admins first). Deferred by decision.
  - [ ] **(Follow-up) Automate auth-abuse detection/alerting** — the monitoring described above is
    *manual* (eyeball Auth logs). It can be automated, but there's no one-click toggle on the
    current plan; options, best-fit first:
    1. **Auth Hook → "Password verification attempt" (recommended, native, event-driven).**
       Supabase calls a Postgres function on every password check (pass/fail) with the user +
       outcome. Use it to count recent failures per user/IP into a small table and **reject after
       N failures** (real lockout/throttle, not just an alert) and/or flag rows for notification.
       Plan-agnostic; *prevents* abuse rather than only reporting it. Config: Dashboard → Auth →
       Hooks. Note: to send an outbound alert (email/Slack) from the DB you'd need `pg_net` or an
       edge function — `pg_net` is **not** installed here (`pg_cron` **is**).
    2. **Log Drains → external alerting (cleanest pure-alerting, plan-gated).** Stream auth logs to
       Datadog/Grafana/webhook and write alert rules (e.g. "≥N `4xx` on `/token` from one IP in
       5 min → notify"). Log Drains are a **Team/Enterprise** feature.
    3. **Not viable as-is:** a `pg_cron` job polling for abuse — `auth.audit_log_entries` is empty
       on this hosted project (GoTrue events go to the log stream, and failed passwords aren't
       recorded there anyway), and there's no outbound HTTP without `pg_net`/an edge function.
    Recommended path for our scale: option 1 (failures table + threshold + cooldown, optionally
    pinging an edge function). Spec it as a proper feature before building.
  **Action remaining:** flip the two dashboard toggles above.

- [x] **S4 · 🟡 Three tables have RLS enabled but zero policies.** ✅ **FIXED 2026-07-09**
  `notification_broadcasts`, `notification_templates`, `notification_types` had RLS enabled
  with **zero policies** *and* the default broad table grants (all of SELECT/INSERT/UPDATE/
  DELETE/TRUNCATE/…) still held by **both `anon` and `authenticated`**. Fails closed today
  (RLS + no policy = deny), but a latent trap: any future policy — or any query switched from
  the service-role client to the anon/authenticated (RLS) client — would expose these
  admin-only config tables. Confirmed every real access path uses the service-role client
  (`createAdminClient()`, which bypasses RLS): reads in `queries/notification-config.ts` +
  `queries/notifications.ts`, writes in `mutations/admin/notification{,-config}.ts` (all
  `requireAdmin()`), dispatch in `notifications/dispatcher.ts` + `template.ts`. Toast templates
  reach the browser as server-rendered props, never a direct client table read — so no
  anon/authenticated access is needed.
  **Fix (both layers — migration `20260709000002_secure_notification_config_tables.sql`, applied
  to live DB):**
  1. *Grants* — `REVOKE ALL` from `anon` (removed entirely) and reduce `authenticated` to the
     minimal DML set (`SELECT/INSERT/UPDATE/DELETE`; dropped TRUNCATE/TRIGGER/REFERENCES).
  2. *Policies* — added one explicit admin-only `FOR ALL TO authenticated USING (is_admin())
     WITH CHECK (is_admin())` policy per table (documents intent, clears the advisor, and gives
     defense-in-depth: only admins pass, never anon). `service_role` still bypasses RLS, so the
     app is unaffected.
  **Verified on live DB:** anon has zero grants; authenticated limited to the 4 DML privileges
  behind the `is_admin()` policy; security advisor no longer flags these tables.

- [x] **S5 · 🟡 Mutable `search_path` on ~20 functions.** ✅ **FIXED 2026-07-09**
  18 `public` functions had an unset (mutable) `search_path` (linter `0011`). The real risk is
  on `SECURITY DEFINER` functions: a caller who controls their session `search_path` can make an
  unqualified name resolve to a malicious object in a schema they control, which then runs with
  the definer's elevated rights (schema-shadowing escalation).
  **Fix (migration `20260709000003_pin_function_search_path.sql`, applied to live DB):**
  `ALTER FUNCTION … SET search_path = public` on all 18. Chose `= public` rather than `= ''`
  because several bodies reference `public` objects *unqualified* (`search_words`/
  `search_language_words` select from `words`/`lessons`/`lesson_words` and call `f_unaccent`; the
  trigger fns update `courses`/`lessons`/`words`) — `''` would break them without a body rewrite.
  Pinning to `public` is equally safe against hijacking on Supabase (untrusted `anon`/
  `authenticated` have no CREATE on `public`, so can't plant a shadow object), keeps `pg_catalog`
  implicitly first (built-ins still resolve), and omits `pg_temp` so temp objects can't shadow.
  **Verified on live DB:** zero `public` plpgsql/sql functions remain without a pinned
  `search_path`; advisor's `function_search_path_mutable` warnings are all cleared.

- [x] **S6 · 🟡 (New, from advisor) `SECURITY DEFINER` functions exposed via `/rpc/`.** ✅ **FIXED 2026-07-09**
  The security advisor (`0028`/`0029`) flags definer functions callable by `anon`/`authenticated`.
  Three groups, triaged:
  1. **Intentional & guarded (no action)** — the S1 read functions (`get_course_vocab_count`,
     `get_distinct_lessons_tested`, `get_league_achievement_stats`, `get_user_leaderboard_position`,
     `get_or_create_league_room`, `get_users_levels`) carry an internal `auth.uid()` ownership
     guard; the advisor can't see it.
  2. **Self-scoped / content-only, low risk (no action)** — `is_admin()` returns only *your own*
     admin bit; `get_leaderboard`, `get_lifetime_coins_earned`, `set_user_timezone`. Reviewed
     `search_words` / `search_language_words`: **anon access is by design** — `search_language_words`
     powers user-facing (incl. guest) course search (`src/lib/queries/search.client.ts`), and both
     only read *published content* tables (`words`/`lessons`), never user-owned data. Left as-is.
  3. **Trigger functions that shouldn't be RPC-exposed (fixed)** — `handle_new_user`,
     `handle_user_email_update` had EXECUTE granted to `PUBLIC`/`anon`/`authenticated`. Migration
     `20260709000004_revoke_rpc_on_trigger_functions.sql` revokes EXECUTE from
     `PUBLIC, anon, authenticated` (kept `postgres`/`service_role`). No code calls them by name;
     they're row triggers on `auth.users`, and trigger firing does **not** require EXECUTE — so
     signup / email-update are unaffected.
  **Verified on live DB:** both functions' ACLs are now `postgres`/`service_role` only; both
  triggers (`on_auth_user_created`, `on_auth_user_email_updated`) remain attached and enabled.
  Remaining `0028`/`0029` advisor entries are the intentional groups (1) and (2) above.

### Compliance (UK/EU GDPR + PECR)

- [x] **C1 · 🔴 Publish real Privacy Policy & Terms.** — **FIXED (pending owner details + legal review).**
  Footer links to `/privacy`, `/terms`, `/refunds` exist but pages have no content.
  A published privacy notice is mandatory under UK/EU GDPR.
  **Action:** author and ship the pages.
  **Done:** shipped all three pages plus a shared `LegalPage` component and a single source of
  truth for company/legal details (`src/lib/legal/company.ts`). Framing: HK PDPO as home regime +
  extraterritorial UK/EU GDPR (Art. 3(2)), Art. 27 representative slot, ICO/PCPD complaint routes.
  Reflects the decisions taken during planning: 16+ minimum age, 14-day right-of-withdrawal
  **waived** on immediate access, Stripe (no card storage) / Supabase / PostHog-EU / email
  sub-processors. **Owner must** replace the clearly-marked `[PLACEHOLDER]`s in `company.ts`
  (entity name, registered address, BR number, privacy/support inboxes, Art. 27 rep, backup
  retention) and have the pages reviewed by a qualified adviser before relying on them. Cookie
  wording is written to reconcile with **C2** when the consent banner ships.

- [x] **C2 · 🟠 Cookie consent.** — **FIXED.**
  No consent banner. Auth cookies are likely strictly-necessary (exempt), but PostHog
  analytics loading pre-consent is a PECR/ePrivacy issue (analytics need opt-in in UK/EU).
  **Action:** add consent banner and gate non-essential analytics behind it.
  **Done:** implemented **prior opt-in**. New `ConsentProvider` (`src/context/ConsentContext.tsx`)
  backs a versioned `localStorage` record via `useSyncExternalStore` (SSR-safe, cross-tab sync);
  it is category-aware (`analytics` + reserved `marketing`) so future Google/Facebook tags gate
  without rework. `PostHogProvider` now only calls `posthog.init()` once `consent.analytics` is
  true, and `opt_out_capturing()` on withdrawal; `PostHogPageView` only captures when consented.
  Bottom-corner `ConsentBanner` (Accept / Reject / dismiss, link to Privacy) mounted once in the
  root layout so it reaches marketing + app + auth routes. Added a footer "Cookie settings" control
  to re-open the card (withdrawal as easy as giving). Lint + typecheck clean on all touched files.

- [x] **C3 · 🟠 Data export (GDPR Art. 20 access/portability).** — **FIXED.**
  No self-serve export. Manual is acceptable at small scale but a process must exist.
  **Action:** add a "download my data" path or a documented manual procedure.
  **Done:** added a read-only `GET /api/account/export` route (mirrors the delete/reset auth
  pattern: session `getUser()` → service-role client) that returns a machine-readable JSON copy of
  the user's account: their `users` profile + auth identity + every per-user table (languages, word
  /lesson progress, study & test sessions, test questions resolved via session ids, daily activity,
  achievements, league memberships, leaderboard snapshots, coin/credit transactions, purchases,
  subscriptions, notifications, notification preferences, tip dismissals, referrals both
  directions). The user id comes **only** from the validated session — never client input — so a
  user can only export their own data (no IDOR). Surfaced as a "Your data → Download my data"
  section in Settings (`DataExportSection`); guests can't reach Settings. **Deliberately excluded:**
  `activity_flags` (internal anti-abuse/fraud signals — recognised access-right limitation). Lint +
  `tsc` clean.

- [x] **C4 · 🟡 Marketing consent + unsubscribe.** — **FIXED (email-embedded unsubscribe link deferred with the future email system).**
  No visible opt-in/unsubscribe flow (needed if emailing users promotionally).
  **Action:** add opt-in at signup + unsubscribe in emails/settings.
  **Done:** built the lawful *consent plumbing* (no promo email is sent yet). Migration
  `20260710000000_add_marketing_email_consent.sql` adds a **tri-state** `users.marketing_email_consent`
  (nullable BOOLEAN — `NULL` = undecided, `TRUE` = opted in, `FALSE` = declined) plus a
  `marketing_consent_updated_at` proof-of-consent timestamp (GDPR Art. 7 — must *demonstrate*
  consent + when), and updates `handle_new_user()` to read `raw_user_meta_data->>'marketing_consent'`.
  **No backfill: existing users stay `NULL`** — we do **not** manufacture consent (an affirmative
  opt-in is required, Art. 4(11); PECR soft opt-in doesn't safely apply). Verified live: all 7 rows
  `NULL`.
  - **Opt-in at signup** — unticked (no pre-tick) checkbox on all 3 signup forms (`signup/page.tsx`,
    `SignupModal`, `OnboardingModal`), passed through `auth.signUp({ options: { data: {
    marketing_consent } } })`. Email signups always record a decision (so they're never re-prompted);
    OAuth signups omit the key and stay `NULL`.
  - **Withdrawal/opt-in in Settings** — new `MarketingEmailSection` ("Email preferences") with a
    Switch + Save/Cancel; server action `updateMarketingConsent()` writes the flag + timestamp
    (id from session only — self-only). This toggle *is* the working unsubscribe path today.
  - **Proactive in-app prompt — removed (2026-07-10).** A dismissible `MarketingOptInPrompt` existed
    to solicit undecided existing/OAuth users, but with no email-marketing system live yet it was
    removed (component + its `getMarketingConsentStatus` query deleted; recoverable from git). Opt-in
    is now solely the unticked signup checkbox + the Settings toggle. Reinstate the prompt when
    marketing email launches if soliciting existing users is wanted (asking is fine; auto-consent isn't).
  - **[ ] (Follow-up, deferred) Email-embedded one-click unsubscribe link.** Belongs with the
    promotional-email sending system (which doesn't exist yet) — its tokenised unsubscribe format
    must match that system, so building it now would be guesswork. It will flip the same
    `marketing_email_consent` flag. Not blocking: no marketing email is sent, and Settings already
    provides withdrawal. Types synced (`database-generated.ts`); `tsc` + lint clean.

- [x] **C5 · 🟡 Age gating.** — **FIXED (16+ self-declaration, no active verification — by decision).**
  No age gate. A vocab app plausibly attracts minors (COPPA <13 US; UK/EU digital-consent
  age 13–16). Decide a minimum age; add parental consent if knowingly serving children.
  **Action:** state minimum age in terms; add age gate if required.
  **Decision:** keep the existing **16+** minimum (chosen deliberately over lowering to 13 or going
  general-audience — a stated floor is what keeps the service *out of scope* of COPPA / the UK
  Children's Code; general-audience would pull it *in*). Minimum age is proportionate for a
  self-declared consumer service, so **no active age verification and no parental-consent flow**
  (we don't knowingly serve under-16s).
  **Done:** the 16+ floor was already asserted in the Terms (§2 "You must be at least 16 years old…
  By using the service you confirm that you meet this requirement") and Privacy ("intended for users
  aged 16 and over"). The gap was that it wasn't surfaced at the decision point. Added a passive
  acceptance line beneath the create-account action on **all 3 signup forms** (`signup/page.tsx`,
  `SignupModal`, `OnboardingModal`, signup mode only): *"By creating an account, you confirm you're
  16 or older and agree to our Terms and Privacy Policy"* with links to `/terms` + `/privacy` — which
  also fills the previously-missing Terms/Privacy acknowledgement at signup. Mirrors the passive
  self-confirmation the Terms already use. `tsc` + lint clean.

- [x] **C6 · 🟡 Erasure retention note + controller records.** — **FIXED (internal record written; owner to finalise a few figures).**
  Deletion flow exists but backups may retain data. Document a retention period; keep a
  lawful-basis record. Consider EU representative if EU users are material.
  **Action:** document retention + lawful basis.
  **Done:** authored the internal accountability record at `docs/DATA_PROTECTION_RECORDS.md`
  (the internal counterpart to the public Privacy Policy), built from what the code actually does:
  - **Art. 30 Records of Processing Activities** — 9 activities with data categories (the
    authoritative per-user tables, mirroring the C3 export), data subjects, purpose, lawful basis,
    recipients, and retention.
  - **Lawful-basis register** — contract / legal obligation / legitimate interests / consent,
    reconciled with Privacy Policy §4.
  - **Retention schedule** — per category incl. account life, billing/tax statutory period,
    Stripe, PostHog, and the `BACKUP_RETENTION` backup-cycle placeholder.
  - **Erasure & reset process** — accurate to `api/account/delete` (hard delete via
    `auth.admin.deleteUser` + `ON DELETE CASCADE` across ~21 tables) and `api/account/reset`.
  - **Sub-processor register**, international transfers, and **Art. 27 representative** decision note.
  **Gaps flagged while documenting:** (1) account deletion did **not** delete the **Stripe customer
  object** — **now fixed (2026-07-10):** `api/account/delete` reads `stripe_customer_id` before the
  cascade and calls `stripe.customers.del()` best-effort after (failure logged, doesn't block
  erasure); (2) billing/tax records cascade-delete immediately vs. a statutory retention requirement
  — **decided (2026-07-10): rely on Stripe (Option A)** as the financial system-of-record (Art.
  17(3)(b) carve-out); Privacy Policy §8 aligned. Owner open-items (backup window, PostHog retention,
  rep appointment, adviser review) listed in the doc §9.

---

## Progress log

_(Append notes here as we resolve each item.)_

- 2026-07-09 — Audit written. Corrected false "secrets committed" finding. Starting S1.
- 2026-07-09 — **S1 closed.** Confirmed IDOR was real & exploitable (definer functions trusted
  `p_user_id`, callable via `/rpc/`). Shipped migration `20260709000000_secure_definer_functions.sql`
  (both layers: revoke client EXECUTE on 5 mutation overloads + ownership guard on 5 read functions),
  routed the 3 mutation server actions through the service-role client, applied to live DB, and
  verified ACLs + guard bodies. Lint clean on edited files. Next: S2 (storage bucket listing).
- 2026-07-09 — **S2 closed.** Confirmed broad `public` SELECT policies allowed anon enumeration
  of avatars (leaking user ids), word-images, word-videos, audio. Mapped the only two real
  `.list()` sites (avatar owner-folder; admin word deletion) and confirmed all playback/render
  uses public URLs. Shipped migration `20260709000001_restrict_storage_listing.sql` replacing the
  four policies with owner/admin-scoped listing, applied to live DB, verified. Next: S3 (auth hardening).
- 2026-07-09 — **S3 code shipped** (2 owner dashboard toggles remain). Centralised password policy
  and raised min 6 → 8 across all 5 client forms + server-side `updatePassword`; removed the
  misleading no-op 2FA toggle (now "Coming soon") and its dead action/threading; documented reliance
  on Supabase's built-in auth rate limiting + how to spot abuse in Auth logs. `tsc` + lint clean.
  Owner to flip: leaked-password protection ON, server min length = 8. Next: S4 (policy-less RLS tables).
- 2026-07-09 — **S4 closed.** The 3 policy-less tables (`notification_broadcasts`,
  `notification_templates`, `notification_types`) also still carried broad `anon`+`authenticated`
  table grants. Confirmed all app access is service-role only (RLS-bypassing). Shipped migration
  `20260709000002_secure_notification_config_tables.sql`: revoked all from `anon`, trimmed
  `authenticated` to SELECT/INSERT/UPDATE/DELETE, and added an admin-only (`is_admin()`) FOR ALL
  policy per table. Applied to live DB; verified grants + policies; security advisor no longer
  flags these tables. Next: S5 (mutable `search_path` on ~20 functions — advisor lists them).
- 2026-07-09 — **S5 closed.** Pulled all 18 flagged function bodies to pick a safe fix: since
  several reference `public` objects unqualified, used `ALTER FUNCTION … SET search_path = public`
  (not `= ''`) across all 18 — migration `20260709000003_pin_function_search_path.sql`, applied to
  live DB. Verified zero functions remain with a mutable `search_path`; advisor `0011` warnings
  cleared. Advisor now only shows the (expected/guarded) definer-executable `0028`/`0029` warnings
  — captured as new low-severity **S6** — and the pending S3 leaked-password toggle. Also recorded
  auth-abuse **automation options** as S3 follow-ups (Auth Hook / Log Drains / why cron isn't
  viable), per request.
- 2026-07-09 — **S6 closed.** Revoked RPC EXECUTE (`PUBLIC`/`anon`/`authenticated`) on the two
  trigger functions `handle_new_user` / `handle_user_email_update` (migration
  `20260709000004_revoke_rpc_on_trigger_functions.sql`); verified ACLs now service_role/postgres
  only and both triggers still enabled. Reviewed `search_*` — anon access is intentional (guest
  course search, content-only reads) so left as-is. Next: compliance (C1 Privacy Policy & Terms).
- 2026-07-09 — **C1 closed (draft shipped; owner to finalise).** Authored `/privacy`, `/terms` and
  `/refunds` under `src/app/(marketing)/`, a shared `LegalPage` layout component, and a single
  source of truth for legal details at `src/lib/legal/company.ts` (obvious `[PLACEHOLDER]`s so it
  can't ship half-filled). Content built on the planning decisions: Hong Kong controller under PDPO
  **plus** extraterritorial UK/EU GDPR, 16+ age floor, 14-day withdrawal right waived on immediate
  access, coins/XP non-refundable, cancel-anytime-keeps-access, Stripe/Supabase/PostHog-EU/email
  sub-processors, ICO + PCPD complaint routes, Art. 27 rep slot. Lint clean on all new files (the
  pre-existing `src/lib/queries/*` lint errors are unrelated). **Not legal advice** — flagged that
  the owner must fill `company.ts` and obtain professional review. Next: C2 (cookie consent) —
  privacy cookie wording already written to line up with it.
- 2026-07-09 — **C2 closed.** Confirmed the only pre-consent tracker was PostHog (init'd
  unconditionally in `PostHogProvider`; `PostHogPageView` the sole consumer). Implemented prior
  opt-in: `ConsentProvider` (`src/context/ConsentContext.tsx`) stores a versioned choice in
  `localStorage` via `useSyncExternalStore` (SSR-safe, cross-tab), category-aware
  (`analytics`/`marketing`) for future ad tags. Gated `posthog.init()` + pageview capture behind
  `consent.analytics` (module-level init guard; `opt_in/opt_out_capturing` on change). Mounted a
  bottom-corner `ConsentBanner` in the root layout (reaches all route groups) plus a footer
  "Cookie settings" re-open control (GDPR withdrawal). Lint + `tsc` clean on all touched files.
  Reconciles with the C1 Privacy Policy cookie wording. Next: C3 (data export / GDPR portability).
- 2026-07-09 — **C3 closed.** Confirmed the full per-user data model from the live DB (19 tables
  with `user_id`/`referrer_id`/`referred_user_id`). Added read-only `GET /api/account/export`
  (session-authenticated, service-role read so the copy is complete even for service-role-only
  tables) returning a single JSON document: profile + auth identity + all per-user tables
  (test_questions resolved from the user's own session ids; referrals matched both directions).
  User id is taken solely from `getUser()` — no client-supplied id — so export is strictly
  self-only. Excluded `activity_flags` (anti-fraud moderation). New `DataExportSection` ("Your data
  → Download my data") added to Settings between Security and Danger Zone; downloads
  `200wad-data-export-<date>.json` via blob. Lint + `tsc` clean on all touched files. Next: C4
  (marketing consent + unsubscribe).
- 2026-07-10 — **C4 closed** (email-embedded unsubscribe link deferred with the future email
  system). No promo email is sent yet, so built the lawful consent *plumbing*: migration
  `20260710000000_add_marketing_email_consent.sql` adds a **tri-state** nullable
  `users.marketing_email_consent` (NULL/undecided · true/in · false/out) + `marketing_consent_updated_at`
  proof timestamp, and threads the choice through `handle_new_user` via signup `user_metadata`.
  **Deliberately no backfill** — existing users stay NULL; mass-marking consent would be invalid
  under GDPR Art. 4(11)/7 (and PECR soft opt-in doesn't safely apply). Applied to live DB; verified
  all 7 existing rows NULL. Added: unticked opt-in checkbox on all 3 signup forms; a Settings
  "Email preferences" toggle (`MarketingEmailSection` + `updateMarketingConsent` action) that serves
  as the working unsubscribe; and a dismissible in-app `MarketingOptInPrompt` (dashboard, non-guests)
  that fires only for undecided users to lawfully solicit existing/OAuth accounts. Synced generated
  types; `tsc` + lint clean (only pre-existing warnings). Remaining C-items: C5 (age gating), C6
  (retention note + controller records), plus the deferred C4 email unsubscribe link.
- 2026-07-10 — **C5 closed** (16+ self-declaration; no active verification, by decision). Discussed
  that age gating is risk-based, not universal — but this being an *education* app (a category
  regulators treat as "likely to be accessed by children") plus the pre-existing 16+ Terms claim
  made a coherent floor worthwhile. Kept 16+ (rejected lowering to 13 / going general-audience, since
  a stated floor keeps the service out of COPPA / UK Children's Code scope). The claim already lived
  in Terms §2 + Privacy; surfaced it at signup via a passive acceptance line ("…confirm you're 16 or
  older and agree to our Terms and Privacy Policy") on all 3 signup forms, which also adds the
  previously-missing Terms/Privacy acknowledgement. No verification/parental-consent flow (not
  knowingly serving under-16s). `tsc` + lint clean. Remaining: C6 (retention + controller records)
  and the deferred C4 email unsubscribe link.
- 2026-07-10 — **C6 closed** (internal record written; owner to finalise figures). Wrote
  `docs/DATA_PROTECTION_RECORDS.md` — the internal accountability counterpart to the public Privacy
  Policy: Art. 30 RoPA (9 activities), lawful-basis register, full retention schedule, erasure/reset
  process accurate to `api/account/{delete,reset}`, sub-processor register, transfers, Art. 27 rep
  decision note, rights-fulfilment map, and an owner open-items checklist. Surfaced two real gaps
  found while documenting: **Stripe customer object was not deleted on account deletion** — **now
  fixed (2026-07-10):** `api/account/delete` deletes the Stripe customer best-effort after the
  cascade; and **billing/tax records cascade-delete immediately** vs. a statutory keep-period — owner
  to decide + align Privacy §8. **All audit action items now closed except owner-only tasks** (S3
  dashboard toggles, C1/C6 placeholder fill + adviser review) and one flagged follow-up (C4
  email-embedded unsubscribe link).
- 2026-07-10 — **Stripe erasure gap fixed** (C6 §5 gap 1). `src/app/api/account/delete/route.ts` now
  reads `stripe_customer_id` from `public.users` **before** `auth.admin.deleteUser` (the row cascades
  away), then calls `stripe.customers.del()` after — best-effort: a Stripe failure is logged for
  manual cleanup and does **not** fail the erasure request (the account is already gone). Removes
  lingering email/name/payment history from Stripe; Stripe still keeps tax-required invoices under
  its own policy. `tsc` + lint clean (only the pre-existing unused-`request` warning). Updated
  `DATA_PROTECTION_RECORDS.md` §4/§5/§9 to match. **Only owner-only tasks remain.**
- 2026-07-10 — **Billing/tax retention decided: Option A (rely on Stripe).** Our billing rows
  (`subscriptions`, `*_transactions`, `user_purchases`) cascade-delete with the account; Stripe is
  the financial system-of-record and retains tax-required invoices/charges (which survive
  `customers.del()`) under its own policy. Covered by GDPR Art. 17(3)(b) legal-obligation carve-out.
  Aligned **Privacy Policy §8** wording to say records are retained by Stripe, not a separate copy of
  ours. Marked §5 gap 2 + the §9 owner item resolved in `DATA_PROTECTION_RECORDS.md`. Owner may later
  add an in-house `billing_records` ledger (Option B) if queryable financial reporting is needed.
- 2026-07-10 — **Marketing opt-in prompt removed** (no email-marketing system live yet). Deleted
  `MarketingOptInPrompt` + its `MarketingOptInPrompt` mount in the dashboard layout and the orphaned
  `getMarketingConsentStatus`/`MarketingConsentStatus` in `mutations/settings.ts` (no dead code left;
  recoverable from git). Consent capture is now the **unticked signup checkbox** (compliant opt-in
  for UK/EEA under PECR + GDPR — pre-tick/auto-subscribe would be invalid) plus the Settings toggle.
  `tsc` clean; lint shows only the pre-existing `languageToRemove` warning. Reinstate the prompt when
  promotional email launches if soliciting existing/OAuth users is wanted.
