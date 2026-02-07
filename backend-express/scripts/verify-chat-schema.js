const { sequelize } = require('../config/database');

async function verify() {
  try {
    console.log('🔍 Verifying chat_messages table schema...');

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_messages'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 chat_messages table columns:');
    console.log('==========================================');
    columns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('==========================================\n');

    // Check for required columns
    const columnNames = columns.map(c => c.column_name);
    const requiredColumns = ['file_mime_type', 'metadata', 'edited_at', 'read_at'];

    console.log('✅ Checking required columns:');
    requiredColumns.forEach(col => {
      if (columnNames.includes(col)) {
        console.log(`  ✓ ${col}`);
      } else {
        console.log(`  ✗ ${col} - MISSING!`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
