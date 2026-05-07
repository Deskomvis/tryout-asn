-- Create exam_results table to store exam submission results
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  twk_score INTEGER NOT NULL DEFAULT 0,
  tiu_score INTEGER NOT NULL DEFAULT 0,
  tkp_score INTEGER NOT NULL DEFAULT 0,
  time_spent INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own exam results
CREATE POLICY "Users can view their own exam results"
  ON exam_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own exam results (via submit_exam function)
CREATE POLICY "Users can insert their own exam results"
  ON exam_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for querying by user_id and exam_id
CREATE INDEX idx_exam_results_user_exam ON exam_results(user_id, exam_id);
CREATE INDEX idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX idx_exam_results_created_at ON exam_results(created_at DESC);
