-- Add svg_content field for programmatically generated charts/graphs
ALTER TABLE questions ADD COLUMN IF NOT EXISTS svg_content TEXT;

COMMENT ON COLUMN questions.svg_content IS 'Inline SVG kode untuk grafik/chart soal berbasis data numerik (tidak perlu image model)';
