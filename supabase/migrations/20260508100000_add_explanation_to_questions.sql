-- Add explanation field to questions table for storing answer explanations
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Add comment for clarity
COMMENT ON COLUMN questions.explanation IS 'Singkat penjelasan jawaban atau pembahasan untuk soal';
