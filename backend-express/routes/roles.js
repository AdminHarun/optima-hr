/**
 * Roles & Permissions Management Routes
 * 
 * RBAC (Role Based Access Control) yönetim endpoint'leri
 * Sadece ADMIN ve SUPER_ADMIN erişebilir
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, adminOnly } = require('../middleware/chatAuth');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const EmployeeRole = require('../models/EmployeeRole');
const Employee = require('../models/Employee');
const { clearPermissionCache } = require('../middleware/rbac');
const { Op } = require('sequelize');

// ==================== ROL YÖNETİMİ ====================

/**
 * GET /api/roles - Tüm rolleri listele
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { site_code } = req.query;

        const where = {};
        if (site_code) {
            where[Op.or] = [
                { site_code },
                { site_code: null } // Global roller her zaman görünür
            ];
        }

        const roles = await Role.findAll({
            where,
            order: [['is_system', 'DESC'], ['name', 'ASC']],
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('[Roles] List error:', error);
        res.status(500).json({ success: false, error: 'Roller alınamadı' });
    }
});

/**
 * GET /api/roles/:id - Rol detayı
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        if (!role) {
            return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
        }

        // Bu role atanmış çalışan sayısı
        const employeeCount = await EmployeeRole.count({
            where: { role_id: role.id }
        });

        res.json({
            success: true,
            data: { ...role.toJSON(), employeeCount }
        });
    } catch (error) {
        console.error('[Roles] Get detail error:', error);
        res.status(500).json({ success: false, error: 'Rol detayı alınamadı' });
    }
});

/**
 * POST /api/roles - Yeni rol oluştur
 */
router.post('/', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { name, display_name, description, site_code, permission_ids } = req.body;

        if (!name || !display_name) {
            return res.status(400).json({
                success: false,
                error: 'Rol adı ve görünen ad zorunludur'
            });
        }

        // İsim formatı kontrolü
        const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        // Aynı isimde rol var mı?
        const existing = await Role.findOne({ where: { name: cleanName } });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Bu isimde bir rol zaten var'
            });
        }

        const role = await Role.create({
            name: cleanName,
            display_name,
            description,
            site_code: site_code || req.user.siteCode,
            is_system: false
        });

        // İzinleri ata
        if (permission_ids && permission_ids.length > 0) {
            const rolePermissions = permission_ids.map(pid => ({
                role_id: role.id,
                permission_id: pid
            }));
            await RolePermission.bulkCreate(rolePermissions, { ignoreDuplicates: true });
        }

        // Cache temizle
        clearPermissionCache();

        const created = await Role.findByPk(role.id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        res.status(201).json({
            success: true,
            data: created
        });
    } catch (error) {
        console.error('[Roles] Create error:', error);
        res.status(500).json({ success: false, error: 'Rol oluşturulamadı' });
    }
});

/**
 * PUT /api/roles/:id - Rol güncelle
 */
router.put('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
        }

        // Sistem rolleri sadece description güncellenebilir
        if (role.is_system) {
            const { display_name, description } = req.body;
            await role.update({ display_name, description });
        } else {
            const { display_name, description, is_active } = req.body;
            await role.update({ display_name, description, is_active });
        }

        // Cache temizle
        clearPermissionCache();

        res.json({
            success: true,
            data: role
        });
    } catch (error) {
        console.error('[Roles] Update error:', error);
        res.status(500).json({ success: false, error: 'Rol güncellenemedi' });
    }
});

/**
 * DELETE /api/roles/:id - Rol sil
 */
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
        }

        if (role.is_system) {
            return res.status(403).json({
                success: false,
                error: 'Sistem rolleri silinemez'
            });
        }

        // Atanmış çalışanları kontrol et
        const assignedCount = await EmployeeRole.count({ where: { role_id: role.id } });
        if (assignedCount > 0) {
            return res.status(409).json({
                success: false,
                error: `Bu role ${assignedCount} çalışan atanmış. Önce çalışanların rollerini değiştirin.`
            });
        }

        // İzin bağlantılarını sil
        await RolePermission.destroy({ where: { role_id: role.id } });
        await role.destroy();

        // Cache temizle
        clearPermissionCache();

        res.json({ success: true, message: 'Rol silindi' });
    } catch (error) {
        console.error('[Roles] Delete error:', error);
        res.status(500).json({ success: false, error: 'Rol silinemedi' });
    }
});

// ==================== ROL İZİN YÖNETİMİ ====================

/**
 * GET /api/roles/:id/permissions - Rol izinlerini getir
 */
router.get('/:id/permissions', authenticateToken, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        if (!role) {
            return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
        }

        res.json({
            success: true,
            data: role.permissions
        });
    } catch (error) {
        console.error('[Roles] Get permissions error:', error);
        res.status(500).json({ success: false, error: 'İzinler alınamadı' });
    }
});

/**
 * PUT /api/roles/:id/permissions - Rol izinlerini güncelle (toplu)
 */
