/**
 * Pricing utility functions for consistent fee calculation across the application
 * Supports event-specific fees and falls back to default nationals pricing
 */

export interface EventFeeConfig {
  registrationFeePerDancer?: number;
  solo1Fee?: number;
  solo2Fee?: number;
  solo3Fee?: number;
  soloAdditionalFee?: number;
  duoTrioFeePerDancer?: number;
  groupFeePerDancer?: number;
  largeGroupFeePerDancer?: number;
  currency?: string;
}

// Default fee structure (ZAR - Nationals pricing)
const DEFAULT_FEES: Required<EventFeeConfig> = {
  registrationFeePerDancer: 300,
  solo1Fee: 400,
  solo2Fee: 750,
  solo3Fee: 1050,
  soloAdditionalFee: 100,
  duoTrioFeePerDancer: 280,
  groupFeePerDancer: 220,
  largeGroupFeePerDancer: 190,
  currency: 'ZAR'
};

/**
 * Calculate the correct fee for a solo entry based on its solo number
 * 
 * IMPORTANT: solo1Fee, solo2Fee, solo3Fee are INDIVIDUAL fees, NOT cumulative totals
 * - solo1Fee = fee for 1st solo (e.g., 300)
 * - solo2Fee = fee for 2nd solo (e.g., 200)
 * - solo3Fee = fee for 3rd solo (e.g., 100)
 * 
 * @param soloNumber - The solo number (1, 2, 3, or 4+)
 * @param eventConfig - Optional event-specific fee configuration
 * @returns The fee that should be charged for this specific solo entry
 */
export function calculateSoloEntryFee(soloNumber: number, eventConfig?: EventFeeConfig): number {
  const fees = { ...DEFAULT_FEES, ...eventConfig };
  
  if (soloNumber === 1) {
    return fees.solo1Fee;
  } else if (soloNumber === 2) {
    return fees.solo2Fee;
  } else if (soloNumber === 3) {
    return fees.solo3Fee;
  } else {
    // 4th+ solos use additional fee
    return fees.soloAdditionalFee;
  }
}

/**
 * Calculate total fee for multiple solo entries being added at once
 * 
 * @param existingSoloCount - Number of solos the dancer already has
 * @param newSoloCount - Number of new solos being added
 * @param eventConfig - Optional event-specific fee configuration
 * @returns Total fee for all new solos
 */
export function calculateMultipleSoloFees(
  existingSoloCount: number,
  newSoloCount: number,
  eventConfig?: EventFeeConfig
): number {
  let total = 0;
  
  for (let i = 1; i <= newSoloCount; i++) {
    const soloNumber = existingSoloCount + i;
    total += calculateSoloEntryFee(soloNumber, eventConfig);
  }
  
  return total;
}

/**
 * Calculate the total cumulative fee for multiple solo entries
 * 
 * NOTE: This calculates the total fee for ALL solos (1 through totalSoloCount)
 * Each solo has its own fee: solo1Fee, solo2Fee, solo3Fee, etc.
 * 
 * @param totalSoloCount - Total number of solo entries
 * @param eventConfig - Optional event-specific fee configuration
 * @returns The total fee that should have been paid for all solo entries
 */
export function calculateCumulativeSoloFee(totalSoloCount: number, eventConfig?: EventFeeConfig): number {
  if (totalSoloCount <= 0) return 0;
  
  let total = 0;
  for (let i = 1; i <= totalSoloCount; i++) {
    total += calculateSoloEntryFee(i, eventConfig);
  }
  
  return total;
}

/**
 * Get existing solo entries for a dancer/contestant for a specific event
 * Handles both legacy and unified system dancers, including studio dancers
 * 
 * @param allEntries - All event entries from the database
 * @param eventId - The event ID to check
 * @param eodsaId - The dancer's EODSA ID
 * @param contestantId - The contestant ID (for legacy system)
 * @param dancerId - The dancer's internal ID (for unified system)
 * @returns Array of existing solo entries for this dancer in this event
 */
