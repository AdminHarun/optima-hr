/**
 * Database Performance Indexes Migration
 * Sık kullanılan sorgular için index optimizasyonu
 */

const { sequelize } = require('../config/database');

async function addIndexSafe(table, columns, indexName) {
    try {
        const colStr = Array.isArray(columns) ? columns.join(', ') : columns;
        await sequelize.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${colStr})`);
        return true;
    } catch (error) {
        // Index zaten varsa veya tablo yoksa sessizce devam et
        if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
            return false;
        }
        console.warn(`⚠️ Index ${indexName} creation note:`, error.message);
        return false;
    }
}

async function runDbIndexMigration() {
    console.log('🔄 Running database index optimization...');
    let created = 0;

    // Chat Messages - en sık sorgulanan tablo
    if (await addIndexSafe('chat_messages', 'room_id, created_at', 'idx_chat_messages_room_created')) created++;
    if (await addIndexSafe('chat_messages', 'sender_type, sender_id', 'idx_chat_messages_sender')) created++;
    if (await addIndexSafe('chat_messages', 'status', 'idx_chat_messages_status')) created++;
    if (await addIndexSafe('chat_messages', 'thread_id', 'idx_chat_messages_thread')) created++;

    // Chat Rooms
    if (await addIndexSafe('chat_rooms', 'room_type, is_active', 'idx_chat_rooms_type_active')) created++;
    if (await addIndexSafe('chat_rooms', 'applicant_id', 'idx_chat_rooms_applicant')) created++;
    if (await addIndexSafe('chat_rooms', 'site_code', 'idx_chat_rooms_site')) created++;

    // Employees
    if (await addIndexSafe('employees', 'email', 'idx_employees_email')) created++;
    if (await addIndexSafe('employees', 'site_code', 'idx_employees_site')) created++;
    if (await addIndexSafe('employees', 'department', 'idx_employees_department')) created++;

    // Audit Logs
    if (await addIndexSafe('audit_logs', 'user_id', 'idx_audit_logs_user')) created++;
    if (await addIndexSafe('audit_logs', 'action', 'idx_audit_logs_action')) created++;
    if (await addIndexSafe('audit_logs', 'created_at', 'idx_audit_logs_created')) created++;
    if (await addIndexSafe('audit_logs', 'module', 'idx_audit_logs_module')) created++;

    // Tasks
    if (await addIndexSafe('tasks', 'assigned_to', 'idx_tasks_assigned_to')) created++;
    if (await addIndexSafe('tasks', 'status', 'idx_tasks_status')) created++;
    if (await addIndexSafe('tasks', 'priority', 'idx_tasks_priority')) created++;
    if (await addIndexSafe('tasks', 'due_date', 'idx_tasks_due_date')) created++;

    // Calendar Events
    if (await addIndexSafe('calendar_events', 'start_date, end_date', 'idx_calendar_events_dates')) created++;
    if (await addIndexSafe('calendar_events', 'created_by', 'idx_calendar_events_creator')) created++;

    // Job Applications
    if (await addIndexSafe('job_applications', 'status', 'idx_applications_status')) created++;
    if (await addIndexSafe('job_applications', 'site_code', 'idx_applications_site')) created++;
    if (await addIndexSafe('job_applications', 'submitted_at', 'idx_applications_submitted')) created++;

    // Admin Users
    if (await addIndexSafe('management_admin_users', 'email', 'idx_admin_users_email')) created++;
    if (await addIndexSafe('management_admin_users', 'role', 'idx_admin_users_role')) created++;

    // Channels
    if (await addIndexSafe('channels', 'site_code, is_active', 'idx_channels_site_active')) created++;
    if (await addIndexSafe('channel_members', 'employee_id', 'idx_channel_members_employee')) created++;

    // Files
    if (await addIndexSafe('managed_files', 'folder_id', 'idx_files_folder')) created++;
    if (await addIndexSafe('managed_files', 'uploaded_by', 'idx_files_uploader')) created++;

    // RBAC
    if (await addIndexSafe('employee_roles', 'employee_id', 'idx_employee_roles_employee')) created++;
    if (await addIndexSafe('employee_roles', 'role_id', 'idx_employee_roles_role')) created++;

    console.log(`✅ Database index optimization: ${created} indexes created/verified`);
    return created;
}

module.exports = runDbIndexMigration;
