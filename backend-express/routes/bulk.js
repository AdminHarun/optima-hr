const express = require('express');
const { Employee } = require('../models');
const router = express.Router();

// POST /api/employees/bulk-action/ - Toplu işlemler
router.post('/bulk-action/', async (req, res) => {
  try {
    const { action, employee_ids } = req.body;

    if (!action || !employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({
        error: 'Action and employee_ids are required'
      });
    }

    const employees = await Employee.findAll({
      where: {
        id: employee_ids
      }
    });

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No employees found with given IDs' });
    }

    let message;
    const count = employees.length;

    switch (action) {
      case 'deactivate':
        await Employee.update(
          {
            is_active: false,
            deactivated_at: new Date()
          },
          {
            where: { id: employee_ids }
          }
        );
        message = `${count} employees deactivated`;
        break;

      case 'activate':
        await Employee.update(
          {
            is_active: true,
            restored_at: new Date(),
            deactivated_at: null
          },
          {
            where: { id: employee_ids }
          }
        );
        message = `${count} employees activated`;
        break;

      case 'delete':
        await Employee.destroy({
          where: { id: employee_ids }
        });
        message = `${count} employees deleted permanently`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: 'Toplu işlem sırasında hata oluştu', details: error.message });
  }
});

module.exports = router;