# Fee Calculation Fix Summary

## Issues Fixed

### 1. Registration Fee Charging R300 Instead of Event-Specific Fee (R175)

**Problem:** The system was charging the default R300 registration fee instead of the event-specific R175 fee configured in the database.

**Root Cause:** 
- The registration fee check was using `||` operator which treats `0` as falsy
- The SQL query was only checking `contestant_id`, missing entries where the dancer is a participant

**Fix Applied:**
1. **Updated `lib/types.ts`** (lines 497-499, 515-517):
   - Changed from `eventRegistrationFee || default` to explicit null/undefined check
   - Now properly uses event-specific registration fee even if it's 0

2. **Updated `lib/registration-fee-tracker.ts`** (lines 48-58):
   - Fixed SQL query to check entries by:
     - `eodsa_id`
     - `contestant_id`
     - `participant_ids` JSON array (using JSONB containment operator `?`)
   - Now properly finds entries where dancer is a participant, not just the main contestant

### 2. Registration Fee Charged Multiple Times Per Event

**Problem:** Registration fee was being charged even when dancer already had entries (paid or unpaid) in the event.

**Fix Applied:**
- The registration fee check now looks for ANY entries (paid or unpaid) for the dancer in the specific event
- If any entry exists, registration fee is waived
- Uses proper JSONB query to check `participant_ids` array

### 3. Solo Fee Calculation - Cumulative Package Pricing

**Problem:** Solo fees were calculated as individual fees, not cumulative package pricing with deduction of already-paid amounts.

**Required Behavior:**
- 1 Solo Package: R550 (total)
- 2 Solos Package: R942 (total)
- 3 Solos Package: R1,256 (total)
- Additional solos: R349 each

**Scenarios:**
1. **Dancer adds 1st Solo:** Pays R550 (1 Solo Package)
2. **Dancer adds 2nd Solo:** Pays R942 (2 Solos Package) - R550 (already paid) = **R392**
3. **Dancer adds 3rd Solo:** Pays R1,256 (3 Solos Package) - R942 (already paid) = **R314**

**Fix Applied:**

1. **Updated `lib/registration-fee-tracker.ts`** (lines 108-202):
   - Added cumulative solo package pricing logic
   - Gets all PAID solo entries for the dancer in the event
   - Calculates what package total they should have paid for existing paid solos
   - Calculates what package total they should pay for the new total (paid + this new one)
   - Charges the difference (new package total - what they should have already paid)

2. **Updated `app/event-dashboard/[region]/competition/page.tsx`** (lines 706-800):
   - Updated `calculateEntryFee()` to use cumulative package pricing
   - First tries to get fee from API (which uses cumulative logic)
   - Falls back to local calculation using same cumulative package logic
   - Counts existing paid solos and calculates incremental charge

## How It Works Now

### Registration Fee Logic

1. **Check for Existing Entries:**
   ```sql
   SELECT COUNT(*) FROM event_entries
   WHERE event_id = ?
   AND (
     eodsa_id = ? OR
     contestant_id = ? OR
     (participant_ids::jsonb ? ?)
   )
   ```

2. **If Entry Exists:** Registration fee = R0 (waived)
3. **If No Entry:** Registration fee = Event's `registrationFeePerDancer` (e.g., R175)

### Solo Fee Logic (Cumulative Package Pricing)

1. **Get Historical Paid Solos:**
   - Query all PAID solo entries for dancer in this event
   - Count: `paidSoloCount`

2. **Calculate Package Totals:**
   - `packageTotalForPaidSolos` = Package price for `paidSoloCount` solos
   - `packageTotalForNewCount` = Package price for `paidSoloCount + 1` solos

3. **Calculate Charge:**
   - `shouldChargeForSolo = packageTotalForNewCount - packageTotalForPaidSolos`

**Example:**
- Dancer has 1 paid solo
- `packageTotalForPaidSolos` = R550 (1 Solo Package)
- `packageTotalForNewCount` = R942 (2 Solos Package)
- `shouldChargeForSolo` = R942 - R550 = **R392**

## Files Modified

1. **lib/registration-fee-tracker.ts**
   - Fixed registration fee check SQL query
   - Added cumulative solo package pricing logic

2. **lib/types.ts**
   - Fixed registration fee fallback to properly use event-specific fees

3. **app/event-dashboard/[region]/competition/page.tsx**
   - Updated solo fee calculation to use cumulative package pricing
   - Added API call for cumulative pricing
   - Added fallback calculation with cumulative logic

## Testing Checklist

- [ ] Registration fee shows R175 (not R300) for Odyssey event
- [ ] Registration fee is waived if dancer has any entry (paid or unpaid) in the event
- [ ] 1st solo charges R550
- [ ] 2nd solo charges R392 (R942 - R550)
- [ ] 3rd solo charges R314 (R1,256 - R942)
- [ ] 4th+ solos charge R349 each (incremental from 3-solo package)

## Database Requirements

Ensure the event has these fields set correctly:
- `registration_fee_per_dancer` = 175
- `solo_1_fee` = 550 (1 Solo Package total)
- `solo_2_fee` = 942 (2 Solos Package total)
- `solo_3_fee` = 1256 (3 Solos Package total)
- `solo_additional_fee` = 349 (Additional solo fee)

## Notes

- The solo package fees (`solo1Fee`, `solo2Fee`, `solo3Fee`) are now treated as **CUMULATIVE totals**, not individual fees
- The system calculates incremental charges based on what the dancer should have already paid
- Registration fee is charged only once per event per dancer (waived if any entry exists)

