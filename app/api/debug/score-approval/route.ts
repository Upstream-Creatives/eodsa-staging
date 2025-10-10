import { NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const performanceId = searchParams.get('performanceId');
    
    const sqlClient = getSql();
    
    // Get performance details
    const performance = await sqlClient`
      SELECT * FROM performances 
      WHERE id = ${performanceId || 'none'}
      LIMIT 1
    ` as any[];
    
    if (performance.length === 0 && !performanceId) {
      // Get all performances
      const allPerformances = await sqlClient`
        SELECT id, title, event_id, status 
        FROM performances 
        ORDER BY created_at DESC 
        LIMIT 10
      ` as any[];
      
      return NextResponse.json({
        message: 'No performance ID provided. Showing recent performances',
        performances: allPerformances
      });
    }
    
    if (performance.length === 0) {
      return NextResponse.json({
        error: 'Performance not found',
        performanceId
      }, { status: 404 });
    }
    
    const perf = performance[0];
    
    // Get judge assignments for this event
    const judgeAssignments = await sqlClient`
      SELECT jea.*, j.name as judge_name
      FROM judge_event_assignments jea
      JOIN judges j ON j.id = jea.judge_id
      WHERE jea.event_id = ${perf.event_id}
    ` as any[];
    
    // Get scores for this performance
    const scores = await sqlClient`
      SELECT s.*, j.name as judge_name
      FROM scores s
      JOIN judges j ON j.id = s.judge_id
      WHERE s.performance_id = ${performanceId}
    ` as any[];
    
    // Count judges
    const judgeCounts = await sqlClient`
      WITH performance_judge_counts AS (
        SELECT
          p.id as performance_id,
          p.title as performance_title,
          p.event_id,
          p.scores_published,
          COUNT(DISTINCT jea.judge_id) as total_judges,
          COUNT(DISTINCT s.judge_id) as scored_judges
        FROM performances p
        JOIN judge_event_assignments jea ON jea.event_id = p.event_id
        LEFT JOIN scores s ON s.performance_id = p.id
        WHERE p.id = ${performanceId}
        GROUP BY p.id, p.title, p.event_id, p.scores_published
      )
      SELECT * FROM performance_judge_counts
    ` as any[];
    
    return NextResponse.json({
      performance: {
        id: perf.id,
        title: perf.title,
        eventId: perf.event_id,
        status: perf.status,
        scoresPublished: perf.scores_published
      },
      judgeAssignments: judgeAssignments.map((ja: any) => ({
        judgeId: ja.judge_id,
        judgeName: ja.judge_name,
        eventId: ja.event_id,
        assignedAt: ja.assigned_at
      })),
      scores: scores.map((s: any) => ({
        scoreId: s.id,
        judgeId: s.judge_id,
        judgeName: s.judge_name,
        total: parseFloat(s.technical_score) + parseFloat(s.musical_score) +
               parseFloat(s.performance_score) + parseFloat(s.styling_score) +
               parseFloat(s.overall_impression_score),
        submittedAt: s.submitted_at
      })),
      counts: judgeCounts[0] || null,
      analysis: {
        totalJudgesAssigned: judgeAssignments.length,
        totalScoresSubmitted: scores.length,
        judgesWhoScored: [...new Set(scores.map((s: any) => s.judge_id))].length,
        shouldAppearInApproval: judgeCounts[0]?.scored_judges === judgeCounts[0]?.total_judges,
        reason: judgeCounts[0]?.scored_judges !== judgeCounts[0]?.total_judges
          ? `Waiting for ${judgeCounts[0]?.total_judges - judgeCounts[0]?.scored_judges} more judge(s) to score`
          : 'All judges have scored - should appear in approval dashboard'
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


