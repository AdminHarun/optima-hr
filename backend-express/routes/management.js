const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const router = express.Router();

// Models - lazy load to avoid circular deps
let Site, AdminUser, AuditLog;
const getModels = () => {
  if (!Site) Site = require('../models/Site');
  if (!AdminUser) AdminUser = require('../models/AdminUser');
  if (!AuditLog) AuditLog = require('../models/AuditLog');
  return { Site, AdminUser, AuditLog };
};

// Helper: Audit log olustur
const createAuditLog = async (data, req) => {
  const { AuditLog } = getModels();
  return AuditLog.create({
    ...data,
    ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
  });
};

// ============================================================
// SITE ENDPOINTS
// ============================================================

// GET /api/management/sites - Tum siteleri listele
router.get('/sites', async (req, res) => {
  try {
    const { Site } = getModels();
    const { search, is_active, sort_by, sort_order, page, limit } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const order = [[sort_by || 'created_at', (sort_order || 'DESC').toUpperCase()]];
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    const { count, rows } = await Site.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error('Sites list error:', error);
    res.status(500).json({ error: 'Siteler yuklenirken hata olustu' });
  }
});

// GET /api/management/sites/stats - Site istatistikleri
router.get('/sites/stats', async (req, res) => {
  try {
    const { Site } = getModels();
    const totalSites = await Site.count();
    const activeSites = await Site.count({ where: { is_active: true } });
    const inactiveSites = totalSites - activeSites;

    const sites = await Site.findAll({
      attributes: ['id', 'code', 'name', 'total_employees', 'total_applications', 'is_active'],
    });

    res.json({
      total: totalSites,
      active: activeSites,
      inactive: inactiveSites,
      sites: sites.map(s => ({
        code: s.code,
        name: s.name,
        employees: s.total_employees,
        applications: s.total_applications,
        isActive: s.is_active,
      })),
    });
  } catch (error) {
    console.error('Sites stats error:', error);
    res.status(500).json({ error: 'Site istatistikleri yuklenirken hata olustu' });
  }
});

// POST /api/management/sites - Yeni site olustur
router.post('/sites', async (req, res) => {
  try {
    const { Site } = getModels();
    // Frontend color -> DB brand_color mapping
    const data = { ...req.body };
    if (data.color && !data.brand_color) {
      data.brand_color = data.color;
      delete data.color;
    }
    delete data._userEmail;
    delete data._userName;
    const site = await Site.create(data);

    await createAuditLog({
      action: 'CREATE',
      module: 'SITE',
      target_type: 'Site',
      target_id: String(site.id),
      target_name: site.name,
      new_values: req.body,
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.status(201).json(site);
  } catch (error) {
    console.error('Site create error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Bu site kodu zaten mevcut' });
    }
    res.status(400).json({ error: 'Site olusturulurken hata olustu', details: error.message });
  }
});

