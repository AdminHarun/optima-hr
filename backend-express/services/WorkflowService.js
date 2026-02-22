/**
 * Workflow Automation Service (Phase 5.4)
 * Olay tabanlı otomasyon sistemi
 * 
 * Trigger Types:
 * - message.created: Mesaj geldiğinde
 * - user.joined: Kullanıcı katıldığında
 * - task.completed: Görev tamamlandığında
 * - schedule: Zamanlanmış görev
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const cron = require('node-cron');

// ============================================================
// WORKFLOW MODEL
// ============================================================
const Workflow = sequelize.define('Workflow', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    trigger_type: {
        type: DataTypes.ENUM('message.created', 'user.joined', 'task.completed', 'schedule'),
        allowNull: false
    },
    trigger_config: { type: DataTypes.JSONB, allowNull: true }, // { keywords: [], schedule: '0 9 * * *' }
    actions: { type: DataTypes.JSONB, allowNull: false }, // [{ type: 'send_message', data: {} }]
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    site_code: { type: DataTypes.STRING(50), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    run_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_run_at: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'workflows',
    timestamps: true,
    underscored: true
});

// Workflow Run History Model
const WorkflowRun = sequelize.define('WorkflowRun', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    workflow_id: { type: DataTypes.INTEGER, allowNull: false },
    trigger_event: { type: DataTypes.STRING(100), allowNull: true },
    status: {
        type: DataTypes.ENUM('success', 'failed', 'skipped'),
        defaultValue: 'success'
    },
    actions_executed: { type: DataTypes.INTEGER, defaultValue: 0 },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    context_snapshot: { type: DataTypes.JSONB, allowNull: true },
    duration_ms: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'workflow_runs',
    timestamps: true,
    underscored: true,
    updatedAt: false
});

class WorkflowService {
    constructor() {
        this.cronJobs = new Map();
        this.init();
    }

    async init() {
        try {
            await Workflow.sync();
            await WorkflowRun.sync();
            await this.loadScheduledWorkflows();
            console.log('✅ Workflow Automation Service initialized');
        } catch (error) {
            console.error('❌ Workflow init error:', error);
        }
    }

    /**
     * Zamanlanmış workflow'ları yükle ve cron job'ları başlat
     */
    async loadScheduledWorkflows() {
        try {
            const scheduled = await Workflow.findAll({
                where: { trigger_type: 'schedule', is_active: true }
            });
            for (const wf of scheduled) {
                this.scheduleWorkflow(wf);
            }
            if (scheduled.length > 0) {
                console.log(`⏰ ${scheduled.length} scheduled workflow(s) loaded`);
            }
        } catch (error) {
            console.error('Failed to load scheduled workflows:', error);
        }
    }

    /**
     * Bir workflow için cron job başlat
     */
    scheduleWorkflow(workflow) {
        const schedule = workflow.trigger_config?.schedule;
        if (!schedule || !cron.validate(schedule)) return;

        // Eski job varsa durdur
        if (this.cronJobs.has(workflow.id)) {
            this.cronJobs.get(workflow.id).stop();
        }

        const job = cron.schedule(schedule, async () => {
            const context = { source: 'scheduler', siteCode: workflow.site_code };
            await this.executeWorkflow(workflow, context);
        });

        this.cronJobs.set(workflow.id, job);
    }

    /**
     * Bir workflow'un cron job'ını durdur
     */
    unscheduleWorkflow(workflowId) {
        if (this.cronJobs.has(workflowId)) {
            this.cronJobs.get(workflowId).stop();
            this.cronJobs.delete(workflowId);
        }
    }

    /**
     * Olay tetikleyici
     * @param {string} eventType - message.created, user.joined vb.
     * @param {object} context - Olay verisi { message, user, room, etc. }
     */
    async trigger(eventType, context) {
        try {
            const workflows = await Workflow.findAll({
                where: {
                    trigger_type: eventType,
                    is_active: true,
                    // site_code: context.siteCode Optional check
                }
            });

            for (const workflow of workflows) {
                if (this.checkConditions(workflow, context)) {
                    await this.executeWorkflow(workflow, context);
                }
            }
        } catch (error) {
            console.error(`[Workflow] Trigger error for ${eventType}:`, error);
        }
    }

    /**
     * Koşul kontrolü
     */
    checkConditions(workflow, context) {
        const config = workflow.trigger_config || {};

        // 1. Keyword check (message.created)
        if (workflow.trigger_type === 'message.created' && config.keywords) {
            const content = context.message?.content?.toLowerCase();
            if (!content) return false;
            // Keywords array'inden en az biri geçiyor mu?
            return config.keywords.some(k => content.includes(k.toLowerCase()));
        }

        // 2. Room check
        if (config.room_id && context.room?.id !== config.room_id) {
            return false;
        }

        // 3. User type check
        if (config.user_type && context.user?.type !== config.user_type) {
            return false;
        }

        return true;
    }

    /**
     * Workflow yürütme (with run tracking)
     */
    async executeWorkflow(workflow, context) {
        console.log(`🚀 Executing Workflow: ${workflow.name} (${workflow.id})`);
        const startTime = Date.now();
        let actionsExecuted = 0;

        try {
            for (const action of workflow.actions) {
                await this.performAction(action, context);
                actionsExecuted++;
            }

            const duration = Date.now() - startTime;

            await workflow.update({
                run_count: workflow.run_count + 1,
                last_run_at: new Date()
            });

            // Log successful run
            await WorkflowRun.create({
                workflow_id: workflow.id,
                trigger_event: workflow.trigger_type,
                status: 'success',
                actions_executed: actionsExecuted,
                duration_ms: duration,
                context_snapshot: {
                    user: context.user?.name,
                    room: context.room?.name,
                    source: context.source
                }
            });
        } catch (error) {
            console.error(`❌ Workflow execution failed for ${workflow.id}:`, error);

            await WorkflowRun.create({
                workflow_id: workflow.id,
                trigger_event: workflow.trigger_type,
                status: 'failed',
                actions_executed: actionsExecuted,
                error_message: error.message,
                duration_ms: Date.now() - startTime
            });
        }
    }

    /**
     * Template değişkenlerini yerine koy
     */
    replaceTemplateVars(text, context) {
        if (!text) return text;
        return text
            .replace(/\{\{userName\}\}/g, context.user?.name || 'User')
            .replace(/\{\{userId\}\}/g, context.user?.id || '')
            .replace(/\{\{roomName\}\}/g, context.room?.name || 'Room')
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('tr-TR'))
            .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString('tr-TR'))
            .replace(/\{\{siteCode\}\}/g, context.siteCode || '');
    }

    /**
     * Aksiyon gerçekleştirme
     */
    async performAction(action, context) {
        switch (action.type) {
            case 'send_message':
                await this.actionSendMessage(action.data, context);
                break;
            case 'create_task':
                await this.actionCreateTask(action.data, context);
                break;
            case 'send_webhook':
                await this.actionSendWebhook(action.data, context);
                break;
            case 'send_email':
                await this.actionSendEmail(action.data, context);
                break;
            case 'log_event':
                console.log(`[Workflow Log] ${this.replaceTemplateVars(action.data.message, context)}`);
                break;
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Mesaj gönderme aksiyonu
     */
    async actionSendMessage(data, context) {
        const ChatMessage = require('../models/ChatMessage');
        const roomId = data.room_id || context.room?.id;
        if (!roomId) return;

        const content = this.replaceTemplateVars(data.message, context);
        const messageId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await ChatMessage.create({
            message_id: messageId,
            room_id: roomId,
            content,
            sender_type: 'system',
            sender_id: 0,
            sender_name: 'Workflow Bot',
            message_type: 'text',
            status: 'sent'
        });
    }

    /**
     * Görev oluşturma aksiyonu
     */
    async actionCreateTask(data, context) {
        const Task = require('../models/Task');
        const title = this.replaceTemplateVars(data.title, context);

        await Task.create({
            title,
            description: this.replaceTemplateVars(data.description || '', context),
            assigned_to: data.assigned_to || context.user?.id,
            priority: data.priority || 'medium',
            status: 'TODO',
            site_code: context.siteCode,
            created_by: 0 // system
        });
    }

    /**
     * Webhook gönderme aksiyonu
     */
    async actionSendWebhook(data, context) {
        const https = require('https');
        const http = require('http');
        const url = new URL(data.url);
        const payload = JSON.stringify({
            event: context.eventType || 'workflow_action',
            workflow_name: context.workflowName,
            data: data.payload || {},
            timestamp: new Date().toISOString()
        });

        const client = url.protocol === 'https:' ? https : http;
        await new Promise((resolve, reject) => {
            const req = client.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            }, (res) => {
                res.on('data', () => {});
                res.on('end', resolve);
            });
            req.on('error', reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error('Webhook timeout')); });
            req.write(payload);
            req.end();
        });
    }

    /**
     * Email gönderme aksiyonu (placeholder - gerçek email servisi entegre edilmeli)
     */
    async actionSendEmail(data, context) {
        const to = this.replaceTemplateVars(data.to, context);
        const subject = this.replaceTemplateVars(data.subject, context);
        const body = this.replaceTemplateVars(data.body, context);
        // Log for now - integrate with actual email service (SendGrid, SES, etc.)
        console.log(`📧 [Workflow Email] To: ${to}, Subject: ${subject}, Body: ${body.substring(0, 100)}`);
    }

    // --- CRUD ---

    async createWorkflow(data) {
        return await Workflow.create(data);
    }

    async getWorkflows() {
        return await Workflow.findAll();
    }

    async deleteWorkflow(id) {
        return await Workflow.destroy({ where: { id } });
    }
}

module.exports = new WorkflowService();
