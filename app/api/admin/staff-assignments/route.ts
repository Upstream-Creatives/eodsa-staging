import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

// GET /api/admin/staff-assignments?eventId=...&role=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const role = searchParams.get('role');

    // If eventId=all, return all assignments (used client-side to filter by user)
    if (eventId === 'all') {
      const all = await db.getAllStaffAssignments();
      return NextResponse.json({ success: true, assignments: all });
    }

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId is required' }, { status: 400 });
    }

    const assignments = await db.getStaffAssignmentsByEvent(eventId, role || undefined);
    return NextResponse.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching staff assignments:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST /api/admin/staff-assignments
// Body: { userId, eventId, role, assignedBy }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, eventId, role, assignedBy } = body;

    if (!userId || !eventId || !role) {
      return NextResponse.json({ success: false, error: 'userId, eventId and role are required' }, { status: 400 });
    }

    const validRoles = ['backstage_manager', 'announcer', 'registration', 'media'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    if (eventId === 'all') {
      // Assign this user to all events
      const events = await db.getAllEvents();
      const created: any[] = [];
      for (const ev of events) {
        try {
          created.push(await db.createStaffAssignment({ userId, eventId: ev.id, role, assignedBy: assignedBy || 'admin' }));
        } catch {}
      }
      return NextResponse.json({ success: true, assignments: created });
    } else {
      const assignment = await db.createStaffAssignment({ userId, eventId, role, assignedBy: assignedBy || 'admin' });
      return NextResponse.json({ success: true, assignment });
    }
  } catch (error) {
    console.error('Error creating staff assignment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create assignment' }, { status: 500 });
  }
}
