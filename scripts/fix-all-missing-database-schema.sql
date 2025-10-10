-- ============================================
-- COMPLETE DATABASE SCHEMA FIX
-- Run this in Neon Database Console to add all missing tables and columns
-- ============================================

-- 1. CREATE MISSING TABLES
-- ============================================

-- Score edit audit logs table
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

-- EFT payment logs table
CREATE TABLE IF NOT EXISTS eft_payment_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  eodsa_id TEXT,
  amount DECIMAL(10,2),
  invoice_number TEXT,
  item_description TEXT,
  entries_count INTEGER DEFAULT 0,
  submitted_at TEXT,
  status TEXT DEFAULT 'pending_verification',
  verified_by TEXT,
  verified_at TEXT,
  notes TEXT
);

-- Performance presence tracking table
CREATE TABLE IF NOT EXISTS performance_presence (
  id TEXT PRIMARY KEY,
  performance_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  present BOOLEAN DEFAULT FALSE,
  checked_in_by TEXT,
  checked_in_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Score approvals table
CREATE TABLE IF NOT EXISTS score_approvals (
  id TEXT PRIMARY KEY,
  performance_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  judge_name TEXT NOT NULL,
  performance_title TEXT NOT NULL,
  score_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  rejected BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  created_at TEXT NOT NULL
);


-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- DANCERS TABLE
ALTER TABLE dancers ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE dancers ADD COLUMN IF NOT EXISTS registration_fee_paid_at TEXT;
ALTER TABLE dancers ADD COLUMN IF NOT EXISTS registration_fee_mastery_level TEXT;
ALTER TABLE dancers ADD COLUMN IF NOT EXISTS province TEXT;

-- EVENT_ENTRIES TABLE
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS qualified_for_nationals BOOLEAN DEFAULT FALSE;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS item_number INTEGER;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS virtual_item_number INTEGER;

-- EVENTS TABLE
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_end_date TEXT;

-- PERFORMANCES TABLE - Critical for scoring system
ALTER TABLE performances ADD COLUMN IF NOT EXISTS item_number INTEGER;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS performance_order INTEGER;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS withdrawn_from_judging BOOLEAN DEFAULT FALSE;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS announced BOOLEAN DEFAULT FALSE;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS announced_by TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS announced_at TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS announcer_notes TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'live';
ALTER TABLE performances ADD COLUMN IF NOT EXISTS video_external_url TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS video_external_type TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS music_file_url TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS music_file_name TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS music_cue TEXT;

-- PERFORMANCES TABLE - Score publishing columns (CRITICAL!)
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published BOOLEAN DEFAULT FALSE;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published_at TEXT;
ALTER TABLE performances ADD COLUMN IF NOT EXISTS scores_published_by TEXT;

-- JUDGES TABLE
ALTER TABLE judges ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'judge';

-- NATIONALS_EVENT_ENTRIES TABLE (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nationals_event_entries') THEN
    ALTER TABLE nationals_event_entries ADD COLUMN IF NOT EXISTS solo_count INTEGER DEFAULT 0;
    ALTER TABLE nationals_event_entries ADD COLUMN IF NOT EXISTS solo_details TEXT;
    ALTER TABLE nationals_event_entries ADD COLUMN IF NOT EXISTS additional_notes TEXT;
  END IF;
END
$$;


-- 3. UPDATE CONSTRAINTS
-- ============================================

-- Fix performance type constraint to allow 'All'
DO $$
BEGIN
  ALTER TABLE events DROP CONSTRAINT IF EXISTS events_performance_type_check;
  ALTER TABLE events ADD CONSTRAINT events_performance_type_check 
    CHECK (performance_type IN ('Solo', 'Duet', 'Trio', 'Group', 'All'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update events_performance_type_check constraint: %', SQLERRM;
END
$$;

-- Fix payment method constraint to allow 'eft'
DO $$
BEGIN
  ALTER TABLE event_entries DROP CONSTRAINT IF EXISTS event_entries_payment_method_check;
  ALTER TABLE event_entries ADD CONSTRAINT event_entries_payment_method_check 
    CHECK (payment_method IN ('credit_card', 'bank_transfer', 'invoice', 'payfast', 'eft'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update event_entries_payment_method_check constraint: %', SQLERRM;
END
$$;


-- 4. VERIFICATION QUERIES
-- ============================================

-- Verify score_edit_logs table exists
SELECT 'score_edit_logs table' AS check_name, 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'score_edit_logs') 
       THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

-- Verify performances columns
SELECT 'performances.scores_published' AS check_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns 
         WHERE table_name = 'performances' AND column_name = 'scores_published'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

SELECT 'performances.scores_published_at' AS check_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns 
         WHERE table_name = 'performances' AND column_name = 'scores_published_at'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

SELECT 'performances.scores_published_by' AS check_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns 
         WHERE table_name = 'performances' AND column_name = 'scores_published_by'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

-- Count records in new tables
SELECT 'score_edit_logs records' AS table_name, COUNT(*) AS record_count FROM score_edit_logs;
SELECT 'score_approvals records' AS table_name, COUNT(*) AS record_count FROM score_approvals;

RAISE NOTICE '✅ Database schema update complete!';


