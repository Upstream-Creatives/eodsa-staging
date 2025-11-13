# Payment / Pricing Rules Implementation

## Overview

This document describes the implementation of the payment/pricing rules system that ensures accurate fee calculation based on database truth, proper registration fee tracking, and payment validation.

## Key Features

### 1. Registration Fee Tracking
- **Registration Charged Flag**: Tracks if registration was CHARGED (not necessarily paid) per dancer/event
- **Database Table**: `registration_charged_flags` stores per-event registration charge status
- **Logic**: Once registration is CHARGED, it will NOT be charged again for subsequent entries in the same event

### 2. Incremental Fee Calculation
- **Server-Side Function**: `computeIncrementalFee()` calculates fees from database truth
- **Database-Driven**: Counts existing entries from database, never relies on session/cart totals
- **Incremental Pricing**: 
  - Solo entries: First (P1), Second (P2-P1), Third (P3-P2), Additional (Px)
  - Duet/Trio: Per-dancer price × participant count
  - Group: Per-dancer price × participant count (with large group discount)

### 3. Payment Validation & Safety Checks
- **Fee Validation**: Validates client-sent fees against server-computed fees
- **Mismatch Detection**: Refuses payment if `computed_total !== client_sent_total`
- **Transaction Records**: All payments create transaction records with:
  - `expected_amount`: Server-computed fee
  - `amount_paid`: Actual amount paid
  - `registration_paid_flag`: Whether registration was paid
  - `registration_charged_flag`: Whether registration was charged
  - `entry_id`: Link to entry
  - `status`: Payment status
  - `mismatch_detected`: Flag for mismatches
  - `mismatch_reason`: Explanation of mismatch

### 4. Payment Methods Support

#### PayFast
- Validates fees before payment initiation
- Creates transaction records
- Marks registration as charged when payment initiated
- Updates transaction records when payment completes

#### EFT
- Validates fees before entry submission
- Creates transaction records
- Marks registration as charged when entries submitted
- `registration_paid` flag set only on manual admin verification
- UI shows registration: paid/unpaid status

## Database Schema

### New Tables

#### `registration_charged_flags`
```sql
CREATE TABLE registration_charged_flags (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  dancer_id TEXT,
  eodsa_id TEXT NOT NULL,
  charged_at TEXT NOT NULL,
  UNIQUE(event_id, eodsa_id)
);
```

#### `transaction_records`
```sql
CREATE TABLE transaction_records (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES event_entries(id),
  event_id TEXT NOT NULL,
  dancer_id TEXT,
  eodsa_id TEXT NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  registration_paid_flag BOOLEAN DEFAULT FALSE,
  registration_charged_flag BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  client_sent_total DECIMAL(10,2),
  computed_total DECIMAL(10,2),
  mismatch_detected BOOLEAN DEFAULT FALSE,
  mismatch_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Updated Tables

#### `eft_payment_logs`
- Added `registration_paid` column (BOOLEAN DEFAULT FALSE)

## API Endpoints

### POST `/api/payments/validate-fee`
Validates that client-sent fee matches server-computed incremental fee.

**Request:**
```json
{
  "eventId": "event-123",
  "dancerId": "dancer-123",
  "eodsaId": "E123456",
  "performanceType": "Solo",
  "participantIds": ["E123456"],
  "masteryLevel": "Water",
  "clientSentTotal": 700
}
```

**Response:**
```json
{
  "success": true,
  "computedFee": 700,
  "registrationFee": 300,
  "entryFee": 400,
  "registrationCharged": true,
  "registrationWasAlreadyCharged": false,
  "entryCount": 0,
  "breakdown": "Registration fee: R300 + Solo entry #1: R400 (first solo)",
  "mismatchDetected": false,
  "isValid": true
}
```

### POST `/api/payments/initiate` (Updated)
- Validates fees for batch payments
- Creates transaction records
- Marks registration as charged
- Refuses payment if mismatch detected

### POST `/api/payments/eft` (Updated)
- Validates fees before entry submission
- Creates transaction records
- Marks registration as charged
- Refuses payment if mismatch detected

## Core Functions

### `computeIncrementalFee(options)`
Server-side function that computes fees from database truth.

**Parameters:**
- `eventId`: Event ID
- `dancerId`: Dancer/contestant ID
- `eodsaId`: EODSA ID
- `performanceType`: 'Solo' | 'Duet' | 'Trio' | 'Group'
- `participantIds`: Array of participant IDs
- `masteryLevel`: Mastery level

**Returns:**
```typescript
{
  registrationFee: number;
  entryFee: number;
  totalFee: number;
  registrationCharged: boolean;
  registrationWasAlreadyCharged: boolean;
  entryCount: number;
  breakdown: string;
  warnings: string[];
}
```

### `markRegistrationCharged(eventId, dancerId, eodsaId)`
Marks registration as charged for a dancer/event. Called when payment is initiated (not necessarily completed).

### `createTransactionRecord(options)`
Creates a transaction record with all payment details and mismatch detection.

## Safety Checks

### Payment Route Safety Check
```typescript
if (computed_total !== client_sent_total) {
  // Refuse payment
  return NextResponse.json({
    success: false,
    error: 'Payment amount mismatch detected',
    details: {
      clientSentTotal,
      computedTotal,
      mismatchReason
    }
  }, { status: 400 });
}
```

### Negative Fee Protection
```typescript
if (totalFee < 0) {
  warnings.push(`Computed fee was negative (${totalFee}), correcting to 0. Manual review required.`);
  totalFee = 0;
}
```

## Unit Tests

Unit tests are provided in `lib/__tests__/incremental-fee-calculator.test.ts` covering:
- First/second/third/extra solos
- Duet/trio/group entries
- Registration fee charging logic
- Combinations with registration paid/unpaid
- Negative fee protection

## Usage Flow

### First Entry (PayFast)
1. Frontend calculates fee and sends to `/api/payments/initiate`
2. Backend validates fee using `computeIncrementalFee()`
3. If mismatch detected, payment is refused
4. Transaction record created with `registration_charged_flag = true`
5. Registration marked as charged in `registration_charged_flags` table
6. Payment initiated with PayFast
7. On payment completion, transaction record updated with `amount_paid` and `registration_paid_flag = true`

### Subsequent Entry (PayFast)
1. Frontend calculates fee and sends to `/api/payments/initiate`
2. Backend validates fee using `computeIncrementalFee()`
3. Function detects registration already charged, calculates only incremental entry fee
4. Transaction record created with `registration_charged_flag = false`
5. Payment initiated with PayFast

### EFT Payment
1. Frontend calculates fee and sends to `/api/payments/eft`
2. Backend validates fee using `computeIncrementalFee()`
3. If mismatch detected, payment is refused
4. Transaction records created
5. Entries created with `payment_status = 'pending'`
6. `registration_paid` flag in `eft_payment_logs` set to `false`
7. Admin manually verifies payment and sets `registration_paid = true`

## Admin Alerts

Mismatch transactions are logged and can be queried:
```typescript
const mismatches = await getMismatchTransactions();
```

These should be reviewed manually to identify potential issues.

## Notes

- All fee calculations are based on database truth (count of existing entries)
- Registration fee is charged once per dancer per event
- Registration charged ≠ Registration paid (for EFT, paid is set manually)
- Fees are never negative (corrected to 0 with warning)
- Payment is refused if computed total ≠ client sent total

