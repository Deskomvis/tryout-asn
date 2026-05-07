-- Update submit_exam to also insert into exam_results
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
  v_twk_score INTEGER := 0;
  v_tiu_score INTEGER := 0;
  v_tkp_score INTEGER := 0;
  v_answered_count INTEGER := 0;
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

  -- Count total questions
  SELECT COUNT(*) INTO v_total_questions FROM public.questions WHERE exam_id = _exam_id;

  FOR v_sub IN SELECT DISTINCT subtest::text FROM public.questions WHERE exam_id = _exam_id LOOP
    v_sub_score := 0;
    v_sub_max := 0;
    FOR r IN SELECT id, correct_answer, option_points, subtest::text AS subtest
             FROM public.questions WHERE exam_id = _exam_id AND subtest::text = v_sub LOOP
      v_user_ans := _answers->>r.id::text;
      v_sub_max := v_sub_max + 5;

      IF v_user_ans IS NOT NULL THEN
        v_answered_count := v_answered_count + 1;
        IF v_sub = 'tkp' THEN
          IF r.option_points IS NOT NULL AND r.option_points ? v_user_ans THEN
            v_sub_score := v_sub_score + COALESCE((r.option_points->>v_user_ans)::int, 0);
          END IF;
        ELSE
          IF v_user_ans = r.correct_answer THEN
            v_sub_score := v_sub_score + 5;
          END IF;
        END IF;
      END IF;
    END LOOP;

    -- Track subtest scores
    IF v_sub = 'twk' THEN v_twk_score := v_sub_score;
    ELSIF v_sub = 'tiu' THEN v_tiu_score := v_sub_score;
    ELSIF v_sub = 'tkp' THEN v_tkp_score := v_sub_score;
    END IF;

    v_breakdown := v_breakdown || jsonb_build_object(v_sub, jsonb_build_object('score', v_sub_score, 'max', v_sub_max));
    v_total_score := v_total_score + v_sub_score;
    v_max_score := v_max_score + v_sub_max;
  END LOOP;

  v_unanswered_count := v_total_questions - v_answered_count;

  INSERT INTO public.user_scores (user_id, exam_id, score, time_spent, score_breakdown, max_score)
  VALUES (v_user, _exam_id, v_total_score, _time_spent, v_breakdown, v_max_score);

  -- Insert into exam_results
  INSERT INTO public.exam_results (user_id, exam_id, total_score, twk_score, tiu_score, tkp_score, time_spent, answered_count, unanswered_count, total_questions)
  VALUES (v_user, _exam_id, v_total_score, v_twk_score, v_tiu_score, v_tkp_score, _time_spent, v_answered_count, v_unanswered_count, v_total_questions)
  ON CONFLICT DO NOTHING;

  UPDATE public.exam_purchases SET used = true, used_at = now() WHERE id = v_purchase_id;

  RETURN v_total_score;
END; $function$;
