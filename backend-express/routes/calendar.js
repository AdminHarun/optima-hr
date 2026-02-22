// backend-express/routes/calendar.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const getSiteCode = (req) => req.headers['x-site-id'] || req.headers['x-site-code'] || 'DEFAULT';
const getEmployeeId = (req) => req.headers['x-employee-id'] || null;

// Helper: event'i frontend uyumlu formata cevir
const formatEvent = (e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    date: e.date,
    startTime: e.start_time,
    endTime: e.end_time,
    allDay: e.all_day || false,
    location: e.location,
    description: e.description,
    priority: e.priority,
    status: e.status,
    attendees: e.attendees || [],
    videoCallUrl: e.video_call_url,
    recurrenceRule: e.recurrence_rule,
    recurrenceEndDate: e.recurrence_end_date,
    reminderMinutes: e.reminder_minutes,
    createdBy: e.creator ? `${e.creator.first_name} ${e.creator.last_name}` : 'system',
    creator: e.creator || null,
    createdAt: e.created_at,
    updatedAt: e.updated_at
});

// Helper: recurring event'lerin instance'larini olustur
const expandRecurringEvents = (events, startDate, endDate) => {
    const expanded = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    events.forEach(event => {
        if (!event.recurrence_rule || event.recurrence_rule === 'none') {
            expanded.push(event);
            return;
        }

        const eventDate = new Date(event.date);
        const recEnd = event.recurrence_end_date ? new Date(event.recurrence_end_date) : new Date(end);
        const actualEnd = recEnd < end ? recEnd : end;

        let current = new Date(eventDate);
        while (current <= actualEnd) {
            if (current >= start && current <= end) {
                const instance = { ...event.toJSON ? event.toJSON() : event };
                instance.date = current.toISOString().split('T')[0];
                instance._isRecurrenceInstance = current.getTime() !== eventDate.getTime();
                instance._originalDate = event.date;
                expanded.push(instance);
            }

            switch (event.recurrence_rule) {
                case 'daily':
                    current.setDate(current.getDate() + 1);
                    break;
                case 'weekly':
                    current.setDate(current.getDate() + 7);
                    break;
                case 'monthly':
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'yearly':
                    current.setFullYear(current.getFullYear() + 1);
                    break;
                default:
                    current = new Date(actualEnd.getTime() + 1);
            }
        }
    });

    return expanded;
};

// GET /api/calendar/events — tum etkinlikleri listele (filtre destegi)
router.get('/events', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const { month, year, type, priority, status, startDate, endDate } = req.query;

        const where = { site_code: siteCode };

        let queryStart, queryEnd;

        // Tarih filtresi
        if (startDate && endDate) {
            queryStart = startDate;
            queryEnd = endDate;
        } else if (month && year) {
            queryStart = `${year}-${month.padStart(2, '0')}-01`;
            const endMonth = parseInt(month);
            const endYear = parseInt(year);
            const lastDay = new Date(endYear, endMonth, 0).getDate();
            queryEnd = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        } else if (year) {
            queryStart = `${year}-01-01`;
            queryEnd = `${year}-12-31`;
        }

        if (queryStart && queryEnd) {
            // Recurring event'leri de yakala: orijinal tarihi query araliginda VEYA recurrence var
            where[Op.or] = [
                { date: { [Op.between]: [queryStart, queryEnd] } },
                {
                    recurrence_rule: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: 'none' }] },
                    date: { [Op.lte]: queryEnd }
                }
            ];
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

        // Recurring event'leri genislet
        let resultEvents = events;
        if (queryStart && queryEnd) {
            resultEvents = expandRecurringEvents(events, queryStart, queryEnd);
        }

        const formattedEvents = resultEvents.map(e => {
            if (e.toJSON) return formatEvent(e);
            // Already expanded plain object
            return {
                id: e.id,
                title: e.title,
                type: e.type,
                date: e.date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day || false,
                location: e.location,
                description: e.description,
                priority: e.priority,
                status: e.status,
                attendees: e.attendees || [],
                videoCallUrl: e.video_call_url,
                recurrenceRule: e.recurrence_rule,
                recurrenceEndDate: e.recurrence_end_date,
                reminderMinutes: e.reminder_minutes,
                createdBy: e.creator ? `${e.creator.first_name} ${e.creator.last_name}` : 'system',
                creator: e.creator || null,
                _isRecurrenceInstance: e._isRecurrenceInstance || false,
                _originalDate: e._originalDate || null
            };
        });

        res.json(formattedEvents);
    } catch (error) {
        console.error('Calendar events fetch error:', error);
        res.status(500).json({ error: 'Etkinlikler yuklenemedi', details: error.message });
    }
});

// GET /api/calendar/events/:id — tek etkinlik
router.get('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id, {
            include: [{ model: Employee, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }]
        });
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadi' });
        res.json(formatEvent(event));
    } catch (error) {
        console.error('Calendar event fetch error:', error);
        res.status(500).json({ error: 'Etkinlik yuklenemedi' });
    }
});

