-- Webhook logging + admin manual grant tooling
-- Root cause: lynk-webhook had no logging — every failure (user not found,
-- email mismatch, signature error) was silent. Admin had no way to see what
-- payments actually arrived or to grant access retroactively.

-- ── 1. Webhook logs table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lynk_webhook_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL,                 -- success | already_granted | user_not_found | unknown_uuid | invalid_signature | invalid_payload | error
  http_status  int  NOT NULL,
  lynk_uuid    text,
  buyer_email  text,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exam_id      uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  amount       numeric,
  error        text,
  raw_payload  jsonb,
  resolved     boolean NOT NULL DEFAULT false,
  resolved_at  timestamptz,
  resolved_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_note text
);

CREATE INDEX IF NOT EXISTS lynk_webhook_logs_received_at_idx
  ON public.lynk_webhook_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS lynk_webhook_logs_status_idx
  ON public.lynk_webhook_logs (status);

CREATE INDEX IF NOT EXISTS lynk_webhook_logs_email_idx
  ON public.lynk_webhook_logs (buyer_email);

ALTER TABLE public.lynk_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read webhook logs" ON public.lynk_webhook_logs;
CREATE POLICY "Admin read webhook logs"
  ON public.lynk_webhook_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin update webhook logs" ON public.lynk_webhook_logs;
CREATE POLICY "Admin update webhook logs"
  ON public.lynk_webhook_logs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edge function (service_role) bypasses RLS, so no INSERT policy is needed.

-- ── 2. Manual grant access RPC ────────────────────────────────────────────────
-- Lets an admin grant exam access to a user (by email) when the webhook didn't
-- fire automatically. Also covers child exams of bundles.

CREATE OR REPLACE FUNCTION public.admin_grant_exam_access(
  _email   text,
  _exam_id uuid,
  _amount  numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_user_id  uuid;
  v_child_id uuid;
  v_granted  uuid[] := ARRAY[]::uuid[];
  v_skipped  uuid[] := ARRAY[]::uuid[];
  v_email    text  := lower(trim(_email));
BEGIN
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant access';
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = v_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'user_not_found',
      'message', format('Tidak ada user dengan email %s. Minta user daftar dulu, baru retry.', v_email)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.exam_purchases WHERE user_id = v_user_id AND exam_id = _exam_id AND used = false) THEN
    INSERT INTO public.exam_purchases (user_id, exam_id, price_paid)
    VALUES (v_user_id, _exam_id, _amount);
    v_granted := v_granted || _exam_id;
  ELSE
    v_skipped := v_skipped || _exam_id;
  END IF;

  FOR v_child_id IN SELECT id FROM public.exams WHERE parent_exam_id = _exam_id LOOP
    IF NOT EXISTS (SELECT 1 FROM public.exam_purchases WHERE user_id = v_user_id AND exam_id = v_child_id AND used = false) THEN
      INSERT INTO public.exam_purchases (user_id, exam_id, price_paid)
      VALUES (v_user_id, v_child_id, 0);
      v_granted := v_granted || v_child_id;
    ELSE
      v_skipped := v_skipped || v_child_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'granted_exam_ids', v_granted,
    'already_had_access', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_exam_access(text, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_exam_access(text, uuid, numeric) TO authenticated;

-- ── 3. Mark a webhook log as resolved ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_resolve_webhook_log(
  _log_id uuid,
  _note   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve webhook logs';
  END IF;

  UPDATE public.lynk_webhook_logs
  SET resolved = true,
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolved_note = _note
  WHERE id = _log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_webhook_log(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_webhook_log(uuid, text) TO authenticated;
