// Simple database connection without external dependencies
const https = require('https');
const crypto = require('crypto');

// Database connection
const sql = neon('postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Sample data arrays
const sampleDancers = [
  {
    name: 'Sarah Johnson',
    dateOfBirth: '2005-03-15',
    nationalId: '0503150123456',
    province: 'Gauteng',
    email: 'sarah.johnson@email.com',
    phone: '0821234567',
    guardianName: 'Mary Johnson',
    guardianEmail: 'mary.johnson@email.com',
    guardianPhone: '0821234568'
  },
  {
    name: 'Michael Chen',
    dateOfBirth: '2007-08-22',
    nationalId: '0708220123457',
    province: 'Western Cape',
    email: 'michael.chen@email.com',
    phone: '0832345678',
    guardianName: 'David Chen',
    guardianEmail: 'david.chen@email.com',
    guardianPhone: '0832345679'
  },
  {
    name: 'Emma Williams',
    dateOfBirth: '2004-12-10',
    nationalId: '0412100123458',
    province: 'KwaZulu-Natal',
    email: 'emma.williams@email.com',
    phone: '0843456789',
    guardianName: 'Lisa Williams',
    guardianEmail: 'lisa.williams@email.com',
    guardianPhone: '0843456790'
  },
  {
    name: 'James Brown',
    dateOfBirth: '2006-05-18',
    nationalId: '0605180123459',
    province: 'Free State',
    email: 'james.brown@email.com',
    phone: '0854567890',
    guardianName: 'Robert Brown',
    guardianEmail: 'robert.brown@email.com',
    guardianPhone: '0854567891'
  },
  {
    name: 'Sophie Davis',
    dateOfBirth: '2008-11-03',
    nationalId: '0811030123460',
    province: 'Eastern Cape',
    email: 'sophie.davis@email.com',
    phone: '0865678901',
    guardianName: 'Jennifer Davis',
    guardianEmail: 'jennifer.davis@email.com',
    guardianPhone: '0865678902'
  },
  {
    name: 'Liam Wilson',
    dateOfBirth: '2005-07-25',
    nationalId: '0507250123461',
    province: 'Limpopo',
    email: 'liam.wilson@email.com',
    phone: '0876789012',
    guardianName: 'Mark Wilson',
    guardianEmail: 'mark.wilson@email.com',
    guardianPhone: '0876789013'
  },
  {
    name: 'Olivia Taylor',
    dateOfBirth: '2007-01-14',
    nationalId: '0701140123462',
    province: 'North West',
    email: 'olivia.taylor@email.com',
    phone: '0887890123',
    guardianName: 'Susan Taylor',
    guardianEmail: 'susan.taylor@email.com',
    guardianPhone: '0887890124'
  },
  {
    name: 'Noah Anderson',
    dateOfBirth: '2004-09-30',
    nationalId: '0409300123463',
    province: 'Mpumalanga',
    email: 'noah.anderson@email.com',
    phone: '0898901234',
    guardianName: 'Paul Anderson',
    guardianEmail: 'paul.anderson@email.com',
    guardianPhone: '0898901235'
  }
];

const sampleStudios = [
  {
    name: 'Dance Academy Johannesburg',
    email: 'info@danceacademyjhb.co.za',
    password: 'studio123',
    contactPerson: 'Maria Rodriguez',
    address: '123 Main Street, Johannesburg, Gauteng',
    phone: '0111234567'
  },
  {
    name: 'Cape Town Dance Studio',
    email: 'contact@capetowndance.co.za',
    password: 'studio123',
    contactPerson: 'John Smith',
    address: '456 Long Street, Cape Town, Western Cape',
    phone: '0219876543'
  },
  {
    name: 'Durban Dance Centre',
    email: 'info@durbandancecentre.co.za',
    password: 'studio123',
    contactPerson: 'Thabo Mthembu',
    address: '789 Florida Road, Durban, KwaZulu-Natal',
    phone: '0314567890'
  },
  {
    name: 'Bloemfontein Ballet School',
    email: 'admin@bloemballet.co.za',
    password: 'studio123',
    contactPerson: 'Anna van der Merwe',
    address: '321 Nelson Mandela Drive, Bloemfontein, Free State',
    phone: '0512345678'
  },
  {
    name: 'Port Elizabeth Dance Academy',
    email: 'info@pedanceacademy.co.za',
    password: 'studio123',
    contactPerson: 'David Johnson',
    address: '654 Govan Mbeki Avenue, Port Elizabeth, Eastern Cape',
    phone: '0413456789'
  },
  {
    name: 'Polokwane Dance Studio',
    email: 'contact@polokwanedance.co.za',
    password: 'studio123',
    contactPerson: 'Grace Mokoena',
    address: '987 Church Street, Polokwane, Limpopo',
    phone: '0152345678'
  },
  {
    name: 'Rustenburg Dance School',
    email: 'info@rustenburgdance.co.za',
    password: 'studio123',
    contactPerson: 'Peter van Niekerk',
    address: '147 Kloof Street, Rustenburg, North West',
    phone: '0143456789'
  },
  {
    name: 'Nelspruit Dance Academy',
    email: 'admin@nelspruitdance.co.za',
    password: 'studio123',
    contactPerson: 'Sarah Botha',
    address: '258 Samora Machel Drive, Nelspruit, Mpumalanga',
    phone: '0134567890'
  }
];

const sampleJudges = [
  {
    name: 'Dr. Patricia Williams',
    email: 'patricia.williams@eodsa.co.za',
    password: 'judge123',
    isAdmin: true,
    role: 'admin',
    specialization: ['Contemporary', 'Ballet', 'Jazz']
  },
  {
    name: 'Prof. Michael Thompson',
    email: 'michael.thompson@eodsa.co.za',
    password: 'judge123',
    isAdmin: true,
    role: 'admin',
    specialization: ['Hip Hop', 'Street Dance', 'Commercial']
  },
  {
    name: 'Ms. Jennifer Lee',
    email: 'jennifer.lee@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'judge',
    specialization: ['Ballet', 'Contemporary', 'Modern']
  },
  {
    name: 'Mr. David Rodriguez',
    email: 'david.rodriguez@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'judge',
    specialization: ['Latin', 'Ballroom', 'Salsa']
  },
  {
    name: 'Ms. Lisa Chen',
    email: 'lisa.chen@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'backstage_manager',
    specialization: ['Technical', 'Production']
  },
  {
    name: 'Mr. Robert Johnson',
    email: 'robert.johnson@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'announcer',
    specialization: ['MC', 'Presentation']
  },
  {
    name: 'Ms. Amanda Davis',
    email: 'amanda.davis@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'registration',
    specialization: ['Administration', 'Registration']
  },
  {
    name: 'Mr. Kevin Wilson',
    email: 'kevin.wilson@eodsa.co.za',
    password: 'judge123',
    isAdmin: false,
    role: 'media',
    specialization: ['Photography', 'Videography']
  }
];

// Helper function to generate EODSA ID
function generateEODSAId() {
  const letter = 'E';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

// Helper function to generate Studio Registration Number
function generateStudioRegistrationId() {
  const letter = 'S';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

async function addSampleData() {
  try {
    console.log('🚀 Starting to add sample data...');

    // Add sample judges/admins
    console.log('👥 Adding sample judges and admins...');
    for (const judge of sampleJudges) {
      try {
        const hashedPassword = await bcrypt.hash(judge.password, 12);
        const id = `judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        
        await sql`
          INSERT INTO judges (id, name, email, password, is_admin, role, specialization, created_at)
          VALUES (${id}, ${judge.name}, ${judge.email}, ${hashedPassword}, ${judge.isAdmin}, ${judge.role}, ${JSON.stringify(judge.specialization)}, ${createdAt})
        `;
        
        console.log(`✅ Added judge: ${judge.name} (${judge.role})`);
      } catch (error) {
        console.log(`⚠️ Judge ${judge.name} might already exist: ${error.message}`);
      }
    }

    // Add sample studios
    console.log('🏢 Adding sample studios...');
    for (const studio of sampleStudios) {
      try {
        const hashedPassword = await bcrypt.hash(studio.password, 12);
        const id = Date.now().toString();
        const registrationNumber = generateStudioRegistrationId();
        const createdAt = new Date().toISOString();
        const approvedAt = new Date().toISOString();
        
        await sql`
          INSERT INTO studios (id, name, email, password, contact_person, address, phone, registration_number, created_at, approved_by, approved_at)
          VALUES (${id}, ${studio.name}, ${studio.email}, ${hashedPassword}, ${studio.contactPerson}, ${studio.address}, ${studio.phone}, ${registrationNumber}, ${createdAt}, 'system', ${approvedAt})
        `;
        
        console.log(`✅ Added studio: ${studio.name} (${registrationNumber})`);
      } catch (error) {
        console.log(`⚠️ Studio ${studio.name} might already exist: ${error.message}`);
      }
    }

    // Add sample dancers
    console.log('💃 Adding sample dancers...');
    for (const dancer of sampleDancers) {
      try {
        const eodsaId = generateEODSAId();
        const id = `dancer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        
        // Calculate age from date of birth
        const birthDate = new Date(dancer.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        // Randomly assign approval status (70% approved, 20% pending, 10% rejected)
        const approvalRandom = Math.random();
        let approved = false;
        let approvedBy = null;
        let approvedAt = null;
        let rejectionReason = null;
        
        if (approvalRandom < 0.7) {
          // Approved
          approved = true;
          approvedBy = 'system';
          approvedAt = new Date().toISOString();
        } else if (approvalRandom < 0.9) {
          // Pending (default values)
          approved = false;
        } else {
          // Rejected
          approved = false;
          rejectionReason = 'Incomplete documentation provided';
        }
        
        await sql`
          INSERT INTO dancers (id, eodsa_id, name, age, date_of_birth, national_id, email, phone, guardian_name, guardian_email, guardian_phone, province, approved, approved_by, approved_at, rejection_reason, created_at)
          VALUES (${id}, ${eodsaId}, ${dancer.name}, ${age}, ${dancer.dateOfBirth}, ${dancer.nationalId}, ${dancer.email}, ${dancer.phone}, ${dancer.guardianName}, ${dancer.guardianEmail}, ${dancer.guardianPhone}, ${dancer.province}, ${approved}, ${approvedBy}, ${approvedAt}, ${rejectionReason}, ${createdAt})
        `;
        
        console.log(`✅ Added dancer: ${dancer.name} (${eodsaId}) - Status: ${approved ? 'Approved' : (rejectionReason ? 'Rejected' : 'Pending')}`);
      } catch (error) {
        console.log(`⚠️ Dancer ${dancer.name} might already exist: ${error.message}`);
      }
    }

    console.log('🎉 Sample data addition completed!');
    console.log('\n📊 Summary:');
    console.log(`- ${sampleJudges.length} judges/admins added`);
    console.log(`- ${sampleStudios.length} studios added`);
    console.log(`- ${sampleDancers.length} dancers added`);
    console.log('\n🔑 Login credentials:');
    console.log('Admin: mains@elementscentral.com / 624355Mage55!');
    console.log('Sample Admin: patricia.williams@eodsa.co.za / judge123');
    console.log('Sample Studio: info@danceacademyjhb.co.za / studio123');

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the script
addSampleData();
