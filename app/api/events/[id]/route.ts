import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = id;
    const event = await db.getEventById(eventId);
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = id;
    const body = await request.json();

    // Admin authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader && !body.adminSession) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // If adminSession is provided in body (for client-side requests)
    if (body.adminSession) {
      try {
        const adminData = typeof body.adminSession === 'string' ? 
          JSON.parse(body.adminSession) : body.adminSession;
        
        if (!adminData.isAdmin) {
          return NextResponse.json(
            { success: false, error: 'Admin privileges required' },
            { status: 403 }
          );
        }
      } catch (sessionError) {
        return NextResponse.json(
          { success: false, error: 'Invalid admin session' },
          { status: 401 }
        );
      }
    }

    // First check if event exists
    const [existingEvent] = await sql`
      SELECT id, name FROM events WHERE id = ${eventId}
    `;

    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Validate required fields for update
    const allowedFields = [
      'name', 'description', 'region', 'ageCategory', 'performanceType',
      'eventDate', 'eventEndDate', 'registrationDeadline', 'venue', 'entryFee', 
      'maxParticipants', 'status'
    ];

    // Filter only allowed fields from the request body
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If no valid fields provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    // Validate date logic if dates are being updated
    if (updateData.eventDate || updateData.registrationDeadline) {
      const eventDate = new Date(updateData.eventDate || existingEvent.event_date);
      const registrationDeadline = new Date(updateData.registrationDeadline || existingEvent.registration_deadline);
      
      if (registrationDeadline >= eventDate) {
        return NextResponse.json(
          { success: false, error: 'Registration deadline must be before event date' },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query using neon's syntax
    const updateFields = Object.keys(updateData).map(key => 
      key.replace(/([A-Z])/g, '_$1').toLowerCase()
    );
    const updateValues = Object.values(updateData);

    // Build SET clause dynamically
    const setClause = updateFields.map((field, index) => 
      `${field} = $${index + 2}`
    ).join(', ');

    // Execute update with neon template literal
    const updateQuery = `
      UPDATE events 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const [updatedEvent] = await sql(updateQuery, eventId, ...updateValues);

    console.log(`✅ Event updated: ${updatedEvent.name} (ID: ${eventId})`);

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error: any) {
    console.error('Error updating event:', error);
    
    if (error.message?.includes('foreign key constraint')) {
      return NextResponse.json(
        { success: false, error: 'Invalid reference data provided' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('CHECK constraint')) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format provided' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    );
  }
} 