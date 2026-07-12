# Data Protection Records (Retention, Lawful Basis & Article 30 RoPA)

_Last updated: 2026-07-10_

Internal accountability record for 200 Words a Day, satisfying audit item **C6**
(retention note + controller records). This is the **internal** counterpart to the
public [Privacy Policy](../src/app/(marketing)/privacy/page.tsx): the Privacy Policy
tells users what we do; this document is the register we keep to *demonstrate*
compliance (GDPR Art. 5(2) accountability, Art. 30 records of processing) and would
show a supervisory authority on request.

> ⚠️ **Not legal advice.** Like the public legal pages, this is a good-faith
> template built from what the code actually does. The **owner must** complete the
> `[PLACEHOLDER]` items (§8) and have a qualified adviser review it (HK PDPO + UK/EU
> GDPR) before relying on it. Company/contact details live in one place:
> `src/lib/legal/company.ts`.

---

## 1. Controller & representative

- **Controller:** `LEGAL_ENTITY` (see `company.ts`), a Hong Kong company, registered
  address `LEGAL_ADDRESS`. Data-protection contact: `PRIVACY_EMAIL`.
- **Home regime:** Hong Kong PDPO.
- **Extraterritorial:** UK GDPR + EU GDPR apply because the service is offered to
  users in the UK/EEA (Art. 3(2)).
- **Art. 27 representative:** `UK_EU_REPRESENTATIVE` in `company.ts` — **decision
  pending** (see §7). A UK and/or EU representative is required once UK/EEA users are
  more than occasional, unless an exemption applies.

---

## 2. Records of Processing Activities (Art. 30)

Each row is a processing activity: what personal data, whose, why, on what lawful
basis, who it's shared with, where it goes, and how long it's kept. Data categories
below are the authoritative per-user tables (mirrors the Art. 20 export at
`src/app/api/account/export/route.ts`).

| # | Activity | Data categories | Data subjects | Purpose | Lawful basis (GDPR) | Recipients | Retention |
|---|----------|-----------------|---------------|---------|---------------------|------------|-----------|
| 1 | **Account & authentication** | `users` (email, hashed password held by Supabase Auth, name/username, profile), OAuth identity | Registered users | Create and secure the account, sign-in | Contract (Art. 6(1)(b)) | Supabase | Life of account + backup cycle (§4) |
| 2 | **Learning service** | `user_languages`, `user_word_progress`, `user_lesson_progress`, `study_sessions`, `test_sessions`, `test_questions`, `user_daily_activity`, `user_achievements` | Registered users | Deliver study/test, save progress, streaks/XP | Contract (Art. 6(1)(b)) | Supabase | Life of account; erased on delete/reset (§5) |
| 3 | **Gamification & rewards** | `league_memberships`, `weekly_leaderboard_snapshots`, `coin_transactions`, `credit_transactions`, `user_purchases`, `user_tip_dismissals` | Registered users | Leagues, leaderboards, coin/credit ledgers, shop | Contract (Art. 6(1)(b)) | Supabase | Life of account; erased on delete (§5) |
| 4 | **Payments & subscriptions** | `subscriptions` (plan/status, amount, currency, `stripe_subscription_id`, `stripe_customer_id`, period dates); card data **never** stored | Paying users | Take payment, manage renewals/receipts | Contract (Art. 6(1)(b)); Legal obligation for tax/accounting (Art. 6(1)(c)) | Stripe, Supabase | Account life; billing/tax records per statutory period (§4) |
| 5 | **Product analytics** | Usage events, approximate region, browser/device (PostHog) | Users who consent | Understand usage, improve product | Consent (Art. 6(1)(a)) — prior opt-in via cookie banner | PostHog (EU) | Per PostHog retention `[CONFIRM]` |
| 6 | **Service & marketing email / notifications** | `notifications`, `user_notification_preferences`, `users.marketing_email_consent` (+ `marketing_consent_updated_at`) | Registered users | Service messages; opt-in product/marketing email | Legitimate interests (Art. 6(1)(f)) for service messages; **Consent** (Art. 6(1)(a)) for marketing | Email provider `[NONE INTEGRATED YET]` | Account life; consent record kept while account exists |
| 7 | **Security & anti-abuse** | `activity_flags` (internal fraud/abuse signals) | Registered users | Detect/prevent abuse, self-cheating, fraud | Legitimate interests (Art. 6(1)(f)) | Supabase | Account life; erased on delete/reset. **Excluded from Art. 15 export** (disclosure would undermine the controls) |
| 8 | **Referrals** | `referrals` (`referrer_id`, `referred_user_id`) | Referrer + referred users | Run the referral programme | Contract / Legitimate interests | Supabase | Account life; cascade-erased on delete |
| 9 | **Support & feedback** | Messages/feedback users send us; email correspondence | Anyone contacting us | Respond to and resolve queries | Legitimate interests (Art. 6(1)(f)) | Email provider `[NONE INTEGRATED YET]` | `[CONFIRM]` (e.g. 24 months from last contact) |

