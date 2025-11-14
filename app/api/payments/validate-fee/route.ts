/**
 * Payment Fee Validation API
 * POST /api/payments/validate-fee
 * 
 * Validates that the client-sent fee matches the server-computed incremental fee.
 * This endpoint should be called before initiating payment to ensure fee accuracy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeIncrementalFee } from '@/lib/incremental-fee-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      dancerId,
      eodsaId,
      performanceType,
      participantIds,
      masteryLevel,
      clientSentTotal
    } = body;

    // Validate required fields
    if (!eventId || !eodsaId || !performanceType || !participantIds || !masteryLevel) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: eventId, eodsaId, performanceType, participantIds, masteryLevel'
      }, { status: 400 });
    }

    // Compute incremental fee from database truth
    const feeResult = await computeIncrementalFee({
      eventId,
      dancerId: dancerId || eodsaId,
      eodsaId,
      performanceType: performanceType as 'Solo' | 'Duet' | 'Trio' | 'Group',
      participantIds: Array.isArray(participantIds) ? participantIds : [participantIds],
      masteryLevel
    });

    // Check for mismatch
    let mismatchDetected = false;
    let mismatchReason = '';

    if (clientSentTotal !== undefined) {
      const difference = Math.abs(clientSentTotal - feeResult.totalFee);
      if (difference > 0.01) { // Allow for small floating point differences
        mismatchDetected = true;
        mismatchReason = `Client sent ${clientSentTotal}, computed ${feeResult.totalFee}, difference: ${difference}`;
      }
    }

    return NextResponse.json({
      success: true,
      computedFee: feeResult.totalFee,
      registrationFee: feeResult.registrationFee,
      entryFee: feeResult.entryFee,
      registrationCharged: feeResult.registrationCharged,
      registrationWasAlreadyCharged: feeResult.registrationWasAlreadyCharged,
      entryCount: feeResult.entryCount,
      breakdown: feeResult.breakdown,
      warnings: feeResult.warnings,
      mismatchDetected,
      mismatchReason: mismatchDetected ? mismatchReason : undefined,
      isValid: !mismatchDetected
    });

  } catch (error: any) {
    console.error('Fee validation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to validate fee'
    }, { status: 500 });
  }
}

