const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TaskComment = require('../models/TaskComment');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
    return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/tasks
 * Yeni görev oluştur
 */
router.post('/', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { title, description, status, priority, assigned_to, due_date, tags, project_id, channel_id, parent_task_id, watchers, attachments } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Görev başlığı zorunludur' });
        }

        const task = await Task.create({
            title: title.trim(),
            description: description || null,
            status: status || 'todo',
            priority: priority || 'medium',
            created_by: employeeId,
            assigned_to: assigned_to || null,
            due_date: due_date || null,
            tags: tags || [],
            project_id: project_id || null,
            channel_id: channel_id || null,
            parent_task_id: parent_task_id || null,
            watchers: watchers || [],
            attachments: attachments || [],
            site_code: siteCode
        });

        // Oluşturulan görevi ilişkilerle birlikte getir
        const fullTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: Employee,
                    as: 'creator',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                },
                {
                    model: Employee,
                    as: 'assignee',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                }
            ]
        });

        res.status(201).json(fullTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Görev oluşturulamadı' });
    }
});

/**
 * GET /api/tasks
 * Görevleri listele (filtreleme destekli)
 */
router.get('/', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { status, priority, assigned_to, created_by, search, limit = 50, offset = 0, sort = 'created_at', order = 'DESC' } = req.query;

        const where = { site_code: siteCode };

        // Filters
        if (status) {
            where.status = status.includes(',') ? { [Op.in]: status.split(',') } : status;
        }
        if (priority) {
            where.priority = priority.includes(',') ? { [Op.in]: priority.split(',') } : priority;
        }
        if (assigned_to) {
            where.assigned_to = assigned_to === 'me' ? employeeId : parseInt(assigned_to);
        }
        if (created_by) {
            where.created_by = created_by === 'me' ? employeeId : parseInt(created_by);
        }
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: tasks } = await Task.findAndCountAll({
            where,
            include: [
                {
                    model: Employee,
                    as: 'creator',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                },
                {
                    model: Employee,
                    as: 'assignee',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                }
            ],
            order: [[sort, order.toUpperCase()]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            tasks,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Görevler getirilemedi' });
    }
});

/**
 * GET /api/tasks/stats
 * Görev istatistikleri (Kanban için)
 */
router.get('/stats', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { sequelize } = require('../config/database');

        const [stats] = await sequelize.query(`
      SELECT 
        status,
        COUNT(*)::int as count,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END)::int as urgent_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END)::int as high_count
      FROM tasks 
      WHERE site_code = :siteCode
      GROUP BY status
    `, {
            replacements: { siteCode },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(stats || []);
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(500).json({ error: 'İstatistikler getirilemedi' });
    }
});

/**
 * GET /api/tasks/:id
 * Görev detayı
 */
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id, {
            include: [
                {
                    model: Employee,
                    as: 'creator',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                },
                {
                    model: Employee,
                    as: 'assignee',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ error: 'Görev bulunamadı' });
        }

        // Get comments
        const comments = await TaskComment.findAll({
            where: { task_id: task.id },
            include: [{
                model: Employee,
                as: 'author',
                attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture']
            }],
            order: [['created_at', 'ASC']]
        });

        res.json({ ...task.toJSON(), comments });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Görev getirilemedi' });
    }
});

/**
 * PUT /api/tasks/:id
 * Görev güncelle
 */
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Görev bulunamadı' });
        }

        const { title, description, status, priority, assigned_to, due_date, tags } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'done' && !task.completed_at) {
                updateData.completed_at = new Date();
            }
            if (status !== 'done') {
                updateData.completed_at = null;
            }
        }
        if (priority !== undefined) updateData.priority = priority;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
        if (due_date !== undefined) updateData.due_date = due_date;
        if (tags !== undefined) updateData.tags = tags;

        await task.update(updateData);

        // Return updated task with relations
        const updatedTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: Employee,
                    as: 'creator',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                },
                {
                    model: Employee,
                    as: 'assignee',
                    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture', 'department']
                }
            ]
        });

        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Görev güncellenemedi' });
    }
});

