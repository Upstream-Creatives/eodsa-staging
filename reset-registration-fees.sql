-- Reset Registration Fees Script
-- This script resets all registration fee tracking to start fresh

-- 1. Reset all dancers' registration fee status to FALSE
UPDATE dancers 
SET registration_fee_paid = FALSE,
    registration_fee_paid_at = NULL,
    registration_fee_mastery_level = NULL;

-- 2. Check current registration fee status
SELECT 
  COUNT(*) as total_dancers,
  COUNT(CASE WHEN registration_fee_paid = TRUE THEN 1 END) as paid_count,
  COUNT(CASE WHEN registration_fee_paid = FALSE THEN 1 END) as unpaid_count
FROM dancers;

-- 3. Show sample of current status
SELECT 
  id,
  name,
  eodsa_id,
  registration_fee_paid,
  registration_fee_paid_at,
  registration_fee_mastery_level
FROM dancers
LIMIT 10;
