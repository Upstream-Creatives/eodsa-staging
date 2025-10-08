# Diagnosis: 100 Missing Performances

## Summary
- **197 total entries** in database
- **97 performances** created
- **100 entries missing performances**

---

## Next Steps: Find Out WHY

Run these queries to diagnose:

### 1. Are the missing entries APPROVED?

```sql
-- Check approval status of entries without performances
SELECT 
  approved,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY approved;
```

**Expected:** If they're not approved, that's normal - performances are only created for approved entries.

---

### 2. Check payment status of missing entries

```sql
-- Check payment status of entries without performances
SELECT 
  payment_status,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY payment_status;
```

**Expected:** If payment is pending, performances might not be created yet.

---

### 3. View the actual missing entries (first 20)

```sql
-- Show details of entries without performances
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
WHERE p.id IS NULL
ORDER BY ee.created_at DESC
LIMIT 20;
```

**This shows you which specific entries are missing performances.**

---

### 4. Breakdown by entry type

```sql
-- Missing performances by entry type
SELECT 
  COALESCE(entry_type, 'NULL') as entry_type,
  COUNT(*) as missing_count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY entry_type;
```

---

### 5. Check if they're recent entries

```sql
-- When were these entries created?
SELECT 
  DATE(created_at) as created_date,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY DATE(created_at)
ORDER BY created_date DESC;
```

---

## Most Likely Causes

### Cause 1: Unapproved Entries (NORMAL) ✅
- Entries waiting for payment or admin approval
- Performances only created after approval
- **Action:** None needed - this is expected behavior

### Cause 2: Approved but Performance Creation Failed ⚠️
- Entry was approved but performance wasn't created
- Could be a bug in the approval process
- **Action:** Run sync script to create missing performances

### Cause 3: Entry Type is NULL 🔴
- Old entries before entry_type field was added
- System doesn't know if they're live or virtual
- **Action:** Update entry_type for these entries

---

## Solution: Sync Missing Performances

If you find that approved entries don't have performances, run:

```bash
node scripts/sync-performances-from-entries.js
```

Or create a quick fix script that only creates performances for approved entries without them.

---

## Quick Fix SQL (CREATE MANUALLY)

**⚠️ CAUTION: Only run this if you're sure these entries should have performances!**

This would need to be done via a Node.js script because we need to:
1. Read each entry without a performance
2. Check if it's approved
3. Create a performance record with all the correct fields

**Don't run raw INSERT statements** - use the proper sync script instead.

---

## Next Query to Run

Start with this one to see if it's just unapproved entries:

```sql
SELECT 
  approved,
  payment_status,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY approved, payment_status
ORDER BY approved, payment_status;
```

This will tell you if the 100 missing entries are:
- ✅ Unapproved (expected, no action needed)
- ⚠️ Approved but no performance (needs fixing)

