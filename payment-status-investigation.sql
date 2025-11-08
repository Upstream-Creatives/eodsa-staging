-- Payment Status Investigation Script
-- This script helps identify payment status issues

-- 1. Find approved entries with PENDING payment status
SELECT 
  ee.id,
  ee.item_number,
  ee.item_name,
  ee.contestant_name,
  ee.studio_name,
  ee.calculated_fee,
  ee.payment_status,
  ee.approved,
  ee.qualified_for_nationals,
  ee.submitted_at,
  ee.approved_at
FROM event_entries ee
WHERE ee.approved = true 
  AND ee.payment_status = 'PENDING'
ORDER BY ee.item_number;

-- 2. Check payment processing logs (if available)
-- This would need to be implemented based on your payment system
SELECT 
  ee.id,
  ee.item_number,
  ee.payment_status,
  ee.payment_method,
  ee.payment_reference,
  ee.payment_processed_at
FROM event_entries ee
WHERE ee.payment_status = 'PENDING'
ORDER BY ee.submitted_at DESC;

-- 3. Find entries that might need payment status updates
SELECT 
  ee.id,
  ee.item_number,
  ee.contestant_name,
  ee.calculated_fee,
  ee.payment_status,
  ee.approved,
  CASE 
    WHEN ee.approved = true AND ee.payment_status = 'PENDING' THEN 'NEEDS STATUS UPDATE'
    WHEN ee.approved = false AND ee.payment_status = 'PAID' THEN 'CHECK APPROVAL'
    ELSE 'STATUS OK'
  END as action_needed
FROM event_entries ee
WHERE (ee.approved = true AND ee.payment_status = 'PENDING')
   OR (ee.approved = false AND ee.payment_status = 'PAID')
ORDER BY ee.item_number;

-- 4. Check for batch payment entries
SELECT 
  ee.payment_reference,
  COUNT(*) as entry_count,
  STRING_AGG(ee.item_number::text, ', ') as item_numbers,
  STRING_AGG(ee.payment_status, ', ') as payment_statuses,
  SUM(ee.calculated_fee) as total_amount
FROM event_entries ee
WHERE ee.payment_reference IS NOT NULL
GROUP BY ee.payment_reference
ORDER BY entry_count DESC;