// PUT /api/management/sites/:id - Site guncelle
router.put('/sites/:id', async (req, res) => {
  try {
    const { Site } = getModels();
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site bulunamadi' });

    const oldValues = site.toJSON();
    const updateData = { ...req.body };
    if (updateData.color && !updateData.brand_color) {
      updateData.brand_color = updateData.color;
      delete updateData.color;
    }
    delete updateData._userEmail;
    delete updateData._userName;
    await site.update(updateData);

    await createAuditLog({
      action: 'UPDATE',
      module: 'SITE',
      target_type: 'Site',
      target_id: String(site.id),
      target_name: site.name,
      old_values: oldValues,
      new_values: req.body,
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json(site);
  } catch (error) {
    console.error('Site update error:', error);
    res.status(400).json({ error: 'Site guncellenirken hata olustu' });
  }
});

// DELETE /api/management/sites/:id - Site sil
router.delete('/sites/:id', async (req, res) => {
  try {
    const { Site } = getModels();
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site bulunamadi' });

    const siteData = site.toJSON();
    await site.destroy();

    await createAuditLog({
      action: 'DELETE',
      module: 'SITE',
      target_type: 'Site',
      target_id: String(siteData.id),
      target_name: siteData.name,
      old_values: siteData,
      user_email: req.query._userEmail || 'system',
      user_name: req.query._userName || 'System',
    }, req);

    res.status(204).send();
  } catch (error) {
    console.error('Site delete error:', error);
    res.status(500).json({ error: 'Site silinirken hata olustu' });
  }
});

// PATCH /api/management/sites/:id/toggle - Site aktif/pasif
router.patch('/sites/:id/toggle', async (req, res) => {
  try {
    const { Site } = getModels();
    const site = await Site.findByPk(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site bulunamadi' });

    const newStatus = !site.is_active;
    await site.update({ is_active: newStatus });

    await createAuditLog({
      action: newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      module: 'SITE',
      target_type: 'Site',
      target_id: String(site.id),
      target_name: site.name,
      details: { status_changed: newStatus },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json(site);
  } catch (error) {
    console.error('Site toggle error:', error);
    res.status(500).json({ error: 'Site durumu degistirilirken hata olustu' });
  }
});

// POST /api/management/sites/bulk - Toplu site islemi
router.post('/sites/bulk', async (req, res) => {
  try {
    const { Site } = getModels();
    const { action, ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: 'Site IDleri gerekli' });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await Site.update({ is_active: true }, { where: { id: { [Op.in]: ids } } });
        break;
      case 'deactivate':
        result = await Site.update({ is_active: false }, { where: { id: { [Op.in]: ids } } });
        break;
      case 'delete':
        result = await Site.destroy({ where: { id: { [Op.in]: ids } } });
        break;
      default:
        return res.status(400).json({ error: 'Gecersiz islem' });
    }

    await createAuditLog({
      action: 'BULK_ACTION',
      module: 'SITE',
      details: { action, ids, affected: result },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json({ success: true, affected: Array.isArray(result) ? result[0] : result });
  } catch (error) {
    console.error('Sites bulk error:', error);
    res.status(500).json({ error: 'Toplu islem sirasinda hata olustu' });
  }
});

// GET /api/management/sites/export - Site CSV export
router.get('/sites/export', async (req, res) => {
  try {
    const { Site } = getModels();
    const sites = await Site.findAll({ order: [['created_at', 'DESC']] });

    const headers = ['Kod', 'Ad', 'Renk', 'Durum', 'Calisan Sayisi', 'Basvuru Sayisi', 'Olusturulma', 'Guncelleme'];
    const rows = sites.map(s => [
      s.code, s.name, s.brand_color || s.color,
      s.is_active ? 'Aktif' : 'Pasif',
      s.total_employees, s.total_applications,
      s.created_at ? new Date(s.created_at).toLocaleDateString('tr-TR') : '',
      s.updated_at ? new Date(s.updated_at).toLocaleDateString('tr-TR') : '',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const bom = '\uFEFF';

    await createAuditLog({
      action: 'EXPORT',
      module: 'SITE',
      details: { format: 'csv', count: sites.length },
      user_email: req.query._userEmail || 'system',
      user_name: req.query._userName || 'System',
    }, req);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=siteler.csv');
    res.send(bom + csv);
  } catch (error) {
    console.error('Sites export error:', error);
    res.status(500).json({ error: 'Export sirasinda hata olustu' });
  }
});

// ============================================================
// USER ENDPOINTS
// ============================================================

// GET /api/management/users - Kullanicilari listele
router.get('/users', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const { search, role, site_code, is_active, sort_by, sort_order, page, limit } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (site_code) where.site_code = site_code;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const order = [[sort_by || 'created_at', (sort_order || 'DESC').toUpperCase()]];
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;

    const { count, rows } = await AdminUser.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Kullanicilar yuklenirken hata olustu' });
  }
});

// GET /api/management/users/stats - Kullanici istatistikleri
router.get('/users/stats', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const totalUsers = await AdminUser.count();
    const activeUsers = await AdminUser.count({ where: { is_active: true } });

    const roleStats = await AdminUser.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['role'],
      raw: true,
    });

    const siteStats = await AdminUser.findAll({
      attributes: [
        'site_code',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['site_code'],
      raw: true,
    });

    res.json({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: roleStats.reduce((acc, r) => { acc[r.role] = parseInt(r.count); return acc; }, {}),
      bySite: siteStats.reduce((acc, s) => { acc[s.site_code || 'ALL'] = parseInt(s.count); return acc; }, {}),
    });
  } catch (error) {
    console.error('Users stats error:', error);
    res.status(500).json({ error: 'Kullanici istatistikleri yuklenirken hata olustu' });
  }
});

// POST /api/management/users - Yeni kullanici olustur
router.post('/users', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const { password, ...userData } = req.body;
    const user = await AdminUser.create({ ...userData, password_hash: password || 'Optima2024!' });

    await createAuditLog({
      action: 'CREATE',
      module: 'USER',
      target_type: 'AdminUser',
      target_id: String(user.id),
      target_name: `${user.first_name} ${user.last_name}`,
      new_values: { ...userData, password: '[HIDDEN]' },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.status(201).json(user);
  } catch (error) {
    console.error('User create error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Bu email zaten kullaniliyor' });
    }
    res.status(400).json({ error: 'Kullanici olusturulurken hata olustu', details: error.message });
  }
});

