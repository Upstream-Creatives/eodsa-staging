-- ============================================
-- CHECK FOR NEW ENTRIES WITHOUT PERFORMANCES
-- This finds approved & paid entries that don't have a performance record yet
-- ============================================

-- 1. Check event_entries that are approved and paid but missing performances
SELECT 
  'REGULAR ENTRIES MISSING PERFORMANCES' AS category,
  COUNT(*) AS missing_count
FROM event_entries ee
WHERE ee.approved = true 
  AND ee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = ee.id
  );

-- 2. Detailed list of missing performances from event_entries
SELECT 
  ee.id AS entry_id,
  ee.event_id,
  ee.item_name,
  ee.entry_type,
  ee.performance_type,
  ee.contestant_id,
  ee.participant_ids,
  ee.submitted_at,
  ee.approved_at,
  'event_entries' AS source_table
FROM event_entries ee
WHERE ee.approved = true 
  AND ee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = ee.id
  )
ORDER BY ee.submitted_at DESC;

-- 3. Check nationals_event_entries (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nationals_event_entries') THEN
    RAISE NOTICE 'Checking nationals_event_entries...';
  END IF;
END
$$;

SELECT 
  'NATIONALS ENTRIES MISSING PERFORMANCES' AS category,
  COUNT(*) AS missing_count
FROM nationals_event_entries nee
WHERE nee.approved = true 
  AND nee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = nee.id
  );

-- 4. Detailed list of missing performances from nationals_event_entries
SELECT 
  nee.id AS entry_id,
  nee.nationals_event_id AS event_id,
  nee.item_name,
  nee.entry_type,
  nee.performance_type,
  nee.contestant_id,
  nee.participant_ids,
  nee.submitted_at,
  nee.approved_at,
  'nationals_event_entries' AS source_table
FROM nationals_event_entries nee
WHERE nee.approved = true 
  AND nee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = nee.id
  )
ORDER BY nee.submitted_at DESC;

-- 5. Summary by entry type
SELECT 
  'Summary by Entry Type' AS report,
  entry_type,
  performance_type,
  COUNT(*) AS missing_count
FROM (
  SELECT entry_type, performance_type FROM event_entries ee
  WHERE ee.approved = true 
    AND ee.payment_status = 'paid'
    AND NOT EXISTS (SELECT 1 FROM performances p WHERE p.event_entry_id = ee.id)
  
  UNION ALL
  
  SELECT entry_type, performance_type FROM nationals_event_entries nee
  WHERE nee.approved = true 
    AND nee.payment_status = 'paid'
    AND NOT EXISTS (SELECT 1 FROM performances p WHERE p.event_entry_id = nee.id)
) combined
GROUP BY entry_type, performance_type
ORDER BY entry_type, performance_type;

-- 6. Check total counts for verification
SELECT 
  'TOTAL APPROVED PAID ENTRIES' AS metric,
  (SELECT COUNT(*) FROM event_entries WHERE approved = true AND payment_status = 'paid') +
  (SELECT COUNT(*) FROM nationals_event_entries WHERE approved = true AND payment_status = 'paid') AS count;

SELECT 
  'TOTAL PERFORMANCES' AS metric,
  COUNT(*) AS count
FROM performances;

SELECT 
  'MISSING PERFORMANCES' AS metric,
  (
    (SELECT COUNT(*) FROM event_entries WHERE approved = true AND payment_status = 'paid' 
     AND NOT EXISTS (SELECT 1 FROM performances p WHERE p.event_entry_id = event_entries.id))
    +
    (SELECT COUNT(*) FROM nationals_event_entries WHERE approved = true AND payment_status = 'paid'
     AND NOT EXISTS (SELECT 1 FROM performances p WHERE p.event_entry_id = nationals_event_entries.id))
  ) AS count;

