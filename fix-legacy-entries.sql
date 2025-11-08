-- Fix for Legacy Entry Studio Issue
-- This script will help identify and fix entries showing as "Legacy Entry"

-- 1. Find all legacy entries
SELECT 
  ee.id,
  ee.item_number,
  ee.item_name,
  ee.contestant_name,
  ee.studio_name,
  ee.eodsa_id,
  ee.participant_ids,
  c.name as contestant_real_name,
  c.studio_name as contestant_studio_name
FROM event_entries ee
LEFT JOIN contestants c ON ee.contestant_id = c.id
WHERE ee.studio_name = 'Legacy Entry' 
   OR ee.contestant_name = 'Legacy Entry'
ORDER BY ee.item_number;

-- 2. Check if these contestants have proper studio associations
SELECT 
  c.id,
  c.name,
  c.studio_name,
  c.type,
  COUNT(ee.id) as entry_count
FROM contestants c
LEFT JOIN event_entries ee ON ee.contestant_id = c.id
WHERE c.studio_name IS NOT NULL 
  AND c.studio_name != 'Legacy Entry'
GROUP BY c.id, c.name, c.studio_name, c.type
ORDER BY entry_count DESC;

-- 3. Update legacy entries with proper studio names (if we can match them)
-- This would need to be done carefully based on the actual data
/*
UPDATE event_entries 
SET studio_name = c.studio_name,
    contestant_name = c.name
FROM contestants c
WHERE event_entries.contestant_id = c.id
  AND event_entries.studio_name = 'Legacy Entry'
  AND c.studio_name IS NOT NULL;
*/
