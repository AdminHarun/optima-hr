// Migration: Add missing columns to chat_rooms table
const { sequelize } = require('../config/database');

async function addChatRoomColumns() {
  try {
    console.log('🔄 Checking chat_rooms table for missing columns...');

    // Check if room_type column exists
    const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'chat_rooms' AND column_name = 'room_type'
    `);

    if (results.length === 0) {
      console.log('📝 Adding room_type column to chat_rooms...');

      // Create the ENUM type first if it doesn't exist
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_chat_rooms_room_type AS ENUM ('applicant', 'admin', 'group');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Add the column
      await sequelize.query(`
        ALTER TABLE chat_rooms
        ADD COLUMN room_type enum_chat_rooms_room_type NOT NULL DEFAULT 'applicant'
      `);

      console.log('✅ room_type column added successfully');
    } else {
      console.log('✅ room_type column already exists');
    }

    // Check for other potentially missing columns
    const columnsToCheck = [
      { name: 'site_code', sql: "ALTER TABLE chat_rooms ADD COLUMN site_code VARCHAR(50)" },
      { name: 'applicant_id', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_id BIGINT" },
      { name: 'applicant_email', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_email VARCHAR(255)" },
      { name: 'applicant_name', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_name VARCHAR(255)" },
      { name: 'room_name', sql: "ALTER TABLE chat_rooms ADD COLUMN room_name VARCHAR(255)" },
      { name: 'is_active', sql: "ALTER TABLE chat_rooms ADD COLUMN is_active BOOLEAN DEFAULT true" },
      { name: 'last_message_id', sql: "ALTER TABLE chat_rooms ADD COLUMN last_message_id INTEGER" },
      { name: 'last_message_at', sql: "ALTER TABLE chat_rooms ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE" },
      { name: 'metadata', sql: "ALTER TABLE chat_rooms ADD COLUMN metadata JSON" }
    ];

    for (const col of columnsToCheck) {
      const [colResults] = await sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'chat_rooms' AND column_name = '${col.name}'
      `);

      if (colResults.length === 0) {
        console.log(`📝 Adding ${col.name} column to chat_rooms...`);
        try {
          await sequelize.query(col.sql);
          console.log(`✅ ${col.name} column added`);
        } catch (err) {
          console.log(`⚠️ Could not add ${col.name}: ${err.message}`);
        }
      }
    }

    console.log('✅ Chat rooms migration completed');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return false;
  }
}

module.exports = { addChatRoomColumns };
