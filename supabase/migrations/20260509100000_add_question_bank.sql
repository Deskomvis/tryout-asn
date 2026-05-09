-- Question bank: junction table so questions can be shared across exam packages
CREATE TABLE IF NOT EXISTS public.exam_question_assignments (
  exam_id    uuid NOT NULL REFERENCES public.exams(id)     ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position   integer      NOT NULL DEFAULT 0,
  added_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, question_id)
);

ALTER TABLE public.exam_question_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on exam_question_assignments"
  ON public.exam_question_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read exam_question_assignments"
  ON public.exam_question_assignments FOR SELECT TO authenticated
  USING (true);

-- Allow questions with no exam (pure bank questions)
ALTER TABLE public.questions ALTER COLUMN exam_id DROP NOT NULL;

-- Update get_exam_questions: use junction table first, fall back to exam_id
DROP FUNCTION IF EXISTS public.get_exam_questions(uuid);

CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id uuid)
  RETURNS TABLE(
    id            uuid,
    question_text text,
    options       jsonb,
    subtest       text,
    explanation   text,
    image_url     text,
    svg_content   text
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.exam_question_assignments WHERE exam_id = _exam_id LIMIT 1
  ) THEN
    RETURN QUERY
      SELECT q.id, q.question_text, q.options, q.subtest::text,
             q.explanation, q.image_url, q.svg_content
      FROM   public.questions q
      JOIN   public.exam_question_assignments a
             ON a.question_id = q.id AND a.exam_id = _exam_id
      ORDER  BY a.position, a.added_at;
  ELSE
    RETURN QUERY
      SELECT q.id, q.question_text, q.options, q.subtest::text,
             q.explanation, q.image_url, q.svg_content
      FROM   public.questions q
      WHERE  q.exam_id = _exam_id
      ORDER  BY q.subtest, q.created_at;
  END IF;
END;
$$;
