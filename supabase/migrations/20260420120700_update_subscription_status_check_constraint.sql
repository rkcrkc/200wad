-- Update CHECK constraint to include all valid statuses
-- (paused from Stripe, past_due from invoice.payment_failed handler)
ALTER TABLE subscriptions
DROP CONSTRAINT subscriptions_status_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_status_check
CHECK (status IN ('active', 'cancelled', 'expired', 'paused', 'past_due'));