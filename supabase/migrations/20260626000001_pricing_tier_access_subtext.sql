-- Replace the short-lived access_visible toggle with an editable "sub-text"
-- line for the subscription-page Access column. The sub-text renders under the
-- main access line and is hidden in the app whenever it's left blank.
ALTER TABLE pricing_tier_copy DROP COLUMN IF EXISTS access_visible;

ALTER TABLE pricing_tier_copy
  ADD COLUMN IF NOT EXISTS access_subtext TEXT;
