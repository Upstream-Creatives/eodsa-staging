/**
 * Pricing utility functions for consistent fee calculation across the application
 * Uses nationals solo pricing structure with restored non-solo pricing
 */

/**
 * Calculate the correct fee for a solo entry based on how many solo entries 
 * the dancer already has for the specific event
 * 
 * @param currentSoloCount - The total number of solo entries (including this new one)
 * @returns The fee that should be charged for this specific solo entry
 */
export function calculateSoloEntryFee(currentSoloCount: number): number {
  // Use nationals solo pricing structure: 1st R400, 2nd R350, 3rd R300, 4th R250, 5th FREE, additional R100
  
  if (currentSoloCount === 1) {
    return 400; // First solo: R400
  } else if (currentSoloCount === 2) {
    return 350; // Second solo: R350
  } else if (currentSoloCount === 3) {
    return 300; // Third solo: R300
  } else if (currentSoloCount === 4) {
    return 250; // Fourth solo: R250
  } else if (currentSoloCount === 5) {
    return 0; // Fifth solo is FREE
  } else {
    return 100; // Additional solos R100 each
  }
}

/**
 * Calculate the total cumulative fee for multiple solo entries
 * 
 * @param totalSoloCount - Total number of solo entries
 * @returns The total fee that should have been paid for all solo entries
 */
export function calculateCumulativeSoloFee(totalSoloCount: number): number {
  if (totalSoloCount <= 0) return 0;
  
  if (totalSoloCount === 1) return 400; // R400
  if (totalSoloCount === 2) return 750; // R400 + R350 = R750
  if (totalSoloCount === 3) return 1050; // R400 + R350 + R300 = R1050
  if (totalSoloCount === 4) return 1300; // R400 + R350 + R300 + R250 = R1300
  if (totalSoloCount === 5) return 1300; // 5th is free, so total stays at R1300
  
  // More than 5: 1300 + (additional * 100)
  return 1300 + ((totalSoloCount - 5) * 100);
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
 * @returns The calculated fee
 */
export function calculateNonSoloFee(performanceType: string, participantCount: number): number {
  if (performanceType === 'Duet' || performanceType === 'Trio') {
    return 280 * participantCount; // R280 per person (restored original pricing)
  } else if (performanceType === 'Group') {
    return participantCount <= 9 ? 220 * participantCount : 190 * participantCount; // R220 (4-9 people), R190 (10+ people)
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
 * @returns Object with validated fee and correction info
 */
export function validateAndCorrectEntryFee(
  performanceType: string,
  participantCount: number,
  submittedFee: number,
  existingSoloCount: number = 0
): {
  validatedFee: number;
  wasCorrect: boolean;
  explanation: string;
} {
  let correctFee: number;
  let explanation: string;
  
  if (performanceType === 'Solo') {
    const currentSoloCount = existingSoloCount + 1;
    correctFee = calculateSoloEntryFee(currentSoloCount);
    explanation = `Solo entry #${currentSoloCount}: ${getSoloFeeExplanation(currentSoloCount)}`;
  } else {
    correctFee = calculateNonSoloFee(performanceType, participantCount);
    explanation = `${performanceType} with ${participantCount} participants`;
  }
  
  return {
    validatedFee: correctFee,
    wasCorrect: submittedFee === correctFee,
    explanation
  };
}

/**
 * Get a human-readable explanation for solo pricing
 */
function getSoloFeeExplanation(soloCount: number): string {
  if (soloCount === 1) return 'R400 (first solo)';
  if (soloCount === 2) return 'R350 (package total R750)';
  if (soloCount === 3) return 'R300 (package total R1050)';
  if (soloCount === 4) return 'R250 (package total R1300)';
  if (soloCount === 5) return 'R0 (fifth solo is FREE)';
  return 'R100 (additional solo)';
}

/**
 * Constants for easy reference - using official EODSA fee structure
 */
export const PRICING_CONSTANTS = {
  SOLO_PACKAGES: {
    1: 400,   // R400
    2: 750,   // R750 
    3: 1050,  // R1050
    4: 1300,  // R1300
    5: 1300   // R1300 (5th is free)
  },
  SOLO_INCREMENTAL: {
    1: 400,   // R400
    2: 350,   // R350
    3: 300,   // R300
    4: 250,   // R250
    5: 0,     // FREE
    additional: 100 // R100
  },
  NON_SOLO: {
    DUET_TRIO_PER_PERSON: 280,    // R280 (restored original)
    SMALL_GROUP_PER_PERSON: 220,  // R220 (4-9 people)
    LARGE_GROUP_PER_PERSON: 190   // R190 (10+ people)
  }
};
