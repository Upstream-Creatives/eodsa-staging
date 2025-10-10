-- ============================================
-- QUICK FIX for Scoring System Issues
-- Run this NOW to fix immediate errors
-- ============================================

-- 1. Create score_edit_logs table (for edit tracking)
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

-- 2. Add score publishing columns to performances table
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published BOOLEAN DEFAULT FALSE;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published_at TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published_by TEXT;

-- 3. Verify the fix
SELECT 
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'score_edit_logs') 
  THEN '✅ score_edit_logs table created' 
  ELSE '❌ score_edit_logs table missing' END AS status_1,
  
  CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'scores_published')
  THEN '✅ scores_published column added'
  ELSE '❌ scores_published column missing' END AS status_2,
  
  CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'scores_published_at')
  THEN '✅ scores_published_at column added'
  ELSE '❌ scores_published_at column missing' END AS status_3,
  
  CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'scores_published_by')
  THEN '✅ scores_published_by column added'
  ELSE '❌ scores_published_by column missing' END AS status_4;


