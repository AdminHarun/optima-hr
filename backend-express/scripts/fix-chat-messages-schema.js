const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('🔧 Starting migration: Fixing chat_messages table schema...\n');

    // Check current columns
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'chat_messages';
    `);

    const columnNames = columns.map(c => c.column_name);
    console.log('📊 Current columns:', columnNames.join(', '));
    console.log();

    // 1. Handle file_mime_type column
    if (columnNames.includes('mime_type') && !columnNames.includes('file_mime_type')) {
      console.log('  → Renaming mime_type to file_mime_type...');
      await sequelize.query(`
        ALTER TABLE chat_messages
        RENAME COLUMN mime_type TO file_mime_type;
      `);
      console.log('  ✅ Renamed mime_type to file_mime_type');
    } else if (!columnNames.includes('file_mime_type')) {
      console.log('  → Adding file_mime_type column...');
      await sequelize.query(`
        ALTER TABLE chat_messages
        ADD COLUMN file_mime_type VARCHAR(100);
      `);
      console.log('  ✅ Added file_mime_type column');
    } else {
      console.log('  ✓ file_mime_type column already exists');
    }

    // 2. Add metadata column
    if (!columnNames.includes('metadata')) {
      console.log('  → Adding metadata column...');
      await sequelize.query(`
        ALTER TABLE chat_messages
        ADD COLUMN metadata JSONB;
      `);
      console.log('  ✅ Added metadata column');
    } else {
      console.log('  ✓ metadata column already exists');
    }

    // 3. Add edited_at column
    if (!columnNames.includes('edited_at')) {
      console.log('  → Adding edited_at column...');
      await sequelize.query(`
        ALTER TABLE chat_messages
        ADD COLUMN edited_at TIMESTAMP;
      `);
      console.log('  ✅ Added edited_at column');
    } else {
      console.log('  ✓ edited_at column already exists');
    }

    // 4. Add read_at column (for status tracking)
    if (!columnNames.includes('read_at')) {
      console.log('  → Adding read_at column...');
      await sequelize.query(`
        ALTER TABLE chat_messages
        ADD COLUMN read_at TIMESTAMP;
      `);
      console.log('  ✅ Added read_at column');
    } else {
      console.log('  ✓ read_at column already exists');
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify final schema
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_messages'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Final chat_messages schema:');
    console.log('==========================================');
    finalColumns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type}`);
    });
    console.log('==========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
