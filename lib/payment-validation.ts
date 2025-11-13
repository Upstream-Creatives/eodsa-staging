/**
 * Payment Validation Helpers
 * 
 * Functions to validate payment amounts against computed incremental fees
 * and create transaction records for payment tracking.
 */

import { computeIncrementalFee, markRegistrationCharged } from './incremental-fee-calculator';
import { createTransactionRecord } from './transaction-records';
import { getSql } from './database';

export interface EntryFeeValidation {
  entryIndex: number;
  entry: any;
  computedFee: number;
  clientSentFee: number;
  registrationFee: number;
  entryFee: number;
  registrationCharged: boolean;
  registrationWasAlreadyCharged: boolean;
  entryCount: number;
  breakdown: string;
  warnings: string[];
  isValid: boolean;
  mismatchDetected: boolean;
  mismatchReason?: string;
}

export interface BatchValidationResult {
  totalComputedFee: number;
  totalClientSentFee: number;
  validations: EntryFeeValidation[];
  allValid: boolean;
  mismatchDetected: boolean;
  mismatchReason?: string;
}

/**
 * Validate fees for a batch of entries
 */
export async function validateBatchEntryFees(
  entries: any[],
  eventId: string,
  clientSentTotal: number
): Promise<BatchValidationResult> {
  const validations: EntryFeeValidation[] = [];
  let totalComputedFee = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    try {
      // Compute incremental fee for this entry
      const feeResult = await computeIncrementalFee({
        eventId,
        dancerId: entry.contestantId || entry.eodsaId,
        eodsaId: entry.eodsaId,
        performanceType: entry.performanceType as 'Solo' | 'Duet' | 'Trio' | 'Group',
        participantIds: Array.isArray(entry.participantIds) ? entry.participantIds : [entry.participantIds],
        masteryLevel: entry.mastery
      });

      const clientSentFee = entry.calculatedFee || 0;
      const mismatchDetected = Math.abs(clientSentFee - feeResult.totalFee) > 0.01;
      const mismatchReason = mismatchDetected 
        ? `Entry ${i + 1}: Client sent ${clientSentFee}, computed ${feeResult.totalFee}, difference: ${Math.abs(clientSentFee - feeResult.totalFee)}`
        : undefined;

      validations.push({
        entryIndex: i,
        entry,
        computedFee: feeResult.totalFee,
        clientSentFee,
        registrationFee: feeResult.registrationFee,
        entryFee: feeResult.entryFee,
        registrationCharged: feeResult.registrationCharged,
        registrationWasAlreadyCharged: feeResult.registrationWasAlreadyCharged,
        entryCount: feeResult.entryCount,
        breakdown: feeResult.breakdown,
        warnings: feeResult.warnings,
        isValid: !mismatchDetected,
        mismatchDetected,
        mismatchReason
      });

      totalComputedFee += feeResult.totalFee;
    } catch (error: any) {
      console.error(`Error validating entry ${i + 1}:`, error);
      validations.push({
        entryIndex: i,
        entry,
        computedFee: 0,
        clientSentFee: entry.calculatedFee || 0,
        registrationFee: 0,
        entryFee: 0,
        registrationCharged: false,
        registrationWasAlreadyCharged: false,
        entryCount: 0,
        breakdown: '',
        warnings: [`Error computing fee: ${error.message}`],
        isValid: false,
        mismatchDetected: true,
        mismatchReason: `Error computing fee for entry ${i + 1}: ${error.message}`
      });
    }
  }

  // Check total mismatch
  const totalMismatchDetected = Math.abs(clientSentTotal - totalComputedFee) > 0.01;
  const totalMismatchReason = totalMismatchDetected
    ? `Total mismatch: Client sent ${clientSentTotal}, computed ${totalComputedFee}, difference: ${Math.abs(clientSentTotal - totalComputedFee)}`
    : undefined;

  return {
    totalComputedFee,
    totalClientSentFee: clientSentTotal,
    validations,
    allValid: validations.every(v => v.isValid) && !totalMismatchDetected,
    mismatchDetected: totalMismatchDetected || validations.some(v => v.mismatchDetected),
    mismatchReason: totalMismatchReason || validations.find(v => v.mismatchDetected)?.mismatchReason
  };
}

/**
 * Create transaction records for batch entries and mark registration as charged
 */
export async function createBatchTransactionRecords(
  entries: any[],
  eventId: string,
  paymentId: string,
  paymentMethod: 'payfast' | 'eft',
  clientSentTotal: number,
  computedTotal: number
): Promise<string[]> {
  const transactionIds: string[] = [];
  const sql = getSql();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    try {
      // Compute fee to get registration charged status
      const feeResult = await computeIncrementalFee({
        eventId,
        dancerId: entry.contestantId || entry.eodsaId,
        eodsaId: entry.eodsaId,
        performanceType: entry.performanceType as 'Solo' | 'Duet' | 'Trio' | 'Group',
        participantIds: Array.isArray(entry.participantIds) ? entry.participantIds : [entry.participantIds],
        masteryLevel: entry.mastery
      });

      // Mark registration as charged if this entry charges registration
      if (feeResult.registrationCharged) {
        await markRegistrationCharged(
          eventId,
          entry.contestantId || entry.eodsaId,
          entry.eodsaId
        );
      }

      // Create transaction record (entry_id will be set later when entry is created)
      const transactionId = await createTransactionRecord({
        entryId: undefined, // Will be set when entry is created
        eventId,
        dancerId: entry.contestantId || entry.eodsaId,
        eodsaId: entry.eodsaId,
        expectedAmount: feeResult.totalFee,
        amountPaid: 0, // Will be updated when payment completes
        registrationPaidFlag: false, // Will be updated when payment completes
        registrationChargedFlag: feeResult.registrationCharged,
        status: 'pending',
        paymentMethod,
        paymentReference: paymentId,
        clientSentTotal: entry.calculatedFee,
        computedTotal: feeResult.totalFee,
        mismatchDetected: Math.abs((entry.calculatedFee || 0) - feeResult.totalFee) > 0.01,
        mismatchReason: Math.abs((entry.calculatedFee || 0) - feeResult.totalFee) > 0.01
          ? `Entry ${i + 1}: Client sent ${entry.calculatedFee}, computed ${feeResult.totalFee}`
          : undefined
      });

      transactionIds.push(transactionId);
    } catch (error: any) {
      console.error(`Error creating transaction record for entry ${i + 1}:`, error);
    }
  }

  return transactionIds;
}

/**
 * Update transaction record with entry ID after entry is created
 */
export async function updateTransactionWithEntryId(
  transactionId: string,
  entryId: string
): Promise<void> {
  const sql = getSql();
  
  await sql`
    UPDATE transaction_records
    SET entry_id = ${entryId}
    WHERE id = ${transactionId}
  `;
}

