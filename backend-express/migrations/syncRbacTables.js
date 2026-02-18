/**
 * RBAC Tables Migration & Seed Data
 * 
 * Oluşturulan tablolar:
 * - roles
 * - permissions
 * - role_permissions
 * - employee_roles
 * 
 * Seed data:
 * - 6 default rol (super_admin, admin, manager, hr, employee, guest)
 * - 30+ default izin (tasks, channels, files, users, calendar, chat)
 * - Default rol-izin mapping
 */

const { sequelize } = require('../config/database');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const EmployeeRole = require('../models/EmployeeRole');

async function syncRbacTables() {
    try {
        console.log('🔐 [RBAC Migration] Starting...');

        // 1. Tabloları oluştur
        await Role.sync({ alter: true });
        await Permission.sync({ alter: true });
        await RolePermission.sync({ alter: true });
        await EmployeeRole.sync({ alter: true });

        console.log('✅ [RBAC Migration] Tables created/synced');

        // 2. Default rolleri seed et
        const defaultRoles = [
            { name: 'super_admin', display_name: 'Süper Admin', description: 'Tüm yetkilere sahip, tüm siteleri yönetebilir', is_system: true },
            { name: 'admin', display_name: 'Admin', description: 'Site yöneticisi, geniş yetkiler', is_system: true },
            { name: 'manager', display_name: 'Yönetici', description: 'Ekip yöneticisi, departman bazlı yetkiler', is_system: true },
            { name: 'hr', display_name: 'İnsan Kaynakları', description: 'İK departmanı, çalışan yönetimi', is_system: true },
            { name: 'employee', display_name: 'Çalışan', description: 'Standart kullanıcı', is_system: true },
            { name: 'guest', display_name: 'Misafir', description: 'Sınırlı erişim, sadece okuma', is_system: true }
        ];

        for (const roleData of defaultRoles) {
            await Role.findOrCreate({
                where: { name: roleData.name },
                defaults: roleData
            });
        }

        console.log('✅ [RBAC Migration] Default roles seeded');

        // 3. Default izinleri seed et
        const defaultPermissions = [
            // Tasks
            { name: 'tasks.create', resource: 'tasks', action: 'create', description: 'Görev oluşturabilir' },
            { name: 'tasks.read', resource: 'tasks', action: 'read', description: 'Görevleri görüntüleyebilir' },
            { name: 'tasks.update.own', resource: 'tasks', action: 'update', description: 'Kendi görevlerini düzenleyebilir' },
            { name: 'tasks.update.all', resource: 'tasks', action: 'update', description: 'Tüm görevleri düzenleyebilir' },
            { name: 'tasks.delete', resource: 'tasks', action: 'delete', description: 'Görev silebilir' },
            { name: 'tasks.manage', resource: 'tasks', action: 'manage', description: 'Görev yönetimi (tam yetki)' },

            // Channels
            { name: 'channels.create', resource: 'channels', action: 'create', description: 'Kanal oluşturabilir' },
            { name: 'channels.read', resource: 'channels', action: 'read', description: 'Kanalları görüntüleyebilir' },
            { name: 'channels.update', resource: 'channels', action: 'update', description: 'Kanal düzenleyebilir' },
            { name: 'channels.delete', resource: 'channels', action: 'delete', description: 'Kanal silebilir' },
            { name: 'channels.manage', resource: 'channels', action: 'manage', description: 'Kanal yönetimi (tam yetki)' },

            // Files
            { name: 'files.upload', resource: 'files', action: 'create', description: 'Dosya yükleyebilir' },
            { name: 'files.read', resource: 'files', action: 'read', description: 'Dosyaları görüntüleyebilir' },
            { name: 'files.update', resource: 'files', action: 'update', description: 'Dosya düzenleyebilir' },
            { name: 'files.delete', resource: 'files', action: 'delete', description: 'Dosya silebilir' },
            { name: 'files.manage', resource: 'files', action: 'manage', description: 'Dosya yönetimi (tam yetki)' },

            // Users / Employees
            { name: 'users.view', resource: 'users', action: 'read', description: 'Kullanıcıları görüntüleyebilir' },
            { name: 'users.create', resource: 'users', action: 'create', description: 'Kullanıcı ekleyebilir' },
            { name: 'users.update', resource: 'users', action: 'update', description: 'Kullanıcı düzenleyebilir' },
            { name: 'users.delete', resource: 'users', action: 'delete', description: 'Kullanıcı silebilir' },
            { name: 'users.manage', resource: 'users', action: 'manage', description: 'Kullanıcı yönetimi (tam yetki)' },

            // Calendar
            { name: 'calendar.create', resource: 'calendar', action: 'create', description: 'Etkinlik oluşturabilir' },
            { name: 'calendar.read', resource: 'calendar', action: 'read', description: 'Takvimi görüntüleyebilir' },
            { name: 'calendar.update', resource: 'calendar', action: 'update', description: 'Etkinlik düzenleyebilir' },
            { name: 'calendar.delete', resource: 'calendar', action: 'delete', description: 'Etkinlik silebilir' },
            { name: 'calendar.manage', resource: 'calendar', action: 'manage', description: 'Takvim yönetimi (tam yetki)' },

            // Chat
            { name: 'chat.send', resource: 'chat', action: 'create', description: 'Mesaj gönderebilir' },
            { name: 'chat.read', resource: 'chat', action: 'read', description: 'Mesajları okuyabilir' },
            { name: 'chat.delete.own', resource: 'chat', action: 'delete', description: 'Kendi mesajlarını silebilir' },
            { name: 'chat.delete.all', resource: 'chat', action: 'delete', description: 'Tüm mesajları silebilir' },
            { name: 'chat.manage', resource: 'chat', action: 'manage', description: 'Chat yönetimi (tam yetki)' },

            // Admin
            { name: 'admin.dashboard', resource: 'admin', action: 'read', description: 'Admin paneline erişebilir' },
            { name: 'admin.settings', resource: 'admin', action: 'manage', description: 'Sistem ayarlarını yönetebilir' },
            { name: 'admin.audit_logs', resource: 'admin', action: 'read', description: 'Denetim kayıtlarını görüntüleyebilir' },
            { name: 'admin.roles', resource: 'admin', action: 'manage', description: 'Rolleri yönetebilir' },

            // Recruitment
            { name: 'recruitment.view', resource: 'recruitment', action: 'read', description: 'İşe alım süreçlerini görüntüleyebilir' },
            { name: 'recruitment.manage', resource: 'recruitment', action: 'manage', description: 'İşe alım yönetimi (tam yetki)' },

            // Payroll
            { name: 'payroll.view', resource: 'payroll', action: 'read', description: 'Bordro bilgilerini görüntüleyebilir' },
            { name: 'payroll.manage', resource: 'payroll', action: 'manage', description: 'Bordro yönetimi (tam yetki)' },
        ];

        for (const permData of defaultPermissions) {
            await Permission.findOrCreate({
                where: { name: permData.name },
                defaults: permData
            });
        }

        console.log('✅ [RBAC Migration] Default permissions seeded');

        // 4. Default rol-izin mapping
        const allRoles = await Role.findAll();
        const allPermissions = await Permission.findAll();

        const roleMap = {};
        allRoles.forEach(r => { roleMap[r.name] = r.id; });

        const permMap = {};
        allPermissions.forEach(p => { permMap[p.name] = p.id; });

        // Rol bazlı izin atamaları
        const rolePermissionMapping = {
            super_admin: Object.keys(permMap), // Tüm izinler
            admin: Object.keys(permMap).filter(p => !p.startsWith('admin.roles')),
            manager: [
                'tasks.create', 'tasks.read', 'tasks.update.all', 'tasks.delete',
                'channels.create', 'channels.read', 'channels.update',
                'files.upload', 'files.read', 'files.update', 'files.delete',
                'users.view',
                'calendar.create', 'calendar.read', 'calendar.update', 'calendar.delete',
                'chat.send', 'chat.read', 'chat.delete.own',
                'admin.dashboard',
                'recruitment.view'
            ],
            hr: [
                'tasks.create', 'tasks.read', 'tasks.update.own',
                'channels.read', 'channels.create',
                'files.upload', 'files.read',
                'users.view', 'users.create', 'users.update',
                'calendar.create', 'calendar.read', 'calendar.update',
                'chat.send', 'chat.read', 'chat.delete.own',
                'admin.dashboard',
                'recruitment.view', 'recruitment.manage',
                'payroll.view'
            ],
            employee: [
                'tasks.create', 'tasks.read', 'tasks.update.own',
                'channels.read',
                'files.upload', 'files.read',
                'users.view',
                'calendar.create', 'calendar.read',
                'chat.send', 'chat.read', 'chat.delete.own'
            ],
            guest: [
                'tasks.read',
                'channels.read',
                'files.read',
                'calendar.read',
                'chat.read'
            ]
        };

        for (const [roleName, permNames] of Object.entries(rolePermissionMapping)) {
            const roleId = roleMap[roleName];
            if (!roleId) continue;

            for (const permName of permNames) {
                const permId = permMap[permName];
                if (!permId) continue;

                await RolePermission.findOrCreate({
                    where: { role_id: roleId, permission_id: permId },
                    defaults: { role_id: roleId, permission_id: permId }
                });
            }
        }

        console.log('✅ [RBAC Migration] Role-permission mappings seeded');
        console.log('🔐 [RBAC Migration] Complete!');

        return true;
    } catch (error) {
        console.error('❌ [RBAC Migration] Error:', error.message);
        return false;
    }
}

module.exports = syncRbacTables;
