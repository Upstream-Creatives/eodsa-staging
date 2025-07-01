import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['judgeId', 'region', 'assignedBy'];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const { judgeId, region, assignedBy } = body;

    // Get all events in the specified region
    const allEvents = await db.getAllEvents();
    const regionEvents = allEvents.filter(event => event.region === region);

    if (regionEvents.length === 0) {
      return NextResponse.json(
        { success: false, error: `No events found in region: ${region}` },
        { status: 400 }
      );
    }

    // Check existing assignments to avoid duplicates
    const existingAssignments = await db.getAllJudgeAssignments();
    
    const assignmentsToCreate = [];
    let skippedCount = 0;

    for (const event of regionEvents) {
      const duplicate = existingAssignments.find(
        assignment => assignment.judgeId === judgeId && assignment.eventId === event.id
      );

      if (!duplicate) {
        assignmentsToCreate.push({
          judgeId,
          eventId: event.id,
          assignedBy
        });
      } else {
        skippedCount++;
      }
    }

    // Create all assignments
    const createdAssignments = [];
    for (const assignmentData of assignmentsToCreate) {
      const assignment = await db.createJudgeEventAssignment(assignmentData);
      createdAssignments.push(assignment);
    }

    return NextResponse.json({
      success: true,
      assignedCount: createdAssignments.length,
      skippedCount,
      region,
      message: `Judge assigned to ${createdAssignments.length} events in ${region}${skippedCount > 0 ? ` (${skippedCount} already assigned)` : ''}`
    });
  } catch (error) {
    console.error('Error creating regional judge assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create regional assignment' },
      { status: 500 }
    );
  }
} 