// PUT /api/management/users/:id - Kullanici guncelle
router.put('/users/:id', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    const oldValues = user.toJSON();
    const { password, ...updateData } = req.body;
    if (password) updateData.password_hash = password;
    await user.update(updateData);

    await createAuditLog({
      action: 'UPDATE',
      module: 'USER',
      target_type: 'AdminUser',
      target_id: String(user.id),
      target_name: `${user.first_name} ${user.last_name}`,
      old_values: oldValues,
      new_values: { ...updateData, password: password ? '[CHANGED]' : undefined },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json(user);
  } catch (error) {
    console.error('User update error:', error);
    res.status(400).json({ error: 'Kullanici guncellenirken hata olustu' });
  }
});

// DELETE /api/management/users/:id - Kullanici sil
router.delete('/users/:id', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    const userData = user.toJSON();
    await user.destroy();

    await createAuditLog({
      action: 'DELETE',
      module: 'USER',
      target_type: 'AdminUser',
      target_id: String(userData.id),
      target_name: `${userData.first_name} ${userData.last_name}`,
      old_values: userData,
      user_email: req.query._userEmail || 'system',
      user_name: req.query._userName || 'System',
    }, req);

    res.status(204).send();
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Kullanici silinirken hata olustu' });
  }
});

// PATCH /api/management/users/:id/toggle - Kullanici aktif/pasif
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    const newStatus = !user.is_active;
    await user.update({ is_active: newStatus });

    await createAuditLog({
      action: newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      module: 'USER',
      target_type: 'AdminUser',
      target_id: String(user.id),
      target_name: `${user.first_name} ${user.last_name}`,
      details: { status_changed: newStatus },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json(user);
  } catch (error) {
    console.error('User toggle error:', error);
    res.status(500).json({ error: 'Kullanici durumu degistirilirken hata olustu' });
  }
});

// POST /api/management/users/bulk - Toplu kullanici islemi
router.post('/users/bulk', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const { action, ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ error: 'Kullanici IDleri gerekli' });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await AdminUser.update({ is_active: true }, { where: { id: { [Op.in]: ids } } });
        break;
      case 'deactivate':
        result = await AdminUser.update({ is_active: false }, { where: { id: { [Op.in]: ids } } });
        break;
      case 'delete':
        result = await AdminUser.destroy({ where: { id: { [Op.in]: ids } } });
        break;
      default:
        return res.status(400).json({ error: 'Gecersiz islem' });
    }

    await createAuditLog({
      action: 'BULK_ACTION',
      module: 'USER',
      details: { action, ids, affected: result },
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json({ success: true, affected: Array.isArray(result) ? result[0] : result });
  } catch (error) {
    console.error('Users bulk error:', error);
    res.status(500).json({ error: 'Toplu islem sirasinda hata olustu' });
  }
});

