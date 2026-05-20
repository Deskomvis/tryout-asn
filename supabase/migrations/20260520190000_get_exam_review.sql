-- Function to load full question data for post-exam review
-- Only accessible after the user has an exam_result for this exam
CREATE OR REPLACE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE(
  id uuid,
  question_text text,
  options jsonb,
  subtest text,
  explanation text,
  correct_answer text,
  option_points jsonb,
  image_url text,
  svg_content text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT
    q.id,
    q.question_text,
    q.options,
    q.subtest::text,
    q.explanation,
    q.correct_answer,
    q.option_points,
    q.image_url,
    q.svg_content
  FROM public.questions q
  WHERE q.exam_id = _exam_id
    AND EXISTS (
      SELECT 1 FROM public.exam_results er
      WHERE er.exam_id = _exam_id AND er.user_id = auth.uid()
    )
  ORDER BY q.subtest, q.created_at;
$f$;

GRANT EXECUTE ON FUNCTION public.get_exam_review(uuid) TO authenticated;
