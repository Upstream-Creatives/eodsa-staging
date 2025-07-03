import { NextRequest, NextResponse } from 'next/server';
import { unifiedDb, initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const performanceType = searchParams.get('performanceType');
    const soloCount = parseInt(searchParams.get('soloCount') || '1');
    const participantCount = parseInt(searchParams.get('participantCount') || '1');
    const participantIds = searchParams.get('participantIds');
    
    if (!performanceType) {
      return NextResponse.json(
        { error: 'Performance type is required' },
        { status: 400 }
      );
    }

    // Parse participant IDs if provided
    let participantIdArray: string[] = [];
    if (participantIds) {
      try {
        participantIdArray = JSON.parse(participantIds);
      } catch (error) {
        // If parsing fails, treat as empty array
        participantIdArray = [];
      }
    }

    const feeBreakdown = await unifiedDb.calculateNationalsFee(
      performanceType, 
      soloCount, 
      participantCount, 
      participantIdArray
    );
    
    return NextResponse.json({ 
      ...feeBreakdown,
      // For backwards compatibility, also include the total as 'fee'
      fee: feeBreakdown.totalFee 
    });
  } catch (error) {
    console.error('Error calculating nationals fee:', error);
    return NextResponse.json(
      { error: 'Failed to calculate nationals fee' },
      { status: 500 }
    );
  }
} 