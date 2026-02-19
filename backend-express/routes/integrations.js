/**
 * Webhook & Bot System (Phase 5.1)
 * Incoming/Outgoing webhook desteği + Bot framework
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken, adminOnly } = require('../middleware/chatAuth');
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// ============================================================
// WEBHOOK MODEL (inline - migration ile de oluşturulabilir)
// ============================================================
const Webhook = sequelize.define('Webhook', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: {
        type: DataTypes.ENUM('incoming', 'outgoing'),
        allowNull: false,
        defaultValue: 'incoming'
    },
    url: { type: DataTypes.STRING(500), allowNull: true }, // Outgoing webhook URL
    token: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    secret: { type: DataTypes.STRING(100), allowNull: true }, // Outgoing webhook signing secret
    channel_id: { type: DataTypes.INTEGER, allowNull: true },
    site_code: { type: DataTypes.STRING(50), allowNull: true },
    events: { type: DataTypes.JSONB, allowNull: true, defaultValue: ['message.created'] },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    last_triggered_at: { type: DataTypes.DATE, allowNull: true },
    trigger_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    metadata: { type: DataTypes.JSONB, allowNull: true }
}, {
    tableName: 'webhooks',
    timestamps: true,
    underscored: true
});

// ============================================================
// BOT MODEL
// ============================================================
const Bot = sequelize.define('Bot', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    display_name: { type: DataTypes.STRING(100), allowNull: true },
    avatar_url: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    token: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    type: {
        type: DataTypes.ENUM('system', 'custom', 'integration'),
        defaultValue: 'custom'
    },
    capabilities: { type: DataTypes.JSONB, defaultValue: [] }, // ['send_messages', 'read_channels', etc.]
    site_code: { type: DataTypes.STRING(50), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true }
}, {
    tableName: 'bots',
    timestamps: true,
    underscored: true
});

// ============================================================
// ROUTES
// ============================================================

// --- WEBHOOK CRUD ---

/**
 * GET /api/integrations/webhooks - Webhook listesi
 */
router.get('/webhooks', authenticateToken, async (req, res) => {
    try {
        await Webhook.sync();
        const webhooks = await Webhook.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, webhooks });
    } catch (error) {
        console.error('[Webhooks] List error:', error);
        res.status(500).json({ success: false, error: 'Webhook listesi alınamadı' });
    }
});

/**
 * POST /api/integrations/webhooks - Yeni webhook oluştur
 */
router.post('/webhooks', authenticateToken, adminOnly, async (req, res) => {
    try {
        await Webhook.sync();
        const { name, type, url, channel_id, events, site_code } = req.body;

        const token = `whk_${crypto.randomBytes(16).toString('hex')}`;
        const secret = type === 'outgoing' ? crypto.randomBytes(32).toString('hex') : null;

        const webhook = await Webhook.create({
            name,
            type: type || 'incoming',
            url: url || null,
            token,
            secret,
            channel_id,
            site_code,
            events: events || ['message.created'],
            created_by: req.user?.id,
            is_active: true
        });

        res.status(201).json({
            success: true,
            webhook: {
                ...webhook.toJSON(),
                webhookUrl: `${process.env.API_URL || 'https://api.optimahr.com'}/api/integrations/webhooks/${token}/trigger`
            }
        });
    } catch (error) {
        console.error('[Webhooks] Create error:', error);
        res.status(500).json({ success: false, error: 'Webhook oluşturulamadı' });
    }
});

/**
 * POST /api/integrations/webhooks/:token/trigger - Incoming webhook tetikle
 * External servisler bu endpoint'i kullanır
 */
