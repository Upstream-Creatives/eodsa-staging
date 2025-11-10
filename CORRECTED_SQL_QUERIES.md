# Corrected SQL Queries for Entry Count Verification

**Note:** The `performances` table uses `event_entry_id` for BOTH regular entries and nationals entries. There is NO separate `nationals_entry_id` column.

---

## ✅ CORRECTED Complete Diagnostic Query

```sql
WITH 
  regular_live AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type = 'live'
  ),
  regular_virtual AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type = 'virtual'
  ),
  regular_null AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type IS NULL
  ),
  nationals AS (
    SELECT COUNT(*) as count FROM nationals_event_entries
  ),
  total_performances AS (
    SELECT COUNT(*) as count FROM performances
  ),
  missing_regular AS (
    SELECT COUNT(*) as count 
    FROM event_entries ee
    LEFT JOIN performances p ON p.event_entry_id = ee.id
    WHERE p.id IS NULL
  ),
  missing_nationals AS (
    SELECT COUNT(*) as count 
    FROM nationals_event_entries ne
    LEFT JOIN performances p ON p.event_entry_id = ne.id
    WHERE p.id IS NULL
  )
SELECT 
  'Live Entries' as metric,
  (SELECT count FROM regular_live) as value
UNION ALL
SELECT 
  'Virtual Entries (regular)',
  (SELECT count FROM regular_virtual)
UNION ALL
SELECT 
  'Virtual Entries (nationals)',
  (SELECT count FROM nationals)
UNION ALL
SELECT 
  'TOTAL Virtual',
  (SELECT count FROM regular_virtual) + (SELECT count FROM nationals)
UNION ALL
SELECT 
  'NULL entry_type (ERROR)',
  (SELECT count FROM regular_null)
UNION ALL
SELECT 
  '---',
  NULL
UNION ALL
SELECT 
  'TOTAL Entries',
  (SELECT count FROM regular_live) + 
  (SELECT count FROM regular_virtual) + 
  (SELECT count FROM regular_null) +
  (SELECT count FROM nationals)
UNION ALL
SELECT 
  'TOTAL Performances',
  (SELECT count FROM total_performances)
UNION ALL
SELECT 
  '---',
  NULL
UNION ALL
SELECT 
  'Missing Performances (regular)',
  (SELECT count FROM missing_regular)
UNION ALL
SELECT 
  'Missing Performances (nationals)',
  (SELECT count FROM missing_nationals)
UNION ALL
SELECT 
  'TOTAL Missing Performances',
  (SELECT count FROM missing_regular) + (SELECT count FROM missing_nationals);
```

---

## Quick Check: Total Counts

```sql
SELECT 
  'event_entries' as table_name,
  COUNT(*) as total_count
FROM event_entries
UNION ALL
SELECT 
  'nationals_event_entries' as table_name,
  COUNT(*) as total_count
FROM nationals_event_entries
UNION ALL
SELECT 
  'performances' as table_name,
  COUNT(*) as total_count
FROM performances;
```

---

## Entry Type Breakdown

```sql
-- Count live and virtual entries
SELECT 
  COALESCE(entry_type, 'NULL/undefined') as entry_type,
  COUNT(*) as count
FROM event_entries
GROUP BY entry_type
ORDER BY entry_type;
```

```sql
-- Add nationals count (all virtual)
SELECT COUNT(*) as nationals_count
FROM nationals_event_entries;
```

---

## Find Entries WITHOUT Performances

```sql
-- Regular entries missing performances
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  ee.approved,
  ee.payment_status,
  e.name as event_name
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
WHERE p.id IS NULL
ORDER BY ee.created_at DESC;
```

```sql
-- Nationals entries missing performances
SELECT 
  ne.id,
  ne.item_name,
  ne.approved,
  ne.payment_status
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.event_entry_id = ne.id
WHERE p.id IS NULL
ORDER BY ne.created_at DESC;
```

---

## Count Missing Performances

```sql
-- How many entries don't have performances?
SELECT 
  'Regular entries missing' as type,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'Nationals entries missing' as type,
  COUNT(*) as count
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.event_entry_id = ne.id
WHERE p.id IS NULL;
```

---

## Check for Orphaned Performances

```sql
-- Performances without matching entry (should be 0)
SELECT 
  p.id,
  p.title,
  p.event_entry_id,
  p.event_id
FROM performances p
LEFT JOIN event_entries ee ON ee.id = p.event_entry_id
LEFT JOIN nationals_event_entries ne ON ne.id = p.event_entry_id
WHERE ee.id IS NULL AND ne.id IS NULL;
```

---

## Your Numbers vs Database

