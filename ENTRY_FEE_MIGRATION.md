# Entry Fee Field Migration

## Problem
The `entryFee` field on the Events table was a legacy single-value field that didn't support the complex fee structure needed for different performance types and packages.

## Solution
We've implemented a comprehensive fee configuration system with the following fields:
- `registrationFeePerDancer` - Per dancer registration fee
- `solo1Fee` - Fee for 1 solo (cumulative package)
- `solo2Fee` - Fee for 2 solos (cumulative package)  
- `solo3Fee` - Fee for 3 solos (cumulative package)
- `soloAdditionalFee` - Fee for each additional solo beyond 3
- `duoTrioFeePerDancer` - Fee per dancer for Duo/Trio
- `groupFeePerDancer` - Fee per dancer for small groups (4-9)
- `largeGroupFeePerDancer` - Fee per dancer for large groups (10+)
- `currency` - Currency code (ZAR, USD, EUR, GBP)

## Migration Status

### ✅ Completed
1. Added new fee configuration columns to events table
2. Updated Event interface to include fee fields
3. Modified database operations (create, get events)
4. Updated API endpoints (POST /api/events, PUT /api/events/[id])
5. Enhanced admin UI with fee configuration section
6. Updated pricing-utils.ts to use event-specific fees
7. Modified event dashboards to display and use event fees
8. Updated database fee calculation functions

### ⚠️ Deprecated
- `entryFee` field is now **deprecated** and set to 0 for all new events
- Admin UI shows this field as disabled with deprecation warning
- Payment initiation no longer uses `event.entry_fee` as fallback

## How It Works Now

1. **Event Creation**: Admin sets all fees in the Fee Configuration section when creating an event
2. **Fee Calculation**: All fee calculations use the event-specific configuration
3. **Payment Processing**: Payments are calculated using the detailed fee structure
4. **Webhooks**: Webhook processing correctly uses `calculatedFee` from entries

## For Frontend Developers

When creating entries, always calculate fees using the event's fee configuration:
```typescript
const event = await getEventById(eventId);
const eventFees = {
  registrationFeePerDancer: event.registrationFeePerDancer,
  solo1Fee: event.solo1Fee,
  solo2Fee: event.solo2Fee,
  solo3Fee: event.solo3Fee,
  soloAdditionalFee: event.soloAdditionalFee,
  duoTrioFeePerDancer: event.duoTrioFeePerDancer,
  groupFeePerDancer: event.groupFeePerDancer,
  largeGroupFeePerDancer: event.largeGroupFeePerDancer,
  currency: event.currency
};

// Use these values to calculate entry fees
```

## Testing Checklist

- [ ] Create a new event with custom fees
- [ ] Verify fee display on event dashboard
- [ ] Create entries for different performance types
- [ ] Verify fee calculations are correct
- [ ] Test payment initiation with calculated fees
- [ ] Test webhook processing after payment
- [ ] Verify registration fee tracking works correctly



