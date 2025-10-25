/**
 * FIX MISSING PERFORMANCES FOR VIRTUAL ENTRIES
 * 
 * This script creates performances for approved+paid virtual entries that don't have them.
 * Run this if judges report they can't see virtual entries that have been approved.
 * 
 * Usage: node scripts/fix-virtual-missing-performances.js
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function fixVirtualMissingPerformances() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('\n🔧 FIXING MISSING PERFORMANCES FOR VIRTUAL ENTRIES');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // 1. Find approved+paid virtual entries without performances
    console.log('📊 Step 1: Finding approved+paid virtual entries without performances...\n');
    
    const missingEntries = await sql`
      SELECT 
        ee.id,
        ee.event_id,
        ee.contestant_id,
        ee.item_name,
        ee.participant_ids,
        ee.estimated_duration,
        ee.choreographer,
        ee.mastery,
        ee.item_style,
        ee.entry_type,
        ee.music_file_url,
        ee.music_file_name,
        ee.video_file_url,
        ee.video_file_name,
        ee.video_external_url,
        ee.video_external_type,
        ee.approved,
        ee.payment_status,
        ee.item_number,
        e.name as event_name
      FROM event_entries ee
      LEFT JOIN performances p ON p.event_entry_id = ee.id
      LEFT JOIN events e ON e.id = ee.event_id
      WHERE p.id IS NULL 
        AND ee.approved = true
        AND ee.payment_status = 'paid'
        AND ee.entry_type = 'virtual'
      ORDER BY ee.created_at ASC
    `;

    console.log(`Found ${missingEntries.length} approved+paid virtual entries without performances:\n`);
    
    if (missingEntries.length === 0) {
      console.log('✅ No missing performances found. All virtual entries have performances!');
      return;
    }

    missingEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.item_name}`);
      console.log(`   Entry ID: ${entry.id}`);
      console.log(`   Event: ${entry.event_name}`);
      console.log(`   Approved: ${entry.approved}`);
      console.log(`   Payment: ${entry.payment_status}`);
      console.log('');
    });

    // 2. Create performances for these entries
    console.log('\n📝 Step 2: Creating performances...\n');
    
    let created = 0;
    let errors = 0;

    for (const entry of missingEntries) {
      try {
        // Get participant names from dancers table
        const participantNames = [];
        
        if (entry.participant_ids && Array.isArray(entry.participant_ids)) {
          for (const participantId of entry.participant_ids) {
            try {
              const dancer = await sql`
                SELECT name FROM dancers 
                WHERE id = ${participantId} OR eodsa_id = ${participantId}
                LIMIT 1
              `;
              
              if (dancer.length > 0 && dancer[0].name) {
                participantNames.push(dancer[0].name);
              } else {
                participantNames.push(`Participant ${participantNames.length + 1}`);
              }
            } catch (err) {
              participantNames.push(`Participant ${participantNames.length + 1}`);
            }
          }
        }

        // If no participants found, add at least one
        if (participantNames.length === 0) {
          participantNames.push('Participant 1');
        }

        // Generate performance ID
        const performanceId = `perf_${entry.id}_${Math.floor(Math.random() * 1000000)}`;

        // Create the performance
        await sql`
          INSERT INTO performances (
            id,
            event_id,
            event_entry_id,
            contestant_id,
            title,
            participant_names,
            duration,
            item_number,
            choreographer,
            mastery,
            item_style,
            status,
            entry_type,
            video_external_url,
            video_external_type,
            music_file_url,
            music_file_name,
            created_at,
            updated_at
          ) VALUES (
            ${performanceId},
            ${entry.event_id},
            ${entry.id},
            ${entry.contestant_id},
            ${entry.item_name},
            ${participantNames},
            ${entry.estimated_duration || 0},
            ${entry.item_number || null},
            ${entry.choreographer || null},
            ${entry.mastery || null},
            ${entry.item_style || null},
            'scheduled',
            'virtual',
            ${entry.video_external_url || null},
            ${entry.video_external_type || null},
            ${entry.music_file_url || null},
            ${entry.music_file_name || null},
            NOW(),
            NOW()
          )
        `;

        console.log(`✅ Created performance for: ${entry.item_name}`);
        console.log(`   Performance ID: ${performanceId}`);
        console.log(`   Entry ID: ${entry.id}`);
        console.log(`   Participants: ${participantNames.join(', ')}`);
        console.log('');
        
        created++;
      } catch (error) {
        console.error(`❌ Failed to create performance for: ${entry.item_name}`);
        console.error(`   Entry ID: ${entry.id}`);
        console.error(`   Error: ${error.message}`);
        console.error('');
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total entries processed: ${missingEntries.length}`);
    console.log(`✅ Performances created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('');

    if (created > 0) {
      console.log('🎉 SUCCESS! Virtual entries now have performances and will be visible to judges.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Ask judges to refresh their dashboard');
      console.log('2. Verify the performances appear in the judge interface');
      console.log('3. Check that video URLs are accessible');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

fixVirtualMissingPerformances();

