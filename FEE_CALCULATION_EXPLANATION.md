# Fee Calculation Logic Explanation - Production

## Issue Reported
For the event "Odyssey of dance - Virtual International championship", the system is charging:
- **R725 for solo** entry fee
- **R300 registration fee** ❌ (Should be **R175**)

## How Fee Calculation Currently Works in Production

### Flow Overview

1. **Frontend Request** → `/api/eodsa-fees` (POST)
   - Located in: `app/api/eodsa-fees/route.ts`
   - Receives: `eventId`, `participantIds`, `masteryLevel`, `performanceType`, etc.

2. **Smart Fee Calculation** → `calculateSmartEODSAFee()`
   - Located in: `lib/registration-fee-tracker.ts`
   - Fetches event-specific fees from database using `eventId`
   - Checks if dancers already have entries in this event (to waive registration fee)
   - Passes event fees to `calculateEODSAFee()`

3. **Core Fee Calculation** → `calculateEODSAFee()`
   - Located in: `lib/types.ts` (lines 440-564)
   - Calculates registration fee + performance fee
   - Uses event-specific fees if provided, otherwise falls back to defaults

### Registration Fee Calculation Logic

The registration fee is calculated in `calculateEODSAFee()` function (`lib/types.ts`):

```typescript
// Line 496: Registration fee per dancer
const regFeePerDancer = eventRegistrationFee || EODSA_FEES.REGISTRATION[masteryLevel];
```

**Priority:**
1. ✅ First: Uses `eventRegistrationFee` (from event's `registrationFeePerDancer` column in database)
2. ❌ Fallback: Uses default R300 from `EODSA_FEES.REGISTRATION[masteryLevel]`

**Key Code Locations:**

1. **Event Fee Fetching** (`lib/registration-fee-tracker.ts`, lines 74-100):
```typescript
if (options?.eventId) {
  const event = await db.getEventById(options.eventId);
  if (event) {
    eventFees = {
      eventRegistrationFee: event.registrationFeePerDancer,  // ← This should be 175
      // ... other fees
    };
  }
}
```

2. **Registration Fee Calculation** (`lib/types.ts`, lines 494-497):
```typescript
if (unpaidDancers.length > 0) {
  const regFeePerDancer = eventRegistrationFee || EODSA_FEES.REGISTRATION[masteryLevel];
  registrationFee = regFeePerDancer * unpaidDancers.length;
}
```

3. **Default Fallback** (`lib/types.ts`, lines 411-417):
```typescript
export const EODSA_FEES = {
  REGISTRATION: {
    'Water (Competitive)': 300,    // R300 PP default
    'Fire (Advanced)': 300,        // R300 PP default
    'Nationals': 300               // R300 PP default
  }
};
```

### Solo Entry Fee Calculation Logic

For solo entries, the fee calculation works as follows:

**In Competition Page** (`app/event-dashboard/[region]/competition/page.tsx`, lines 706-725):
```typescript
const solo1Fee = event?.solo1Fee || 400;
const solo2Fee = event?.solo2Fee || 200;
const solo3Fee = event?.solo3Fee || 100;
const soloAdditionalFee = event?.soloAdditionalFee || 100;

if (soloCount === 1) {
  fee = solo1Fee;  // ← For first solo
}
```

**Note:** The solo fees (`solo1Fee`, `solo2Fee`, etc.) are treated as **INDIVIDUAL fees**, NOT cumulative packages.

### Why It Might Be Charging R300 Instead of R175

**Possible Causes:**

1. **Database Issue**: The event's `registrationFeePerDancer` column is not set to 175
   - Check: `SELECT registration_fee_per_dancer FROM events WHERE name LIKE '%Odyssey%'`

2. **EventId Not Passed**: The `eventId` might not be passed correctly to the API
   - The API expects `eventId` in the request body (`app/api/eodsa-fees/route.ts`, line 77)
   - Competition page does pass it (line 1075)

3. **Event Not Found**: The database query might fail silently
   - Error handling in `calculateSmartEODSAFee()` catches errors but continues with defaults

4. **Null/Undefined Value**: If `event.registrationFeePerDancer` is `null` or `undefined`, it falls back to default

### How to Verify the Issue

1. **Check Event Configuration in Database:**
```sql
SELECT 
  id, 
  name, 
  registration_fee_per_dancer,
  solo_1_fee,
  currency
FROM events 
WHERE name LIKE '%Odyssey%' OR name LIKE '%Virtual International%';
```

2. **Check API Logs:**
   - Look for console logs from `calculateSmartEODSAFee()` (lines 90-95)
   - Should show: `💰 Using event-specific fees for event {eventId}`
   - Should show: `Registration: ZAR175` (if correctly configured)

3. **Check Frontend API Calls:**
   - Verify `eventId` is being passed in the POST request to `/api/eodsa-fees`
   - Check browser Network tab for the request payload

### Files Involved in Fee Calculation

1. **API Endpoint**: `app/api/eodsa-fees/route.ts`
   - Receives request with `eventId`
   - Calls `calculateSmartEODSAFee()` with `eventId`

2. **Smart Calculation**: `lib/registration-fee-tracker.ts`
   - Fetches event from database using `eventId`
   - Extracts `registrationFeePerDancer` from event
   - Checks if dancers already have entries (waives registration fee)

3. **Core Calculation**: `lib/types.ts`
   - `calculateEODSAFee()` function (lines 440-564)
   - Uses `eventRegistrationFee` if provided, else defaults to R300

4. **Competition Page**: `app/event-dashboard/[region]/competition/page.tsx`
   - Calls `/api/eodsa-fees` with `eventId` (line 1075)
   - Also calculates entry fees locally (lines 706-733)

### Current Solo Fee Structure (Defaults)

- **1st Solo**: R400 (or `event.solo1Fee`)
- **2nd Solo**: R200 (or `event.solo2Fee`)
- **3rd Solo**: R100 (or `event.solo3Fee`)
- **4th+ Solo**: R100 each (or `event.soloAdditionalFee`)

**Note:** These are INDIVIDUAL fees, not cumulative packages.

If solo fee is R725, this could be:
- A custom event-specific `solo1Fee` set to 725
- OR a calculation issue

### Recommended Fix Steps

1. **Verify Database Configuration:**
   ```sql
   UPDATE events 
   SET registration_fee_per_dancer = 175 
   WHERE name LIKE '%Odyssey%' AND name LIKE '%Virtual International%';
   ```

2. **Add Better Error Logging:**
   - In `calculateSmartEODSAFee()`, log when event is not found
   - Log the actual `registrationFeePerDancer` value fetched

3. **Verify EventId is Being Passed:**
   - Add console.log in `/api/eodsa-fees` to log the received `eventId`
   - Verify it matches the Odyssey event ID

4. **Check for Null Values:**
   - Ensure `registrationFeePerDancer` is not `NULL` in database
   - Add explicit check: `event.registrationFeePerDancer ?? 175` (with event-specific default)

