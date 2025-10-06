// Script to fix existing virtual entry performances
// Run with: node scripts/fix-virtual-performances.js

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const sql = neon(process.env.DATABASE_URL);

async function fixVirtualPerformances() {
  console.log('🔍 Checking for virtual entries with performances...\n');

  try {
    // Get all virtual entries
    const virtualEntries = await sql`
      SELECT
        ee.id as entry_id,
        ee.item_name,
        ee.item_number,
        ee.video_external_url,
        ee.video_external_type,
        ee.entry_type,
        ee.event_id
      FROM event_entries ee
      WHERE ee.entry_type = 'virtual' AND ee.approved = true
    `;

    console.log(`Found ${virtualEntries.length} virtual entries\n`);

    for (const entry of virtualEntries) {
      console.log(`\n📹 Virtual Entry: "${entry.item_name}" (Item #${entry.item_number || '?'})`);

      // Find corresponding performance
      const performances = await sql`
        SELECT id, title, item_number, entry_type, video_external_url
        FROM performances
        WHERE event_entry_id = ${entry.entry_id}
      `;

      if (performances.length === 0) {
        console.log('  ❌ NO PERFORMANCE FOUND - Needs to be created');
      } else {
        const perf = performances[0];
        console.log(`  ✓ Performance exists: ${perf.id}`);
        console.log(`    - Item Number: ${perf.item_number || '❌ MISSING'}`);
        console.log(`    - Entry Type: ${perf.entry_type || '❌ MISSING'}`);
        console.log(`    - Video URL: ${perf.video_external_url ? '✓' : '❌ MISSING'}`);

        // Fix missing data
        let needsUpdate = false;
        const updates = [];

        if (!perf.item_number && entry.item_number) {
          updates.push(`item_number = ${entry.item_number}`);
          needsUpdate = true;
        }

        if (!perf.entry_type) {
          updates.push(`entry_type = 'virtual'`);
          needsUpdate = true;
        }

        if (!perf.video_external_url && entry.video_external_url) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log(`  🔧 FIXING performance ${perf.id}...`);

          await sql`
            UPDATE performances
            SET
              item_number = ${entry.item_number || null},
              entry_type = 'virtual',
              video_external_url = ${entry.video_external_url || null},
              video_external_type = ${entry.video_external_type || null}
            WHERE id = ${perf.id}
          `;

          console.log(`  ✅ Fixed!`);
        } else {
          console.log(`  ✓ Already correct`);
        }
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixVirtualPerformances();
