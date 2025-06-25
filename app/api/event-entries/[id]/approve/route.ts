import { NextResponse } from 'next/server';
import { db, unifiedDb, initializeDatabase } from '@/lib/database';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Temporarily enable initialization to ensure schema migrations are applied
    await initializeDatabase();
    
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

    // Mark registration fees as paid for all participants after admin approval
    if (entry.participantIds && entry.participantIds.length > 0) {
      try {
        for (const participantId of entry.participantIds) {
          // Get the entry to find the mastery level
          const mastery = entry.mastery || 'Eisteddfod';
          await unifiedDb.markRegistrationFeePaid(participantId, mastery);
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