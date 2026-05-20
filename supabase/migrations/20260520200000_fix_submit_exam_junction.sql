-- Fix submit_exam and get_exam_review to use exam_question_assignments junction table.
-- All questions now have exam_id = NULL and are linked to exams via the junction table.
-- The old functions were still querying WHERE questions.exam_id = _exam_id → always 0 results → always 0 scores.

-- ── 1. Fix submit_exam ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_exam(
  _exam_id    uuid,
  _answers    jsonb,
  _time_spent integer
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user            UUID    := auth.uid();
  v_purchase_id     UUID;
  v_total_score     INTEGER := 0;
  v_max_score       INTEGER := 0;
  v_breakdown       jsonb   := '{}'::jsonb;
  v_sub             text;
  v_sub_score       INTEGER;
  v_sub_max         INTEGER;
  v_user_ans        text;
  v_twk_score       INTEGER := 0;
  v_tiu_score       INTEGER := 0;
  v_tkp_score       INTEGER := 0;
  v_answered_count  INTEGER := 0;
  v_unanswered_count INTEGER := 0;
  v_total_questions INTEGER := 0;
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

  -- Count total questions (junction table first, fallback to direct exam_id)
  SELECT COUNT(*) INTO v_total_questions
  FROM public.questions q
  WHERE q.id IN (SELECT question_id FROM public.exam_question_assignments WHERE exam_id = _exam_id)
     OR q.exam_id = _exam_id;

  -- Score per subtest
  FOR v_sub IN (
    SELECT DISTINCT q.subtest::text
    FROM public.questions q
    WHERE q.id IN (SELECT question_id FROM public.exam_question_assignments WHERE exam_id = _exam_id)
       OR q.exam_id = _exam_id
  ) LOOP
    v_sub_score := 0;
    v_sub_max   := 0;

    FOR r IN (
      SELECT q.id, q.correct_answer, q.option_points
      FROM public.questions q
      WHERE (
        q.id IN (SELECT question_id FROM public.exam_question_assignments WHERE exam_id = _exam_id)
        OR q.exam_id = _exam_id
      )
      AND q.subtest::text = v_sub
    ) LOOP
      v_user_ans := _answers ->> r.id::text;
      v_sub_max  := v_sub_max + 5;

      IF v_user_ans IS NOT NULL THEN
        v_answered_count := v_answered_count + 1;
        IF v_sub = 'tkp' THEN
          IF r.option_points IS NOT NULL AND r.option_points ? v_user_ans THEN
            v_sub_score := v_sub_score + COALESCE((r.option_points ->> v_user_ans)::int, 0);
          END IF;
        ELSE
          IF v_user_ans = r.correct_answer THEN
            v_sub_score := v_sub_score + 5;
          END IF;
        END IF;
      END IF;
    END LOOP;

    IF    v_sub = 'twk' THEN v_twk_score := v_sub_score;
    ELSIF v_sub = 'tiu' THEN v_tiu_score := v_sub_score;
    ELSIF v_sub = 'tkp' THEN v_tkp_score := v_sub_score;
    END IF;

    v_breakdown   := v_breakdown || jsonb_build_object(
      v_sub, jsonb_build_object('score', v_sub_score, 'max', v_sub_max)
    );
    v_total_score := v_total_score + v_sub_score;
    v_max_score   := v_max_score   + v_sub_max;
  END LOOP;

  v_unanswered_count := v_total_questions - v_answered_count;

  INSERT INTO public.user_scores (user_id, exam_id, score, time_spent, score_breakdown, max_score)
  VALUES (v_user, _exam_id, v_total_score, _time_spent, v_breakdown, v_max_score);

  INSERT INTO public.exam_results (
    user_id, exam_id, total_score, twk_score, tiu_score, tkp_score,
    time_spent, answered_count, unanswered_count, total_questions
  )
  VALUES (
    v_user, _exam_id, v_total_score, v_twk_score, v_tiu_score, v_tkp_score,
    _time_spent, v_answered_count, v_unanswered_count, v_total_questions
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.exam_purchases SET used = true, used_at = now() WHERE id = v_purchase_id;

  RETURN v_total_score;
END;
$function$;

-- ── 2. Fix get_exam_review ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE(
  id            uuid,
  question_text text,
  options       jsonb,
  subtest       text,
  explanation   text,
  correct_answer text,
  option_points  jsonb,
  image_url     text,
  svg_content   text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT
    q.id, q.question_text, q.options, q.subtest::text, q.explanation,
    q.correct_answer, q.option_points, q.image_url, q.svg_content
  FROM public.questions q
  WHERE (
    q.id IN (SELECT question_id FROM public.exam_question_assignments WHERE exam_id = _exam_id)
    OR q.exam_id = _exam_id
  )
  AND EXISTS (
    SELECT 1 FROM public.exam_results er
    WHERE er.exam_id = _exam_id AND er.user_id = auth.uid()
  )
  ORDER BY q.subtest, q.created_at;
$f$;
