import { NextResponse } from 'next/server';
import { db, unifiedDb, initializeDatabase } from '@/lib/database';
import { autoMarkRegistrationForParticipants } from '@/lib/registration-fee-tracker';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Before doing anything, ensure the necessary columns exist.
    // This is a more robust way to handle migrations at runtime.
    await db.addRegistrationFeeColumns();
    
    const { id } = await params;
    const entryId = id;
    
    // Get the current entry
    const allEntries = await db.getAllEventEntries();
    const entry = allEntries.find(e => e.id === entryId);
    
    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Event entry not found' },
        { status: 404 }
      );
    }

    // Update the entry to approved and mark payment as paid
    const updatedEntry = {
      ...entry,
      approved: true,
      paymentStatus: 'paid' as const, // Mark payment as paid when approved
      approvedAt: new Date().toISOString()
    };

    await db.updateEventEntry(entryId, updatedEntry);

    // CRITICAL: Auto-create performance for this approved entry (idempotent)
    try {
      const existingPerformances = await db.getAllPerformances();
      const alreadyExists = existingPerformances.some(p => p.eventEntryId === entryId);
      
      if (!alreadyExists) {
        console.log(`🎭 Creating performance for approved entry: ${entryId}`);
        
        // Build participant names using unified dancer records when available
        const participantNames: string[] = [];
        try {
          for (let i = 0; i < entry.participantIds.length; i++) {
            const pid = entry.participantIds[i];
            try {
              const dancer = await unifiedDb.getDancerById(pid);
              if (dancer?.name) {
                participantNames.push(dancer.name);
                continue;
              }
            } catch {}
            participantNames.push(`Participant ${i + 1}`);
          }
        } catch {
          entry.participantIds.forEach((_, i) => participantNames.push(`Participant ${i + 1}`));
        }

        await db.createPerformance({
          eventId: entry.eventId,
          eventEntryId: entryId,
          contestantId: entry.contestantId,
          title: entry.itemName,
          participantNames,
          duration: entry.estimatedDuration || 0,
          choreographer: entry.choreographer,
          mastery: entry.mastery,
          itemStyle: entry.itemStyle,
          status: 'scheduled',
          itemNumber: entry.itemNumber || undefined,
          entryType: entry.entryType || 'live',
          videoExternalUrl: entry.videoExternalUrl,
          videoExternalType: entry.videoExternalType,
          musicFileUrl: entry.musicFileUrl,
          musicFileName: entry.musicFileName
        });
        
        console.log(`✅ Performance created successfully for entry: ${entryId}`);
      } else {
        console.log(`ℹ️  Performance already exists for entry: ${entryId}`);
      }
    } catch (perfErr) {
      console.error('⚠️  Failed to auto-create performance for entry', entryId, perfErr);
      // Don't fail the approval if performance creation fails
    }

    // Auto-mark registration fees as paid for all participants since entry is now paid
    if (entry.participantIds && entry.participantIds.length > 0 && entry.mastery) {
      try {
        const registrationResults = await autoMarkRegistrationForParticipants(entry.participantIds, entry.mastery);
        console.log('Registration fee auto-marking results:', registrationResults);
      } catch (error) {
        console.error('Failed to auto-mark registration fees on approval:', error);
      }
    }

    // Mark registration fees as paid for all participants after admin approval
    if (entry.participantIds && entry.participantIds.length > 0) {
      try {
        for (const participantId of entry.participantIds) {
          // Get the entry to find the mastery level
          const mastery = entry.mastery || 'Eisteddfod';
          
          // CRITICAL FIX: Look up the dancer by their primary ID (which should be the EODSA ID)
          // The participantId from the entry might be a temporary or non-EODSA ID.
          const dancer = await unifiedDb.getDancerById(participantId);

          if (dancer) {
            await unifiedDb.markRegistrationFeePaid(dancer.id, mastery);
          } else {
            console.warn(`Could not find dancer with ID: ${participantId} to mark registration fee as paid.`);
          }
        }
        console.log('✅ Registration fees marked as paid for approved entry participants');
      } catch (error) {
        console.warn('Failed to update registration status after approval:', error);
        // Don't fail the approval if registration status update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Event entry approved successfully'
    });
  } catch (error) {
    console.error('Error approving event entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve event entry' },
      { status: 500 }
    );
  }
} 