require('dotenv').config();
const { sequelize } = require('../config/database');

// Import all models
require('../models/associations');

async function syncDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🔄 Syncing database models...');
    // force: true will drop existing tables and recreate them
    // alter: true will try to alter existing tables to match models
    await sequelize.sync({ force: true, alter: false });
    console.log('✅ Database models synced successfully');

    console.log('📊 Created tables:');
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      { type: sequelize.QueryTypes.SELECT }
    );
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();
