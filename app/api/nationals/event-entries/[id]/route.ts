import { NextRequest, NextResponse } from 'next/server';
import { unifiedDb } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { approved } = body;

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'approved field must be a boolean' },
        { status: 400 }
      );
    }

    // Update the entry approval status
    const result = await unifiedDb.updateNationalsEventEntry(id, { approved });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update entry or entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Entry ${approved ? 'approved' : 'unapproved'} successfully`,
      entry: result
    });

  } catch (error) {
    console.error('Error updating nationals event entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
} 