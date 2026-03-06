/**
 * Admin Portal Routes
 * Merkezi yönetim portalı API endpoint'leri
 * 
 * GET  /api/admin/settings/:category  → Ayarları getir
 * PUT  /api/admin/settings/:category  → Ayarları güncelle
 * GET  /api/admin/audit-logs          → Denetim kayıtları
 * GET  /api/admin/dashboard           → Dashboard istatistikleri
 */

const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const OrganizationSettings = require('../models/OrganizationSettings');
const AuditLog = require('../models/AuditLog');
const AdminUser = require('../models/AdminUser');
const { sequelize } = require('../config/database');

// ============================================
// Yardımcı: Audit log kaydı oluştur
// ============================================
const logAction = async (req, action, module, details = {}) => {
  try {
    await AuditLog.create({
      action,
      module,
      user_id: req.user?.id,
      user_email: req.user?.email,
      user_name: `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim(),
      ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      user_agent: req.headers['user-agent'],
      request_method: req.method,
      request_url: req.originalUrl,
      details,
    });
  } catch (err) {
    console.error('Audit log kayıt hatası:', err.message);
  }
};

// ============================================
// GET /api/admin/settings/:category
// Kategori bazlı ayarları getir
// ============================================
router.get('/settings/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const settings = await OrganizationSettings.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });

    // key-value map olarak dön
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({ success: true, data: settingsMap });
  } catch (err) {
    console.error('Settings get error:', err);
    res.status(500).json({ success: false, error: 'Ayarlar yüklenemedi' });
  }
});

// ============================================
// PUT /api/admin/settings/:category
// Kategori bazlı ayarları güncelle
// ============================================
router.put('/settings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const data = req.body;

    // Her key için upsert yap
    for (const [key, value] of Object.entries(data)) {
      await OrganizationSettings.upsert({
        key: `${category}.${key}`,
        value,
        category,
        updated_by: req.user?.id,
      });
    }

    // Audit log
    await logAction(req, 'settings.update', 'admin', {
      category,
      keys: Object.keys(data)
    });

    res.json({ success: true, message: 'Ayarlar kaydedildi' });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ success: false, error: 'Ayarlar kaydedilemedi' });
  }
});

// ============================================
// GET /api/admin/audit-logs
// Denetim kayıtlarını getir (pagination + filter)
// ============================================
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      module: mod,
      user_id,
      search,
      startDate,
      endDate
    } = req.query;

    const where = {};

    if (action) where.action = action;
    if (mod) where.module = mod;
    if (user_id) where.user_id = user_id;

    if (search) {
      where[Op.or] = [
        { user_name: { [Op.iLike]: `%${search}%` } },
        { user_email: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      }
    });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ success: false, error: 'Denetim kayıtları yüklenemedi' });
  }
});

// ============================================
// GET /api/admin/dashboard
// Dashboard istatistikleri
// ============================================
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await AdminUser.count();
    const activeUsers = await AdminUser.count({ where: { is_active: true } });
    const twoFaUsers = await AdminUser.count({ where: { two_factor_enabled: true } });

    // Son 24 saat login sayısı
    const recentLogins = await AuditLog.count({
      where: {
        action: { [Op.iLike]: '%login%' },
        created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    // Son 7 gün audit log sayısı
    const weeklyLogs = await AuditLog.count({
      where: {
        created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        twoFaUsers,
        recentLogins,
        weeklyLogs,
        securityScore: Math.round((twoFaUsers / Math.max(totalUsers, 1)) * 100),
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'İstatistikler yüklenemedi' });
  }
});

module.exports = router;
