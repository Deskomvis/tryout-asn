-- Capture the byte-exact raw body Lynk sends, so HMAC signature forensics
-- can compare against the same string. raw_payload (jsonb) re-orders keys and
-- strips whitespace on storage, so it can't be used to recompute HMAC.

ALTER TABLE public.lynk_webhook_logs
ADD COLUMN IF NOT EXISTS raw_body text;
