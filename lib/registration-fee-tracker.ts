// Registration Fee Tracking System
// This module handles tracking of registration fees per dancer per event
// Since we don't have per-event registration tracking, we check for existing entries in the event

import { unifiedDb } from './database';
import { Dancer, calculateEODSAFee } from './types';

export interface RegistrationFeeStatus {
  registrationFeePaid: boolean;
  registrationFeePaidAt?: string;
  registrationFeeMasteryLevel?: string;
}

export interface EnhancedDancer extends Dancer {
  registrationFeePaid?: boolean;
  registrationFeePaidAt?: string;
  registrationFeeMasteryLevel?: string;
}

// Enhanced fee calculation - BACKEND IS SOURCE OF TRUTH
// Calculates fees from scratch based on existing entries, package pricing, and registration assignment
export const calculateSmartEODSAFee = async (
  masteryLevel: string,
  performanceType: 'Solo' | 'Duet' | 'Trio' | 'Group',
  participantIds: string[],
  options?: {
    soloCount?: number;
    eventId?: string;
  }
) => {
  if (!options?.eventId) {
    // Fallback to basic calculation if no eventId
    return calculateEODSAFee(
      masteryLevel,
      performanceType,
      participantIds.length,
      {
        soloCount: options?.soloCount || 1,
        includeRegistration: true
      }
    );
  }

  // Fetch event-specific fees
  let eventFees: any = {};
  try {
    const { db } = await import('./database');
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
      
      console.log(`💰 Event fees for ${options.eventId}:`);
      console.log(`   - Registration: R${eventFees.eventRegistrationFee}`);
      console.log(`   - Solo 1 Package: R${eventFees.eventSolo1Fee}`);
      console.log(`   - Solo 2 Package: R${eventFees.eventSolo2Fee}`);
      console.log(`   - Solo 3 Package: R${eventFees.eventSolo3Fee}`);
    }
  } catch (error) {
    console.error('Error fetching event fees:', error);
  }

  const { getSql } = await import('./database');
  const sqlClient = getSql();

  // For solo entries: calculate cumulative package pricing with proper deduction
  if (performanceType === 'Solo' && participantIds.length === 1) {
    const participantId = participantIds[0];
    
    // First, get the dancer's EODSA ID from the internal ID
    let dancerEodsaId: string | null = null;
    try {
      const dancerInfo = await sqlClient`
        SELECT eodsa_id FROM dancers WHERE id = ${participantId} LIMIT 1
      ` as any[];
      
      if (dancerInfo.length > 0 && dancerInfo[0].eodsa_id) {
        dancerEodsaId = dancerInfo[0].eodsa_id;
      }
    } catch (error) {
      console.error('Error getting dancer EODSA ID:', error);
    }
    
    // Get ALL existing solo entries for this dancer in this event (paid AND unpaid)
    // Check by BOTH internal ID (participant_ids) and EODSA ID
    let existingSoloEntries: any[] = [];
    if (dancerEodsaId) {
      existingSoloEntries = await sqlClient`
        SELECT id, calculated_fee, payment_status, participant_ids, eodsa_id, contestant_id
        FROM event_entries
        WHERE event_id = ${options.eventId}
        AND performance_type = 'Solo'
        AND (
          eodsa_id = ${dancerEodsaId}
          OR contestant_id = ${participantId}
          OR (participant_ids::jsonb ? ${participantId})
          OR (participant_ids::jsonb ? ${dancerEodsaId})
        )
        ORDER BY submitted_at ASC
      ` as any[];
    } else {
      existingSoloEntries = await sqlClient`
        SELECT id, calculated_fee, payment_status, participant_ids, eodsa_id, contestant_id
        FROM event_entries
        WHERE event_id = ${options.eventId}
        AND performance_type = 'Solo'
        AND (
          contestant_id = ${participantId}
          OR (participant_ids::jsonb ? ${participantId})
        )
        ORDER BY submitted_at ASC
      ` as any[];
    }
    
    console.log(`🔍 Looking for existing solos for dancer ${participantId} (EODSA: ${dancerEodsaId || 'N/A'}) in event ${options.eventId}`);
    console.log(`   - Found ${existingSoloEntries.length} existing solo entries`);
    existingSoloEntries.forEach((entry, idx) => {
      console.log(`   - Entry ${idx + 1}: ID ${entry.id}, Fee R${entry.calculated_fee}, Payment: ${entry.payment_status}`);
    });
    
    const existingSoloCount = existingSoloEntries.length;
    
    // Get package fees (these are CUMULATIVE package totals, not individual fees)
    const solo1Package = eventFees.eventSolo1Fee || 550;  // 1 Solo Package total (performance only)
    const solo2Package = eventFees.eventSolo2Fee || 942;   // 2 Solos Package total (performance only)
    const solo3Package = eventFees.eventSolo3Fee || 1256;  // 3 Solos Package total (performance only)
    const additionalSoloFee = eventFees.eventSoloAdditionalFee || 349;
    const registrationFee = eventFees.eventRegistrationFee || 175;
    
    // Check if registration was already assigned (has ANY entry in this event, paid or unpaid)
    // This includes checking other entry types too, not just solos
    const registrationAlreadyAssigned = existingSoloEntries.length > 0 || 
      await (async () => {
        let anyEntry: any[] = [];
        if (dancerEodsaId) {
          anyEntry = await sqlClient`
            SELECT COUNT(*) as count FROM event_entries
            WHERE event_id = ${options.eventId}
            AND (
              eodsa_id = ${dancerEodsaId}
              OR contestant_id = ${participantId}
              OR (participant_ids::jsonb ? ${participantId})
              OR (participant_ids::jsonb ? ${dancerEodsaId})
            )
            LIMIT 1
          ` as any[];
        } else {
          anyEntry = await sqlClient`
            SELECT COUNT(*) as count FROM event_entries
            WHERE event_id = ${options.eventId}
            AND (
              contestant_id = ${participantId}
              OR (participant_ids::jsonb ? ${participantId})
            )
            LIMIT 1
          ` as any[];
        }
        return anyEntry && anyEntry[0] && anyEntry[0].count > 0;
      })();
    
    // Calculate what package total they should have been charged for existing solos
    // This is based on the solo count, not what they actually paid
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
    
    // Calculate new total solo count
    const newTotalSoloCount = existingSoloCount + 1;
    
    // Calculate new package total (performance fees only, registration is separate)
    let newPackagePerformanceTotal = 0;
    if (newTotalSoloCount === 1) {
      newPackagePerformanceTotal = solo1Package;
    } else if (newTotalSoloCount === 2) {
      newPackagePerformanceTotal = solo2Package;
    } else if (newTotalSoloCount === 3) {
      newPackagePerformanceTotal = solo3Package;
    } else {
      // 4+ solos: 3-solo package + additional solos
      newPackagePerformanceTotal = solo3Package + ((newTotalSoloCount - 3) * additionalSoloFee);
    }
    
    // Calculate performance fee increment (new package total - previous package total)
    // This is what they should pay for performance fees NOW
    const calculatedPerformanceFee = Math.max(0, newPackagePerformanceTotal - previousPackageTotal);
    
    // Registration fee: only charge if NOT already assigned
    const finalRegistrationFee = registrationAlreadyAssigned ? 0 : registrationFee;
    
    // Calculate total amount already charged (sum of ALL calculated_fee values)
    // This is what they've ACTUALLY been charged (might include previous registration)
    const previousChargesTotal = existingSoloEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.calculated_fee) || 0);
    }, 0);
    
    // Total amount due now = performance increment + registration (if not assigned)
    const amountDueNow = calculatedPerformanceFee + finalRegistrationFee;
    
    console.log(`💰 Backend Fee Calculation (Source of Truth):`);
    console.log(`   - Existing solo entries: ${existingSoloCount}`);
    console.log(`   - Previous package total: R${previousPackageTotal}`);
    console.log(`   - Previous charges total (actual): R${previousChargesTotal}`);
    console.log(`   - New total solo count: ${newTotalSoloCount}`);
    console.log(`   - New package performance total: R${newPackagePerformanceTotal}`);
    console.log(`   - Registration already assigned: ${registrationAlreadyAssigned}`);
    console.log(`   - Performance fee increment: R${calculatedPerformanceFee}`);
    console.log(`   - Registration fee: R${finalRegistrationFee}`);
    console.log(`   - Amount due now: R${amountDueNow}`);
    console.log(`   - Breakdown: Performance R${calculatedPerformanceFee} + Registration R${finalRegistrationFee}`);
    
    return {
      registrationFee: finalRegistrationFee,
      performanceFee: calculatedPerformanceFee,
      totalFee: calculatedPerformanceFee + finalRegistrationFee,
      breakdown: `Solo Package (${newTotalSoloCount} solos) - Previous: R${previousChargesTotal}`,
      registrationBreakdown: finalRegistrationFee > 0 
        ? `Registration fee (first entry in this event)`
        : `Registration fee waived (already assigned on previous entry)`,
      currency: eventFees.eventCurrency || 'ZAR',
      unpaidRegistrationDancers: finalRegistrationFee > 0 ? participantIds : [],
      paidRegistrationDancers: finalRegistrationFee === 0 ? participantIds : []
    };
  }

  // For non-solo entries: standard calculation with registration check
  const dancers = await unifiedDb.getDancersWithRegistrationStatus(participantIds);
  
  const dancersWithPendingCheck = await Promise.all(
    dancers.map(async (dancer) => {
      // Check if this dancer has ANY entries for THIS specific event (paid or unpaid)
      let hasEntryForThisEvent = false;
      
      try {
        const existingEntries = await sqlClient`
          SELECT COUNT(*) as count FROM event_entries
          WHERE event_id = ${options.eventId}
          AND (
            eodsa_id = ${dancer.eodsaId || dancer.id}
            OR contestant_id = ${dancer.id}
            OR (participant_ids::jsonb ? ${dancer.id})
            OR (participant_ids::jsonb ? ${dancer.eodsaId || ''})
          )
          LIMIT 1
        ` as any[];

        hasEntryForThisEvent = existingEntries && existingEntries[0] && existingEntries[0].count > 0;
      } catch (error) {
        console.error(`Error checking existing entries for dancer ${dancer.id}:`, error);
      }

      return {
        ...dancer,
        registrationFeePaid: hasEntryForThisEvent,
        registrationFeeMasteryLevel: hasEntryForThisEvent ? masteryLevel : undefined
      };
    })
  );

  const feeBreakdown = calculateEODSAFee(
    masteryLevel,
    performanceType,
    participantIds.length,
    {
      soloCount: options?.soloCount || 1,
      includeRegistration: true,
      participantDancers: dancersWithPendingCheck,
      eventId: options.eventId,
      ...eventFees
    }
  );

  return {
    ...feeBreakdown,
    unpaidRegistrationDancers: dancersWithPendingCheck.filter(d => !d.registrationFeePaid),
    paidRegistrationDancers: dancersWithPendingCheck.filter(d => d.registrationFeePaid)
  };
};