**PDPO note:** under the PDPO we use personal data only for the purposes above or a
directly related purpose, and retain it no longer than necessary (DPP2/DPP3).

---

## 3. Lawful basis register (summary)

Mirrors Privacy Policy §4. One line per basis so it's auditable:

- **Contract** — account, learning service, gamification, taking payment
  (activities 1–4, 8). Necessary to provide what the user signed up for.
- **Legal obligation** — retaining billing/tax records; responding to lawful
  requests (activity 4).
- **Legitimate interests** — securing/improving the product, anti-abuse/fraud,
  service (transactional) email, support (activities 4, 6, 7, 9). LIA summary: low
  privacy impact, users reasonably expect it, necessary to run a safe service; no
  override of user rights identified. `[Owner: record a short LIA if challenged.]`
- **Consent** — non-essential/analytics cookies and **marketing email** (activities
  5, 6). Captured as prior opt-in; withdrawable as easily as given (cookie banner /
  Settings toggle / `marketing_email_consent`). Consent + timestamp are logged for
  proof (Art. 7).

---

## 4. Retention schedule

| Data | Retention | Trigger | Notes |
|------|-----------|---------|-------|
| Account + learning + gamification data | Life of account | Account deletion → immediate hard delete | Cascade delete across all per-user tables (§5) |
| Progress data | Until account deletion **or** user-initiated reset | Delete or "reset progress" | Reset clears study/test data but keeps the account (§5) |
| Marketing consent record | Life of account | — | Kept to prove/withdraw consent (Art. 7) |
| Billing/subscription records (`subscriptions`, `*_transactions`, `user_purchases`) | Life of account only in our DB | Account deletion → cascade delete | **Option A:** our rows cascade-delete; the statutory financial record is held by **Stripe** (system-of-record), not us (§5 gap 2) |
| Stripe customer & invoices | Per Stripe's retention (typically several years for tax) | Account deletion → `stripe.customers.del()` best-effort | Customer object is now deleted on account deletion (§5). Stripe still retains invoices it legally needs for tax under its own policy |
| Analytics (PostHog EU) | `[CONFIRM PostHog project retention]` | — | Consent-gated; pseudonymous |
| Encrypted database backups | `BACKUP_RETENTION` — currently `[e.g. 30–90 days]` in `company.ts` | Rolling backup cycle | Deleted users' residual rows age out on this cycle. **Owner must set to the real Supabase backup/PITR window.** |
| Support correspondence | `[CONFIRM — e.g. 24 months]` | Last contact | Depends on email provider once integrated |

---

## 5. Erasure & reset process (as implemented)

**Account deletion** — `src/app/api/account/delete/route.ts`
- Authenticated via session `getUser()`; user can only delete themselves.
- Calls `adminClient.auth.admin.deleteUser(user.id)`.
- `public.users.id` is FK to `auth.users(id) ON DELETE CASCADE`, and every per-user
  table references `users(id) ON DELETE CASCADE`, so deletion **cascades** across all
  ~21 per-user tables (progress, sessions, ledgers, subscriptions, notifications,
  preferences, referrals, `activity_flags`, etc.). This is a **hard delete**, not
  anonymisation.
- Residual copies in encrypted backups age out on the backup cycle (`BACKUP_RETENTION`).

**Progress reset** — `src/app/api/account/reset/route.ts`
- Clears study/test data (`user_word_progress`, `user_lesson_progress`,
  `study_sessions` → cascades `test_questions`, `user_daily_activity`,
  `activity_flags`, `user_tip_dismissals`, `weekly_leaderboard_snapshots`,
  `notifications`, `user_notification_preferences`) and resets streak/league fields
  on `users`.
- **Preserves** the account, subscriptions, credits/coins, profile, enrolled
  languages, and referral code.

### Erasure gaps
1. **Stripe customer deletion — ✅ RESOLVED (2026-07-10).** Account deletion now reads
   `stripe_customer_id` before the cascade and calls `stripe.customers.del()` on a
   best-effort basis after the account is removed (`src/app/api/account/delete/route.ts`),
   so email/name/payment history no longer lingers in Stripe. A Stripe failure is
   logged for manual cleanup and does not block the erasure. Stripe still retains what
   it legally needs (e.g. invoices for tax) under its own policy.
