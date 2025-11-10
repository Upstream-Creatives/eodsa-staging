# Deep Diagnosis: How Were Performances Created?

## Let's Compare: Entries WITH performances vs entries WITHOUT

---

## 1. Check Creation Timestamps

```sql
-- Compare when entries were created (WITH vs WITHOUT performances)
SELECT 
  'WITH performance' as status,
  DATE(ee.created_at) as date,
  COUNT(*) as count
FROM event_entries ee
INNER JOIN performances p ON p.event_entry_id = ee.id
GROUP BY DATE(ee.created_at)

UNION ALL

SELECT 
  'WITHOUT performance' as status,
  DATE(ee.created_at) as date,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = true
GROUP BY DATE(ee.created_at)

ORDER BY date DESC, status;
```

**This shows if the missing ones are all recent or all old.**

---

## 2. Check if Approval Date Matters

```sql
-- Do entries have an approved_at timestamp we can check?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_entries' 
  AND column_name LIKE '%approv%';
```

---

## 3. Compare Entry Attributes

```sql
-- What's different about entries WITH performances vs WITHOUT?
SELECT 
  'WITH performance' as status,
  entry_type,
  payment_status,
  COUNT(*) as count
FROM event_entries ee
INNER JOIN performances p ON p.event_entry_id = ee.id
GROUP BY entry_type, payment_status

UNION ALL

SELECT 
  'WITHOUT performance (approved)' as status,
  entry_type,
  payment_status,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = true
GROUP BY entry_type, payment_status

ORDER BY status, entry_type, payment_status;
```

---

## 4. Check Which Events They Belong To

```sql
-- Are the missing performances from specific events?
SELECT 
  e.name as event_name,
  e.id as event_id,
  COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) as has_performance,
  COUNT(CASE WHEN p.id IS NULL AND ee.approved = true THEN 1 END) as missing_performance
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
GROUP BY e.name, e.id
HAVING COUNT(CASE WHEN p.id IS NULL AND ee.approved = true THEN 1 END) > 0
ORDER BY missing_performance DESC;
```

**This shows if certain events have the problem while others don't.**

---

## 5. Check Performance Creation Timestamps

```sql
-- When were performances created vs when entries were created?
SELECT 
  ee.id as entry_id,
  ee.item_name,
  ee.created_at as entry_created,
  p.id as performance_id,
  -- Performances might not have created_at, check what columns exist
  e.name as event_name
FROM event_entries ee
INNER JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
ORDER BY ee.created_at DESC
LIMIT 20;
```

---

## 6. Check for Pattern in Entry IDs

```sql
-- Are the missing performances all from a certain ID range?
SELECT 
  'WITH performance' as status,
  MIN(ee.id) as min_id,
  MAX(ee.id) as max_id,
  COUNT(*) as count
FROM event_entries ee
INNER JOIN performances p ON p.event_entry_id = ee.id

UNION ALL

SELECT 
  'WITHOUT performance (approved)' as status,
  MIN(ee.id) as min_id,
  MAX(ee.id) as max_id,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = true;
```

---

## 7. Sample of Entries WITH Performances (to understand the pattern)

```sql
-- Show 10 entries that DO have performances
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  ee.approved,
  ee.payment_status,
  ee.created_at,
  p.id as performance_id,
  e.name as event_name
FROM event_entries ee
INNER JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
ORDER BY ee.created_at DESC
LIMIT 10;
```

---

## 8. Sample of Entries WITHOUT Performances (approved)

```sql
-- Show 10 approved entries WITHOUT performances
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  ee.approved,
  ee.payment_status,
  ee.created_at,
  e.name as event_name
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
LEFT JOIN events e ON e.id = ee.event_id
WHERE p.id IS NULL AND ee.approved = true
ORDER BY ee.created_at DESC
LIMIT 10;
```

---

## 9. Check API/Script Logs

Look for:
- Entry approval API: `/api/admin/entries/[id]/approve` or similar
- Performance creation API: `/api/performances` or similar
- Sync scripts that create performances

```sql
-- Check if there's a pattern in who created the entries
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'event_entries' 
  AND (column_name LIKE '%created%' OR column_name LIKE '%by%');
```

---

## 10. Most Likely Scenarios

### Scenario A: Old Entries Before Performance Auto-Creation
- ✅ Newer entries automatically get performances
- ❌ Older entries (before feature was added) don't
- **Check:** Are missing ones all old?

### Scenario B: Payment Timing Issue
- ✅ Entries approved AFTER payment → performance created
- ❌ Entries approved BEFORE payment (or payment added later) → no performance
- **Check:** Were these approved before being marked as paid?

### Scenario C: Specific Event or Entry Type
- ✅ Some events/types work fine
- ❌ Others don't trigger performance creation
- **Check:** Are they all from one event?

### Scenario D: Manual Approval vs Auto-Approval
- ✅ Some approval method creates performances
- ❌ Other approval method doesn't
- **Check:** How were the working ones approved?

### Scenario E: Database Transaction Failure
- Entry saved ✅
- Performance creation failed ❌
- No rollback (not in transaction)

---

## 🎯 Run These Queries in Order

1. **Query #4** - Shows which events have the problem
2. **Query #1** - Shows if it's time-based
3. **Query #3** - Shows if it's entry-type based
4. **Query #7 & #8** - Compare working vs broken entries side-by-side

This will reveal the pattern!

---

## Expected Findings

After running these, you'll likely find:
- 📅 All missing entries are from a specific date range
- 🎪 All missing entries are from a specific event
- 💰 All missing entries were approved in a certain way
- 🔧 Performance creation logic changed at some point

Then we'll know exactly how to fix it! 🔍

