import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

/**
 * GET /api/certificates/check
 * Check if a certificate exists for a performance or entry
 * Query params: performanceId, entryId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const performanceId = searchParams.get('performanceId');
    const entryId = searchParams.get('entryId');

    if (!performanceId && !entryId) {
      return NextResponse.json(
        { error: 'performanceId or entryId is required' },
        { status: 400 }
      );
    }

    const sqlClient = getSql();

    let result;
    if (performanceId) {
      result = await sqlClient`
        SELECT certificate_url, id
        FROM certificates
        WHERE performance_id = ${performanceId}
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[];
    } else if (entryId) {
      result = await sqlClient`
        SELECT certificate_url, id
        FROM certificates
        WHERE event_entry_id = ${entryId}
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[];
    }

    if (result && result.length > 0 && result[0].certificate_url) {
      return NextResponse.json({
        exists: true,
        certificateUrl: result[0].certificate_url,
        certificateId: result[0].id
      });
    }

    return NextResponse.json({
      exists: false
    });

  } catch (error) {
    console.error('Error checking certificate:', error);
    return NextResponse.json(
      { error: 'Failed to check certificate' },
      { status: 500 }
    );
  }
}