// GET /api/management/users/export - Kullanici CSV export
router.get('/users/export', async (req, res) => {
  try {
    const { AdminUser } = getModels();
    const users = await AdminUser.findAll({ order: [['created_at', 'DESC']] });

    const roleLabels = {
      SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', HR: 'Insan Kaynaklari',
      RECRUITER: 'Ise Alim Uzmani', USER: 'Kullanici',
    };

    const headers = ['Ad', 'Soyad', 'E-posta', 'Rol', 'Site', 'Durum', 'Kayit Tarihi', 'Son Giris'];
    const rows = users.map(u => [
      u.first_name, u.last_name, u.email,
      roleLabels[u.role] || u.role,
      u.site_code || 'Tum Siteler',
      u.is_active ? 'Aktif' : 'Pasif',
      u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '',
      u.last_login ? new Date(u.last_login).toLocaleDateString('tr-TR') : 'Henuz giris yok',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const bom = '\uFEFF';

    await createAuditLog({
      action: 'EXPORT',
      module: 'USER',
      details: { format: 'csv', count: users.length },
      user_email: req.query._userEmail || 'system',
      user_name: req.query._userName || 'System',
    }, req);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=kullanicilar.csv');
    res.send(bom + csv);
  } catch (error) {
    console.error('Users export error:', error);
    res.status(500).json({ error: 'Export sirasinda hata olustu' });
  }
});

// ============================================================
// PERMISSION ENDPOINTS
// ============================================================

// GET /api/management/permissions - Yetki matrisini getir
router.get('/permissions', async (req, res) => {
  try {
    const permissions = {
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'RECRUITER', 'USER'],
      permissions: [
        { key: 'dashboard_view', label: 'Dashboard Goruntuleme', category: 'Genel' },
        { key: 'application_manage', label: 'Basvuru Yonetimi', category: 'Basvuru' },
        { key: 'profile_manage', label: 'Profil Yonetimi', category: 'Profil' },
        { key: 'user_manage', label: 'Kullanici Yonetimi', category: 'Yonetim' },
        { key: 'site_manage', label: 'Site Yonetimi', category: 'Yonetim' },
        { key: 'permission_manage', label: 'Yetki Yonetimi', category: 'Yonetim' },
        { key: 'document_manage', label: 'Dokuman Yonetimi', category: 'Dokuman' },
        { key: 'mail_send', label: 'Mail Gonderme', category: 'Iletisim' },
        { key: 'report_view', label: 'Rapor Goruntuleme', category: 'Rapor' },
        { key: 'system_settings', label: 'Sistem Ayarlari', category: 'Sistem' },
        { key: 'chat_manage', label: 'Chat Yonetimi', category: 'Iletisim' },
        { key: 'employee_manage', label: 'Calisan Yonetimi', category: 'Personel' },
        { key: 'payroll_view', label: 'Maas Goruntuleme', category: 'Finans' },
        { key: 'calendar_manage', label: 'Takvim Yonetimi', category: 'Genel' },
      ],
      matrix: {
        SUPER_ADMIN: {
          dashboard_view: true, application_manage: true, profile_manage: true,
          user_manage: true, site_manage: true, permission_manage: true,
          document_manage: true, mail_send: true, report_view: true,
          system_settings: true, chat_manage: true, employee_manage: true,
          payroll_view: true, calendar_manage: true,
        },
        ADMIN: {
          dashboard_view: true, application_manage: true, profile_manage: true,
          user_manage: true, site_manage: false, permission_manage: false,
          document_manage: true, mail_send: true, report_view: true,
          system_settings: false, chat_manage: true, employee_manage: true,
          payroll_view: true, calendar_manage: true,
        },
        HR: {
          dashboard_view: true, application_manage: true, profile_manage: true,
          user_manage: false, site_manage: false, permission_manage: false,
          document_manage: true, mail_send: true, report_view: true,
          system_settings: false, chat_manage: true, employee_manage: true,
          payroll_view: false, calendar_manage: true,
        },
        RECRUITER: {
          dashboard_view: true, application_manage: true, profile_manage: true,
          user_manage: false, site_manage: false, permission_manage: false,
          document_manage: false, mail_send: true, report_view: false,
          system_settings: false, chat_manage: true, employee_manage: false,
          payroll_view: false, calendar_manage: true,
        },
        USER: {
          dashboard_view: true, application_manage: false, profile_manage: false,
          user_manage: false, site_manage: false, permission_manage: false,
          document_manage: false, mail_send: false, report_view: false,
          system_settings: false, chat_manage: false, employee_manage: false,
          payroll_view: false, calendar_manage: false,
        },
      },
    };

    // DB'den custom override varsa merge et
    // Simdilik static matrix donuyoruz

    res.json(permissions);
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ error: 'Yetkiler yuklenirken hata olustu' });
  }
});

