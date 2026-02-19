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

class WorkflowService {
    constructor() {
        this.init();
    }

    async init() {
        try {
            await Workflow.sync();
            console.log('✅ Workflow Automation Service initialized');
        } catch (error) {
            console.error('❌ Workflow init error:', error);
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
     * Workflow yürütme
     */
    async executeWorkflow(workflow, context) {
        console.log(`🚀 Executing Workflow: ${workflow.name} (${workflow.id})`);

        try {
            for (const action of workflow.actions) {
                await this.performAction(action, context);
            }

            await workflow.update({
                run_count: workflow.run_count + 1,
                last_run_at: new Date()
            });
        } catch (error) {
            console.error(`❌ Workflow execution failed for ${workflow.id}:`, error);
        }
    }

    /**
     * Aksiyon gerçekleştirme
     */
    async performAction(action, context) {
        switch (action.type) {
            case 'send_message':
                await this.sendMessage(action.data, context);
                break;
            case 'log_event':
                console.log(`[Workflow Log] ${action.data.message}`, context);
                break;
            // TODO: Add more actions (create_task, send_email, etc.)
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Mesaj gönderme aksiyonu
     */
    async sendMessage(data, context) {
        const ChatMessage = require('../models/ChatMessage');
        const roomId = data.room_id || context.room?.id;

        if (!roomId) return;

        let content = data.message;
        // Template replacement
        if (content) {
            content = content.replace('{{userName}}', context.user?.name || 'User')
                .replace('{{userId}}', context.user?.id || '')
                .replace('{{roomName}}', context.room?.name || 'Room');
        }

        await ChatMessage.create({
            room_id: roomId,
            message: content,
            sender_type: 'bot',
            sender_id: 'workflow_bot',
            sender_name: 'Automation Bot',
            metadata: { source: 'workflow_automation' }
        });
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
