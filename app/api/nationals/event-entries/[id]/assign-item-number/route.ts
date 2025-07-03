import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = id;
    const { itemNumber } = await request.json();

    // Validate the input
    if (typeof itemNumber !== 'number' || itemNumber < 1) {
      return NextResponse.json(
        { error: 'itemNumber must be a positive integer' },
        { status: 400 }
      );
    }

    // Check if item number is already assigned to another entry
    const allEntries = await db.getAllNationalsEventEntries();
    const existingEntry = allEntries.find(entry => 
      entry.itemNumber === itemNumber && entry.id !== entryId
    );

    if (existingEntry) {
      return NextResponse.json(
        { error: `Item number ${itemNumber} is already assigned to another entry` },
        { status: 409 }
      );
    }

    // Update the entry with the item number
    await db.updateNationalsEventEntry(entryId, { itemNumber });

    return NextResponse.json({
      success: true,
      message: `Item number ${itemNumber} assigned successfully`
    });

  } catch (error: any) {
    console.error('Error assigning item number:', error);
    return NextResponse.json(
      { error: 'Failed to assign item number' },
      { status: 500 }
    );
  }
} 