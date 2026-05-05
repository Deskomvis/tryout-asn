
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 1800,
  total_questions INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  time_spent INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Exams policies
CREATE POLICY "Everyone authenticated views exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Questions policies (only admins direct access; users go via RPC)
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User scores policies
CREATE POLICY "Authenticated view scores for leaderboard" ON public.user_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own scores" ON public.user_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage scores" ON public.user_scores FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profile auto-create + default role trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: get questions for exam (without correct_answer)
CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id UUID)
RETURNS TABLE (id UUID, question_text TEXT, options JSONB)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question_text, q.options
  FROM public.questions q
  WHERE q.exam_id = _exam_id
  ORDER BY q.created_at;
$$;

-- RPC: submit exam, compute score server-side
CREATE OR REPLACE FUNCTION public.submit_exam(_exam_id UUID, _answers JSONB, _time_spent INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_correct INTEGER := 0;
  v_total INTEGER := 0;
  v_score INTEGER := 0;
  r RECORD;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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

  RETURN v_score;
END; $$;

-- Seed an example exam with questions
INSERT INTO public.exams (id, title, description, duration, total_questions, price)
VALUES ('11111111-1111-1111-1111-111111111111', 'Tryout UTBK Demo', 'Soal demo gratis - Tes Potensi Skolastik', 600, 3, 0);

INSERT INTO public.questions (exam_id, question_text, options, correct_answer) VALUES
('11111111-1111-1111-1111-111111111111', 'Ibu kota Indonesia adalah?', '["Jakarta","Bandung","Surabaya","Medan"]'::jsonb, 'Jakarta'),
('11111111-1111-1111-1111-111111111111', '5 + 7 x 2 = ?', '["24","19","17","14"]'::jsonb, '19'),
('11111111-1111-1111-1111-111111111111', 'Sinonim dari "cepat" adalah?', '["Lambat","Kilat","Berat","Sunyi"]'::jsonb, 'Kilat');
