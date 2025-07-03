import { NextResponse } from 'next/server';
import { unifiedDb, initializeDatabase } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (eventId) {
      // Get entries for a specific event
      const allEntries = await unifiedDb.getAllNationalsEventEntries();
      const entries = allEntries.filter(entry => entry.nationalsEventId === eventId);
      
      return NextResponse.json({
        success: true,
        entries
      });
    } else {
      // Get all entries
      const entries = await unifiedDb.getAllNationalsEventEntries();
      return NextResponse.json({
        success: true,
        entries
      });
    }
  } catch (error) {
    console.error('Error fetching nationals event entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nationals event entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'nationalsEventId', 'contestantId', 'eodsaId', 'participantIds',
      'calculatedFee', 'itemName', 'choreographer', 'mastery', 'itemStyle',
      'estimatedDuration', 'performanceType', 'ageCategory'
    ];
    
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create nationals event entry
    const entry = await unifiedDb.createNationalsEventEntry({
      nationalsEventId: body.nationalsEventId,
      contestantId: body.contestantId,
      eodsaId: body.eodsaId,
      participantIds: body.participantIds,
      calculatedFee: body.calculatedFee,
      paymentStatus: body.paymentStatus,
      paymentMethod: body.paymentMethod,
      approved: body.approved,
      qualifiedForNationals: body.qualifiedForNationals,
      itemNumber: body.itemNumber,
      itemName: body.itemName,
      choreographer: body.choreographer,
      mastery: body.mastery,
      itemStyle: body.itemStyle,
      estimatedDuration: body.estimatedDuration,
      performanceType: body.performanceType,
      ageCategory: body.ageCategory,
      soloCount: body.soloCount || 0,
      soloDetails: body.soloDetails || null,
      additionalNotes: body.additionalNotes
    });

    return NextResponse.json({
      success: true,
      entry
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating nationals event entry:', error);
    
    if (error instanceof Error && error.message) {
      if (error.message.includes('FOREIGN KEY')) {
        return NextResponse.json(
          { success: false, error: 'Invalid event or contestant ID provided' },
          { status: 400 }
        );
      }
      if (error.message.includes('UNIQUE constraint')) {
        return NextResponse.json(
          { success: false, error: 'This contestant is already registered for this nationals event' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create nationals event entry' },
      { status: 500 }
    );
  }
} 