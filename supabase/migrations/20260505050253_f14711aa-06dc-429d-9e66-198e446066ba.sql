
-- 1) user_balances
CREATE TABLE public.user_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage balances" ON public.user_balances
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) topup_requests
CREATE TYPE public.topup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status public.topup_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topups" ON public.topup_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own topups" ON public.topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage topups" ON public.topup_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) exam_purchases
CREATE TABLE public.exam_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
CREATE INDEX idx_exam_purchases_user ON public.exam_purchases(user_id, used);
ALTER TABLE public.exam_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases" ON public.exam_purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage purchases" ON public.exam_purchases
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Trigger: create balance row on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Backfill for existing users
INSERT INTO public.user_balances (user_id, balance)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Update existing handle_new_user to also create balance
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_balances (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END; $$;

-- 5) purchase_exam: deduct balance & create purchase
CREATE OR REPLACE FUNCTION public.purchase_exam(_exam_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_price INTEGER;
  v_balance INTEGER;
  v_purchase_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT price INTO v_price FROM public.exams WHERE id = _exam_id;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Paket tidak ditemukan'; END IF;

  -- Lock balance row
  SELECT balance INTO v_balance FROM public.user_balances WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN
    INSERT INTO public.user_balances(user_id, balance) VALUES (v_user, 0);
    v_balance := 0;
  END IF;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo tidak cukup. Saldo: %, harga: %', v_balance, v_price;
  END IF;

  UPDATE public.user_balances
    SET balance = balance - v_price, updated_at = now()
    WHERE user_id = v_user;

  INSERT INTO public.exam_purchases (user_id, exam_id, price_paid)
  VALUES (v_user, _exam_id, v_price)
  RETURNING id INTO v_purchase_id;

  RETURN v_purchase_id;
END; $$;

-- 6) submit_exam updated: requires unused purchase, marks it used
CREATE OR REPLACE FUNCTION public.submit_exam(_exam_id UUID, _answers jsonb, _time_spent INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_correct INTEGER := 0;
  v_total INTEGER := 0;
  v_score INTEGER := 0;
  r RECORD;
  v_user UUID := auth.uid();
  v_purchase_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Find earliest unused purchase for this exam
  SELECT id INTO v_purchase_id
  FROM public.exam_purchases
  WHERE user_id = v_user AND exam_id = _exam_id AND used = false
  ORDER BY purchased_at ASC LIMIT 1
  FOR UPDATE;

  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'Anda belum membeli paket ini atau akses sudah terpakai';
  END IF;

  FOR r IN SELECT id, correct_answer FROM public.questions WHERE exam_id = _exam_id LOOP
    v_total := v_total + 1;
    IF (_answers->>r.id::text) = r.correct_answer THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  IF v_total > 0 THEN
    v_score := ROUND((v_correct::numeric / v_total::numeric) * 100);
  END IF;

  INSERT INTO public.user_scores (user_id, exam_id, score, time_spent)
  VALUES (v_user, _exam_id, v_score, _time_spent);

  UPDATE public.exam_purchases SET used = true, used_at = now() WHERE id = v_purchase_id;

  RETURN v_score;
END; $$;

-- 7) admin_adjust_balance: admin adds/subtracts saldo, optionally linked to a topup
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id UUID, _amount INTEGER, _topup_id UUID DEFAULT NULL, _approve BOOLEAN DEFAULT true)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_new_balance INTEGER;
BEGIN
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Hanya admin';
  END IF;

  INSERT INTO public.user_balances (user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_balances
    SET balance = GREATEST(0, balance + _amount), updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance INTO v_new_balance;

  IF _topup_id IS NOT NULL THEN
    UPDATE public.topup_requests
      SET status = CASE WHEN _approve THEN 'approved'::topup_status ELSE 'rejected'::topup_status END,
          processed_at = now(), processed_by = v_admin
      WHERE id = _topup_id;
  END IF;

  RETURN v_new_balance;
END; $$;
