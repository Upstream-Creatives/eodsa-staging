/**
 * FIX MISSING PERFORMANCES - CRITICAL
 * 
 * This script creates performances for approved entries that don't have them.
 * Found: 79 approved+paid entries without performances!
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function fixMissingPerformances() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('\n🔧 FIXING MISSING PERFORMANCES');
  console.log('=' .repeat(80));
  console.log('\n');

  try {
    // 1. Find approved entries without performances
    console.log('📊 Step 1: Finding approved entries without performances...\n');
    
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
        e.age_category,
        e.name as event_name
      FROM event_entries ee
      LEFT JOIN performances p ON p.event_entry_id = ee.id
      LEFT JOIN events e ON e.id = ee.event_id
      WHERE p.id IS NULL 
        AND ee.approved = true
        AND ee.payment_status = 'paid'
      ORDER BY ee.created_at ASC
    `;

    console.log(`Found ${missingEntries.length} approved + paid entries without performances\n`);

    if (missingEntries.length === 0) {
      console.log('✅ No missing performances to fix!\n');
      return;
    }

    // Show breakdown
    const byPaymentStatus = missingEntries.reduce((acc, entry) => {
      acc[entry.payment_status] = (acc[entry.payment_status] || 0) + 1;
      return acc;
    }, {});

    console.log('Breakdown by payment status:');
    Object.entries(byPaymentStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    console.log('');

    const byEntryType = missingEntries.reduce((acc, entry) => {
      const type = entry.entry_type || 'NULL';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    console.log('Breakdown by entry type:');
    Object.entries(byEntryType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log('\n');

    // 2. Create performances for each missing entry
    console.log('🔨 Step 2: Creating missing performances...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const entry of missingEntries) {
      try {
        const performanceId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Parse participant_ids if it's a string
        let participantNames = [];
        try {
          const participantIds = typeof entry.participant_ids === 'string' 
            ? JSON.parse(entry.participant_ids) 
            : entry.participant_ids;
          
          // Try to get participant names from dancers table
          if (participantIds && participantIds.length > 0) {
            const dancers = await sql`
              SELECT name FROM dancers WHERE id = ANY(${participantIds})
            `;
            participantNames = dancers.map(d => d.name);
          }
        } catch (e) {
          console.warn(`  ⚠️  Could not parse participant names for entry ${entry.id}`);
        }

        // If no names found, use placeholder
        if (participantNames.length === 0) {
          participantNames = ['Participant'];
        }

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
            choreographer,
            mastery,
            item_style,
            status,
            entry_type,
            music_file_url,
            music_file_name,
            video_external_url,
            video_external_type,
            age_category,
            item_number
          ) VALUES (
            ${performanceId},
            ${entry.event_id},
            ${entry.id},
            ${entry.contestant_id},
            ${entry.item_name},
            ${JSON.stringify(participantNames)},
            ${entry.estimated_duration || 5},
            ${entry.choreographer || 'Unknown'},
            ${entry.mastery || 'Unknown'},
            ${entry.item_style || 'Unknown'},
            'scheduled',
            ${entry.entry_type || 'live'},
            ${entry.music_file_url || null},
            ${entry.music_file_name || null},
            ${entry.video_external_url || null},
            ${entry.video_external_type || null},
            ${entry.age_category || null},
            ${entry.item_number || null}
          )
        `;

        successCount++;
        console.log(`  ✅ Created performance for: ${entry.item_name} (Event: ${entry.event_name})`);

      } catch (error) {
        errorCount++;
        errors.push({ entry: entry.item_name, error: error.message });
        console.error(`  ❌ Failed to create performance for: ${entry.item_name}`);
        console.error(`     Error: ${error.message}`);
      }
    }

    // 3. Summary
    console.log('\n');
    console.log('=' .repeat(80));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Total entries processed:     ${missingEntries.length}`);
    console.log(`✅ Successfully created:      ${successCount}`);
    console.log(`❌ Failed:                    ${errorCount}`);
    console.log('');

    if (errors.length > 0) {
      console.log('⚠️  ERRORS:');
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.entry}: ${err.error}`);
      });
      console.log('');
    }

    // 4. Verify the fix
    console.log('🔍 Step 3: Verifying fix...\n');
    
    const stillMissing = await sql`
      SELECT COUNT(*) as count
      FROM event_entries ee
      LEFT JOIN performances p ON p.event_entry_id = ee.id
      WHERE p.id IS NULL AND ee.approved = true AND ee.payment_status = 'paid'
    `;

    console.log(`Approved + paid entries still missing performances: ${stillMissing[0].count}`);
    
    if (stillMissing[0].count === 0) {
      console.log('✅ ALL APPROVED ENTRIES NOW HAVE PERFORMANCES!\n');
    } else {
      console.log(`⚠️  ${stillMissing[0].count} approved entries still missing performances\n`);
    }

    // Show updated totals
    const updatedCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM event_entries) as total_entries,
        (SELECT COUNT(*) FROM performances) as total_performances,
        (SELECT COUNT(*) FROM event_entries WHERE entry_type = 'live') as live_entries,
        (SELECT COUNT(*) FROM event_entries WHERE entry_type = 'virtual') as virtual_entries
    `;

    console.log('📊 UPDATED COUNTS:');
    console.log(`Total entries:        ${updatedCounts[0].total_entries}`);
    console.log(`Total performances:   ${updatedCounts[0].total_performances}`);
    console.log(`Live entries:         ${updatedCounts[0].live_entries}`);
    console.log(`Virtual entries:      ${updatedCounts[0].virtual_entries}`);
    console.log('');

    console.log('✅ Fix complete!\n');

  } catch (error) {
    console.error('❌ Critical error during fix:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixMissingPerformances()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { fixMissingPerformances };