```sql
-- Compare your reported numbers to database
SELECT 
  'Expected (your numbers)' as source,
  109 as live_count,
  79 as virtual_count,
  188 as total_entries,
  92 as performances,
  96 as gap

UNION ALL

SELECT 
  'Actual (database)' as source,
  (SELECT COUNT(*) FROM event_entries WHERE entry_type = 'live') as live_count,
  (
    (SELECT COUNT(*) FROM event_entries WHERE entry_type = 'virtual') +
    (SELECT COUNT(*) FROM nationals_event_entries)
  ) as virtual_count,
  (
    (SELECT COUNT(*) FROM event_entries) +
    (SELECT COUNT(*) FROM nationals_event_entries)
  ) as total_entries,
  (SELECT COUNT(*) FROM performances) as performances,
  (
    (SELECT COUNT(*) FROM event_entries) +
    (SELECT COUNT(*) FROM nationals_event_entries) -
    (SELECT COUNT(*) FROM performances)
  ) as gap;
```

---

## Check Approval Status

```sql
-- How many entries are approved vs not approved?
SELECT 
  'event_entries' as table_name,
  approved,
  COUNT(*) as count
FROM event_entries
GROUP BY approved

UNION ALL

SELECT 
  'nationals_event_entries' as table_name,
  approved,
  COUNT(*) as count
FROM nationals_event_entries
GROUP BY approved

ORDER BY table_name, approved;
```

---

## Check Payment Status

```sql
-- How many entries have been paid?
SELECT 
  'event_entries' as table_name,
  payment_status,
  COUNT(*) as count
FROM event_entries
GROUP BY payment_status

UNION ALL

SELECT 
  'nationals_event_entries' as table_name,
  payment_status,
  COUNT(*) as count
FROM nationals_event_entries
GROUP BY payment_status

ORDER BY table_name, payment_status;
```

---

## Find Unapproved Entries Without Performances

```sql
-- These entries might be waiting for approval/payment
SELECT 
  'Regular - Unapproved' as type,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = false

UNION ALL

SELECT 
  'Regular - Approved but no performance' as type,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = true

UNION ALL

SELECT 
  'Nationals - Unapproved' as type,
  COUNT(*) as count
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.event_entry_id = ne.id
WHERE p.id IS NULL AND ne.approved = false

UNION ALL

SELECT 
  'Nationals - Approved but no performance' as type,
  COUNT(*) as count
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.event_entry_id = ne.id
WHERE p.id IS NULL AND ne.approved = true;
```

---

## 🎯 Most Important Query - Run This First!

This single query tells you everything:

```sql
WITH 
  regular_live AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type = 'live'
  ),
  regular_virtual AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type = 'virtual'
  ),
  regular_null AS (
    SELECT COUNT(*) as count FROM event_entries WHERE entry_type IS NULL
  ),
  nationals AS (
    SELECT COUNT(*) as count FROM nationals_event_entries
  ),
  total_performances AS (
    SELECT COUNT(*) as count FROM performances
  ),
  missing_regular AS (
    SELECT COUNT(*) as count 
    FROM event_entries ee
    LEFT JOIN performances p ON p.event_entry_id = ee.id
    WHERE p.id IS NULL
  ),
  missing_nationals AS (
    SELECT COUNT(*) as count 
    FROM nationals_event_entries ne
    LEFT JOIN performances p ON p.event_entry_id = ne.id
    WHERE p.id IS NULL
  )
SELECT 
  'Live Entries' as metric,
  (SELECT count FROM regular_live) as value
UNION ALL
SELECT 
  'Virtual Entries (regular)',
  (SELECT count FROM regular_virtual)
UNION ALL
SELECT 
  'Virtual Entries (nationals)',
  (SELECT count FROM nationals)
UNION ALL
SELECT 
  'TOTAL Virtual',
  (SELECT count FROM regular_virtual) + (SELECT count FROM nationals)
UNION ALL
SELECT 
  'NULL entry_type (ERROR)',
  (SELECT count FROM regular_null)
UNION ALL
SELECT 
  '---',
  NULL
UNION ALL
SELECT 
  'TOTAL Entries',
  (SELECT count FROM regular_live) + 
  (SELECT count FROM regular_virtual) + 
  (SELECT count FROM regular_null) +
  (SELECT count FROM nationals)
UNION ALL
SELECT 
  'TOTAL Performances',
  (SELECT count FROM total_performances)
UNION ALL
SELECT 
  '---',
  NULL
UNION ALL
SELECT 
  'Missing Performances (regular)',
  (SELECT count FROM missing_regular)
UNION ALL
SELECT 
  'Missing Performances (nationals)',
  (SELECT count FROM missing_nationals)
UNION ALL
SELECT 
  'TOTAL Missing Performances',
  (SELECT count FROM missing_regular) + (SELECT count FROM missing_nationals);
```

---

## 📝 Key Points

1. **Both tables use the same column**: `performances.event_entry_id` links to BOTH `event_entries.id` AND `nationals_event_entries.id`

2. **The gap (188 entries → 92 performances = 96 missing)** means:
   - Either 96 entries don't have performances created yet
   - Or some entries are duplicates
   - Or some entries are unapproved and shouldn't have performances

3. **To fix missing performances**, you'd need to run the sync script:
   ```bash
   node scripts/sync-performances-from-entries.js
   ```

---

Copy and run the **Most Important Query** above in your Neon console - it will show you exactly what's going on! 🚀

