// Simple script to add sample data using built-in Node.js modules
const https = require('https');
const crypto = require('crypto');

// Database connection string
const DATABASE_URL = 'postgres://neondb_owner:npg_0QjbL8sznKtx@ep-lingering-base-a426puts-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Simple bcrypt replacement using crypto
function simpleHash(password) {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

// Sample data
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
  }
];

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
  }
];

// Helper functions
function generateEODSAId() {
  const letter = 'E';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

function generateStudioRegistrationId() {
  const letter = 'S';
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${letter}${digits}`;
}

// Function to execute SQL queries via HTTP (Neon's HTTP API)
async function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(DATABASE_URL);
    const hostname = url.hostname;
    const port = url.port || 5432;
    
    // This is a simplified approach - in reality, you'd need to use Neon's HTTP API
    // For now, let's just log what we would do
    console.log('Would execute query:', query);
    console.log('With params:', params);
    resolve({ success: true });
  });
}

async function addSampleData() {
  try {
    console.log('🚀 Starting to add sample data...');
    console.log('📝 Note: This script shows what data would be added.');
    console.log('🔧 To actually add the data, you\'ll need to run these SQL commands directly in your database.');
    
    console.log('\n👥 Sample Judges/Admins to add:');
    for (const judge of sampleJudges) {
      const hashedPassword = simpleHash(judge.password);
      const id = `judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      console.log(`INSERT INTO judges (id, name, email, password, is_admin, role, specialization, created_at)`);
      console.log(`VALUES ('${id}', '${judge.name}', '${judge.email}', '${hashedPassword}', ${judge.isAdmin}, '${judge.role}', '${JSON.stringify(judge.specialization)}', '${createdAt}');`);
      console.log('');
    }

    console.log('\n🏢 Sample Studios to add:');
    for (const studio of sampleStudios) {
      const hashedPassword = simpleHash(studio.password);
      const id = Date.now().toString();
      const registrationNumber = generateStudioRegistrationId();
      const createdAt = new Date().toISOString();
      const approvedAt = new Date().toISOString();
      
      console.log(`INSERT INTO studios (id, name, email, password, contact_person, address, phone, registration_number, created_at, approved_by, approved_at)`);
      console.log(`VALUES ('${id}', '${studio.name}', '${studio.email}', '${hashedPassword}', '${studio.contactPerson}', '${studio.address}', '${studio.phone}', '${registrationNumber}', '${createdAt}', 'system', '${approvedAt}');`);
      console.log('');
    }

    console.log('\n💃 Sample Dancers to add:');
    for (const dancer of sampleDancers) {
      const eodsaId = generateEODSAId();
      const id = `dancer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      // Calculate age from date of birth
      const birthDate = new Date(dancer.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      // Randomly assign approval status
      const approvalRandom = Math.random();
      let approved = false;
      let approvedBy = null;
      let approvedAt = null;
      let rejectionReason = null;
      
      if (approvalRandom < 0.7) {
        approved = true;
        approvedBy = 'system';
        approvedAt = new Date().toISOString();
      } else if (approvalRandom < 0.9) {
        approved = false;
      } else {
        approved = false;
        rejectionReason = 'Incomplete documentation provided';
      }
      
      console.log(`INSERT INTO dancers (id, eodsa_id, name, age, date_of_birth, national_id, email, phone, guardian_name, guardian_email, guardian_phone, province, approved, approved_by, approved_at, rejection_reason, created_at)`);
      console.log(`VALUES ('${id}', '${eodsaId}', '${dancer.name}', ${age}, '${dancer.dateOfBirth}', '${dancer.nationalId}', '${dancer.email}', '${dancer.phone}', '${dancer.guardianName}', '${dancer.guardianEmail}', '${dancer.guardianPhone}', '${dancer.province}', ${approved}, ${approvedBy ? `'${approvedBy}'` : 'NULL'}, ${approvedAt ? `'${approvedAt}'` : 'NULL'}, ${rejectionReason ? `'${rejectionReason}'` : 'NULL'}, '${createdAt}');`);
      console.log('');
    }

    console.log('🎉 Sample data SQL commands generated!');
    console.log('\n📊 Summary:');
    console.log(`- ${sampleJudges.length} judges/admins`);
    console.log(`- ${sampleStudios.length} studios`);
    console.log(`- ${sampleDancers.length} dancers`);
    console.log('\n🔑 Login credentials:');
    console.log('Admin: mains@elementscentral.com / 624355Mage55!');
    console.log('Sample Admin: patricia.williams@eodsa.co.za / judge123');
    console.log('Sample Studio: info@danceacademyjhb.co.za / studio123');

  } catch (error) {
    console.error('❌ Error generating sample data:', error);
  }
}

// Run the script
addSampleData();

