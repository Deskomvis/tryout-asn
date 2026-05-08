-- Update get_exam_questions to include svg_content field
DROP FUNCTION IF EXISTS public.get_exam_questions(uuid);

CREATE FUNCTION public.get_exam_questions(_exam_id uuid)
 RETURNS TABLE(id uuid, question_text text, options jsonb, subtest text, explanation text, image_url text, svg_content text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT q.id, q.question_text, q.options, q.subtest::text, q.explanation, q.image_url, q.svg_content
  FROM public.questions q
  WHERE q.exam_id = _exam_id
  ORDER BY q.subtest, q.created_at;
$f$;