router.post('/webhooks/:token/trigger', async (req, res) => {
    try {
        await Webhook.sync();
        const webhook = await Webhook.findOne({
            where: { token: req.params.token, type: 'incoming', is_active: true }
        });

        if (!webhook) {
            return res.status(404).json({ success: false, error: 'Webhook bulunamadı' });
        }

        const { text, username, icon_url, channel } = req.body;

        // Mesajı ilgili kanala gönder
        if (text && webhook.channel_id) {
            try {
                const ChatMessage = require('../models/ChatMessage');
                await ChatMessage.create({
                    room_id: webhook.channel_id,
                    message: text,
                    sender_type: 'bot',
                    sender_id: `webhook_${webhook.id}`,
                    sender_name: username || webhook.name,
                    metadata: {
                        webhook_id: webhook.id,
                        icon_url: icon_url || null,
                        source: 'incoming_webhook'
                    }
                });
            } catch (msgErr) {
                console.error('[Webhooks] Message create error:', msgErr.message);
            }
        }

        // Trigger sayacını güncelle
        await webhook.update({
            last_triggered_at: new Date(),
            trigger_count: webhook.trigger_count + 1
        });

        res.json({ success: true, message: 'Webhook triggered' });
    } catch (error) {
        console.error('[Webhooks] Trigger error:', error);
        res.status(500).json({ success: false, error: 'Webhook tetiklenemedi' });
    }
});

/**
 * DELETE /api/integrations/webhooks/:id - Webhook sil
 */
router.delete('/webhooks/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const webhook = await Webhook.findByPk(req.params.id);
        if (!webhook) return res.status(404).json({ success: false, error: 'Webhook bulunamadı' });

        await webhook.destroy();
        res.json({ success: true, message: 'Webhook silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Webhook silinemedi' });
    }
});

// --- BOT CRUD ---

/**
 * GET /api/integrations/bots - Bot listesi
 */
router.get('/bots', authenticateToken, async (req, res) => {
    try {
        await Bot.sync();
        const bots = await Bot.findAll({ order: [['created_at', 'DESC']] });
        res.json({ success: true, bots });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Bot listesi alınamadı' });
    }
});

/**
 * POST /api/integrations/bots - Yeni bot oluştur
 */
router.post('/bots', authenticateToken, adminOnly, async (req, res) => {
    try {
        await Bot.sync();
        const { name, display_name, description, avatar_url, capabilities, site_code } = req.body;

        const token = `bot_${crypto.randomBytes(16).toString('hex')}`;

        const bot = await Bot.create({
            name,
            display_name: display_name || name,
            description,
            avatar_url,
            token,
            capabilities: capabilities || ['send_messages'],
            site_code,
            created_by: req.user?.id,
            is_active: true
        });

        res.status(201).json({ success: true, bot });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Bot oluşturulamadı' });
    }
});

/**
 * POST /api/integrations/bots/:token/send - Bot mesajı gönder
 */
router.post('/bots/:token/send', async (req, res) => {
    try {
        await Bot.sync();
        const bot = await Bot.findOne({
            where: { token: req.params.token, is_active: true }
        });

        if (!bot) {
            return res.status(404).json({ success: false, error: 'Bot bulunamadı' });
        }

        const { channel_id, room_id, message, attachments } = req.body;
        const targetRoom = channel_id || room_id;

        if (!targetRoom || !message) {
            return res.status(400).json({ success: false, error: 'channel_id ve message gerekli' });
        }

        const ChatMessage = require('../models/ChatMessage');
        const chatMessage = await ChatMessage.create({
            room_id: targetRoom,
            message,
            sender_type: 'bot',
            sender_id: `bot_${bot.id}`,
            sender_name: bot.display_name || bot.name,
            metadata: {
                bot_id: bot.id,
                avatar_url: bot.avatar_url,
                attachments: attachments || []
            }
        });

        res.json({ success: true, message: chatMessage });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Mesaj gönderilemedi' });
    }
});

/**
 * DELETE /api/integrations/bots/:id - Bot sil
 */
router.delete('/bots/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const bot = await Bot.findByPk(req.params.id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot bulunamadı' });

        await bot.destroy();
        res.json({ success: true, message: 'Bot silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Bot silinemedi' });
    }
});

module.exports = router;
