require('dotenv').config();
const { Sequelize } = require('sequelize');

async function createDatabase() {
  // Connect to default postgres database first
  const sequelize = new Sequelize('postgres', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  });

  try {
    console.log('🔄 Connecting to PostgreSQL server...');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const [results] = await sequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`
    );

    if (results.length === 0) {
      console.log(`🔄 Creating database '${process.env.DB_NAME}'...`);
      await sequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✅ Database '${process.env.DB_NAME}' created successfully`);
    } else {
      console.log(`✅ Database '${process.env.DB_NAME}' already exists`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

createDatabase();
