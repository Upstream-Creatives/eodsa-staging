import { NextResponse } from 'next/server';
import { unifiedDb, initializeDatabase } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (eventId) {
      // Get assignments for a specific event
      const assignments = await unifiedDb.getNationalsJudgeAssignmentsByEvent(eventId);
      const judgeCount = await unifiedDb.getNationalsEventJudgeCount(eventId);
      
      return NextResponse.json({
        success: true,
        assignments,
        judgeCount,
        maxJudges: 4
      });
    } else {
      // Get all assignments (you could implement this if needed)
      return NextResponse.json({
        success: true,
        assignments: [],
        judgeCount: 0,
        maxJudges: 4
      });
    }
  } catch (error) {
    console.error('Error fetching nationals judge assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nationals judge assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['judgeId', 'nationalsEventId', 'assignedBy'];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create assignment with validation (the database function handles the 4-judge limit)
    const assignment = await unifiedDb.createNationalsJudgeAssignment({
      judgeId: body.judgeId,
      nationalsEventId: body.nationalsEventId,
      assignedBy: body.assignedBy
    });

    // Get updated judge count
    const judgeCount = await unifiedDb.getNationalsEventJudgeCount(body.nationalsEventId);

    return NextResponse.json({
      success: true,
      assignment,
      judgeCount,
      maxJudges: 4,
      message: `Judge assigned successfully. ${judgeCount}/4 judges assigned to this event.`
    });
  } catch (error) {
    console.error('Error creating nationals judge assignment:', error);
    
    if (error instanceof Error && error.message) {
      if (error.message.includes('already assigned')) {
        return NextResponse.json(
          { success: false, error: 'This judge is already assigned to this nationals event' },
          { status: 409 }
        );
      }
      if (error.message.includes('maximum of 4 judges')) {
        return NextResponse.json(
          { success: false, error: 'This nationals event already has the maximum of 4 judges assigned' },
          { status: 409 }
        );
      }
      if (error.message.includes('FOREIGN KEY')) {
        return NextResponse.json(
          { success: false, error: 'Invalid judge or event ID provided' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create judge assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    await unifiedDb.removeNationalsJudgeAssignment(assignmentId);

    return NextResponse.json({
      success: true,
      message: 'Judge assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing nationals judge assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove judge assignment' },
      { status: 500 }
    );
  }
} 