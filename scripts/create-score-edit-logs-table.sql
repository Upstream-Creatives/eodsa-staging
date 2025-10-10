-- Create the score_edit_logs table for tracking admin edits to judge scores
-- Run this directly in Neon Database console

CREATE TABLE IF NOT EXISTS score_edit_logs (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  performance_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  judge_name TEXT,
  old_values JSONB,
  new_values JSONB,
  edited_by TEXT NOT NULL,
  edited_by_name TEXT,
  edited_at TEXT NOT NULL
);

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'score_edit_logs'
ORDER BY ordinal_position;

