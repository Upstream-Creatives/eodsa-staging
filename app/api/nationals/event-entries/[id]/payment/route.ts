import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

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
    const { paymentStatus } = body;

    if (!paymentStatus || !['paid', 'pending', 'failed'].includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Valid payment status is required (paid, pending, failed)' },
        { status: 400 }
      );
    }

    // Update the payment status
    const result = await db.updateNationalsEventPayment(id, paymentStatus);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update payment status or entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      entry: result
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
} 