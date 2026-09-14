/**
 * Single source of truth for the legal/company details used across the
 * Privacy Policy, Terms of Service and Refunds pages.
 *
 * These pages are a good-faith template, not legal advice — have them reviewed
 * by a qualified adviser (esp. HK PDPO + UK/EU GDPR + consumer law) before you
 * rely on them. Two follow-ups are tracked on the Notion board: appointing a
 * UK/EU Article 27 representative (Privacy §2) and stating a concrete backup
 * retention window (Privacy §8); both are currently worded conditionally.
 */

/** Registered/trading name of the operating entity. */
export const LEGAL_ENTITY = "Eurapac Investasia (HK) Ltd";

/** The public product/brand name. */
export const BRAND_NAME = "200 Words a Day";

/** Full registered address (Hong Kong). */
export const LEGAL_ADDRESS =
  "Room 502, 5/F Prosperous Building, 48-52 Des Voeux Road Central, Hong Kong";

/** Company/business registration number, if you want to show it. */
export const COMPANY_NUMBER = "1700936";

/** Inbox for privacy / data-protection requests. */
export const PRIVACY_EMAIL = "hi@200words-a-day.com";

/** General support / billing inbox. */
export const SUPPORT_EMAIL = "help@200words-a-day.com";

/** Public contact inbox shown on the /contact page and used to route form submissions. */
export const CONTACT_EMAIL = "hi@200words-a-day.com";

/** Governing-law jurisdiction for the Terms. */
export const GOVERNING_LAW = "Hong Kong";

/**
 * Human-readable "last updated" date shown on every legal page. Bump this
 * whenever the substance of any policy changes.
 */
export const LEGAL_LAST_UPDATED = "13 September 2026";
