import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const sqlClient = getSql();

    // Get all certificates ordered by creation date, with event information
    const certificates = await sqlClient`
      SELECT 
        c.id,
        c.dancer_id,
        c.dancer_name,
        c.eodsa_id,
        c.email,
        c.performance_id,
        c.percentage,
        c.style,
        c.title,
        c.medallion,
        c.event_date,
        c.certificate_url,
        c.sent_at,
        c.sent_by,
        c.downloaded,
        c.downloaded_at,
        c.created_at,
        c.created_by,
        p.event_id,
        e.name as event_name
      FROM certificates c
      LEFT JOIN performances p ON p.id = c.performance_id
      LEFT JOIN events e ON e.id = p.event_id
      ORDER BY c.created_at DESC
    ` as any[];

    return NextResponse.json(certificates);

  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