2. **Billing vs. tax retention — ✅ DECIDED (2026-07-10): rely on Stripe (Option A).**
   Our own billing rows (`subscriptions`, `*_transactions`, `user_purchases`)
   cascade-delete with the account; **Stripe is the system-of-record** for the
   legally-required financial records and retains the invoices/charges it needs for
   tax under its own policy (these survive `customers.del()`, which only strips the
   identifying customer object). Erasure of the user's own data is therefore complete
   while the statutory financial record is preserved by the processor. GDPR Art.
   17(3)(b) (legal-obligation carve-out) covers the retention. Privacy Policy §8 wording
   aligned. Owner may revisit and add an in-house `billing_records` ledger (Option B)
   if queryable financial reporting is later needed.

---

## 6. Sub-processor register

| Sub-processor | Function | Location / hosting | Transfer safeguard | Notes |
|---------------|----------|--------------------|--------------------|-------|
| **Supabase** | Database, auth, file storage | `[CONFIRM region]` | SCCs / UK Addendum as applicable | Primary data store; RLS enforced |
| **Stripe** | Payments, subscriptions | Global | SCCs; PCI-DSS | Card data never touches our DB; holds customer object |
| **PostHog (EU)** | Product analytics | European Union (`eu.i.posthog.com`) | EU hosting (no transfer for EEA users) | Consent-gated (prior opt-in) |
| **Email provider** | Account + marketing email | `[NONE INTEGRATED YET]` | `[SCCs once chosen]` | Dispatcher is a `noop` stub (`src/lib/notifications/sender.ts`); no real delivery yet |

Keep this table in sync with Privacy Policy §6. Any new sub-processor → update both.

---

## 7. International transfers & Art. 27 representative

- **Transfers:** operated from Hong Kong with providers in various regions, so UK/EEA
  personal data may be transferred outside the UK/EEA. Rely on SCCs (+ UK Addendum)
  or adequacy, as stated in Privacy Policy §7. PostHog EEA data stays in the EU.
- **Representative (Art. 27):** because the controller is outside the UK/EEA and
  offers services to people there, a UK and/or EU representative is likely required
  unless the processing is "occasional," low-risk, and unlikely to affect rights.
  **Owner decision:** assess whether UK/EEA users are material; if so, appoint a
  representative and set `UK_EU_REPRESENTATIVE` in `company.ts`. Record the decision
  (and its reasoning if declining) here.

---

## 8. Data-subject rights — how we fulfil them

| Right | Mechanism | Reference |
|-------|-----------|-----------|
| Access / portability (Art. 15/20) | Self-serve JSON export | `src/app/api/account/export/route.ts`; Settings → "Download my data" |
| Erasure (Art. 17) | Self-serve account deletion (hard delete + cascade) | `src/app/api/account/delete/route.ts`; Settings → Danger Zone. See §5 gaps |
| Rectification (Art. 16) | Edit profile in Settings; or email `PRIVACY_EMAIL` | Settings |
| Restriction / objection (Art. 18/21) | Manual, via `PRIVACY_EMAIL` | — |
| Withdraw consent (Art. 7(3)) | Cookie banner (analytics); Settings marketing toggle (email) | `ConsentContext`; `MarketingEmailSection` |
| Complaint | ICO (UK) / PCPD (HK), per Privacy Policy §9 | Privacy Policy |

---

## 9. Owner action items (open)

- [ ] Fill `BACKUP_RETENTION` in `company.ts` with the real Supabase backup/PITR
      window; confirm deleted rows age out within it.
- [x] Decide billing/tax retention vs. immediate cascade (§5 gap 2) — **decided
      2026-07-10: rely on Stripe (Option A)**; Privacy Policy §8 aligned.
- [x] Stripe customer deletion on account deletion (§5 gap 1) — **shipped 2026-07-10**
      in `src/app/api/account/delete/route.ts`.
- [ ] Confirm PostHog project data-retention period (activity 5 / §4).
- [ ] Confirm support-correspondence retention once an email provider is chosen.
- [ ] Assess and, if required, appoint UK/EU Art. 27 representative (§7); set
      `UK_EU_REPRESENTATIVE`.
- [ ] Have this record + the public legal pages reviewed by a qualified adviser.
- [ ] Review this document at least annually or on any material processing change.
