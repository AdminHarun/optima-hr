const express = require('express');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { testConnection, sequelize } = require('./config/database');
const corsMiddleware = require('./middleware/cors');
const chatWebSocketService = require('./services/ChatWebSocketService');
const videoCallService = require('./services/videoCallService');
const recordingService = require('./services/recordingService');
const databaseMigrationService = require('./services/databaseMigrationService');

// Import models and associations first
require('./models/associations');

// Routes
const employeeRoutes = require('./routes/employees');
const bulkRoutes = require('./routes/bulk');
const invitationRoutes = require('./routes/invitations');
const applicationRoutes = require('./routes/applications');
const chatRoutes = require('./routes/chat');
const recordingRoutes = require('./routes/recordings');
const linkPreviewRoutes = require('./routes/link-preview');
const managementRoutes = require('./routes/management');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 9000;

// Global request logger (before everything)
app.use((req, res, next) => {
  console.log('🌍 INCOMING REQUEST:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/media', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ✅ /uploads path'i de eklendi

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Optima HR API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/employees', bulkRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/chat/api', chatRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/link-preview', linkPreviewRoutes);
app.use('/api/management', managementRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Run database migrations and create missing tables
    // console.log('🔄 Running database migrations...');
    // await databaseMigrationService.runMigrations();
    // await databaseMigrationService.getTableCounts();
    console.log('✅ Skipping database migration service (manuel migration yapıldı)');

    // Sync models (disabled - using SQL migrations instead)
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('🔄 Syncing database models...');
    //   await sequelize.sync({ force: false, alter: false });
    //   console.log('✅ Database models synced');
    // }
    console.log('✅ Skipping Sequelize sync - using SQL migrations instead');

    // Add site_code columns for multi-tenant isolation (idempotent)
    try {
      const qi = sequelize.getQueryInterface();
      const addColumnIfNotExists = async (table, column, type) => {
        try {
          await qi.addColumn(table, column, type);
          console.log(`  ✅ Added ${column} to ${table}`);
        } catch (e) {
          if (e.message && e.message.includes('already exists')) {
            // Column already exists, skip
          } else {
            console.log(`  ⚠️ ${table}.${column}: ${e.message}`);
          }
        }
      };
      console.log('🔄 Checking site_code columns for multi-tenant isolation...');
      await addColumnIfNotExists('employees_employee', 'site_code', { type: 'VARCHAR(50)', allowNull: true });
      await addColumnIfNotExists('applicant_profiles', 'site_code', { type: 'VARCHAR(50)', allowNull: true });
      await addColumnIfNotExists('job_applications', 'site_code', { type: 'VARCHAR(50)', allowNull: true });
      await addColumnIfNotExists('chat_rooms', 'site_code', { type: 'VARCHAR(50)', allowNull: true });
      console.log('✅ Site isolation columns checked');

      // Applicant auth columns
      console.log('🔄 Checking applicant auth columns...');
      await addColumnIfNotExists('applicant_profiles', 'password_hash', { type: 'VARCHAR(255)', allowNull: true });
      await addColumnIfNotExists('applicant_profiles', 'security_question', { type: 'VARCHAR(500)', allowNull: true });
      await addColumnIfNotExists('applicant_profiles', 'security_answer_hash', { type: 'VARCHAR(255)', allowNull: true });
      console.log('✅ Applicant auth columns checked');

      // Applicant device tracking columns
      console.log('🔄 Checking applicant device tracking columns...');
      await addColumnIfNotExists('applicant_profiles', 'device_info', { type: 'JSONB', allowNull: true });
      await addColumnIfNotExists('applicant_profiles', 'vpn_score', { type: 'INTEGER', allowNull: true, defaultValue: 0 });
      await addColumnIfNotExists('applicant_profiles', 'is_vpn', { type: 'BOOLEAN', allowNull: true, defaultValue: false });
      console.log('✅ Applicant device tracking columns checked');
    } catch (migrationErr) {
      console.log('⚠️ Site code migration note:', migrationErr.message);
    }

    // Initialize core tables (applicant_profiles, job_applications)
    try {
      const { InvitationLink, ApplicantProfile, JobApplication, ChatRoom, ChatMessage } = require('./models/associations');

      // Create tables if they don't exist (order matters for foreign keys)
      console.log('🔄 Checking core tables...');
      await InvitationLink.sync({ alter: false });
      await ApplicantProfile.sync({ alter: false });
      await JobApplication.sync({ alter: false });
      await ChatRoom.sync({ alter: false });
      await ChatMessage.sync({ alter: false });
      console.log('✅ Core tables initialized');
    } catch (coreErr) {
      console.log('⚠️ Core tables note:', coreErr.message);
    }

    // Initialize management tables (AdminUser, AuditLog, Site)
    try {
      const AdminUser = require('./models/AdminUser');
      const AuditLog = require('./models/AuditLog');
      const Site = require('./models/Site');
      await AdminUser.sync({ alter: false });
      await AuditLog.sync({ alter: false });
      await Site.sync({ alter: false });
      console.log('✅ Management tables initialized');
    } catch (mgmtErr) {
      console.log('⚠️ Management tables note:', mgmtErr.message);
    }

    // Initialize video call tables (already included in migrations)
    await videoCallService.initializeTables();

    // Initialize recording service
    await recordingService.initialize();

    // Initialize WebSocket service
    chatWebSocketService.initialize(server);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Optima HR API server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💬 WebSocket URL: ws://localhost:${PORT}/ws`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();