/**
 * DELETE /api/tasks/:id
 * Görev sil
 */
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Görev bulunamadı' });
        }

        await task.destroy();
        res.json({ message: 'Görev silindi' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Görev silinemedi' });
    }
});

/**
 * POST /api/tasks/:id/comments
 * Göreve yorum ekle
 */
router.post('/:id/comments', async (req, res) => {
    try {
        const employeeId = getEmployeeId(req);
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Yorum içeriği zorunludur' });
        }

        const task = await Task.findByPk(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Görev bulunamadı' });
        }

        const comment = await TaskComment.create({
            task_id: task.id,
            employee_id: employeeId,
            content: content.trim()
        });

        const fullComment = await TaskComment.findByPk(comment.id, {
            include: [{
                model: Employee,
                as: 'author',
                attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture']
            }]
        });

        res.status(201).json(fullComment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Yorum eklenemedi' });
    }
});

/**
 * GET /api/tasks/:id/comments
 * Görev yorumlarını getir
 */
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await TaskComment.findAll({
            where: { task_id: req.params.id },
            include: [{
                model: Employee,
                as: 'author',
                attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture']
            }],
            order: [['created_at', 'ASC']]
        });

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Yorumlar getirilemedi' });
    }
});

/**
 * POST /api/tasks/:id/watch
 * Gorevi izlemeye al
 */
router.post('/:id/watch', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ error: 'Gorev bulunamadi' });

        const employeeId = getEmployeeId(req);
        let watchers = task.watchers || [];
        if (!watchers.includes(parseInt(employeeId))) {
            watchers.push(parseInt(employeeId));
            await task.update({ watchers });
        }
        res.json({ message: 'Izlemeye alindi', watchers });
    } catch (error) {
        console.error('Error watching task:', error);
        res.status(500).json({ error: 'Izleme eklenemedi' });
    }
});

/**
 * DELETE /api/tasks/:id/watch
 * Gorev izlemesini kaldir
 */
router.delete('/:id/watch', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ error: 'Gorev bulunamadi' });

        const employeeId = getEmployeeId(req);
        let watchers = (task.watchers || []).filter(id => id !== parseInt(employeeId));
        await task.update({ watchers });
        res.json({ message: 'Izleme kaldirildi', watchers });
    } catch (error) {
        console.error('Error unwatching task:', error);
        res.status(500).json({ error: 'Izleme kaldirilamadi' });
    }
});

/**
 * GET /api/tasks/:id/subtasks
 * Alt gorevleri getir
 */
router.get('/:id/subtasks', async (req, res) => {
    try {
        const subtasks = await Task.findAll({
            where: { parent_task_id: req.params.id },
            include: [{
                model: Employee,
                as: 'assignee',
                attributes: ['id', 'employee_id', 'first_name', 'last_name', 'profile_picture'],
                required: false
            }],
            order: [['created_at', 'ASC']]
        });
        res.json(subtasks);
    } catch (error) {
        console.error('Error fetching subtasks:', error);
        res.status(500).json({ error: 'Alt gorevler getirilemedi' });
    }
});

/**
 * POST /api/tasks/:id/subtasks
 * Alt gorev olustur
 */
router.post('/:id/subtasks', async (req, res) => {
    try {
        const parentTask = await Task.findByPk(req.params.id);
        if (!parentTask) return res.status(404).json({ error: 'Ust gorev bulunamadi' });

        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { title, description, priority, assigned_to, due_date } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Alt gorev basligi zorunludur' });
        }

        const subtask = await Task.create({
            title: title.trim(),
            description: description || null,
            status: 'todo',
            priority: priority || 'medium',
            created_by: employeeId,
            assigned_to: assigned_to || null,
            due_date: due_date || null,
            parent_task_id: parseInt(req.params.id),
            site_code: siteCode
        });

        res.status(201).json(subtask);
    } catch (error) {
        console.error('Error creating subtask:', error);
        res.status(500).json({ error: 'Alt gorev olusturulamadi' });
    }
});

module.exports = router;
