# Dashboard Filtering Fix - Missing Dancers Issue

## Issue Summary
Some dashboards were missing performances due to incorrect filtering by entry type (live vs virtual). This was causing registration staff and other users to not see all the dancers/performances they needed to manage.

## Root Cause
The **Registration Dashboard** was incorrectly filtering to show only LIVE performances, when it should show ALL performances (both live and virtual) since registration staff needs to check in all performers regardless of their entry type.

## Fix Applied

### Registration Dashboard (`app/registration-dashboard/page.tsx`)
**BEFORE (Line 254-276):**
```javascript
const isLive = (perf.entryType || 'live') === 'live';
// ... other filters ...
return isLive && matchesPresence && matchesSearch; // ❌ Only showed LIVE
```

**AFTER:**
```javascript
// FIXED: Registration should see ALL performances (both live and virtual)
// Registration staff needs to check in all performers regardless of entry type
// ... other filters ...
return matchesPresence && matchesSearch; // ✅ Shows ALL (live + virtual)
```

## Dashboard Filtering Summary (After Fix)

| Dashboard | Entry Type Filter | Status | Reason |
|-----------|------------------|--------|---------|
| **Judge Dashboard** | ALL (live + virtual), excludes withdrawn | ✅ Correct | Judges score all performances |
| **Announcer Dashboard** | LIVE only | ✅ Correct | Announcers only announce live performances |
| **Registration Dashboard** | ALL (live + virtual) | ✅ **FIXED** | Registration checks in all performers |
| **Backstage Dashboard** | LIVE only | ✅ Correct | Backstage manages live performance flow |
| **Media Dashboard** | Configurable (all/live/virtual dropdown) | ✅ Correct | Media can filter as needed |

## Technical Details

### How Each Dashboard Gets Performances
All dashboards fetch from the same API endpoint:
```javascript
GET /api/events/${eventId}/performances
```

This endpoint returns ALL performances (both live and virtual). Each dashboard then applies its own filtering based on its specific needs:

1. **Judge Dashboard** - Shows all except `withdrawnFromJudging: true`
   - Judges need to score both live and virtual performances
   
2. **Announcer Dashboard** - Filters `entryType === 'live'`
   - Announcers only announce performers who are physically present
   
3. **Registration Dashboard** - **NOW** shows all (no entry type filter)
   - Registration checks in ALL performers, regardless of entry type
   
4. **Backstage Dashboard** - Filters `entryType === 'live'`
   - Backstage manages the live performance sequence/flow
   
5. **Media Dashboard** - User-selectable filter
   - Media team can choose to see all, only live, or only virtual

## Verification Steps

To verify the fix works:

1. **Create both live and virtual entries** for an event
2. **Check Registration Dashboard** - Should show ALL entries (both live and virtual)
3. **Check Announcer Dashboard** - Should show ONLY live entries
4. **Check Judge Dashboard** - Should show ALL entries (both live and virtual)
5. **Check Backstage Dashboard** - Should show ONLY live entries
6. **Check Media Dashboard** - Should show all, with filter dropdown working

## Related Files Modified
- `app/registration-dashboard/page.tsx` - Fixed to show ALL performances

## Date Fixed
October 10, 2025