export function getExistingSoloEntries(
  allEntries: any[],
  eventId: string,
  eodsaId: string,
  contestantId?: string,
  dancerId?: string
): any[] {
  console.log(`🔍 Looking for existing solo entries for dancer ${eodsaId} in event ${eventId}`);
  console.log(`🔍 Checking ${allEntries.length} total entries`);
  
  const soloEntries = allEntries.filter(entry => {
    // Must be the same event and a solo entry (single participant)
    if (entry.eventId !== eventId) {
      return false;
    }
    
    // Check if it's a solo entry - must have exactly 1 participant
    let participantIds: string[] = [];
    if (Array.isArray(entry.participantIds)) {
      participantIds = entry.participantIds;
    } else if (typeof entry.participantIds === 'string') {
      try {
        participantIds = JSON.parse(entry.participantIds);
      } catch (e) {
        // If it's not valid JSON, treat as single string
        participantIds = [entry.participantIds];
      }
    }
    
    if (participantIds.length !== 1) {
      return false;
    }
    
    // Check if this dancer is the participant in this solo entry
    const participantId = participantIds[0];
    
    // Method 1: Check if the entry is owned by this dancer directly (eodsaId match)
    if (entry.eodsaId === eodsaId) {
      console.log(`✅ Found solo entry owned by dancer: ${entry.id} (${entry.itemName})`);
      return true;
    }
    
    // Method 2: Check if the entry is owned by this dancer via contestant ID (legacy system)
    if (contestantId && entry.contestantId === contestantId) {
      console.log(`✅ Found solo entry via contestant ID: ${entry.id} (${entry.itemName})`);
      return true;
    }
    
    // Method 3: Check if this dancer is the participant (participantIds array)
    if (participantId === eodsaId || (dancerId && participantId === dancerId)) {
      console.log(`✅ Found solo entry with dancer as participant: ${entry.id} (${entry.itemName})`);
      return true;
    }
    
    // Method 4: For studio entries, the participant might be the EODSA ID stored as participant
    // This handles cases where studio creates entries for their dancers
    if (participantId === eodsaId) {
      console.log(`✅ Found studio solo entry for dancer: ${entry.id} (${entry.itemName})`);
      return true;
    }
    
    return false;
  });
  
  console.log(`📊 Found ${soloEntries.length} existing solo entries for dancer ${eodsaId}`);
  soloEntries.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.itemName} (${entry.id})`);
  });
  
  return soloEntries;
}

/**
 * Calculate fee for non-solo performance types
 * 
 * @param performanceType - 'Duet', 'Trio', or 'Group'
 * @param participantCount - Number of participants
 * @param eventConfig - Optional event-specific fee configuration
 * @returns The calculated fee
 */
export function calculateNonSoloFee(performanceType: string, participantCount: number, eventConfig?: EventFeeConfig): number {
  const fees = { ...DEFAULT_FEES, ...eventConfig };
  
  if (performanceType === 'Duet' || performanceType === 'Trio') {
    return fees.duoTrioFeePerDancer * participantCount;
  } else if (performanceType === 'Group') {
    return participantCount <= 9 
      ? fees.groupFeePerDancer * participantCount 
      : fees.largeGroupFeePerDancer * participantCount;
  }
  return 0;
}

/**
 * Validate and correct an entry fee for any performance type
 * This is the main function that should be used for server-side fee validation
 * 
 * @param performanceType - 'Solo', 'Duet', 'Trio', or 'Group'
 * @param participantCount - Number of participants
 * @param submittedFee - The fee that was submitted from the frontend
 * @param existingSoloCount - Number of existing solo entries (for solo only)
 * @param eventConfig - Optional event-specific fee configuration
 * @returns Object with validated fee and correction info
 */
export function validateAndCorrectEntryFee(
  performanceType: string,
  participantCount: number,
  submittedFee: number,
  existingSoloCount: number = 0,
  eventConfig?: EventFeeConfig
): {
  validatedFee: number;
  wasCorrect: boolean;
  explanation: string;
} {
  let correctFee: number;
  let explanation: string;
  
  if (performanceType === 'Solo') {
    // Use CUMULATIVE PACKAGE PRICING (same logic as calculateSmartEODSAFee)
    // solo1Fee, solo2Fee, solo3Fee are CUMULATIVE package totals, not individual fees
    const fees = { ...DEFAULT_FEES, ...eventConfig };
    const solo1Package = fees.solo1Fee || 550;
    const solo2Package = fees.solo2Fee || 942;
    const solo3Package = fees.solo3Fee || 1256;
    const additionalSoloFee = fees.soloAdditionalFee || 349;
    
    // Calculate previous package total (what they should have paid for existing solos)
    let previousPackageTotal = 0;
    if (existingSoloCount === 0) {
      previousPackageTotal = 0;
    } else if (existingSoloCount === 1) {
      previousPackageTotal = solo1Package;
    } else if (existingSoloCount === 2) {
      previousPackageTotal = solo2Package;
    } else if (existingSoloCount === 3) {
      previousPackageTotal = solo3Package;
    } else {
      // 4+ solos: 3-solo package + additional solos
      previousPackageTotal = solo3Package + ((existingSoloCount - 3) * additionalSoloFee);
    }
    
    // Calculate new package total (what they should pay for new total count)
    const newTotalSoloCount = existingSoloCount + 1;
    let newPackageTotal = 0;
    if (newTotalSoloCount === 1) {
      newPackageTotal = solo1Package;
    } else if (newTotalSoloCount === 2) {
      newPackageTotal = solo2Package;
    } else if (newTotalSoloCount === 3) {
      newPackageTotal = solo3Package;
    } else {
      // 4+ solos: 3-solo package + additional solos
      newPackageTotal = solo3Package + ((newTotalSoloCount - 3) * additionalSoloFee);
    }
    
    // Entry fee is the INCREMENTAL difference (new package - previous package)
    correctFee = Math.max(0, newPackageTotal - previousPackageTotal);
    
    const currencySymbol = fees.currency === 'USD' ? '$' : fees.currency === 'EUR' ? '€' : fees.currency === 'GBP' ? '£' : 'R';
    explanation = `Solo Package (${newTotalSoloCount} solos total): ${currencySymbol}${newPackageTotal} - Previous: ${currencySymbol}${previousPackageTotal} = ${currencySymbol}${correctFee}`;
  } else {
    correctFee = calculateNonSoloFee(performanceType, participantCount, eventConfig);
    explanation = `${performanceType} with ${participantCount} participants`;
  }
  
  return {
    validatedFee: correctFee,
    wasCorrect: Math.abs(submittedFee - correctFee) < 0.01, // Allow small rounding differences
    explanation
  };
}

/**
 * Get a human-readable explanation for solo pricing
 */
function getSoloFeeExplanation(soloCount: number, eventConfig?: EventFeeConfig): string {
  const fees: Required<EventFeeConfig> = { ...DEFAULT_FEES, ...eventConfig };
  const currencySymbol = fees.currency === 'USD' ? '$' : fees.currency === 'EUR' ? '€' : fees.currency === 'GBP' ? '£' : 'R';
  
  // All fees are guaranteed to be defined due to DEFAULT_FEES spread
  const solo1Fee = fees.solo1Fee;
  const solo2Fee = fees.solo2Fee;
  const solo3Fee = fees.solo3Fee;
  const soloAdditionalFee = fees.soloAdditionalFee;
  
  if (soloCount === 1) return `${currencySymbol}${solo1Fee} (first solo)`;
  if (soloCount === 2) return `${currencySymbol}${solo2Fee - solo1Fee} (package total ${currencySymbol}${solo2Fee})`;
  if (soloCount === 3) return `${currencySymbol}${solo3Fee - solo2Fee} (package total ${currencySymbol}${solo3Fee})`;
  return `${currencySymbol}${soloAdditionalFee} (additional solo)`;
}

/**
 * Constants for easy reference - using official EODSA fee structure (defaults)
 * These can be overridden by event-specific configuration
 */
export const PRICING_CONSTANTS = DEFAULT_FEES;
