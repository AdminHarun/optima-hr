/**
 * API Route Groups - Backend API Yalıtımı (Part 6)
 * 
 * Tüm route'ları 3 gruba ayırır:
 * - Admin: İK yönetim ve tam erişim gerektiren route'lar
 * - Employee: Çalışan self-servis route'ları 
 * - Public: Aday başvuru ve kariyer portalı
 * - Shared: Tüm uygulamaların erişebildiği ortak route'lar
 */

const express = require('express');

// Route imports
const employeeRoutes = require('./employees');
const bulkRoutes = require('./bulk');
const invitationRoutes = require('./invitations');
const applicationRoutes = require('./applications');
const chatRoutes = require('./chat');
const channelRoutes = require('./channels');
const searchRoutes = require('./search');
const recordingRoutes = require('./recordings');
const linkPreviewRoutes = require('./link-preview');
const managementRoutes = require('./management');
const mediaRoutes = require('./media');
const voiceRoutes = require('./voice');
const scheduledRoutes = require('./scheduled');
const bookmarkRoutes = require('./bookmarks');
const pinRoutes = require('./pins');
const readReceiptRoutes = require('./read-receipts');
const screenShareRoutes = require('./screen-share');
const taskRoutes = require('./tasks');
const calendarRoutes = require('./calendar');
const fileRoutes = require('./files');
const roleRoutes = require('./roles');
const twoFactorRoutes = require('./twoFactor');
const ssoRoutes = require('./sso');
const integrationRoutes = require('./integrations');
const workflowRoutes = require('./workflows');

// ============================================
// ADMIN ROUTES - İK Yönetim Paneli
// Sadece SUPER_ADMIN, ADMIN, HR, RECRUITER
// ============================================
const adminRouter = express.Router();

adminRouter.use('/employees', employeeRoutes);
adminRouter.use('/employees', bulkRoutes);
adminRouter.use('/invitations', invitationRoutes);
adminRouter.use('/recordings', recordingRoutes);
adminRouter.use('/management', managementRoutes);
adminRouter.use('/roles', roleRoutes);
adminRouter.use('/2fa', twoFactorRoutes);
adminRouter.use('/sso', ssoRoutes);
adminRouter.use('/integrations', integrationRoutes);
adminRouter.use('/workflows', workflowRoutes);
adminRouter.use('/scheduled', scheduledRoutes);

// ============================================
// EMPLOYEE ROUTES - Çalışan Self-Servis
// USER rolü dahil tüm çalışanlar
// ============================================
const employeeRouter = express.Router();

employeeRouter.use('/tasks', taskRoutes);
employeeRouter.use('/calendar', calendarRoutes);
employeeRouter.use('/files', fileRoutes);

// ============================================
// PUBLIC ROUTES - Kariyer Portalı
// Anonim erişim veya token bazlı
// ============================================
const publicRouter = express.Router();

publicRouter.use('/applications', applicationRoutes);

// ============================================
// SHARED ROUTES - Tüm uygulamalar
// Auth gerektiren ama her uygulama tarafından
// kullanılan ortak route'lar
// ============================================
const sharedRouter = express.Router();

sharedRouter.use('/channels', channelRoutes);
sharedRouter.use('/search', searchRoutes);
sharedRouter.use('/link-preview', linkPreviewRoutes);
sharedRouter.use('/media', mediaRoutes);
sharedRouter.use('/voice', voiceRoutes);
sharedRouter.use('/bookmarks', bookmarkRoutes);
sharedRouter.use('/pins', pinRoutes);
sharedRouter.use('/read-receipts', readReceiptRoutes);
sharedRouter.use('/screen-share', screenShareRoutes);

module.exports = {
  adminRouter,
  employeeRouter,
  publicRouter,
  sharedRouter,
  chatRoutes  // Chat özel mount gerektirir (/chat/api)
};
