# Age Category Calculation Fix

**Date:** 2025-10-03
**Issue:** Age categories were showing as "ALL" instead of proper calculated categories based on dancer ages

---

## ✅ **PROBLEM IDENTIFIED**

The age category field was set to the event's age category (often "All Ages" or "ALL") instead of calculating it based on the **average age** of the participating dancers.

### Why This Was Wrong:
- For group performances with dancers aged 8, 9, and 10, it should show **"7-9"** or **"10-12"** (based on average)
- Instead, it was showing **"ALL"** because that was the event's age category
- This made it impossible to properly categorize performances for judging and rankings

---

## 🔧 **SOLUTION IMPLEMENTED**

### 1. Age Category Calculation Logic
Added automatic calculation in [app/api/event-entries/route.ts](app/api/event-entries/route.ts):

```typescript
// Calculate age category from average dancer ages
let calculatedAgeCategory = event.ageCategory; // Default to event's age category

try {
  // Get ages of all participants
  const participantAges = await Promise.all(
    body.participantIds.map(async (participantId: string) => {
      // Try unified system first
      const dancer = await unifiedDb.getDancerById(participantId);
      if (dancer) {
        return dancer.age;
      }

      // Try old system
      const result = await sqlClient`
        SELECT age, date_of_birth FROM dancers
        WHERE id = ${participantId} OR eodsa_id = ${participantId}
      ` as any[];

      if (result.length > 0) {
        if (result[0].age) {
          return result[0].age;
        }
        if (result[0].date_of_birth) {
          return calculateAgeOnDate(result[0].date_of_birth, new Date(event.eventDate));
        }
      }
      return null;
    })
  );

  // Filter out null values and calculate average age
  const validAges = participantAges.filter(age => age !== null) as number[];
  if (validAges.length > 0) {
    const averageAge = Math.round(validAges.reduce((sum, age) => sum + age, 0) / validAges.length);
    calculatedAgeCategory = getAgeCategoryFromAge(averageAge);
    console.log(`✅ Calculated age category: ${calculatedAgeCategory} (average age: ${averageAge})`);
  }
} catch (error) {
  console.error('Error calculating age category:', error);
  // Fall back to event age category
}
```

### 2. Age Category Ranges (from lib/types.ts)
The system uses these official EODSA age categories:

```typescript
export const AGE_CATEGORIES = [
  'All Ages',
  '4 & Under',
  '6 & Under',
  '7-9',
  '10-12',
  '13-14',
  '15-17',
  '18-24',
  '25-39',
  '40+',
  '60+'
];

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

### 3. Database Schema Updates
Updated [lib/database.ts](lib/database.ts) to store age category:

**Added columns:**
- `performance_type` - Calculated from participant count (Solo, Duet, Trio, Group)
- `age_category` - Calculated from average participant ages

**Updated INSERT statements:**
```sql
INSERT INTO event_entries (
  ...,
  performance_type,
  age_category
)
VALUES (
  ...,
  ${performanceType},
  ${calculatedAgeCategory}
)
```

### 4. Type Definitions Updated
Updated [lib/types.ts](lib/types.ts) EventEntry interface:

```typescript
export interface EventEntry {
  ...
  performanceType?: string; // Calculated from participant count
  ageCategory?: string;     // Calculated from average participant ages
  ...
}
```

---

## 📊 **HOW IT WORKS**

### Example 1: Solo Performance
- Dancer: Age 8
- **Calculated Age Category:** "7-9"
- **Performance Type:** "Solo"

### Example 2: Duet Performance
- Dancer 1: Age 12
- Dancer 2: Age 13
- Average Age: 12.5 (rounded to 13)
- **Calculated Age Category:** "13-14"
- **Performance Type:** "Duet"

### Example 3: Group Performance
- Dancer 1: Age 8
- Dancer 2: Age 9
- Dancer 3: Age 10
- Dancer 4: Age 11
- Average Age: 9.5 (rounded to 10)
- **Calculated Age Category:** "10-12"
- **Performance Type:** "Group"

---

## 🎯 **WHAT THIS FIXES**

### Before:
- Age Category: "ALL" (not useful)
- Performance Type: Missing
- Can't properly categorize for judging

### After:
- Age Category: "7-9" (based on actual dancer ages)
- Performance Type: "Group" (calculated from participant count)
- Proper categorization for judging and rankings

---

## 📋 **FILES MODIFIED**

1. **[app/api/event-entries/route.ts](app/api/event-entries/route.ts)**
   - Added age category calculation logic
   - Added performance type calculation
   - Imports `getAgeCategoryFromAge` and `calculateAgeOnDate` helpers

2. **[lib/database.ts](lib/database.ts)**
   - Updated `createEventEntry` INSERT statements
   - Added `performance_type` and `age_category` columns
   - Updated `getAllEventEntries` to return new fields

3. **[lib/types.ts](lib/types.ts)**
   - Updated `EventEntry` interface
   - Added `performanceType` and `ageCategory` fields

---

## ✅ **TESTING RECOMMENDATIONS**

### 1. Test New Entries
- Create a new performance entry
- Verify age category is calculated correctly
- Check all dashboards show the calculated category (not "ALL")

### 2. Test Different Age Ranges
- Solo with age 5 → Should show "4 & Under" or "6 & Under"
- Duet with ages 10, 11 → Should show "10-12"
- Group with ages 15, 16, 17 → Should show "15-17"
- Group with mixed ages (8, 12, 16) → Should calculate average and categorize

### 3. Test Edge Cases
- What if dancer age is missing? → Falls back to event age category
- What if all dancers' ages can't be found? → Uses event default
- Mixed age groups → Rounds to nearest age category

### 4. Verify Dashboards
- **Registration Dashboard** → Shows calculated age category
- **Backstage Dashboard** → Shows calculated age category
- **Announcer Dashboard** → Shows calculated age category
- **Media Dashboard** → Shows calculated age category
- **Judges Dashboard** → Shows calculated age category

---

## 🔍 **VERIFICATION QUERIES**

To verify the fix is working, check the database:

```sql
-- Check if age_category is being stored correctly
SELECT id, item_name, performance_type, age_category, participant_ids
FROM event_entries
WHERE age_category IS NOT NULL AND age_category != 'ALL'
ORDER BY submitted_at DESC
LIMIT 10;

-- Verify performances have age categories
SELECT id, title, age_category, performance_order
FROM performances
WHERE age_category IS NOT NULL
ORDER BY performance_order
LIMIT 10;
```

---

## 📝 **IMPORTANT NOTES**

1. **Existing Entries:** Old entries with "ALL" will remain until they're re-calculated or manually updated
2. **Event Age Category:** Events can still have "All Ages" as their category (for entry eligibility)
3. **Performance Age Category:** Each performance now has its OWN calculated age category based on dancers
4. **Average Calculation:** Uses mathematical rounding (e.g., 12.5 → 13)
5. **Fallback Logic:** If calculation fails, uses event's age category as fallback

---

## 🎉 **RESULT**

Age categories now properly reflect the **actual ages of the dancers** in each performance, making judging and rankings accurate and meaningful!

**Before:** Everything = "ALL" ❌
**After:** "7-9", "10-12", "13-14", etc. based on real dancer ages ✅

---

**End of Fix Documentation**
