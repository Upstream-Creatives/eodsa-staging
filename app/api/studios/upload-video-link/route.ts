import { NextRequest, NextResponse } from 'next/server';
import { unifiedDb, getSql } from '@/lib/database';

// Allow studios to save video link for their dancers' virtual entries
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { studioId, entryId, videoExternalUrl, videoExternalType } = body;

    if (!studioId || !entryId || !videoExternalUrl || !videoExternalType) {
      return NextResponse.json(
        { success: false, error: 'Studio ID, entry ID, video URL, and video type are required' },
        { status: 400 }
      );
    }

    // Verify that this entry belongs to this studio
    const studioEntries = await unifiedDb.getStudioEntries(studioId);
    const entry = studioEntries.find(e => e.id === entryId);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found or does not belong to this studio' },
        { status: 404 }
      );
    }

    // Verify this is a virtual entry that can have video
    if (entry.entryType !== 'virtual') {
      return NextResponse.json(
        { success: false, error: 'Only virtual entries can have video links' },
        { status: 400 }
      );
    }

    // Update the entry with video link information
    const sqlClient = getSql();
    await sqlClient`
      UPDATE event_entries
      SET video_external_url = ${videoExternalUrl},
          video_external_type = ${videoExternalType}
      WHERE id = ${entryId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Video link saved successfully by studio',
      entry: {
        ...entry,
        videoExternalUrl,
        videoExternalType
      }
    });

  } catch (error: any) {
    console.error('Error saving video link for studio entry:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

