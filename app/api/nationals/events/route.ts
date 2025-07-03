import { NextResponse } from 'next/server';
import { unifiedDb, initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    // Update event statuses based on current date/time before fetching
    await unifiedDb.updateNationalsEventStatuses();
    
    const events = await unifiedDb.getAllNationalsEvents();
    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching nationals events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nationals events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'name', 'description', 'eventDate', 'registrationDeadline', 'venue', 'createdBy'
    ];
    
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate date fields
    const eventDate = new Date(body.eventDate);
    const registrationDeadline = new Date(body.registrationDeadline);
    const now = new Date();
    
    if (registrationDeadline >= eventDate) {
      return NextResponse.json(
        { success: false, error: 'Registration deadline must be before event date' },
        { status: 400 }
      );
    }

    const event = await unifiedDb.createNationalsEvent({
      name: body.name,
      description: body.description,
      eventDate: body.eventDate,
      eventEndDate: body.eventEndDate,
      registrationDeadline: body.registrationDeadline,
      venue: body.venue,
      maxParticipants: body.maxParticipants,
      createdBy: body.createdBy
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error creating nationals event:', error);
    
    if (error instanceof Error && error.message) {
      if (error.message.includes('FOREIGN KEY')) {
        return NextResponse.json(
          { success: false, error: 'Invalid reference data provided' },
          { status: 400 }
        );
      }
      if (error.message.includes('CHECK constraint')) {
        return NextResponse.json(
          { success: false, error: 'Invalid data format provided' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create nationals event' },
      { status: 500 }
    );
  }
} 