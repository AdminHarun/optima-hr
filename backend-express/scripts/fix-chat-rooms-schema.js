const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('🔧 Starting migration: Fixing chat_rooms table schema...');

    // Drop old chat_rooms table and recreate with correct schema
    console.log('  → Dropping old chat_rooms table...');
    await sequelize.query(`DROP TABLE IF EXISTS chat_rooms CASCADE;`);

    // Recreate with correct schema
    console.log('  → Creating chat_rooms table with correct schema...');
    await sequelize.query(`
      CREATE TABLE chat_rooms (
        id SERIAL PRIMARY KEY,
        room_type VARCHAR(50) DEFAULT 'applicant',
        applicant_id BIGINT,
        applicant_email VARCHAR(255),
        applicant_name VARCHAR(255),
        room_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_message_id INTEGER,
        last_message_at TIMESTAMP,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log('  → Creating indexes...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_applicant ON chat_rooms(applicant_id);
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(room_type);
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📊 chat_rooms table recreated with applicant_id column');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
