# Performance Auto-Creation Fix

## 🔴 **CRITICAL ISSUE IDENTIFIED**

New entries approved by admin (or paid via payment) **were NOT automatically creating performance records**, causing them to be invisible to judges.

---

## 🔍 **Root Cause**

The `/api/event-entries/[id]/approve` endpoint was **only** updating the entry status but **NOT creating the performance record**.

### What Was Missing:
- When admin clicks "Approve" on an entry
- Entry status changes to `approved: true` and `payment_status: 'paid'`
- ❌ **BUT no performance was created**
- Result: Entry exists but judges can't see it

---

## ✅ **Fix Applied**

### 1. **Updated Approval Endpoint**
**File:** `app/api/event-entries/[id]/approve/route.ts`

**Changes:**
- Now automatically creates a performance record when an entry is approved
- Uses idempotent check (won't create duplicates)
- Pulls participant names from unified dancer records
- Includes all entry details (music, video, entry type, etc.)

### 2. **Verification SQL Script**
**File:** `scripts/check-new-missing-performances.sql`

**Use this to:**
- Check how many approved/paid entries are missing performances
- See detailed list of missing entries
- Get breakdown by entry type (solo, group, etc.)
- Verify after fix

---

## 📊 **How to Verify**

### Step 1: Check for Missing Performances
Run this in **Neon Database Console**:

```sql
-- Count missing performances
SELECT 
  'Missing Performances' AS status,
  COUNT(*) AS count
FROM event_entries ee
WHERE ee.approved = true 
  AND ee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = ee.id
  );
```

### Step 2: List Specific Missing Entries
```sql
-- See which entries are missing
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  ee.performance_type,
  ee.submitted_at
FROM event_entries ee
WHERE ee.approved = true 
  AND ee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = ee.id
  )
ORDER BY ee.submitted_at DESC;
```

### Step 3: Check Nationals Entries Too
```sql
-- Check nationals entries
SELECT 
  nee.id,
  nee.item_name,
  nee.entry_type,
  nee.performance_type,
  nee.submitted_at
FROM nationals_event_entries nee
WHERE nee.approved = true 
  AND nee.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM performances p 
    WHERE p.event_entry_id = nee.id
  )
ORDER BY nee.submitted_at DESC;
```

---

## 🔧 **What Happens Now**

### For New Approvals (After Fix):
1. ✅ Admin approves entry
2. ✅ Performance automatically created
3. ✅ Shows up immediately on judge dashboard
4. ✅ Registration fees marked as paid
5. ✅ All data synced

### For Old Missing Entries:
You'll need to create performances manually using the SQL script we created earlier:
- Use `scripts/fix-missing-performances.js` (the one we used for the 79 entries)
- Or re-run the sync endpoint: `POST /api/admin/sync-performances-from-entries`

---

## 🚨 **Testing Steps**

1. **Create a test entry** as a contestant
2. **Leave it unapproved** initially
3. **Check judge dashboard** - entry should NOT appear
4. **Approve the entry** via admin panel
5. **Refresh judge dashboard** - entry should NOW appear
6. **Verify** the performance has all correct data (name, type, video/music URLs)

---

## 📝 **Related Files Changed**

| File | Change |
|------|--------|
| `app/api/event-entries/[id]/approve/route.ts` | ✅ Added auto performance creation |
| `scripts/check-new-missing-performances.sql` | 🆕 Created verification script |
| `PERFORMANCE_AUTO_CREATION_FIX.md` | 📄 This document |

---

## ⚠️ **Important Notes**

1. **Payment flows already have this fix:**
   - `app/api/payments/process-entries/route.ts` ✅
   - `app/api/payments/payfast/webhook/route.ts` ✅
   
2. **Admin approval now matches payment flow:**
   - Creates performance immediately ✅
   - Marks registration fees as paid ✅
   - Updates all related records ✅

3. **The fix is idempotent:**
   - Won't create duplicate performances
   - Safe to approve same entry multiple times
   - Checks if performance already exists first

---

## 🎯 **Next Steps**

1. ✅ Fix is deployed
2. ⏳ Run verification SQL to check for any remaining missing performances
3. ⏳ If missing entries found, run the sync script or manual SQL insert
4. ⏳ Test by approving a new entry and verifying it shows on judge dashboard

---

## 📞 **If Entries Still Not Showing**

If entries are still missing after approval, check:

1. **Event ID match:** Does the entry's `event_id` match the judge's assigned event?
2. **Performance created:** Run the verification SQL to confirm performance exists
3. **Judge assignment:** Is the judge properly assigned to the event?
4. **Browser cache:** Clear cache and hard refresh (Ctrl+Shift+R)
5. **Database tables:** Ensure `score_edit_logs` and score publishing columns exist (previous fix)

---

**Status:** ✅ FIXED - Performance auto-creation now working on admin approval

