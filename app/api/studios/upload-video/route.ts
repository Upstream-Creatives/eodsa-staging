import { NextRequest, NextResponse } from 'next/server';
import { unifiedDb } from '@/lib/database';

// Allow studios to upload video for their dancers' entries
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { studioId, entryId, videoFileUrl, videoFileName } = body;

    if (!studioId || !entryId || !videoFileUrl || !videoFileName) {
      return NextResponse.json(
        { success: false, error: 'Studio ID, entry ID, video file URL, and filename are required' },
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
        { success: false, error: 'Only virtual entries can have video uploaded' },
        { status: 400 }
      );
    }

    // Update the entry with video information using the existing studio entry update method
    const updatedEntry = await unifiedDb.updateStudioEntry(studioId, entryId, {
      videoFileUrl,
      videoFileName
    });

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully by studio',
      entry: {
        ...updatedEntry,
        videoFileUrl,
        videoFileName
      }
    });

  } catch (error: any) {
    console.error('Error uploading video for studio entry:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
