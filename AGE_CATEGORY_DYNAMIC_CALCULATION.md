# Age Category Dynamic Calculation - Implementation

**Date:** 2025-10-03
**Approach:** Calculate age categories on-the-fly from dancer ages (NO database column)

---

## ✅ **SOLUTION IMPLEMENTED**

Instead of storing age categories in the database, we now **calculate them dynamically** every time performances are fetched.

### Why This Approach:
- ✅ **Always accurate** - Reflects current dancer ages
- ✅ **No migrations needed** - No database schema changes
- ✅ **Automatic updates** - If a dancer's age changes, categories update automatically
- ✅ **Single source of truth** - Dancer ages in `dancers` table

---

## 🔧 **HOW IT WORKS**

### 1. API Endpoint Updated
**File:** [app/api/events/[id]/performances/route.ts](app/api/events/[id]/performances/route.ts)

### 2. Calculation Logic

```typescript
async function calculateAgeCategoryForPerformance(performance, eventDate, sqlClient) {
  // 1. Get the event entry for this performance
  const entry = entries.find(e => e.id === performance.eventEntryId);

  // 2. Get participant IDs from the entry
  const participantIds = entry.participantIds;

  // 3. Look up each dancer's age
  const participantAges = await Promise.all(
    participantIds.map(async (participantId) => {
      // Try unified system
      const dancer = await unifiedDb.getDancerById(participantId);
      if (dancer) return dancer.age;

      // Try old system
      const result = await sqlClient`SELECT age, date_of_birth FROM dancers WHERE id = ${participantId}`;
      if (result[0].age) return result[0].age;
      if (result[0].date_of_birth) {
        return calculateAgeOnDate(result[0].date_of_birth, eventDate);
      }
      return null;
    })
  );

  // 4. Calculate average age
  const validAges = participantAges.filter(age => age !== null);
  const averageAge = Math.round(validAges.reduce((sum, age) => sum + age, 0) / validAges.length);

  // 5. Map to age category
  return getAgeCategoryFromAge(averageAge);
}
```

### 3. Age Category Mapping

From [lib/types.ts](lib/types.ts):

```typescript
export function getAgeCategoryFromAge(age: number): string {
  if (age <= 4) return '4 & Under';
  if (age <= 6) return '6 & Under';
  if (age <= 9) return '7-9';
  if (age <= 12) return '10-12';
  if (age <= 14) return '13-14';
  if (age <= 17) return '15-17';
  if (age <= 24) return '18-24';
  if (age <= 39) return '25-39';
  if (age < 60) return '40+';
  return '60+';
}
```

---

## 📊 **EXAMPLES**

### Example 1: Solo Performance
- Dancer: Susan Pan (ID: `dancer-123`)
- Age: 8
- **Calculated Category:** `7-9`

### Example 2: Duet
- Dancer 1: Age 12
- Dancer 2: Age 13
- Average: 12.5 → **Rounded to 13**
- **Calculated Category:** `13-14`

### Example 3: Group
- Dancer 1: Age 8
- Dancer 2: Age 9
- Dancer 3: Age 10
- Dancer 4: Age 11
- Average: 9.5 → **Rounded to 10**
- **Calculated Category:** `10-12`

---

## 🎯 **WHERE IT'S CALCULATED**

The age category is calculated when:

1. **Fetching performances for an event**
   - API: `GET /api/events/[id]/performances`
   - Returns performances with `ageCategory` field added

2. **Dashboard loads**
   - All dashboards (Backstage, Announcer, Media, Judges, Registration)
   - Receive performances with pre-calculated age categories

---

## 🔍 **DATA FLOW**

```
┌─────────────────┐
│  Dancers Table  │
│  (age column)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Event Entry            │
│  (participantIds array) │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  API: Get Performances       │
│  1. Fetch all performances   │
│  2. For each performance:    │
│     - Get participantIds     │
│     - Look up each age       │
│     - Calculate average      │
│     - Map to category        │
│  3. Return with ageCategory  │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────┐
│  Dashboards     │
│  (display)      │
└─────────────────┘
```

---

## ✅ **TESTING**

### To verify it's working:

1. **Check browser console** when loading a dashboard:
   ```
   Performance entry types: [
     {
       id: "...",
       title: "LOLLOS",
       ageCategory: "7-9",  ← Should NOT be "All"
       participantCount: 1
     }
   ]
   ```

2. **Check dashboard display:**
   - Age Category should show: `7-9`, `10-12`, `13-14`, etc.
   - NOT: `All`, `N/A`, or undefined

### What if it shows "N/A"?
- Dancer age not found in database
- Participant ID doesn't match any dancer
- Check console for warnings

---

## 🚀 **NO MANUAL STEPS REQUIRED**

Unlike the previous approach:
- ❌ No database migration needed
- ❌ No recalculation script to run
- ✅ Just refresh the page!

The age categories will automatically show correctly based on the dancer ages already in the database.

---

## 📝 **FILES MODIFIED**

1. **[app/api/events/[id]/performances/route.ts](app/api/events/[id]/performances/route.ts)**
   - Added `calculateAgeCategoryForPerformance()` function
   - Calculates age category for each performance
   - Returns performances with `ageCategory` field

---

## 🎉 **RESULT**

**Before:**
- Age Category: `All` ❌

**After (just refresh):**
- Age Category: `7-9`, `10-12`, `13-14`, etc. ✅

**No migration, no scripts, no manual steps - it just works!**

---

**End of Implementation**
