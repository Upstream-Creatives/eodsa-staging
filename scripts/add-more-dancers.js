// Script to add 5 more dancers to the studios
const { neon } = require('@neondatabase/serverless');

// Database connection
const DATABASE_URL = 'postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

// Helper function
function generateEODSAId() {
  const letter = 'E';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

async function addMoreDancers() {
  try {
    console.log('🚀 Adding 5 more dancers to the studios...');
    
    // First, get the existing studios
    const studios = await sql`SELECT id, name, email FROM studios ORDER BY created_at DESC LIMIT 4`;
    console.log(`Found ${studios.length} studios to assign dancers to`);
    
    // 5 new dancers with different approval statuses
    const newDancers = [
      {
        name: 'Zoe Martinez',
        dateOfBirth: '2005-11-08',
        nationalId: '0511080123464',
        province: 'Gauteng',
        email: 'zoe.martinez@email.com',
        phone: '0823456789',
        guardianName: 'Carlos Martinez',
        guardianEmail: 'carlos.martinez@email.com',
        guardianPhone: '0823456790',
        approvalStatus: 'approved' // Will be approved
      },
      {
        name: 'Alex Thompson',
        dateOfBirth: '2006-04-12',
        nationalId: '0604120123465',
        province: 'Western Cape',
        email: 'alex.thompson@email.com',
        phone: '0834567890',
        guardianName: 'Sarah Thompson',
        guardianEmail: 'sarah.thompson@email.com',
        guardianPhone: '0834567891',
        approvalStatus: 'pending' // Will be pending
      },
      {
        name: 'Maya Patel',
        dateOfBirth: '2007-09-25',
        nationalId: '0709250123466',
        province: 'KwaZulu-Natal',
        email: 'maya.patel@email.com',
        phone: '0845678901',
        guardianName: 'Raj Patel',
        guardianEmail: 'raj.patel@email.com',
        guardianPhone: '0845678902',
        approvalStatus: 'approved' // Will be approved
      },
      {
        name: 'Jordan Kim',
        dateOfBirth: '2004-07-03',
        nationalId: '0407030123467',
        province: 'Free State',
        email: 'jordan.kim@email.com',
        phone: '0856789012',
        guardianName: 'Lisa Kim',
        guardianEmail: 'lisa.kim@email.com',
        guardianPhone: '0856789013',
        approvalStatus: 'rejected' // Will be rejected
      },
      {
        name: 'Taylor Johnson',
        dateOfBirth: '2006-12-18',
        nationalId: '0612180123468',
        province: 'Limpopo',
        email: 'taylor.johnson@email.com',
        phone: '0867890123',
        guardianName: 'Mike Johnson',
        guardianEmail: 'mike.johnson@email.com',
        guardianPhone: '0867890124',
        approvalStatus: 'approved' // Will be approved
      }
    ];
    
    for (let i = 0; i < newDancers.length; i++) {
      const dancer = newDancers[i];
      const studio = studios[i % studios.length]; // Cycle through studios
      
      try {
        const eodsaId = generateEODSAId();
        const id = `dancer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        
        // Calculate age from date of birth
        const birthDate = new Date(dancer.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        // Set approval status based on the predefined status
        let approved = false;
        let approvedBy = null;
        let approvedAt = null;
        let rejectionReason = null;
        
        if (dancer.approvalStatus === 'approved') {
          approved = true;
          approvedBy = 'system';
          approvedAt = new Date().toISOString();
        } else if (dancer.approvalStatus === 'rejected') {
          approved = false;
          rejectionReason = 'Missing required documentation';
        } else {
          approved = false; // pending
        }
        
        // Insert the dancer
        await sql`
          INSERT INTO dancers (id, eodsa_id, name, age, date_of_birth, national_id, email, phone, guardian_name, guardian_email, guardian_phone, province, approved, approved_by, approved_at, rejection_reason, created_at)
          VALUES (${id}, ${eodsaId}, ${dancer.name}, ${age}, ${dancer.dateOfBirth}, ${dancer.nationalId}, ${dancer.email}, ${dancer.phone}, ${dancer.guardianName}, ${dancer.guardianEmail}, ${dancer.guardianPhone}, ${dancer.province}, ${approved}, ${approvedBy}, ${approvedAt}, ${rejectionReason}, ${createdAt})
        `;
        
        console.log(`✅ Added dancer: ${dancer.name} (${eodsaId}) - Status: ${dancer.approvalStatus.toUpperCase()} - Assigned to: ${studio.name}`);
        
        // If approved, create a studio application (dancer-studio relationship)
        if (approved) {
          try {
            const applicationId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const applicationCreatedAt = new Date().toISOString();
            
            await sql`
              INSERT INTO studio_applications (id, dancer_id, studio_id, status, applied_at, accepted_at, created_at)
              VALUES (${applicationId}, ${id}, ${studio.id}, 'accepted', ${applicationCreatedAt}, ${applicationCreatedAt}, ${applicationCreatedAt})
            `;
            
            console.log(`  📝 Created studio application for ${dancer.name} → ${studio.name}`);
          } catch (appError) {
            console.log(`  ⚠️ Could not create studio application: ${appError.message}`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️ Dancer ${dancer.name} might already exist: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Additional dancers added successfully!');
    console.log('\n📊 Summary of new dancers:');
    console.log('✅ Zoe Martinez (EODSA ID: E[random]) - APPROVED - Dance Academy Johannesburg');
    console.log('⏳ Alex Thompson (EODSA ID: E[random]) - PENDING - Cape Town Dance Studio');
    console.log('✅ Maya Patel (EODSA ID: E[random]) - APPROVED - Durban Dance Centre');
    console.log('❌ Jordan Kim (EODSA ID: E[random]) - REJECTED - Bloemfontein Ballet School');
    console.log('✅ Taylor Johnson (EODSA ID: E[random]) - APPROVED - Dance Academy Johannesburg');
    
    console.log('\n🔑 Login credentials remain the same:');
    console.log('Admin: mains@elementscentral.com / 624355Mage55!');
    console.log('Sample Admin: patricia.williams@eodsa.co.za / judge123');
    console.log('Sample Studio: info@danceacademyjhb.co.za / studio123');
    
  } catch (error) {
    console.error('❌ Error adding more dancers:', error);
  }
}

// Run the script
addMoreDancers();
