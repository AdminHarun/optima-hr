/**
 * RBAC (Role Based Access Control) Middleware
 * 
 * Kullanım:
 *   router.post('/endpoint', authenticateToken, checkPermission('tasks.create'), handler)
 *   router.get('/endpoint', authenticateToken, checkAnyPermission(['tasks.read', 'tasks.manage']), handler)
 */

const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const EmployeeRole = require('../models/EmployeeRole');

// In-memory permission cache (TTL: 5 dakika)
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

/**
 * Kullanıcının izinlerini getir (cache destekli)
 */
async function getUserPermissions(userId, userType) {
    const cacheKey = `${userType}:${userId}`;
    const cached = permissionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.permissions;
    }

    try {
        // Employee'nin rollerini bul
        const employeeRoles = await EmployeeRole.findAll({
            where: { employee_id: userId },
            attributes: ['role_id']
        });

        if (employeeRoles.length === 0) {
            // Rol atanmamış kullanıcılar için boş izin seti
            permissionCache.set(cacheKey, { permissions: [], timestamp: Date.now() });
            return [];
        }

        const roleIds = employeeRoles.map(er => er.role_id);

        // Rollerin izinlerini bul
        const rolePermissions = await RolePermission.findAll({
            where: { role_id: roleIds },
            attributes: ['permission_id']
        });

        const permissionIds = [...new Set(rolePermissions.map(rp => rp.permission_id))];

        if (permissionIds.length === 0) {
            permissionCache.set(cacheKey, { permissions: [], timestamp: Date.now() });
            return [];
        }

        const permissions = await Permission.findAll({
            where: { id: permissionIds },
            attributes: ['name']
        });

        const permissionNames = permissions.map(p => p.name);

        // Cache'e kaydet
        permissionCache.set(cacheKey, { permissions: permissionNames, timestamp: Date.now() });

        return permissionNames;
    } catch (error) {
        console.error('[RBAC] getUserPermissions error:', error.message);
        return [];
    }
}

/**
 * Cache'i temizle (rol/izin değişikliklerinde çağrılır)
 */
function clearPermissionCache(userId) {
    if (userId) {
        // Belirli kullanıcı cache'ini temizle
        for (const [key] of permissionCache) {
            if (key.endsWith(`:${userId}`)) {
                permissionCache.delete(key);
            }
        }
    } else {
        // Tüm cache'i temizle
        permissionCache.clear();
    }
}

/**
 * Tek bir izin kontrolü middleware
 * @param {string} requiredPermission - Gerekli izin adı (ör: 'tasks.create')
 */
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const { user } = req;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Yetkilendirme gerekli'
                });
            }

            // SUPER_ADMIN tüm izinleri bypass eder
            if (user.role === 'SUPER_ADMIN') {
                return next();
            }

            // ADMIN rolü de geniş yetkilere sahip (geriye uyumluluk)
            if (user.role === 'ADMIN') {
                return next();
            }

            const userId = user.employeeId || user.id;
            const userPermissions = await getUserPermissions(userId, user.type);

            // *.manage izni tüm alt izinleri kapsar
            const resource = requiredPermission.split('.')[0];
            const hasManageAll = userPermissions.includes(`${resource}.manage`);

            if (hasManageAll || userPermissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz yok',
                required: requiredPermission
            });
        } catch (error) {
            console.error('[RBAC] checkPermission error:', error);
            return res.status(500).json({
                success: false,
                error: 'Yetki kontrolü sırasında hata oluştu'
            });
        }
    };
};

/**
 * Birden fazla izinden herhangi birinin yeterli olduğu kontrol
 * @param {string[]} requiredPermissions - İzin adları listesi
 */
const checkAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const { user } = req;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Yetkilendirme gerekli'
                });
            }

            // SUPER_ADMIN ve ADMIN bypass
            if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
                return next();
            }

            const userId = user.employeeId || user.id;
            const userPermissions = await getUserPermissions(userId, user.type);

            const hasAny = requiredPermissions.some(rp => {
                const resource = rp.split('.')[0];
                return userPermissions.includes(rp) || userPermissions.includes(`${resource}.manage`);
            });

            if (hasAny) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz yok',
                required: requiredPermissions
            });
        } catch (error) {
            console.error('[RBAC] checkAnyPermission error:', error);
            return res.status(500).json({
                success: false,
                error: 'Yetki kontrolü sırasında hata oluştu'
            });
        }
    };
};

/**
 * Kullanıcının belirli bir izni olup olmadığını kontrol et (middleware değil, helper)
 */
async function hasPermission(userId, userType, permissionName) {
    const permissions = await getUserPermissions(userId, userType);
    const resource = permissionName.split('.')[0];
    return permissions.includes(permissionName) || permissions.includes(`${resource}.manage`);
}

module.exports = {
    checkPermission,
    checkAnyPermission,
    hasPermission,
    getUserPermissions,
    clearPermissionCache
};
