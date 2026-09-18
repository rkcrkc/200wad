# Email System — Resend (transactional), Brevo (marketing)

_Status: Phase 1 (Resend) implemented. Phase 2 (Brevo) outlined only._

One branded email template system serves all outbound mail. Phase 1 stands up
the transactional stack on **Resend**; Phase 2 (separate spec) adds a **Brevo**
marketing stack.

## Architecture

```
src/lib/email/
  client.ts            getResendClient() singleton + TRANSACTIONAL_FROM / AUTH_FROM
  send.ts              sendEmail() (single) + sendEmailBatch() (chunks of 100). Never throw.
  theme.ts             brand palette + <Tailwind> config (mirrors globals.css; no CSS vars)
  templates/
    BaseLayout.tsx     branded shell: wordmark, card, legal footer, optional preferencesUrl
    EmailButton.tsx    CTA button (primary / critical variants)
    NotificationEmail.tsx   { title, message, cta?, severity? } → notification email
    ContactEmail.tsx        branded contact-form submission
    auth/
      AuthEmail.tsx           shared body for link-based auth emails
      ConfirmSignupEmail.tsx
      ResetPasswordEmail.tsx
      EmailChangeEmail.tsx
      MagicLinkEmail.tsx
      ReauthenticationEmail.tsx  (OTP code, no link)
```

Templating: **React Email** (`@react-email/components`, bundles `render`).
Palette mirrors the app layer (`globals.css`): bg `#faf8f3`, primary `#0b6cff`,
success `#00c950`, warning `#ff9224`, destructive `#fb2c36`.

## Three surfaces (all reuse `src/lib/email/`)

### 1. Notification emails
`src/lib/notifications/sender.ts` — `sendBroadcastEmails()` loads recipients and
honours per-type opt-out (`user_notification_preferences.email`), then:
- `EMAIL_PROVIDER=noop` (default): logs one line per recipient, no send.
- `EMAIL_PROVIDER=resend`: builds a `NotificationEmail` per recipient and sends
  via `sendEmailBatch()` (chunks of 100). CTA hrefs run through `appUrl()`;
  relative paths resolve to the app host, absolute URLs pass through. A
  "Manage email preferences" link (→ `/settings`) is injected via `BaseLayout`.

Both broadcast and single-user (`insert.ts`) paths call `sendBroadcastEmails()`.
The admin CMS (`TemplateFormModal.tsx`) exposes the Email channel checkbox so
admins choose per-template whether email fires. DB trigger
`validate_template_channels()` already accepts `email`.

### 2. Supabase auth emails (Send-Email hook)
Supabase's **Send Email hook** POSTs all auth mail to
`src/app/api/auth/send-email/route.ts`, which:
1. Verifies the Standard Webhooks signature with `SEND_EMAIL_HOOK_SECRET`
   (`v1,whsec_` prefix stripped) via the `standardwebhooks` lib.
2. Switches on `email_action_type` (signup / recovery / magiclink /
   email_change / reauthentication) → picks the matching template.
3. Builds the action URL to `src/app/auth/confirm/route.ts`, which calls
   `supabase.auth.verifyOtp({ token_hash, type })` then redirects to
   `redirect_to` (PKCE-safe; mirrors `/auth/callback`).
4. Sends via `sendEmail()` with `AUTH_FROM`. Returns 200 on success, non-200 on
   failure so Supabase logs + retries.

When the hook is enabled Supabase routes *all* auth mail through it — no custom
SMTP needed.

### 3. Contact form
`src/lib/mutations/contact.ts` — refactored to use the shared `sendEmail()` +
`ContactEmail` template. Behaviour unchanged: reply-to = visitor, honeypot,
never throws.

## Config / env

See `.env.example`. New keys:
- `RESEND_API_KEY` — required to send.
- `EMAIL_PROVIDER=resend` — turns on notification-email delivery.
- `EMAIL_FROM` / `CONTACT_FROM_EMAIL` — transactional sender.
- `AUTH_FROM_EMAIL` — auth sender.
- `SEND_EMAIL_HOOK_SECRET` — `v1,whsec_<base64>` from Supabase → Auth → Hooks.

`supabase/config.toml`: `enable_confirmations = true` (reconciled to prod);
`[auth.hook.send_email]` enabled with local URI + secret via env.

### Supabase (dashboard / MCP)
- Enable the **Send Email** hook; URI =
  `https://app.200words-a-day.com/api/auth/send-email`; generate the signing
  secret and store as `SEND_EMAIL_HOOK_SECRET`.

### DNS / Resend (user ops)
- Verify `200words-a-day.com` in Resend (SPF, DKIM, DMARC).
- Confirm the `from` addresses (`hello@`, `no-reply@`).

## Verification
1. `npm install` → `npm run lint` + `npm run build` clean.
2. **Notification:** `EMAIL_PROVIDER=resend` + key; enable email on a template;
   fire for a test user → branded email arrives; a user opted-out for that type
   is skipped.
3. **Auth:** on a preview/staging deploy with the hook configured, sign up →
   branded confirmation via the hook; link hits `/auth/confirm`, verifies,
   redirects. Repeat for reset + email change.
4. **Contact:** submit the form → email to `CONTACT_EMAIL`, reply-to = visitor.
5. **Deliverability:** SPF/DKIM/DMARC pass (Resend dashboard / mail-tester).

---

## Phase 2 — Brevo (marketing) — outline only

To be detailed in `docs/EMAIL_BREVO_PLAN.md` before building. Full scope:
- **Contact sync:** push users + `marketing_email_consent` to a Brevo list.
  Real-time on the consent hook (`src/app/auth/callback/route.ts`) and on
  `updateMarketingConsent()` (`src/lib/mutations/settings.ts`), plus a
  reconciliation cron. Only list contacts where consent = true; suppress on
  false; respect the tri-state (NULL = not yet decided).
- **Campaigns/automations:** authored via Brevo API + templates; welcome series
  / win-back flows keyed off app events.
- New `src/lib/marketing/brevo/` client + `BREVO_API_KEY`; reconciliation cron.
