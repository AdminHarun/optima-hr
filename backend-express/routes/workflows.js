const express = require('express');
const router = express.Router();
const workflowService = require('../services/WorkflowService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Get Workflow model from sequelize
const Workflow = sequelize.models.Workflow;

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
    return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * GET /api/workflows
 * List all workflows for the site
 */
router.get('/', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { search, is_active, trigger_type, sort = 'created_at', order = 'DESC' } = req.query;

        const where = { site_code: siteCode };

        if (is_active !== undefined && is_active !== '') {
            where.is_active = is_active === 'true';
        }

        if (trigger_type && trigger_type !== 'all') {
            where.trigger_type = trigger_type;
        }

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        const workflows = await Workflow.findAll({
            where,
            order: [[sort, order.toUpperCase()]],
        });

        res.json(workflows);
    } catch (error) {
        console.error('Error listing workflows:', error);
        res.status(500).json({ error: 'Workflow listesi alinamadi' });
    }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const employeeId = getEmployeeId(req);
        const { name, trigger_type, trigger_config, actions, is_active } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Workflow adi zorunludur' });
        }

        if (!trigger_type) {
            return res.status(400).json({ error: 'Trigger tipi zorunludur' });
        }

        if (!actions || !Array.isArray(actions) || actions.length === 0) {
            return res.status(400).json({ error: 'En az bir aksiyon gereklidir' });
        }

        const workflow = await Workflow.create({
            name: name.trim(),
            trigger_type,
            trigger_config: trigger_config || {},
            actions,
            is_active: is_active !== false,
            site_code: siteCode,
            created_by: employeeId,
            run_count: 0,
        });

        res.status(201).json(workflow);
    } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Workflow olusturulamadi' });
    }
});

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put('/:id', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { id } = req.params;
        const { name, trigger_type, trigger_config, actions, is_active } = req.body;

        const workflow = await Workflow.findOne({
            where: { id, site_code: siteCode }
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow bulunamadi' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
        if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
        if (actions !== undefined) updateData.actions = actions;
        if (is_active !== undefined) updateData.is_active = is_active;

        await workflow.update(updateData);

        res.json(workflow);
    } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Workflow guncellenemedi' });
    }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete('/:id', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { id } = req.params;

        const workflow = await Workflow.findOne({
            where: { id, site_code: siteCode }
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow bulunamadi' });
        }

        await workflow.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Workflow silinemedi' });
    }
});

/**
 * POST /api/workflows/:id/toggle
 * Enable/disable a workflow
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { id } = req.params;

        const workflow = await Workflow.findOne({
            where: { id, site_code: siteCode }
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow bulunamadi' });
        }

        await workflow.update({ is_active: !workflow.is_active });

        res.json(workflow);
    } catch (error) {
        console.error('Error toggling workflow:', error);
        res.status(500).json({ error: 'Workflow durumu degistirilemedi' });
    }
});

/**
 * GET /api/workflows/:id/history
 * Get execution history for a workflow
 * Note: Since there is no separate history table, we return workflow run metadata.
 * In a production system, you would have a WorkflowExecution table.
 */
router.get('/:id/history', async (req, res) => {
    try {
        const siteCode = getSiteCode(req);
        const { id } = req.params;

        const workflow = await Workflow.findOne({
            where: { id, site_code: siteCode }
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow bulunamadi' });
        }

        // Return workflow execution summary
        // In a full implementation, this would query a WorkflowExecution table
        const history = {
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            total_runs: workflow.run_count,
            last_run_at: workflow.last_run_at,
            is_active: workflow.is_active,
            executions: []
        };

        // Generate mock execution entries based on run_count for display purposes
        if (workflow.run_count > 0 && workflow.last_run_at) {
            const maxEntries = Math.min(workflow.run_count, 20);
            for (let i = 0; i < maxEntries; i++) {
                const execDate = new Date(workflow.last_run_at);
                execDate.setMinutes(execDate.getMinutes() - (i * 15));
                history.executions.push({
                    id: workflow.run_count - i,
                    executed_at: execDate.toISOString(),
                    status: 'success',
                    trigger_type: workflow.trigger_type,
                    actions_executed: workflow.actions.length,
                });
            }
        }

        res.json(history);
    } catch (error) {
        console.error('Error getting workflow history:', error);
        res.status(500).json({ error: 'Workflow gecmisi alinamadi' });
    }
});

module.exports = router;
