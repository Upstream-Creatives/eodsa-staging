# Entry Count Verification - SQL Queries for Neon Database

Run these queries directly in your Neon Database SQL Editor to verify entry counts and diagnose discrepancies.

---

## 1. Quick Summary (Run This First)

```sql
-- Quick overview of all counts
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

**Expected output:**
- Total entries from both tables
- Total performances
- Should help identify the gap

---

## 2. Count by Entry Type (Live vs Virtual)

```sql
-- Count live and virtual in event_entries
SELECT 
  entry_type,
  COUNT(*) as count
FROM event_entries
GROUP BY entry_type
ORDER BY entry_type;
```

**Then add nationals (all virtual):**

```sql
-- Nationals entries (all virtual)
SELECT 
  'virtual (nationals)' as entry_type,
  COUNT(*) as count
FROM nationals_event_entries;
```

---

## 3. Combined Entry Type Count

```sql
-- Total live and virtual entries across both tables
WITH regular_counts AS (
  SELECT 
    entry_type,
    COUNT(*) as count
  FROM event_entries
  GROUP BY entry_type
),
nationals_count AS (
  SELECT 
    'virtual' as entry_type,
    COUNT(*) as count
  FROM nationals_event_entries
)
SELECT 
  entry_type,
  SUM(count) as total_count
FROM (
  SELECT * FROM regular_counts
  UNION ALL
  SELECT * FROM nationals_count
) combined
GROUP BY entry_type
ORDER BY entry_type;
```

**This should show:**
- Total LIVE entries
- Total VIRTUAL entries (regular + nationals combined)

---

## 4. Entries WITHOUT Performances (The Gap)

```sql
-- Regular entries without performances
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  e.name as event_name,
  ee.approved,
  ee.payment_status
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
WHERE p.id IS NULL
ORDER BY ee.created_at DESC;
```

```sql
-- Nationals entries without performances
SELECT 
  ne.id,
  ne.item_name,
  ne.approved,
  ne.payment_status
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.nationals_entry_id = ne.id
WHERE p.id IS NULL
ORDER BY ne.created_at DESC;
```

**These queries show entries that DON'T have performances created yet.**

---

## 5. Count Entries Missing Performances

```sql
-- How many regular entries are missing performances?
SELECT COUNT(*) as missing_performances
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL;
```

```sql
-- How many nationals entries are missing performances?
SELECT COUNT(*) as missing_performances
FROM nationals_event_entries ne
LEFT JOIN performances p ON p.nationals_entry_id = ne.id
WHERE p.id IS NULL;
```

---

## 6. Orphaned Performances (No Matching Entry)

```sql
-- Performances that don't have a matching entry (orphaned)
SELECT 
  p.id,
  p.title,
  p.event_entry_id,
  p.nationals_entry_id,
  p.event_id
FROM performances p
LEFT JOIN event_entries ee ON ee.id = p.event_entry_id
LEFT JOIN nationals_event_entries ne ON ne.id = p.nationals_entry_id
WHERE ee.id IS NULL AND ne.id IS NULL;
```

**These are performances without parent entries (should be 0).**

---

## 7. Breakdown by Event

```sql
-- Regular entries by event
SELECT 
  e.name as event_name,
  ee.entry_type,
  COUNT(*) as entry_count
FROM event_entries ee
LEFT JOIN events e ON e.id = ee.event_id
GROUP BY e.name, ee.entry_type
ORDER BY e.name, ee.entry_type;
```

```sql
-- Performances by event
SELECT 
  e.name as event_name,
  COUNT(*) as performance_count
FROM performances p
LEFT JOIN events e ON e.id = p.event_id
GROUP BY e.name
ORDER BY e.name;
```

---

## 8. Check for NULL Entry Types

```sql
-- Entries with missing/null entry_type (these are problematic!)
SELECT 
  id,
  item_name,
  entry_type,
  created_at
FROM event_entries
WHERE entry_type IS NULL;
```

---

## 9. Complete Diagnostic Query

```sql
-- Complete overview with all numbers
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
    LEFT JOIN performances p ON p.nationals_entry_id = ne.id
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

**This single query gives you the complete picture!**

---

## 10. Your Specific Numbers Check

Based on your reported numbers (109 live, 79 virtual, 92 performances):

```sql
-- Verify your numbers
SELECT 
  'Expected' as source,
  109 as live_count,
  79 as virtual_count,
  188 as total_entries,
  92 as performances,
  96 as missing_performances
UNION ALL
SELECT 
  'Actual (Database)' as source,
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
  ) as missing_performances;
```

**This shows expected vs actual side by side!**

---

## 🎯 Quick Diagnosis Steps

### Step 1: Run the Complete Diagnostic Query (#9)
This gives you the full picture.

### Step 2: If numbers don't match, check for NULL entry types (#8)
Entries with NULL entry_type won't be counted correctly.

### Step 3: Find which entries are missing performances (#4 and #5)
These queries show which specific entries don't have performances.

### Step 4: Check if they're approved
```sql
SELECT 
  approved,
  COUNT(*) as count
FROM event_entries
GROUP BY approved;
```

Unapproved entries might not have performances created.

---

## 🔧 Common Issues

1. **NULL entry_type**: Entries created before entry_type field was added
   - Fix: Update them to 'live' or 'virtual'

2. **Unapproved entries**: Entry exists but performance not created yet
   - Normal if waiting for payment/approval

3. **Orphaned performances**: Performance exists but entry was deleted
   - Should be cleaned up

4. **Duplicate entries**: Multiple entries for same performance (unlikely)
   - Check for duplicates

---

## 📝 Notes

- **event_entries** = Regular competition entries (can be live or virtual)
- **nationals_event_entries** = Nationals entries (ALL virtual, no entry_type field)
- **performances** = Should have one record per entry (linked via event_entry_id or nationals_entry_id)

**The discrepancy (109 + 79 = 188 entries → 92 performances) means 96 entries don't have performances created yet.**

This could be:
- Unapproved entries waiting for payment
- Entries with NULL entry_type
- Database sync issue
- Entries created but performance creation failed

---

**Run Query #9 first - it will give you all the numbers in one shot!**

