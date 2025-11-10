# How to Fix Age Categories for Existing Data

**Issue:** Existing performances show "All" as age category instead of proper calculated categories.

**Solution:** Run the age category recalculation API endpoint.

---

## 🔧 **Method 1: Using Browser (Easiest)**

1. Open your browser
2. Open Developer Console (F12 or Right-click → Inspect → Console tab)
3. Paste this code and press Enter:

```javascript
fetch('/api/recalculate-age-categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Recalculation complete!');
  console.log(`Processed: ${data.successCount} entries`);
  console.log(`Failed: ${data.errorCount} entries`);
  console.log('Full response:', data);
  alert(`Age categories updated! ${data.successCount} entries processed successfully.`);
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error recalculating age categories. Check console for details.');
});
```

4. Wait for the completion message
5. Refresh your dashboards to see the updated age categories

---

## 🔧 **Method 2: Using cURL (Command Line)**

```bash
curl -X POST http://localhost:3000/api/recalculate-age-categories \
  -H "Content-Type: application/json"
```

Or for production:
```bash
curl -X POST https://your-domain.com/api/recalculate-age-categories \
  -H "Content-Type: application/json"
```

---

## 🔧 **Method 3: Using Postman/Insomnia**

1. Create a new POST request
2. URL: `http://localhost:3000/api/recalculate-age-categories` (or your production URL)
3. Headers: `Content-Type: application/json`
4. Click **Send**

---

## 📊 **What It Does**

The recalculation API will:

1. **Fetch all event entries** from the database
2. **For each entry:**
   - Get all participant IDs
   - Look up each participant's age
   - Calculate average age
   - Map average age to proper age category using `getAgeCategoryFromAge()`
   - Update the `event_entries` table with correct `age_category`
   - Update the `performances` table with correct `age_category`
3. **Return a summary:**
   - Total entries processed
   - Success count
   - Error count

---

## 📋 **Expected Response**

```json
{
  "success": true,
  "message": "Age category recalculation completed",
  "totalEntries": 32,
  "successCount": 30,
  "errorCount": 2,
  "details": {
    "processed": 30,
    "failed": 2,
    "skipped": 0
  }
}
```

---

## ✅ **Verification**

After running the recalculation, check your dashboards:

### Before:
- Age Category: **All** ❌

### After:
- Age Category: **7-9**, **10-12**, **13-14**, etc. ✅ (based on actual dancer ages)

### Check in Console:
Look for log messages like:
```
✅ Entry 1234567890: Updated to 7-9 (avg age: 8)
✅ Entry 1234567891: Updated to 10-12 (avg age: 11)
✅ Entry 1234567892: Updated to 13-14 (avg age: 13)
```

---

## 🔍 **Manual Verification Query**

If you have database access, you can verify with SQL:

```sql
-- Check event entries age categories
SELECT
  id,
  item_name,
  age_category,
  participant_ids
FROM event_entries
WHERE age_category IS NOT NULL
ORDER BY submitted_at DESC
LIMIT 10;

-- Check performances age categories
SELECT
  id,
  title,
  age_category,
  item_number
FROM performances
WHERE age_category IS NOT NULL
ORDER BY item_number
LIMIT 10;
```

---

## ⚠️ **Important Notes**

1. **Safe to run multiple times** - The API is idempotent (safe to run repeatedly)
2. **No data loss** - Only updates `age_category` field, doesn't delete anything
3. **Existing entries only** - New entries will automatically get correct categories
4. **Fallback logic** - If ages can't be found, keeps event's default age category
5. **Performance impact** - May take a few seconds for large datasets (32 items ~1-2 seconds)

---

## 🎯 **When to Run This**

- **After initial implementation** - To fix existing "All" entries
- **After data import** - If you bulk imported entries
- **After age corrections** - If dancer ages were updated in the database
- **Troubleshooting** - If age categories look incorrect

---

## 🚨 **Troubleshooting**

### If you get errors:

1. **Check console logs** - Look for specific error messages
2. **Verify dancer data** - Make sure dancers have valid ages
3. **Check database connection** - Ensure database is accessible
4. **Try again** - API is safe to retry

### Common issues:

- **"No valid ages found"** - Dancers might not have ages in database
- **"Event not found"** - Entry references non-existent event
- **"Participant not found"** - Participant ID doesn't exist

---

## 📝 **API Endpoint Details**

**URL:** `/api/recalculate-age-categories`
**Method:** `POST`
**Auth:** None (add auth if needed in production)
**Body:** None required
**Response:** JSON with success status and counts

**File Location:** `app/api/recalculate-age-categories/route.ts`

---

**That's it!** Your age categories should now show properly across all dashboards. 🎉
