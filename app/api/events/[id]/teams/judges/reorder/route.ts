import { NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

// PUT /api/events/[id]/teams/judges/reorder - Reorder judges (drag-and-drop)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { judgeIds } = body; // Array of judge IDs in new order
    
    if (!Array.isArray(judgeIds)) {
      return NextResponse.json(
        { success: false, error: 'judgeIds must be an array' },
        { status: 400 }
      );
    }
    
    const sqlClient = getSql();
    
    // Update display_order for each judge
    for (let i = 0; i < judgeIds.length; i++) {
      await sqlClient`
        UPDATE judge_event_assignments
        SET display_order = ${i + 1}
        WHERE judge_id = ${judgeIds[i]}
          AND event_id = ${eventId}
          AND status = 'active'
      `;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Judge order updated successfully'
    });
  } catch (error) {
    console.error('Error reordering judges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder judges' },
      { status: 500 }
    );
  }
}

