-- Fix for Registration Fee Logic
-- This script will help fix the registration fee charging issue

-- 1. Check current fee structure and identify duplicate registration fees
SELECT 
  ee.id,
  ee.item_number,
  ee.item_name,
  ee.eodsa_id,
  ee.contestant_id,
  ee.participant_ids,
  ee.calculated_fee,
  ee.registration_fee,
  ee.performance_fee,
  ee.payment_status,
  c.name as contestant_name,
  c.studio_name
FROM event_entries ee
LEFT JOIN contestants c ON ee.contestant_id = c.id
WHERE ee.registration_fee > 0
ORDER BY ee.eodsa_id, ee.item_number;

-- 2. Find dancers who have multiple entries with registration fees for the same event
SELECT 
  ee.eodsa_id,
  ee.event_id,
  c.name as dancer_name,
  COUNT(*) as entry_count,
  SUM(ee.registration_fee) as total_registration_fees,
  STRING_AGG(ee.item_number::text, ', ') as item_numbers
FROM event_entries ee
LEFT JOIN contestants c ON ee.contestant_id = c.id
WHERE ee.registration_fee > 0
GROUP BY ee.eodsa_id, ee.event_id, c.name
HAVING COUNT(*) > 1
ORDER BY total_registration_fees DESC;

-- 3. Check fee calculation logic
-- The issue is likely in the fee calculation where registration fee is charged for each entry
-- instead of once per dancer per event

-- 4. Suggested fix: Update fee calculation to only charge registration fee once per dancer per event
/*
-- This would need to be implemented in the fee calculation logic:
-- 1. Check if dancer has already paid registration fee for this event
-- 2. If yes, only charge performance fee
-- 3. If no, charge both registration and performance fees
*/
