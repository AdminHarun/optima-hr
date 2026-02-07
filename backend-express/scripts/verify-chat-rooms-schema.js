const { sequelize } = require('../config/database');

async function verify() {
  try {
    console.log('🔍 Verifying chat_rooms table schema...');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_rooms'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 chat_rooms table columns:');
    console.log('==========================================');
    columns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('==========================================\n');

    // Check for required columns
    const columnNames = columns.map(c => c.column_name);
    const requiredColumns = ['applicant_id', 'applicant_email', 'applicant_name', 'room_type'];

    console.log('✅ Checking required columns:');
    requiredColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col} - MISSING!`);
      }
    });

    // Check for old columns that should NOT exist
    const oldColumns = ['participant1_id', 'participant2_id', 'participant1_type', 'participant2_type'];
    console.log('\n❌ Checking old columns (should NOT exist):');
    oldColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`  ✗ ${col} - STILL EXISTS! Should be removed!`);
      } else {
        console.log(`  ✓ ${col} - Correctly removed`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
