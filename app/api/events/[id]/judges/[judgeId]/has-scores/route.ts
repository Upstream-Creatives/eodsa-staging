import { NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

// GET /api/events/[id]/judges/[judgeId]/has-scores - Check if judge has scored any items for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; judgeId: string }> }
) {
  try {
    const { id: eventId, judgeId } = await params;
    
    if (!eventId || !judgeId) {
      return NextResponse.json(
        { success: false, error: 'eventId and judgeId are required' },
        { status: 400 }
      );
    }
    
    const sqlClient = getSql();
    
    // Check if this judge has scored any performances for this event
    const scoreResult = await sqlClient`
      SELECT COUNT(*) as score_count
      FROM scores s
      JOIN performances p ON s.performance_id = p.id
      WHERE s.judge_id = ${judgeId}
        AND p.event_id = ${eventId}
    ` as any[];
    
    const scoreCount = parseInt(scoreResult[0]?.score_count || '0', 10);
    
    return NextResponse.json({
      success: true,
      hasScores: scoreCount > 0,
      scoreCount
    });
  } catch (error) {
    console.error('Error checking judge scores:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check judge scores' },
      { status: 500 }
    );
  }
}