router.put('/:id/permissions', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { permission_ids } = req.body;
        const roleId = req.params.id;

        const role = await Role.findByPk(roleId);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Rol bulunamadı' });
        }

        if (!Array.isArray(permission_ids)) {
            return res.status(400).json({
                success: false,
                error: 'permission_ids array olmalıdır'
            });
        }

        // Mevcut izinleri sil ve yenilerini ekle
        await RolePermission.destroy({ where: { role_id: roleId } });

        if (permission_ids.length > 0) {
            const rolePermissions = permission_ids.map(pid => ({
                role_id: roleId,
                permission_id: pid
            }));
            await RolePermission.bulkCreate(rolePermissions, { ignoreDuplicates: true });
        }

        // Cache temizle
        clearPermissionCache();

        const updated = await Role.findByPk(roleId, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }]
        });

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[Roles] Update permissions error:', error);
        res.status(500).json({ success: false, error: 'İzinler güncellenemedi' });
    }
});

// ==================== İZİN YÖNETİMİ ====================

/**
 * GET /api/roles/permissions/all - Tüm izinleri listele
 */
router.get('/permissions/all', authenticateToken, async (req, res) => {
    try {
        const permissions = await Permission.findAll({
            order: [['resource', 'ASC'], ['action', 'ASC']]
        });

        // Kaynak bazlı gruplama
        const grouped = {};
        permissions.forEach(p => {
            if (!grouped[p.resource]) {
                grouped[p.resource] = [];
            }
            grouped[p.resource].push(p);
        });

        res.json({
            success: true,
            data: permissions,
            grouped
        });
    } catch (error) {
        console.error('[Permissions] List error:', error);
        res.status(500).json({ success: false, error: 'İzinler alınamadı' });
    }
});

// ==================== ÇALIŞAN ROL ATAMA ====================

/**
 * GET /api/roles/employee/:employeeId - Çalışanın rollerini getir
 */
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
    try {
        const { employeeId } = req.params;

        const employeeRoles = await EmployeeRole.findAll({
            where: { employee_id: employeeId },
            include: [{
                model: Role,
                as: 'role',
                include: [{
                    model: Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                }]
            }]
        });

        const roles = employeeRoles.map(er => er.role);

        // Tüm izinleri birleştir
        const allPermissions = [...new Set(
            roles.flatMap(r => (r.permissions || []).map(p => p.name))
        )];

        res.json({
            success: true,
            data: {
                roles,
                permissions: allPermissions
            }
        });
    } catch (error) {
        console.error('[Roles] Get employee roles error:', error);
        res.status(500).json({ success: false, error: 'Çalışan rolleri alınamadı' });
    }
});

/**
 * PUT /api/roles/employee/:employeeId - Çalışana rol ata (toplu)
 */
router.put('/employee/:employeeId', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { role_ids } = req.body;

        if (!Array.isArray(role_ids)) {
            return res.status(400).json({
                success: false,
                error: 'role_ids array olmalıdır'
            });
        }

        // Çalışanın mevcut rollerini sil
        await EmployeeRole.destroy({ where: { employee_id: employeeId } });

        // Yeni rolleri ata
        if (role_ids.length > 0) {
            const assignments = role_ids.map(roleId => ({
                employee_id: parseInt(employeeId),
                role_id: roleId,
                assigned_by: req.user.employeeId || req.user.id,
                assigned_at: new Date()
            }));
            await EmployeeRole.bulkCreate(assignments, { ignoreDuplicates: true });
        }

        // Cache temizle
        clearPermissionCache(employeeId);

        res.json({
            success: true,
            message: `${role_ids.length} rol atandı`
        });
    } catch (error) {
        console.error('[Roles] Assign roles error:', error);
        res.status(500).json({ success: false, error: 'Roller atanamadı' });
    }
});

/**
 * POST /api/roles/employee/:employeeId/add - Çalışana tek rol ekle
 */
router.post('/employee/:employeeId/add', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { role_id } = req.body;

        if (!role_id) {
            return res.status(400).json({ success: false, error: 'role_id zorunludur' });
        }

        const [assignment, created] = await EmployeeRole.findOrCreate({
            where: { employee_id: employeeId, role_id },
            defaults: {
                assigned_by: req.user.employeeId || req.user.id,
                assigned_at: new Date()
            }
        });

        // Cache temizle
        clearPermissionCache(employeeId);

        res.json({
            success: true,
            created,
            message: created ? 'Rol atandı' : 'Rol zaten atanmış'
        });
    } catch (error) {
        console.error('[Roles] Add role error:', error);
        res.status(500).json({ success: false, error: 'Rol eklenemedi' });
    }
});

/**
 * DELETE /api/roles/employee/:employeeId/:roleId - Çalışandan rol kaldır
 */
router.delete('/employee/:employeeId/:roleId', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { employeeId, roleId } = req.params;

        const deleted = await EmployeeRole.destroy({
            where: { employee_id: employeeId, role_id: roleId }
        });

        // Cache temizle
        clearPermissionCache(employeeId);

        res.json({
            success: true,
            message: deleted ? 'Rol kaldırıldı' : 'Rol zaten atanmamış'
        });
    } catch (error) {
        console.error('[Roles] Remove role error:', error);
        res.status(500).json({ success: false, error: 'Rol kaldırılamadı' });
    }
});

module.exports = router;
