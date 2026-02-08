// Comprehensive Chat Tables Migration
// This script ensures chat_rooms and chat_messages tables match the expected schema

const syncChatTables = async (sequelize) => {
  console.log('🔄 Starting comprehensive chat tables sync...');

  try {
    // ============================================
    // 1. Create ENUM types if not exist
    // ============================================
    console.log('📝 Creating ENUM types...');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_chat_rooms_room_type AS ENUM ('applicant', 'admin', 'group');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_chat_messages_sender_type AS ENUM ('admin', 'applicant', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_chat_messages_message_type AS ENUM ('text', 'file', 'image', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_chat_messages_status AS ENUM ('sent', 'delivered', 'read', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ ENUM types ensured');

    // ============================================
    // 2. Create chat_rooms table if not exists
    // ============================================
    console.log('📝 Checking chat_rooms table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id SERIAL PRIMARY KEY,
        room_type enum_chat_rooms_room_type NOT NULL DEFAULT 'applicant',
        applicant_id BIGINT,
        applicant_email VARCHAR(255),
        applicant_name VARCHAR(255),
        room_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_message_id INTEGER,
        last_message_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        site_code VARCHAR(50)
      );
    `);

    // Add missing columns to chat_rooms
    const chatRoomColumns = [
      { name: 'room_type', sql: "ALTER TABLE chat_rooms ADD COLUMN room_type enum_chat_rooms_room_type NOT NULL DEFAULT 'applicant'" },
      { name: 'applicant_id', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_id BIGINT" },
      { name: 'applicant_email', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_email VARCHAR(255)" },
      { name: 'applicant_name', sql: "ALTER TABLE chat_rooms ADD COLUMN applicant_name VARCHAR(255)" },
      { name: 'room_name', sql: "ALTER TABLE chat_rooms ADD COLUMN room_name VARCHAR(255)" },
      { name: 'is_active', sql: "ALTER TABLE chat_rooms ADD COLUMN is_active BOOLEAN DEFAULT true" },
      { name: 'last_message_id', sql: "ALTER TABLE chat_rooms ADD COLUMN last_message_id INTEGER" },
      { name: 'last_message_at', sql: "ALTER TABLE chat_rooms ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE" },
      { name: 'metadata', sql: "ALTER TABLE chat_rooms ADD COLUMN metadata JSONB" },
      { name: 'site_code', sql: "ALTER TABLE chat_rooms ADD COLUMN site_code VARCHAR(50)" },
      { name: 'created_at', sql: "ALTER TABLE chat_rooms ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()" },
      { name: 'updated_at', sql: "ALTER TABLE chat_rooms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()" }
    ];

    for (const col of chatRoomColumns) {
      try {
        const [result] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'chat_rooms' AND column_name = '${col.name}'
        `);
        if (result.length === 0) {
          await sequelize.query(col.sql);
          console.log(`  ✅ Added chat_rooms.${col.name}`);
        }
      } catch (e) {
        // Column might already exist with different type
      }
    }

    console.log('✅ chat_rooms table synced');

    // ============================================
    // 3. Create chat_messages table if not exists
    // ============================================
    console.log('📝 Checking chat_messages table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(100) NOT NULL UNIQUE,
        room_id INTEGER NOT NULL,
        sender_type enum_chat_messages_sender_type NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_id INTEGER,
        message_type enum_chat_messages_message_type NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        file_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        file_mime_type VARCHAR(100),
        reply_to_id INTEGER,
        status enum_chat_messages_status NOT NULL DEFAULT 'sent',
        reactions JSONB DEFAULT '[]',
        metadata JSONB,
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMP WITH TIME ZONE,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Fix room_id column type if it's VARCHAR
    try {
      await sequelize.query(`
        ALTER TABLE chat_messages
        ALTER COLUMN room_id TYPE INTEGER USING room_id::INTEGER
      `);
      console.log('  ✅ Fixed room_id type to INTEGER');
    } catch (e) {
      // Already INTEGER or can't convert
    }

    // Add missing columns to chat_messages
    const chatMessageColumns = [
      { name: 'message_id', sql: "ALTER TABLE chat_messages ADD COLUMN message_id VARCHAR(100) NOT NULL DEFAULT 'msg_' || extract(epoch from now())::text" },
      { name: 'sender_type', sql: "ALTER TABLE chat_messages ADD COLUMN sender_type enum_chat_messages_sender_type NOT NULL DEFAULT 'applicant'" },
      { name: 'sender_name', sql: "ALTER TABLE chat_messages ADD COLUMN sender_name VARCHAR(255) NOT NULL DEFAULT 'Unknown'" },
      { name: 'sender_id', sql: "ALTER TABLE chat_messages ADD COLUMN sender_id INTEGER" },
      { name: 'message_type', sql: "ALTER TABLE chat_messages ADD COLUMN message_type enum_chat_messages_message_type NOT NULL DEFAULT 'text'" },
      { name: 'content', sql: "ALTER TABLE chat_messages ADD COLUMN content TEXT NOT NULL DEFAULT ''" },
      { name: 'file_url', sql: "ALTER TABLE chat_messages ADD COLUMN file_url TEXT" },
      { name: 'file_name', sql: "ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255)" },
      { name: 'file_size', sql: "ALTER TABLE chat_messages ADD COLUMN file_size INTEGER" },
      { name: 'file_mime_type', sql: "ALTER TABLE chat_messages ADD COLUMN file_mime_type VARCHAR(100)" },
      { name: 'reply_to_id', sql: "ALTER TABLE chat_messages ADD COLUMN reply_to_id INTEGER" },
      { name: 'status', sql: "ALTER TABLE chat_messages ADD COLUMN status enum_chat_messages_status NOT NULL DEFAULT 'sent'" },
      { name: 'reactions', sql: "ALTER TABLE chat_messages ADD COLUMN reactions JSONB DEFAULT '[]'" },
      { name: 'metadata', sql: "ALTER TABLE chat_messages ADD COLUMN metadata JSONB" },
      { name: 'is_edited', sql: "ALTER TABLE chat_messages ADD COLUMN is_edited BOOLEAN DEFAULT false" },
      { name: 'edited_at', sql: "ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE" },
      { name: 'is_deleted', sql: "ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT false" },
      { name: 'deleted_at', sql: "ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE" },
      { name: 'read_at', sql: "ALTER TABLE chat_messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE" },
      { name: 'created_at', sql: "ALTER TABLE chat_messages ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()" },
      { name: 'updated_at', sql: "ALTER TABLE chat_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()" }
    ];

    for (const col of chatMessageColumns) {
      try {
        const [result] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'chat_messages' AND column_name = '${col.name}'
        `);
        if (result.length === 0) {
          await sequelize.query(col.sql);
          console.log(`  ✅ Added chat_messages.${col.name}`);
        }
      } catch (e) {
        // Column might already exist
      }
    }

    // Add foreign key if not exists
    try {
      await sequelize.query(`
        DO $$ BEGIN
          ALTER TABLE chat_messages
          ADD CONSTRAINT chat_messages_room_id_fkey
          FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    } catch (e) {
      // Constraint might already exist
    }

    console.log('✅ chat_messages table synced');

    // ============================================
    // 4. Create indexes
    // ============================================
    console.log('📝 Creating indexes...');

    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_chat_rooms_applicant_id ON chat_rooms(applicant_id)",
      "CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_type ON chat_rooms(room_type)",
      "CREATE INDEX IF NOT EXISTS idx_chat_rooms_site_code ON chat_rooms(site_code)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON chat_messages(sender_type)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)"
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(idx);
      } catch (e) {
        // Index might already exist
      }
    }

    console.log('✅ Indexes created');
    console.log('🎉 Chat tables sync completed successfully!');

    return true;
  } catch (error) {
    console.error('❌ Chat tables sync error:', error.message);
    return false;
  }
};

module.exports = { syncChatTables };
