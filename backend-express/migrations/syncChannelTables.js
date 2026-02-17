// Channel System Tables Migration
// Creates channels and channel_members tables for Slack-style channel functionality

const syncChannelTables = async (sequelize) => {
  console.log('🔄 Starting channel tables sync...');

  try {
    // ============================================
    // 1. Create ENUM types for channels
    // ============================================
    console.log('📝 Creating channel ENUM types...');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_channels_type AS ENUM ('public', 'private');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_channel_members_role AS ENUM ('owner', 'admin', 'member');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_channel_members_notification AS ENUM ('all', 'mentions', 'none');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add 'employee' to sender_type enum if not exists
    try {
      await sequelize.query(`
        ALTER TYPE enum_chat_messages_sender_type ADD VALUE IF NOT EXISTS 'employee';
      `);
      console.log('  ✅ Added employee to sender_type enum');
    } catch (e) {
      // Value might already exist or enum might not exist yet
    }

    console.log('✅ Channel ENUM types ensured');

    // ============================================
    // 2. Create channels table
    // ============================================
    console.log('📝 Creating channels table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        type enum_channels_type NOT NULL DEFAULT 'public',
        site_code VARCHAR(50) NOT NULL DEFAULT 'FXB',
        created_by INTEGER,
        is_archived BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        topic TEXT,
        icon VARCHAR(50) DEFAULT 'tag',
        color VARCHAR(20),
        last_message_at TIMESTAMP WITH TIME ZONE,
        last_message_preview VARCHAR(200),
        member_count INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(name, site_code)
      );
    `);

    // Add missing columns if table exists
    const channelColumns = [
      { name: 'display_name', sql: "ALTER TABLE channels ADD COLUMN display_name VARCHAR(255) NOT NULL DEFAULT ''" },
      { name: 'description', sql: "ALTER TABLE channels ADD COLUMN description TEXT" },
      { name: 'site_code', sql: "ALTER TABLE channels ADD COLUMN site_code VARCHAR(50) NOT NULL DEFAULT 'FXB'" },
      { name: 'created_by', sql: "ALTER TABLE channels ADD COLUMN created_by INTEGER" },
      { name: 'is_archived', sql: "ALTER TABLE channels ADD COLUMN is_archived BOOLEAN DEFAULT false" },
      { name: 'is_default', sql: "ALTER TABLE channels ADD COLUMN is_default BOOLEAN DEFAULT false" },
      { name: 'topic', sql: "ALTER TABLE channels ADD COLUMN topic TEXT" },
      { name: 'icon', sql: "ALTER TABLE channels ADD COLUMN icon VARCHAR(50) DEFAULT 'tag'" },
      { name: 'color', sql: "ALTER TABLE channels ADD COLUMN color VARCHAR(20)" },
      { name: 'last_message_at', sql: "ALTER TABLE channels ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE" },
      { name: 'last_message_preview', sql: "ALTER TABLE channels ADD COLUMN last_message_preview VARCHAR(200)" },
      { name: 'member_count', sql: "ALTER TABLE channels ADD COLUMN member_count INTEGER DEFAULT 0" },
      { name: 'message_count', sql: "ALTER TABLE channels ADD COLUMN message_count INTEGER DEFAULT 0" }
    ];

    for (const col of channelColumns) {
      try {
        const [result] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'channels' AND column_name = '${col.name}'
        `);
        if (result.length === 0) {
          await sequelize.query(col.sql);
          console.log(`  ✅ Added channels.${col.name}`);
        }
      } catch (e) {
        // Column might already exist
      }
    }

    console.log('✅ channels table synced');

    // ============================================
    // 3. Create channel_members table
    // ============================================
    console.log('📝 Creating channel_members table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS channel_members (
        id SERIAL PRIMARY KEY,
        channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL,
        role enum_channel_members_role NOT NULL DEFAULT 'member',
        muted BOOLEAN DEFAULT false,
        starred BOOLEAN DEFAULT false,
        notification_preference enum_channel_members_notification DEFAULT 'all',
        unread_count INTEGER DEFAULT 0,
        last_read_at TIMESTAMP WITH TIME ZONE,
        last_read_message_id INTEGER,
        invited_by INTEGER,
        joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(channel_id, employee_id)
      );
    `);

    // Add missing columns
    const memberColumns = [
      { name: 'muted', sql: "ALTER TABLE channel_members ADD COLUMN muted BOOLEAN DEFAULT false" },
      { name: 'starred', sql: "ALTER TABLE channel_members ADD COLUMN starred BOOLEAN DEFAULT false" },
      { name: 'unread_count', sql: "ALTER TABLE channel_members ADD COLUMN unread_count INTEGER DEFAULT 0" },
      { name: 'last_read_at', sql: "ALTER TABLE channel_members ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE" },
      { name: 'last_read_message_id', sql: "ALTER TABLE channel_members ADD COLUMN last_read_message_id INTEGER" },
      { name: 'invited_by', sql: "ALTER TABLE channel_members ADD COLUMN invited_by INTEGER" },
      { name: 'joined_at', sql: "ALTER TABLE channel_members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()" }
    ];

    for (const col of memberColumns) {
      try {
        const [result] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'channel_members' AND column_name = '${col.name}'
        `);
        if (result.length === 0) {
          await sequelize.query(col.sql);
          console.log(`  ✅ Added channel_members.${col.name}`);
        }
      } catch (e) {
        // Column might already exist
      }
    }

    console.log('✅ channel_members table synced');

    // ============================================
    // 4. Add channel_id to chat_messages
    // ============================================
    console.log('📝 Adding channel support to chat_messages...');

    try {
      const [result] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'channel_id'
      `);
      if (result.length === 0) {
        await sequelize.query("ALTER TABLE chat_messages ADD COLUMN channel_id INTEGER REFERENCES channels(id)");
        console.log('  ✅ Added chat_messages.channel_id');
      }
    } catch (e) {
      // Column might already exist
    }

    try {
      const [result] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'thread_id'
      `);
      if (result.length === 0) {
        await sequelize.query("ALTER TABLE chat_messages ADD COLUMN thread_id INTEGER");
        console.log('  ✅ Added chat_messages.thread_id');
      }
    } catch (e) {
      // Column might already exist
    }

    // ============================================
    // 5. Create indexes
    // ============================================
    console.log('📝 Creating channel indexes...');

    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_channels_site_code ON channels(site_code)",
      "CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type)",
      "CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name)",
      "CREATE INDEX IF NOT EXISTS idx_channels_is_archived ON channels(is_archived)",
      "CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id)",
      "CREATE INDEX IF NOT EXISTS idx_channel_members_employee_id ON channel_members(employee_id)",
      "CREATE INDEX IF NOT EXISTS idx_channel_members_role ON channel_members(role)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id)"
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(idx);
      } catch (e) {
        // Index might already exist
      }
    }

    console.log('✅ Channel indexes created');
    console.log('🎉 Channel tables sync completed successfully!');

    return true;
  } catch (error) {
    console.error('❌ Channel tables sync error:', error.message);
    console.error(error);
    return false;
  }
};

module.exports = { syncChannelTables };
