import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      userId,
      userEmail,
      userName,
      eodsaId,
      amount,
      invoiceNumber,
      itemDescription,
      entries,
      submitImmediately
    } = body;

    console.log('🏦 Processing EFT payment submission:', {
      userName,
      userEmail,
      eodsaId,
      amount,
      invoiceNumber,
      entriesCount: entries?.length
    });

    const sqlClient = getSql();

    if (submitImmediately && entries && entries.length > 0) {
      // Submit all entries to the database immediately with pending payment status
      for (const entry of entries) {
        const entryId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        try {
          await sqlClient`
            INSERT INTO event_entries (
              id, event_id, contestant_id, eodsa_id, participant_ids, calculated_fee, 
              payment_status, payment_method, payment_reference, submitted_at, 
              approved, qualified_for_nationals, item_name, choreographer, mastery, 
              item_style, estimated_duration, entry_type, music_file_url, music_file_name, 
              video_external_url, video_external_type
            )
            VALUES (
              ${entryId}, ${entry.eventId}, ${entry.contestantId}, ${entry.eodsaId}, 
              ${JSON.stringify(entry.participantIds)}, ${entry.calculatedFee}, 
              'pending', 'eft', ${invoiceNumber}, ${new Date().toISOString()}, 
              false, true, ${entry.itemName}, ${entry.choreographer}, ${entry.mastery}, 
              ${entry.itemStyle}, ${entry.estimatedDuration}, ${entry.entryType || 'live'}, 
              ${entry.musicFileUrl || null}, ${entry.musicFileName || null}, 
              ${entry.videoExternalUrl || null}, ${entry.videoExternalType || null}
            )
          `;

          console.log(`✅ Entry ${entryId} created successfully for EFT payment`);
        } catch (dbError: any) {
          console.error(`❌ Failed to create entry ${entryId}:`, dbError);
          throw new Error(`Failed to submit entry: ${entry.itemName}`);
        }
      }
    }

    // Log the EFT payment attempt
    const paymentLogId = Date.now().toString();
    try {
      await sqlClient`
        INSERT INTO eft_payment_logs (
          id, user_id, user_email, user_name, eodsa_id, amount, 
          invoice_number, item_description, entries_count, submitted_at, status
        )
        VALUES (
          ${paymentLogId}, ${userId}, ${userEmail}, ${userName}, ${eodsaId}, 
          ${amount}, ${invoiceNumber}, ${itemDescription}, ${entries?.length || 0}, 
          ${new Date().toISOString()}, 'pending_verification'
        )
      `;
    } catch (logError) {
      console.warn('Failed to log EFT payment, but continuing:', logError);
      // Don't fail the main process if logging fails
    }

    console.log('✅ EFT payment processed successfully');

    return NextResponse.json({
      success: true,
      message: 'EFT payment submitted successfully. Entries are now pending payment verification.',
      paymentId: paymentLogId,
      entriesSubmitted: entries?.length || 0
    });

  } catch (error: any) {
    console.error('❌ EFT payment processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to process EFT payment submission' 
      },
      { status: 500 }
    );
  }
}
