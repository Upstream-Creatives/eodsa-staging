require('dotenv').config({ path: '.env' });
const { sql } = require('@vercel/postgres');

async function fixParticipantNames() {
  try {
    console.log('🔧 Starting to fix participant names in performances...\n');

    // Get all performances with their event entries
    const result = await sql`
      SELECT 
        p.id as performance_id,
        p.title,
        p.participant_names,
        p.event_entry_id,
        ee.participant_ids
      FROM performances p
      JOIN event_entries ee ON ee.id = p.event_entry_id
      WHERE ee.participant_ids IS NOT NULL
    `;
    
    const performances = result.rows;
    console.log(`📊 Found ${performances.length} performances to check\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const perf of performances) {
      try {
        // Parse participant_names (current)
        let currentNames = [];
        try {
          currentNames = JSON.parse(perf.participant_names || '[]');
        } catch {
          currentNames = [];
        }

        // Check if it has "Unknown Dancer" or "Participant X"
        const hasUnknown = currentNames.some(name => 
          name === 'Unknown Dancer' || 
          name.startsWith('Participant ')
        );

        if (!hasUnknown) {
          skipped++;
          continue; // Skip if names look good
        }

        // Parse participant_ids
        let participantIds = [];
        try {
          participantIds = typeof perf.participant_ids === 'string' 
            ? JSON.parse(perf.participant_ids) 
            : perf.participant_ids;
        } catch {
          console.warn(`⚠️  Could not parse participant_ids for ${perf.title}`);
          failed++;
          continue;
        }

        if (!Array.isArray(participantIds) || participantIds.length === 0) {
          failed++;
          continue;
        }

        // Fetch dancer names - try by ID first
        let dancersResult = await sql`
          SELECT id, eodsa_id, name 
          FROM dancers 
          WHERE id = ANY(${participantIds})
        `;
        let dancers = dancersResult.rows;

        // If no results, try by EODSA ID
        if (dancers.length === 0) {
          const dancersResult2 = await sql`
            SELECT id, eodsa_id, name 
            FROM dancers 
            WHERE eodsa_id = ANY(${participantIds})
          `;
          dancers = dancersResult2.rows;
        }

        // Build new participant names array
        const newNames = [];
        for (const pid of participantIds) {
          const dancer = dancers.find(d => d.id === pid || d.eodsa_id === pid);
          if (dancer?.name) {
            newNames.push(dancer.name);
          } else {
            console.warn(`⚠️  Dancer not found for ID: ${pid} in ${perf.title}`);
            newNames.push('Unknown Dancer'); // Keep as Unknown if really not found
          }
        }

        // Update the performance
        await sql`
          UPDATE performances 
          SET participant_names = ${JSON.stringify(newNames)}
          WHERE id = ${perf.performance_id}
        `;

        console.log(`✅ Updated "${perf.title}": ${currentNames.join(', ')} → ${newNames.join(', ')}`);
        updated++;

      } catch (err) {
        console.error(`❌ Error processing ${perf.title}:`, err.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped} (already correct)`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fixParticipantNames();

