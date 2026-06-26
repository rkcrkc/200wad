-- Round the remaining non-whole monthly price to a clean whole dollar, matching
-- the language / all-languages monthly tiers.
--   course monthly 999 -> 1000  ($10/mo)
UPDATE pricing_plans SET amount_cents = 1000 WHERE tier = 'course' AND billing_model = 'monthly';