// Mark registration fee as paid for multiple dancers
export const markGroupRegistrationFeePaid = async (
  dancerIds: string[],
  masteryLevel: string
) => {
  const results = [];
  for (const dancerId of dancerIds) {
    try {
      await unifiedDb.markRegistrationFeePaid(dancerId, masteryLevel);
      results.push({ dancerId, success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      results.push({ dancerId, success: false, error: errorMessage });
    }
  }
  return results;
};

// Check if a group of dancers need to pay registration fees (ALL PERFORMANCE TYPES)
export const checkGroupRegistrationStatus = async (
  dancerIds: string[],
  masteryLevel: string,
  performanceType?: 'Solo' | 'Duet' | 'Trio' | 'Group',
  eventId?: string
) => {
  // REGISTRATION FEE CHECKING FOR ALL PERFORMANCE TYPES
  
  const dancers = await unifiedDb.getDancersWithRegistrationStatus(dancerIds);
  
  const analysis = {
    totalDancers: dancers.length,
    needRegistration: dancers.filter(d => 
      !d.registrationFeePaid || 
      (d.registrationFeeMasteryLevel && d.registrationFeeMasteryLevel !== masteryLevel)
    ),
    alreadyPaid: dancers.filter(d => 
      d.registrationFeePaid && d.registrationFeeMasteryLevel === masteryLevel
    ),
    registrationFeeRequired: 0
  };

  if (analysis.needRegistration.length > 0) {
    // Try to get event-specific registration fee
    let registrationFeePerPerson = 300; // Default
    
    if (eventId) {
      try {
        const { db } = await import('./database');
        const event = await db.getEventById(eventId);
        if (event && event.registrationFeePerDancer) {
          registrationFeePerPerson = event.registrationFeePerDancer;
        }
      } catch (error) {
        console.error('Error fetching event for registration fee:', error);
      }
    }

    analysis.registrationFeeRequired = registrationFeePerPerson * analysis.needRegistration.length;
  }

  return analysis;
};

// Automatically mark registration fee as paid when dancer gets their first paid entry
export const autoMarkRegistrationFeePaid = async (eodsaId: string, masteryLevel: string) => {
  try {
    console.log(`🎫 Auto-marking registration fee for dancer: ${eodsaId} (${masteryLevel})`);
    
    // Find the dancer by EODSA ID
    const basicDancer = await unifiedDb.getDancerByEodsaId(eodsaId);
    if (!basicDancer) {
      console.warn(`⚠️ No dancer found with EODSA ID: ${eodsaId}`);
      return { success: false, reason: 'Dancer not found' };
    }

    // Get registration status for this dancer
    const dancers = await unifiedDb.getDancersWithRegistrationStatus([basicDancer.id]);
    const dancer = dancers[0];
    
    if (!dancer) {
      console.warn(`⚠️ Could not get registration status for dancer: ${eodsaId}`);
      return { success: false, reason: 'Registration status not found' };
    }

    // Check if registration fee is already marked as paid for this mastery level
    if (dancer.registrationFeePaid && dancer.registrationFeeMasteryLevel === masteryLevel) {
      console.log(`✅ Registration fee already marked as paid for dancer: ${eodsaId} (${masteryLevel})`);
      return { success: true, reason: 'Already paid for this mastery level' };
    }

    // Mark registration fee as paid
    await unifiedDb.markRegistrationFeePaid(dancer.id, masteryLevel);
    console.log(`✅ Auto-marked registration fee as paid for dancer: ${eodsaId} (${masteryLevel})`);
    
    return { success: true, reason: 'Marked as paid' };
  } catch (error) {
    console.error('❌ Failed to auto-mark registration fee as paid:', error);
    return { success: false, reason: 'Error occurred' };
  }
};

// Auto-mark registration fees for multiple participants when entry is paid
export const autoMarkRegistrationForParticipants = async (participantIds: string[], masteryLevel: string) => {
  const results = [];
  
  for (const participantId of participantIds) {
    try {
      // Get dancer info
      const dancer = await unifiedDb.getDancerById(participantId);
      if (dancer && dancer.eodsaId) {
        const result = await autoMarkRegistrationFeePaid(dancer.eodsaId, masteryLevel);
        results.push({ participantId, eodsaId: dancer.eodsaId, ...result });
      } else {
        results.push({ participantId, success: false, reason: 'No EODSA ID found' });
      }
    } catch (error) {
      console.error(`Error processing participant ${participantId}:`, error);
      results.push({ participantId, success: false, reason: 'Error occurred' });
    }
  }
  
  return results;
};

// Initialize registration fee tracking in database
export const initializeRegistrationFeeTracking = async () => {
  try {
    await unifiedDb.addRegistrationFeeColumns();
    console.log('✅ Registration fee tracking initialized');
  } catch (error) {
    console.error('❌ Failed to initialize registration fee tracking:', error);
  }
}; 