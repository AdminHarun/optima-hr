const express = require('express');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { testConnection, sequelize } = require('./config/database');
const corsMiddleware = require('./middleware/cors');
const chatWebSocketService = require('./services/ChatWebSocketService');
const videoCallService = require('./services/videoCallService');
const recordingService = require('./services/recordingService');
const databaseMigrationService = require('./services/databaseMigrationService');

// Import models and associations first
require('./models/associations');

// Routes - Grouped API (Part 6)
const authRoutes = require('./routes/auth');
const { adminRouter, employeeRouter, publicRouter, sharedRouter, chatRoutes } = require('./routes/apiGroups');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 9000;

// Trust proxy - Required for Railway/Cloudflare reverse proxy
// Fixes express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// Global request logger (before everything)
app.use((req, res, next) => {
  console.log('🌍 INCOMING REQUEST:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// Security Middleware — Helmet with CSP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com", "https://static.cloudflareinsights.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.cloudflare.com"],
      connectSrc: ["'self'", "https://api.optima-hr.net", "wss://api.optima-hr.net", "https://challenges.cloudflare.com"],
      frameSrc: ["https://challenges.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
// Permissions-Policy header
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.use(cookieParser());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting — katmanlı (Plans 07)
const { apiLimiter, authLimiter, submitLimiter, adminLimiter } = require('./middleware/rateLimiters');
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/apply/applicant-login', authLimiter);
app.use('/api/apply/submit', submitLimiter);
app.use('/api/admin/', adminLimiter);

// Static files for uploads with cache headers
const staticOptions = {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    } else if (filePath.match(/\.(mp4|webm|mp3|wav|ogg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
};
app.use('/media', express.static(path.join(__dirname, 'uploads'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Optima HR API',
    version: '1.0.0'
  });
});

// ============================================
// API ROUTES - Grouped (Part 6)
// ============================================
app.use('/api/auth', authLimiter, authRoutes);

// Admin routes - IK Yonetim Paneli
app.use('/api/admin', adminRouter);

// Employee routes - Calisan Self-Servis
app.use('/api/employee', employeeRouter);

// Public routes - Kariyer Portali
app.use('/api/public', publicRouter);

// Shared routes - Tum uygulamalar
app.use('/api', sharedRouter);

// Chat - Ozel mount
app.use('/chat/api', chatRoutes);

// ============================================
// Auth middleware - korumalı route'lar için
// ============================================
const { requireAuth } = require('./middleware/requireAuth');

// ============================================
// PUBLIC ROUTES - Auth gerektirmeyen
// ============================================
app.use('/api/sso', require('./routes/sso'));
app.use('/api/apply', require('./routes/applicationsPublic'));

// Backward compatibility: /api/invitations/validate/:token public kalmalı
const invitationsPublicRouter = require('express').Router();
const { InvitationLink, ApplicantProfile, JobApplication } = require('./models/associations');
invitationsPublicRouter.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invitation = await InvitationLink.findOne({ where: { token } });
    if (!invitation) {
      return res.status(404).json({ error: 'Geçersiz davet linki' });
    }
    // IP kaydet
    const clientIP = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const realIP = req.query.real_ip || clientIP;
    const updateData = {};
    if (!invitation.first_accessed_ip) {
      updateData.first_accessed_ip = realIP;
      updateData.first_clicked_at = new Date();
      updateData.status = 'clicked';
    }
    updateData.click_count = (invitation.click_count || 0) + 1;
    if (Object.keys(updateData).length > 0) {
      await invitation.update(updateData);
    }

    // Profil ve başvuru kontrol
    if (invitation.status === 'used') {
      const profile = await ApplicantProfile.findOne({
        where: { invitation_link_id: invitation.id },
        include: [{ model: JobApplication, as: 'applications', required: false }]
      });
      return res.status(410).json({
        error: 'Bu davet linki daha önce kullanılmış',
        status: 'used',
        hasProfile: !!profile,
        hasApplication: profile?.applications?.length > 0
        // GÜVENLİK: sessionToken kaldırıldı
      });
    }

    res.json({
      valid: true,
      email: invitation.email,
      status: invitation.status,
      siteCode: invitation.site_code
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ error: 'Doğrulama başarısız' });
  }
});
app.use('/api/invitations', invitationsPublicRouter);

// Backward compatibility: applicant endpoints eski path'lerden de erişilebilir
app.use('/api/applications/session', require('express').Router().get('/:sessionToken', async (req, res) => {
  const profile = await ApplicantProfile.findOne({
    where: { session_token: req.params.sessionToken },
    include: [{ model: InvitationLink, as: 'invitation_link' }]
  });
  if (!profile) return res.status(404).json({ error: 'Geçersiz session' });
  res.json({ id: profile.id, firstName: profile.first_name, lastName: profile.last_name, email: profile.email, phone: profile.phone, token: profile.invitation_link?.token, valid: true });
}));
app.use('/api/applications/chat', require('express').Router().get('/:chatToken', async (req, res) => {
  const profile = await ApplicantProfile.findOne({
    where: { chat_token: req.params.chatToken },
    include: [{ model: InvitationLink, as: 'invitation_link' }, { model: JobApplication, as: 'applications' }]
  });
  if (!profile) return res.status(404).json({ error: 'Geçersiz chat token' });
  res.json({ id: profile.id, firstName: profile.first_name, lastName: profile.last_name, email: profile.email, application: profile.applications?.[0] ? { id: profile.applications[0].id, status: profile.applications[0].status } : null, valid: true });
}));
app.use('/api/applications/applicant-login', require('express').Router().post('/', async (req, res) => {
  // Forward to /api/apply/applicant-login
  const applicationsPublic = require('./routes/applicationsPublic');
  req.url = '/applicant-login';
  applicationsPublic(req, res);
}));
app.use('/api/applications/get-security-question', require('express').Router().post('/', async (req, res) => {
  const applicationsPublic = require('./routes/applicationsPublic');
  req.url = '/get-security-question';
  applicationsPublic(req, res);
}));
app.use('/api/applications/profiles', require('express').Router().post('/', async (req, res) => {
  const applicationsPublic = require('./routes/applicationsPublic');
  req.url = '/profiles';
  applicationsPublic(req, res);
}));
app.use('/api/applications/submit', require('express').Router().post('/', async (req, res) => {
  const applicationsPublic = require('./routes/applicationsPublic');
  req.url = '/submit';
  applicationsPublic(req, res);
}));
app.use('/api/applications/by-profile', require('express').Router().get('/:profileId', async (req, res) => {
  const profile = await ApplicantProfile.findByPk(req.params.profileId, {
    include: [{ model: JobApplication, as: 'applications', required: false }]
  });
  if (!profile) return res.status(404).json({ error: 'Profil bulunamadı' });
  const application = profile.applications?.[0];
  if (!application) return res.json({ hasApplication: false });
  res.json({ hasApplication: true, application: { id: application.id, status: application.status, chatToken: application.chat_token, submittedAt: application.created_at } });
}));

// ============================================
// PROTECTED ROUTES - Auth gerektiren
// ============================================
const { ipAllowlistMiddleware } = require('./middleware/ipAllowlist');
app.use('/api/invitations', requireAuth, require('./routes/invitations'));
app.use('/api/applications', requireAuth, require('./routes/applications'));
app.use('/api/employees', requireAuth, require('./routes/employees'));
app.use('/api/employees', requireAuth, require('./routes/bulk'));
app.use('/api/recordings', requireAuth, require('./routes/recordings'));
app.use('/api/management', requireAuth, require('./routes/management'));
app.use('/api/admin', requireAuth, require('./routes/admin'));
app.use('/api/roles', requireAuth, require('./routes/roles'));
app.use('/api/2fa', require('./routes/twoFactor')); // Auth endpoint bazlı — /verify ve /check public
app.use('/api/integrations', requireAuth, require('./routes/integrations'));
app.use('/api/workflows', requireAuth, require('./routes/workflows'));
app.use('/api/scheduled', requireAuth, require('./routes/scheduled'));
app.use('/api/tasks', requireAuth, require('./routes/tasks'));
app.use('/api/calendar', requireAuth, require('./routes/calendar'));
app.use('/api/files', requireAuth, require('./routes/files'));
app.use('/api/channels', requireAuth, require('./routes/channels'));
app.use('/api/search', requireAuth, require('./routes/search'));
app.use('/api/link-preview', requireAuth, require('./routes/link-preview'));
app.use('/api/media', requireAuth, require('./routes/media'));
app.use('/api/voice', requireAuth, require('./routes/voice'));
app.use('/api/bookmarks', requireAuth, require('./routes/bookmarks'));
app.use('/api/pins', requireAuth, require('./routes/pins'));
app.use('/api/read-receipts', requireAuth, require('./routes/read-receipts'));
app.use('/api/screen-share', requireAuth, require('./routes/screen-share'));

// Health check endpoint (Phase 4.6 - Load Balancing support)
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    checks: {}
  };

  // Database check
  try {
    await sequelize.authenticate();
    health.checks.database = { status: 'ok', responseTime: Date.now() - startTime + 'ms' };
  } catch (e) {
    health.checks.database = { status: 'error', error: e.message };
    health.status = 'degraded';
  }

  // Redis check
  try {
    const RedisService = require('./services/RedisService');
    const isConnected = RedisService.isReady ? RedisService.isReady() : false;
    health.checks.redis = { status: isConnected ? 'ok' : 'fallback (in-memory)' };
  } catch (e) {
    health.checks.redis = { status: 'not configured' };
  }

  // Cache stats
  try {
    const CacheService = require('./services/CacheService');
    health.checks.cache = CacheService.getStats();
  } catch (e) {
    health.checks.cache = { status: 'not loaded' };
  }

  const responseTime = Date.now() - startTime;
  health.responseTime = responseTime + 'ms';

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

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
    console.log('🚀 Server v1.0.3 starting - quick boot for Railway');

    // Test database connection first
    await testConnection();

    // Initialize WebSocket service early
    chatWebSocketService.initialize(server);

    // Start HTTP server IMMEDIATELY to pass Railway health check
    server.listen(PORT, () => {
      console.log(`🚀 Optima HR API server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log('✅ Server ready - running migrations in background...');

      // Run migrations in background after server starts
      runMigrations().catch(err => console.error('Migration error:', err));
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Background migrations
const runMigrations = async () => {
  try {
    console.log('🔄 Running background migrations...');

    // Add columns using IF NOT EXISTS to avoid PostgreSQL stderr noise
    try {
      const addColumnSafe = async (table, column, type) => {
        try {
          await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
        } catch (e) {
          console.log(`  ⚠️ ${table}.${column}: ${e.message}`);
        }
      };
      console.log('🔄 Checking site_code columns for multi-tenant isolation...');
      await addColumnSafe('employees_employee', 'site_code', 'VARCHAR(50)');
      await addColumnSafe('applicant_profiles', 'site_code', 'VARCHAR(50)');
      await addColumnSafe('job_applications', 'site_code', 'VARCHAR(50)');
      await addColumnSafe('chat_rooms', 'site_code', 'VARCHAR(50)');
      console.log('✅ Site isolation columns checked');

      // Applicant auth columns
      console.log('🔄 Checking applicant auth columns...');
      await addColumnSafe('applicant_profiles', 'password_hash', 'VARCHAR(255)');
      await addColumnSafe('applicant_profiles', 'security_question', 'VARCHAR(500)');
      await addColumnSafe('applicant_profiles', 'security_answer_hash', 'VARCHAR(255)');
      console.log('✅ Applicant auth columns checked');

      // 2FA columns (Phase 3.2)
      console.log('🔄 Checking 2FA columns...');
      await addColumnSafe('management_admin_users', 'two_factor_secret', 'VARCHAR(500)');
      await addColumnSafe('management_admin_users', 'two_factor_enabled', 'BOOLEAN DEFAULT false');
      await addColumnSafe('management_admin_users', 'two_factor_backup_codes', 'TEXT');
      await addColumnSafe('management_admin_users', 'token_version', 'INTEGER DEFAULT 0');
      console.log('✅ 2FA + token_version columns checked');

      // Audit log enhancement columns (Phase 3.3)
      console.log('🔄 Checking audit log enhancement columns...');
      await addColumnSafe('audit_logs', 'user_agent', 'TEXT');
      await addColumnSafe('audit_logs', 'request_method', 'VARCHAR(10)');
      await addColumnSafe('audit_logs', 'request_url', 'TEXT');
      await addColumnSafe('audit_logs', 'response_status', 'INTEGER');
      await addColumnSafe('audit_logs', 'duration_ms', 'INTEGER');
      console.log('✅ Audit log columns checked');

      // Applicant device tracking columns
      console.log('🔄 Checking applicant device tracking columns...');
      await addColumnSafe('applicant_profiles', 'device_info', 'JSONB');
      await addColumnSafe('applicant_profiles', 'vpn_score', 'INTEGER DEFAULT 0');
      await addColumnSafe('applicant_profiles', 'is_vpn', 'BOOLEAN DEFAULT false');
      console.log('✅ Applicant device tracking columns checked');

      // Chat message columns
      console.log('🔄 Checking chat message columns...');
      await addColumnSafe('chat_messages', 'reply_to_message_id', 'VARCHAR(100)');
      await addColumnSafe('chat_messages', 'mentions', 'JSONB DEFAULT NULL');
      await addColumnSafe('chat_messages', 'metadata', 'JSONB DEFAULT NULL');
      console.log('✅ Chat message columns checked');

      // Chat room columns for group chat
      console.log('🔄 Checking chat room columns for group chat...');
      await addColumnSafe('chat_rooms', 'description', 'TEXT');
      console.log('✅ Chat room group columns checked');

      // Pin columns (must be added BEFORE ChatMessage.sync() to avoid index errors)
      console.log('🔄 Checking pin columns...');
      await addColumnSafe('chat_messages', 'is_pinned', 'BOOLEAN DEFAULT false');
      await addColumnSafe('chat_messages', 'pinned_at', 'TIMESTAMP');
      await addColumnSafe('chat_messages', 'pinned_by_type', 'VARCHAR(20)');
      await addColumnSafe('chat_messages', 'pinned_by_id', 'INTEGER');
      console.log('✅ Pin columns checked');
    } catch (migrationErr) {
      console.log('⚠️ Site code migration note:', migrationErr.message);
    }

    // Initialize core tables (applicant_profiles, job_applications)
    try {
      const { InvitationLink, ApplicantProfile, JobApplication, ChatRoom, ChatMessage, ChatRoomMember } = require('./models/associations');

      // Create tables if they don't exist (order matters for foreign keys)
      console.log('🔄 Checking core tables...');
      try { await InvitationLink.sync({ force: false }); } catch (e) { console.log('⚠️ InvitationLink sync:', e.message); }
      try { await ApplicantProfile.sync({ force: false }); } catch (e) { console.log('⚠️ ApplicantProfile sync:', e.message); }
      try { await JobApplication.sync({ force: false }); } catch (e) { console.log('⚠️ JobApplication sync:', e.message); }
      try { await ChatRoom.sync({ force: false }); } catch (e) { console.log('⚠️ ChatRoom sync:', e.message); }
      try { await ChatMessage.sync({ force: false }); } catch (e) { console.log('⚠️ ChatMessage sync:', e.message); }
      try { await ChatRoomMember.sync({ force: false }); } catch (e) { console.log('⚠️ ChatRoomMember sync:', e.message); }
      console.log('✅ Core tables synced');
    } catch (coreErr) {
      console.log('⚠️ Core tables note:', coreErr.message);
    }

    // Run comprehensive chat tables migration
    try {
      const { syncChatTables } = require('./migrations/syncChatTables');
      await syncChatTables(sequelize);
    } catch (chatMigrationErr) {
      console.log('⚠️ Chat migration note:', chatMigrationErr.message);
    }

    // Run channel tables migration
    try {
      const { syncChannelTables } = require('./migrations/syncChannelTables');
      await syncChannelTables(sequelize);
    } catch (channelMigrationErr) {
      console.log('⚠️ Channel migration note:', channelMigrationErr.message);
    }

    // Initialize employee tables
    try {
      const { Employee, EmployeeDocument } = require('./models');
      console.log('🔄 Checking employee tables...');
      await Employee.sync({ force: false });
      await EmployeeDocument.sync({ force: false });
      console.log('✅ Employee tables synced');
    } catch (empErr) {
      console.log('⚠️ Employee tables note:', empErr.message);
    }

    // Initialize task management tables
    try {
      const { Task, TaskComment } = require('./models/associations');
      console.log('🔄 Checking task management tables...');
      try { await Task.sync({ force: false }); } catch (e) { console.log('⚠️ Task sync:', e.message); }
      try { await TaskComment.sync({ force: false }); } catch (e) { console.log('⚠️ TaskComment sync:', e.message); }
      console.log('✅ Task management tables synced');
    } catch (taskErr) {
      console.log('⚠️ Task tables note:', taskErr.message);
    }

    // Initialize calendar tables
    try {
      const { CalendarEvent } = require('./models/associations');
      console.log('🔄 Checking calendar tables...');
      try { await CalendarEvent.sync({ force: false }); } catch (e) { console.log('⚠️ CalendarEvent sync:', e.message); }
      console.log('✅ Calendar tables synced');
    } catch (calErr) {
      console.log('⚠️ Calendar tables note:', calErr.message);
    }

    // Initialize file management tables
    try {
      const { ManagedFile, FileFolder, FileVersion } = require('./models/associations');
      console.log('🔄 Checking file management tables...');
      try { await FileFolder.sync({ force: false }); } catch (e) { console.log('⚠️ FileFolder sync:', e.message); }
      try { await ManagedFile.sync({ force: false }); } catch (e) { console.log('⚠️ ManagedFile sync:', e.message); }
      try { await FileVersion.sync({ force: false }); } catch (e) { console.log('⚠️ FileVersion sync:', e.message); }
      console.log('✅ File management tables synced');
    } catch (fileErr) {
      console.log('⚠️ File tables note:', fileErr.message);
    }

    // Add missing columns and fix constraints on job_applications table
    try {
      console.log('🔄 Adding missing columns to job_applications...');
      const jobAppColumns = [
        ['tc_number', 'VARCHAR(11)'],
        ['birth_date', 'DATE'],
        ['address', 'TEXT'],
        ['city', 'VARCHAR(100)'],
        ['district', 'VARCHAR(100)'],
        ['postal_code', 'VARCHAR(10)'],
        ['education_level', 'VARCHAR(50)'],
        ['university', 'VARCHAR(200)'],
        ['department', 'VARCHAR(200)'],
        ['graduation_year', 'INTEGER'],
        ['gpa', 'DECIMAL(5,2)'],
        ['has_sector_experience', 'BOOLEAN DEFAULT false'],
        ['experience_level', 'VARCHAR(50)'],
        ['last_company', 'VARCHAR(200)'],
        ['last_position', 'VARCHAR(200)'],
        ['internet_download', 'INTEGER'],
        ['internet_upload', 'INTEGER'],
        ['typing_speed', 'INTEGER'],
        ['processor', 'VARCHAR(100)'],
        ['ram', 'VARCHAR(50)'],
        ['os', 'VARCHAR(100)'],
        ['source', 'VARCHAR(100)'],
        ['has_reference', 'BOOLEAN DEFAULT false'],
        ['reference_name', 'VARCHAR(200)'],
        ['kvkk_approved', 'BOOLEAN DEFAULT false'],
        ['status', 'VARCHAR(50) DEFAULT \'submitted\''],
        ['reject_reason', 'TEXT'],
        ['submitted_ip', 'INET'],
        ['submitted_location', 'JSONB'],
        ['cv_file_path', 'VARCHAR(500)'],
        ['cv_file_name', 'VARCHAR(255)'],
        ['internet_test_file_path', 'VARCHAR(500)'],
        ['internet_test_file_name', 'VARCHAR(255)'],
        ['typing_test_file_path', 'VARCHAR(500)'],
        ['typing_test_file_name', 'VARCHAR(255)'],
        ['token', 'VARCHAR(32)'],
        ['profile_id', 'INTEGER'],
        ['applicant_profile_id', 'INTEGER'],
        ['invitation_link_id', 'INTEGER'],
        ['site_code', 'VARCHAR(50)'],
        ['submitted_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
      ];

      for (const [col, type] of jobAppColumns) {
        try {
          await sequelize.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS ${col} ${type}`);
        } catch (e) {
          // Silently ignore if column already exists
        }
      }

      // Remove NOT NULL constraints from optional columns (only columns that exist in job_applications)
      const optionalColumns = ['tc_number', 'birth_date', 'address', 'city', 'district'];
      for (const col of optionalColumns) {
        try {
          await sequelize.query(`ALTER TABLE job_applications ALTER COLUMN ${col} DROP NOT NULL`);
        } catch (e) {
          // Column might not exist or already nullable
        }
      }

      console.log('✅ job_applications columns checked');
    } catch (colErr) {
      console.log('⚠️ Column migration note:', colErr.message);
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

    // Run hybrid chat migration for new columns
    try {
      console.log('🔄 Running hybrid chat migration...');
      const hybridChatMigration = require('./migrations/20240215_hybrid_chat');
      await hybridChatMigration.up();
      console.log('✅ Hybrid chat migration completed');
    } catch (hybridErr) {
      console.log('⚠️ Hybrid chat migration note:', hybridErr.message);
    }

    // Run employee status migration (Task 1.5)
    try {
      console.log('🔄 Running employee status migration...');
      const employeeStatusMigration = require('./migrations/20240220_employee_status');
      await employeeStatusMigration.up();
      console.log('✅ Employee status migration completed');
    } catch (statusErr) {
      console.log('⚠️ Employee status migration note:', statusErr.message);
    }

    // Run offline message queue migration (Task 1.6)
    try {
      console.log('🔄 Running offline message queue migration...');
      const offlineQueueMigration = require('./migrations/20240220_offline_message_queue');
      await offlineQueueMigration.up();
      console.log('✅ Offline message queue migration completed');
    } catch (offlineErr) {
      console.log('⚠️ Offline message queue migration note:', offlineErr.message);
    }

    // Initialize offline messaging service
    try {
      const offlineMessagingService = require('./services/OfflineMessagingService');
      await offlineMessagingService.initialize();
      console.log('✅ Offline messaging service initialized');
    } catch (offlineSvcErr) {
      console.log('⚠️ Offline messaging service note:', offlineSvcErr.message);
    }

    // Run scheduled messages migration (Task 2.4)
    try {
      console.log('🔄 Running scheduled messages migration...');
      const scheduledMigration = require('./migrations/20240220_scheduled_messages');
      await scheduledMigration.up();
      console.log('✅ Scheduled messages migration completed');
    } catch (scheduledErr) {
      console.log('⚠️ Scheduled messages migration note:', scheduledErr.message);
    }

    // Initialize scheduled message service
    try {
      const scheduledMessageService = require('./services/ScheduledMessageService');
      await scheduledMessageService.initialize();
      console.log('✅ Scheduled message service initialized');
    } catch (scheduledSvcErr) {
      console.log('⚠️ Scheduled message service note:', scheduledSvcErr.message);
    }

    // Run message bookmarks migration (Task 2.6)
    try {
      console.log('🔄 Running message bookmarks migration...');
      const bookmarksMigration = require('./migrations/20240220_message_bookmarks');
      await bookmarksMigration.up();
      console.log('✅ Message bookmarks migration completed');
    } catch (bookmarksErr) {
      console.log('⚠️ Message bookmarks migration note:', bookmarksErr.message);
    }

    // Initialize screen share service (Task 2.3)
    try {
      console.log('🔄 Initializing screen share service...');
      const screenShareService = require('./services/ScreenShareService');
      await screenShareService.initializeTables();
      screenShareService.setWebSocketService(chatWebSocketService);
      console.log('✅ Screen share service initialized');
    } catch (screenShareErr) {
      console.log('⚠️ Screen share service note:', screenShareErr.message);
    }

    // Initialize video call tables (already included in migrations)
    await videoCallService.initializeTables();

    // Initialize recording service
    await recordingService.initialize();

    // Run RBAC migration (Phase 3.1)
    try {
      console.log('🔐 Running RBAC migration...');
      const syncRbacTables = require('./migrations/syncRbacTables');
      await syncRbacTables();
      console.log('✅ RBAC migration completed');
    } catch (rbacErr) {
      console.log('⚠️ RBAC migration note:', rbacErr.message);
    }

    // Performance indexes (Phase 4.4)
    try {
      console.log('📊 Running DB index optimization...');
      const runDbIndexMigration = require('./migrations/addPerformanceIndexes');
      await runDbIndexMigration();
    } catch (indexErr) {
      console.log('⚠️ DB index note:', indexErr.message);
    }

    console.log('✅ All background migrations completed');

    // Seed admin users (always ensure demo accounts exist)
    try {
      const AdminUser = require('./models/AdminUser');
      const seedPassword = process.env.ADMIN_SEED_PASSWORD || require('crypto').randomBytes(16).toString('hex');
      if (!process.env.ADMIN_SEED_PASSWORD) {
        console.log('⚠️  ADMIN_SEED_PASSWORD env var tanımlanmamış, rastgele şifre:', seedPassword);
      }
      console.log('🌱 Checking demo admin accounts...');
      const admins = [
        { first_name: 'Super', last_name: 'Admin', email: 'admin@company.com', password_hash: seedPassword, role: 'SUPER_ADMIN', is_active: true },
        { first_name: 'Furkan', last_name: 'Dağhan', email: 'furkan@optima.com', password_hash: seedPassword, role: 'ADMIN', is_active: true },
        { first_name: 'Harun', last_name: 'Yönetici', email: 'harun@optima.com', password_hash: seedPassword, role: 'HR', is_active: true },
      ];
      for (const admin of admins) {
        const [user, created] = await AdminUser.findOrCreate({ where: { email: admin.email }, defaults: admin });
        if (created) {
          console.log(`  ✅ Created: ${admin.email} (${admin.role})`);
        } else {
          console.log(`  ⏭️  Exists: ${admin.email}`);
        }
      }
      console.log('🎉 Admin seed check completed!');
    } catch (seedErr) {
      console.log('⚠️ Admin seed note:', seedErr.message);
    }

    // Start data retention scheduler (Phase 3.5)
    try {
      const { scheduleDataRetention } = require('./services/dataRetention');
      scheduleDataRetention();
    } catch (retentionErr) {
      console.log('⚠️ Data retention scheduler note:', retentionErr.message);
    }
  } catch (error) {
    console.error('⚠️ Background migration error:', error.message);
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