// PUT /api/management/permissions/:role - Rol yetkilerini guncelle
router.put('/permissions/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    await createAuditLog({
      action: 'PERMISSION_CHANGE',
      module: 'PERMISSION',
      target_type: 'Role',
      target_id: role,
      target_name: role,
      new_values: permissions,
      user_email: req.body._userEmail || 'system',
      user_name: req.body._userName || 'System',
    }, req);

    res.json({ success: true, role, permissions });
  } catch (error) {
    console.error('Permission update error:', error);
    res.status(500).json({ error: 'Yetki guncellenirken hata olustu' });
  }
});

// ============================================================
// AUDIT LOG ENDPOINTS
// ============================================================

// GET /api/management/audit-logs - Audit loglari listele
router.get('/audit-logs', async (req, res) => {
  try {
    const { AuditLog } = getModels();
    const { module, action, user_email, search, date_from, date_to, sort_by, sort_order, page, limit } = req.query;

    const where = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (user_email) where.user_email = { [Op.iLike]: `%${user_email}%` };
    if (search) {
      where[Op.or] = [
        { target_name: { [Op.iLike]: `%${search}%` } },
        { user_name: { [Op.iLike]: `%${search}%` } },
        { user_email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const order = [[sort_by || 'created_at', (sort_order || 'DESC').toUpperCase()]];
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Audit loglari yuklenirken hata olustu' });
  }
});

// GET /api/management/audit-logs/export - Audit log CSV export
router.get('/audit-logs/export', async (req, res) => {
  try {
    const { AuditLog } = getModels();
    const logs = await AuditLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 1000,
    });

    const headers = ['Tarih', 'Modul', 'Islem', 'Hedef', 'Kullanici', 'IP'];
    const rows = logs.map(l => [
      l.created_at ? new Date(l.created_at).toLocaleString('tr-TR') : '',
      l.module, l.action, l.target_name || '-',
      l.user_name || l.user_email || '-',
      l.ip_address || '-',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const bom = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(bom + csv);
  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({ error: 'Audit log export hatasi' });
  }
});

// ============================================================
// GLOBAL STATS
// ============================================================

// GET /api/management/stats - Genel istatistikler
router.get('/stats', async (req, res) => {
  try {
    const { Site, AdminUser, AuditLog } = getModels();

    const [totalSites, activeSites, totalUsers, activeUsers, totalLogs] = await Promise.all([
      Site.count(),
      Site.count({ where: { is_active: true } }),
      AdminUser.count(),
      AdminUser.count({ where: { is_active: true } }),
      AuditLog.count(),
    ]);

    const recentLogs = await AuditLog.findAll({
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    res.json({
      sites: { total: totalSites, active: activeSites },
      users: { total: totalUsers, active: activeUsers },
      auditLogs: { total: totalLogs },
      recentActivity: recentLogs,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Istatistikler yuklenirken hata olustu' });
  }
});

// ============================================================
// INIT / SEED - Tablolari olustur
// ============================================================

// POST /api/management/init - Tablolari olustur ve seed data ekle
router.post('/init', async (req, res) => {
  try {
    const { Site, AdminUser } = getModels();

    // Tablolari olustur
    await Site.sync({ alter: true });
    await AdminUser.sync({ alter: true });
    await AuditLog.sync({ alter: true });

    // Default siteleri ekle (yoksa)
    const siteCount = await Site.count();
    if (siteCount === 0) {
      await Site.bulkCreate([
        { code: 'FXB', name: 'FIXBET', color: '#FF0000', is_active: true },
        { code: 'MTD', name: 'MATADORBET', color: '#0000FF', is_active: true },
        { code: 'ZBH', name: 'ZBahis', color: '#00FF00', is_active: true },
      ]);
    }

    // Default super admin ekle (yoksa)
    const userCount = await AdminUser.count();
    if (userCount === 0) {
      await AdminUser.create({
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@optima.com',
        password_hash: process.env.ADMIN_SEED_PASSWORD || require('crypto').randomBytes(16).toString('hex'),
        role: 'SUPER_ADMIN',
        site_code: null,
        is_active: true,
      });
    }

    res.json({ success: true, message: 'Tablolar olusturuldu ve seed data eklendi' });
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ error: 'Tablo olusturma hatasi', details: error.message });
  }
});

module.exports = router;
