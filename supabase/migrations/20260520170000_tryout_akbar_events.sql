-- Tryout Akbar: event simulasi nasional dengan quota dan periode pendaftaran
CREATE TABLE tryout_akbar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  max_quota INT NOT NULL DEFAULT 10000,
  price INT NOT NULL DEFAULT 20000,
  cta_link TEXT,
  registration_start TIMESTAMPTZ,
  registration_end TIMESTAMPTZ,
  exam_start TIMESTAMPTZ,
  exam_end TIMESTAMPTZ,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tryout_akbar_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tryout_akbar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  payment_status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(event_id, user_id)
);

ALTER TABLE tryout_akbar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryout_akbar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read events"
  ON tryout_akbar_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin manage events"
  ON tryout_akbar_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User read own registrations"
  ON tryout_akbar_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User insert own registration"
  ON tryout_akbar_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin manage registrations"
  ON tryout_akbar_registrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
