
DO $$ BEGIN
  CREATE TYPE public.exam_subtest AS ENUM ('twk','tiu','tkp','skb');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS subtest public.exam_subtest NOT NULL DEFAULT 'tiu',
  ADD COLUMN IF NOT EXISTS option_points jsonb;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_type text NOT NULL DEFAULT 'skd';

ALTER TABLE public.user_scores
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS max_score integer;

DROP FUNCTION IF EXISTS public.get_exam_questions(uuid);
CREATE FUNCTION public.get_exam_questions(_exam_id uuid)
 RETURNS TABLE(id uuid, question_text text, options jsonb, subtest text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT q.id, q.question_text, q.options, q.subtest::text
  FROM public.questions q
  WHERE q.exam_id = _exam_id
  ORDER BY q.subtest, q.created_at;
$f$;

CREATE OR REPLACE FUNCTION public.submit_exam(_exam_id uuid, _answers jsonb, _time_spent integer)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_purchase_id UUID;
  v_total_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_breakdown jsonb := '{}'::jsonb;
  v_sub text;
  v_sub_score INTEGER;
  v_sub_max INTEGER;
  v_user_ans text;
  r RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_purchase_id
  FROM public.exam_purchases
  WHERE user_id = v_user AND exam_id = _exam_id AND used = false
  ORDER BY purchased_at ASC LIMIT 1 FOR UPDATE;

  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'Anda belum membeli paket ini atau akses sudah terpakai';
  END IF;

  FOR v_sub IN SELECT DISTINCT subtest::text FROM public.questions WHERE exam_id = _exam_id LOOP
    v_sub_score := 0;
    v_sub_max := 0;
    FOR r IN SELECT id, correct_answer, option_points, subtest::text AS subtest
             FROM public.questions WHERE exam_id = _exam_id AND subtest::text = v_sub LOOP
      v_user_ans := _answers->>r.id::text;
      v_sub_max := v_sub_max + 5;
      IF v_sub = 'tkp' THEN
        IF v_user_ans IS NOT NULL AND r.option_points IS NOT NULL AND r.option_points ? v_user_ans THEN
          v_sub_score := v_sub_score + COALESCE((r.option_points->>v_user_ans)::int, 0);
        END IF;
      ELSE
        IF v_user_ans IS NOT NULL AND v_user_ans = r.correct_answer THEN
          v_sub_score := v_sub_score + 5;
        END IF;
      END IF;
    END LOOP;
    v_breakdown := v_breakdown || jsonb_build_object(v_sub, jsonb_build_object('score', v_sub_score, 'max', v_sub_max));
    v_total_score := v_total_score + v_sub_score;
    v_max_score := v_max_score + v_sub_max;
  END LOOP;

  INSERT INTO public.user_scores (user_id, exam_id, score, time_spent, score_breakdown, max_score)
  VALUES (v_user, _exam_id, v_total_score, _time_spent, v_breakdown, v_max_score);

  UPDATE public.exam_purchases SET used = true, used_at = now() WHERE id = v_purchase_id;

  RETURN v_total_score;
END; $function$;