// POST /api/calendar/events — yeni etkinlik
router.post('/events', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const {
            title, type, date, startTime, endTime, location, description,
            priority, attendees, allDay, videoCallUrl, recurrenceRule,
            recurrenceEndDate, reminderMinutes
        } = req.body;

        if (!title || !date) {
            return res.status(400).json({ error: 'Baslik ve tarih zorunludur' });
        }

        const parsedAttendees = Array.isArray(attendees)
            ? attendees
            : (attendees ? attendees.split(',').map(a => a.trim()).filter(Boolean) : []);

        const event = await CalendarEvent.create({
            title: title.trim(),
            type: type || 'meeting',
            date,
            start_time: allDay ? null : (startTime || '09:00'),
            end_time: allDay ? null : (endTime || '10:00'),
            all_day: allDay || false,
            location: location || null,
            description: description || null,
            priority: priority || 'medium',
            status: 'scheduled',
            attendees: parsedAttendees,
            video_call_url: videoCallUrl || null,
            recurrence_rule: recurrenceRule || null,
            recurrence_end_date: recurrenceEndDate || null,
            reminder_minutes: reminderMinutes != null ? reminderMinutes : 15,
            created_by: employeeId,
            site_code: siteCode
        });

        const fullEvent = await CalendarEvent.findByPk(event.id, {
            include: [{ model: Employee, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }]
        });

        res.status(201).json(formatEvent(fullEvent));
    } catch (error) {
        console.error('Calendar event create error:', error);
        res.status(500).json({ error: 'Etkinlik olusturulamadi', details: error.message });
    }
});

// PUT /api/calendar/events/:id — guncelle
router.put('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent, Employee } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id);
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadi' });

        const {
            title, type, date, startTime, endTime, location, description,
            priority, status, attendees, allDay, videoCallUrl,
            recurrenceRule, recurrenceEndDate, reminderMinutes
        } = req.body;
        const updateData = {};

        if (title !== undefined) updateData.title = title.trim();
        if (type !== undefined) updateData.type = type;
        if (date !== undefined) updateData.date = date;
        if (startTime !== undefined) updateData.start_time = startTime;
        if (endTime !== undefined) updateData.end_time = endTime;
        if (allDay !== undefined) updateData.all_day = allDay;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (videoCallUrl !== undefined) updateData.video_call_url = videoCallUrl;
        if (recurrenceRule !== undefined) updateData.recurrence_rule = recurrenceRule;
        if (recurrenceEndDate !== undefined) updateData.recurrence_end_date = recurrenceEndDate;
        if (reminderMinutes !== undefined) updateData.reminder_minutes = reminderMinutes;
        if (attendees !== undefined) {
            updateData.attendees = Array.isArray(attendees) ? attendees : attendees.split(',').map(a => a.trim()).filter(Boolean);
        }

        await event.update(updateData);

        const fullEvent = await CalendarEvent.findByPk(event.id, {
            include: [{ model: Employee, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] }]
        });

        res.json(formatEvent(fullEvent));
    } catch (error) {
        console.error('Calendar event update error:', error);
        res.status(500).json({ error: 'Etkinlik guncellenemedi' });
    }
});

// POST /api/calendar/events/:id/respond — katilimci cevap ver
router.post('/events/:id/respond', async (req, res) => {
    try {
        const { CalendarEvent } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id);
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadi' });

        const { email, response } = req.body;
        if (!email || !['accepted', 'declined', 'tentative'].includes(response)) {
            return res.status(400).json({ error: 'Gecerli email ve cevap (accepted/declined/tentative) gerekli' });
        }

        let attendees = event.attendees || [];

        // attendees string array ise object array'e cevir
        attendees = attendees.map(a => {
            if (typeof a === 'string') return { email: a, status: 'pending' };
            return a;
        });

        const idx = attendees.findIndex(a => (a.email || a) === email);
        if (idx >= 0) {
            attendees[idx] = { email, status: response };
        } else {
            attendees.push({ email, status: response });
        }

        await event.update({ attendees });
        res.json({ message: 'Cevap kaydedildi', attendees });
    } catch (error) {
        console.error('Calendar event respond error:', error);
        res.status(500).json({ error: 'Cevap kaydedilemedi' });
    }
});

// DELETE /api/calendar/events/:id — sil
router.delete('/events/:id', async (req, res) => {
    try {
        const { CalendarEvent } = require('../models/associations');
        const event = await CalendarEvent.findByPk(req.params.id);
        if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadi' });

        await event.destroy();
        res.json({ message: 'Etkinlik silindi' });
    } catch (error) {
        console.error('Calendar event delete error:', error);
        res.status(500).json({ error: 'Etkinlik silinemedi' });
    }
});

module.exports = router;
