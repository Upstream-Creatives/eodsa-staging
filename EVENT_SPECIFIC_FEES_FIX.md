# Event-Specific Fee Calculation Fix

## 🎯 **PROBLEM IDENTIFIED**

The system was **NOT using event-specific fees** when calculating entry costs. Instead, it was using hardcoded ZAR fees, even when events were configured with different currencies (like USD).

### **Critical Issues:**
1. ❌ Event set with **USD ($10 registration fee)** was being treated as **ZAR R10**
2. ❌ Event-specific **performance fees** (solo, duo, group) were **completely ignored**
3. ❌ **Registration fees were not being charged** for new entries
4. ❌ System only passed `eventRegistrationFee` but not other event fees

## ✅ **SOLUTION IMPLEMENTED**

### **1. Updated `calculateEODSAFee` Function (`lib/types.ts`)**

Added support for ALL event-specific fee parameters:
- `eventRegistrationFee` - Registration fee per dancer
- `eventSolo1Fee` - Single solo fee
- `eventSolo2Fee` - 2 solos package fee
- `eventSolo3Fee` - 3 solos package fee
- `eventSoloAdditionalFee` - Additional solo fee (after 3rd)
- `eventDuoTrioFee` - Duo/Trio fee per dancer
- `eventGroupFee` - Group fee per dancer
- `eventCurrency` - Currency symbol (USD, ZAR, etc.)

### **2. Updated `calculateSmartEODSAFee` Function (`lib/registration-fee-tracker.ts`)**

Now fetches ALL event fees from the database:
```typescript
const event = await db.getEventById(options.eventId);
if (event) {
  eventFees = {
    eventRegistrationFee: event.registrationFeePerDancer,
    eventSolo1Fee: event.solo1Fee,
    eventSolo2Fee: event.solo2Fee,
    eventSolo3Fee: event.solo3Fee,
    eventSoloAdditionalFee: event.soloAdditionalFee,
    eventDuoTrioFee: event.duoTrioFeePerDancer,
    eventGroupFee: event.groupFeePerDancer,
    eventCurrency: event.currency
  };
}
```

### **3. Updated Fee Calculation Logic**

The system now:
1. ✅ Fetches event-specific fees from the database
2. ✅ Uses event fees if provided, otherwise falls back to defaults
3. ✅ Displays the correct currency in breakdowns
4. ✅ Calculates fees based on the event's configuration

## 📊 **HOW IT WORKS NOW**

### **Example: Virtual Event with USD Pricing**

**Event Configuration:**
- Currency: **USD ($)**
- Registration Fee: **$10** per dancer
- 1 Solo: **$31.50**
- 2 Solos: **$54**
- 3 Solos: **$72**
- Additional Solo: **$20**
- Duo/Trio: **$18** per dancer
- Group: **$12** per dancer

### **Fee Calculation:**

**Scenario 1: New Dancer, 1 Solo**
- Registration Fee: **$10** ✅
- Performance Fee: **$31.50** ✅
- **Total: $41.50** ✅

**Scenario 2: Dancer with existing entry, 1 Solo**
- Registration Fee: **$0** (waived - has entry in this event) ✅
- Performance Fee: **$31.50** ✅
- **Total: $31.50** ✅

**Scenario 3: New Dancer, Duo (2 dancers)**
- Registration Fee: **$10 × 2 = $20** ✅
- Performance Fee: **$18 × 2 = $36** ✅
- **Total: $56** ✅

## 🔍 **KEY CHANGES**

### **File: `lib/types.ts`**
- Added 7 new event fee parameters to `calculateEODSAFee`
- Updated performance fee calculation to use event-specific fees
- Added currency to return value

### **File: `lib/registration-fee-tracker.ts`**
- Fetches ALL event fees, not just registration fee
- Logs event fees for debugging
- Passes all event fees to `calculateEODSAFee`

### **File: `lib/database.ts`**
- Already had `getEventById` with all fee fields
- Returns event with proper fee structure

## 🧪 **TESTING**

To test the fix:
1. Navigate to an event with USD pricing
2. Create a new entry for a dancer
3. Check that fees match the event configuration
4. Verify currency is displayed correctly ($ instead of R)
5. Add another entry for the same dancer - registration fee should be waived

## 🎉 **RESULT**

✅ **Event-specific fees are now fully implemented**
✅ **Registration fees charge once per dancer per event**
✅ **Correct currency is displayed**
✅ **All fee types (solo, duo, trio, group) use event configuration**
✅ **International events with USD/EUR pricing work correctly**

## 📝 **NOTES**

- Default fees (ZAR) are still used as fallback if event fees are not configured
- Registration fee logic remains: charged once per dancer per event
- Event fees are fetched from the database on every calculation
- Currency symbol is included in fee breakdowns

