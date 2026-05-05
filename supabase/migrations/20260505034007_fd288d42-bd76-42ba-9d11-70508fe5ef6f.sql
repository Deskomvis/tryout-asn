
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_exam_questions(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_exam_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_exam(uuid, jsonb, integer) TO authenticated;
