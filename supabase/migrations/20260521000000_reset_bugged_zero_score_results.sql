-- Data repair: reset exam purchases and delete exam_results that were corrupted
-- by the submit_exam bug (all scores saved as 0 because questions.exam_id was NULL
-- and the function didn't use the exam_question_assignments junction table).
--
-- Identifying criterion: total_questions = 0 means no questions were found by the
-- old query → these rows are all artifacts of the bug, not real attempts.

-- 1. Delete bogus exam_results (0 questions scored = definitely from the bug)
DELETE FROM public.exam_results
WHERE total_questions = 0
  AND answered_count = 0
  AND total_score = 0;

-- 2. Delete corresponding bogus user_scores
DELETE FROM public.user_scores
WHERE score = 0
  AND id IN (
    -- Only scores inserted at the same time as the buggy results
    -- (safe: legitimate 0-score attempts would have total_questions > 0 in exam_results)
    SELECT us.id FROM public.user_scores us
    WHERE us.score = 0
      AND NOT EXISTS (
        SELECT 1 FROM public.exam_results er
        WHERE er.user_id = us.user_id
          AND er.exam_id = us.exam_id
          AND er.total_questions > 0
      )
  );

-- 3. Reset the 4 purchases that were consumed during the bugged period
--    (purchase marked used=true but exam scored 0 — users deserve a retry)
UPDATE public.exam_purchases
SET used = false, used_at = NULL
WHERE id IN (
  '31586734-983c-483d-803f-5af1f29834d2',
  '1e0fadc6-6822-4ee1-822b-4845723e019a',
  'a9fd6741-058e-4574-ad41-bf6901ebdc25',
  '33d80bda-b83c-4102-bead-af52ec19fb87'
);
