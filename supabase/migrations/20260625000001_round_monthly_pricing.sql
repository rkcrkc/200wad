-- Round monthly prices to clean whole dollars, matching the annual prices.
--   language      monthly 1499 -> 1500  ($15/mo)
--   all-languages monthly 1999 -> 2000  ($20/mo)
UPDATE pricing_plans SET amount_cents = 1500 WHERE tier = 'language' AND billing_model = 'monthly';
UPDATE pricing_plans SET amount_cents = 2000 WHERE tier = 'all-languages' AND billing_model = 'monthly';
