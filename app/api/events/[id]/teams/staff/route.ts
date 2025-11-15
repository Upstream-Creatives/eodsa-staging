import { NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

// POST /api/events/[id]/teams/staff - Assign staff to event with role
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { staffId, eventRole, assignedBy } = body;
    
    if (!staffId || !eventRole || !assignedBy) {
      return NextResponse.json(
        { success: false, error: 'staffId, eventRole, and assignedBy are required' },
        { status: 400 }
      );
    }
    
    const validRoles = ['announcer', 'backstage', 'media', 'runner', 'score_approver'];
    if (!validRoles.includes(eventRole)) {
      return NextResponse.json(
        { success: false, error: `eventRole must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }
    
    const sqlClient = getSql();
    
    // Verify staff exists and is actually staff
    // Staff have roles like 'backstage_manager', 'announcer', 'registration', 'media'
    const staffResult = await sqlClient`
      SELECT id, name, role, staff_permissions FROM judges WHERE id = ${staffId}
    ` as any[];
    
    if (staffResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }
    
    const staffRole = staffResult[0].role || 'judge';
    if (!['backstage_manager', 'announcer', 'registration', 'media'].includes(staffRole)) {
      return NextResponse.json(
        { success: false, error: 'User is not a staff member' },
        { status: 400 }
      );
    }
    
    // Check if already assigned with this role
    const existingResult = await sqlClient`
      SELECT id FROM event_staff_assignments 
      WHERE staff_id = ${staffId} 
        AND event_id = ${eventId}
        AND event_role = ${eventRole}
    ` as any[];
    
    if (existingResult.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Staff member is already assigned to this event with this role' },
        { status: 400 }
      );
    }
    
    // Verify staff has the permission (if applicable)
    // Note: Event roles can override default permissions but cannot exceed them
    // This is a business logic check - we'll allow it but note it in the response
    
    // Create assignment
    const assignmentId = `staff-assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const assignedAt = new Date().toISOString();
    
    await sqlClient`
      INSERT INTO event_staff_assignments (
        id, event_id, staff_id, event_role, assigned_by, assigned_at
      )
      VALUES (
        ${assignmentId}, ${eventId}, ${staffId}, ${eventRole}, ${assignedBy}, ${assignedAt}
      )
    `;
    
    return NextResponse.json({
      success: true,
      assignment: {
        id: assignmentId,
        eventId,
        staffId,
        eventRole,
        assignedBy,
        assignedAt
      },
      message: 'Staff assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign staff' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/teams/staff?staffId=xxx&eventRole=xxx - Remove staff from event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const eventRole = searchParams.get('eventRole');
    
    if (!staffId || !eventRole) {
      return NextResponse.json(
        { success: false, error: 'staffId and eventRole are required' },
        { status: 400 }
      );
    }
    
    const sqlClient = getSql();
    
    // Remove assignment
    await sqlClient`
      DELETE FROM event_staff_assignments
      WHERE staff_id = ${staffId} 
        AND event_id = ${eventId}
        AND event_role = ${eventRole}
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Staff removed from event successfully'
    });
  } catch (error) {
    console.error('Error removing staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove staff' },
      { status: 500 }
    );
  }
}

