// backend-express/routes/calendar.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const getSiteCode = (req) => req.headers['x-site-id'] || req.headers['x-site-code'] || 'DEFAULT';
const getEmployeeId = (req) => req.headers['x-employee-id'] || null;

// GET /api/calendar/events — tüm etkinlikleri listele (filtre desteği)
router.get('/events', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const { month, year, type, priority, status } = req.query;

        const where = { site_code: siteCode };

        // Tarih filtresi (ay/yıl bazlı)
        if (month && year) {
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endMonth = parseInt(month);
            const endYear = parseInt(year);
            const lastDay = new Date(endYear, endMonth, 0).getDate();
            const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
            where.date = { [Op.between]: [startDate, endDate] };
        } else if (year) {
            where.date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
        }

        if (type) where.type = type;
        if (priority) where.priority = priority;
        if (status) where.status = status;

        const events = await CalendarEvent.findAll({
            where,
            include: [{
                model: Employee,
                as: 'creator',
                attributes: ['id', 'first_name', 'last_name', 'email', 'position'],
                required: false
            }],
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        // Frontend uyumlu format
        const formattedEvents = events.map(e => ({
            id: e.id,
            title: e.title,
            type: e.type,
            date: e.date,
            startTime: e.start_time,
            endTime: e.end_time,
            location: e.location,
            description: e.description,
            priority: e.priority,
            status: e.status,
            attendees: e.attendees || [],
            createdBy: e.creator ? `${e.creator.first_name} ${e.creator.last_name}` : 'system',
            creator: e.creator
        }));

        res.json(formattedEvents);
    } catch (error) {
        console.error('Calendar events fetch error:', error);
        res.status(500).json({ error: 'Etkinlikler yüklenemedi', details: error.message });
    }
});

// GET /api/calendar/events/:id — tek etkinlik
router.get('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id, {
            include: [{ model: Employee, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }]
        });
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });
        res.json(event);
    } catch (error) {
        console.error('Calendar event fetch error:', error);
        res.status(500).json({ error: 'Etkinlik yüklenemedi' });
    }
});

// POST /api/calendar/events — yeni etkinlik
router.post('/events', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { title, type, date, startTime, endTime, location, description, priority, attendees } = req.body;

        if (!title || !date) {
            return res.status(400).json({ error: 'Başlık ve tarih zorunludur' });
        }

        const event = await CalendarEvent.create({
            title: title.trim(),
            type: type || 'meeting',
            date,
            start_time: startTime || '09:00',
            end_time: endTime || '10:00',
            location: location || null,
            description: description || null,
            priority: priority || 'medium',
            status: 'scheduled',
            attendees: Array.isArray(attendees) ? attendees : (attendees ? attendees.split(',').map(a => a.trim()).filter(Boolean) : []),
            created_by: employeeId,
            site_code: siteCode
        });

        const fullEvent = await CalendarEvent.findByPk(event.id, {
            include: [{ model: Employee, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }]
        });

        // Frontend uyumlu format
        res.status(201).json({
            id: fullEvent.id,
            title: fullEvent.title,
            type: fullEvent.type,
            date: fullEvent.date,
            startTime: fullEvent.start_time,
            endTime: fullEvent.end_time,
            location: fullEvent.location,
            description: fullEvent.description,
            priority: fullEvent.priority,
            status: fullEvent.status,
            attendees: fullEvent.attendees || [],
            createdBy: fullEvent.creator ? `${fullEvent.creator.first_name} ${fullEvent.creator.last_name}` : 'system'
        });
    } catch (error) {
        console.error('Calendar event create error:', error);
        res.status(500).json({ error: 'Etkinlik oluşturulamadı', details: error.message });
    }
});

// PUT /api/calendar/events/:id — güncelle
router.put('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id);
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });

        const { title, type, date, startTime, endTime, location, description, priority, status, attendees } = req.body;
        const updateData = {};

        if (title !== undefined) updateData.title = title.trim();
        if (type !== undefined) updateData.type = type;
        if (date !== undefined) updateData.date = date;
        if (startTime !== undefined) updateData.start_time = startTime;
        if (endTime !== undefined) updateData.end_time = endTime;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (attendees !== undefined) {
            updateData.attendees = Array.isArray(attendees) ? attendees : attendees.split(',').map(a => a.trim()).filter(Boolean);
        }

        await event.update(updateData);
        res.json(event);
    } catch (error) {
        console.error('Calendar event update error:', error);
        res.status(500).json({ error: 'Etkinlik güncellenemedi' });
    }
});

// DELETE /api/calendar/events/:id — sil
router.delete('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id);
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı' });

        await event.destroy();
        res.json({ message: 'Etkinlik silindi' });
    } catch (error) {
        console.error('Calendar event delete error:', error);
        res.status(500).json({ error: 'Etkinlik silinemedi' });
    }
});

module.exports = router;
