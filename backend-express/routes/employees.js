const express = require('express');
const { Employee, EmployeeDocument } = require('../models');
const router = express.Router();

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || null;
const addSiteFilter = (where, siteCode) => {
  if (siteCode) where.site_code = siteCode;
  return where;
};

// GET /api/employees/ - Tüm çalışanları listele
router.get('/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = {};
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Employee list error:', error);
    res.status(500).json({ error: 'Çalışan listesi yüklenirken hata oluştu' });
  }
});

// GET /api/employees/active/ - Aktif çalışanları listele
router.get('/active/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { is_active: true };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Active employees error:', error);
    res.status(500).json({ error: 'Aktif çalışanlar yüklenirken hata oluştu' });
  }
});

// GET /api/employees/inactive/ - Pasif çalışanları listele
router.get('/inactive/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { is_active: false };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Inactive employees error:', error);
    res.status(500).json({ error: 'Pasif çalışanlar yüklenirken hata oluştu' });
  }
});

// GET /api/employees/by_department/ - Departmana göre çalışanları listele
router.get('/by_department/', async (req, res) => {
  try {
    const { department } = req.query;
    const siteCode = getSiteCode(req);

    if (!department) {
      return res.status(400).json({ error: 'Departman parametresi gerekli' });
    }

    const where = { department: department, is_active: true };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Department employees error:', error);
    res.status(500).json({ error: 'Departman çalışanları yüklenirken hata oluştu' });
  }
});

// GET /api/employees/search/ - Çalışan arama
router.get('/search/', async (req, res) => {
  try {
    const { q, department, position, is_active } = req.query;
    const siteCode = getSiteCode(req);
    const where = {};
    addSiteFilter(where, siteCode);

    if (q) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { first_name: { [Op.like]: `%${q}%` } },
        { last_name: { [Op.like]: `%${q}%` } },
        { employee_id: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }

    if (department) where.department = department;
    if (position) where.position = position;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({ error: 'Çalışan arama sırasında hata oluştu' });
  }
});

// GET /api/employees/dashboard/ - Dashboard istatistikleri
router.get('/dashboard/', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const siteCode = getSiteCode(req);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const siteWhere = {};
    addSiteFilter(siteWhere, siteCode);

    const totalEmployees = await Employee.count({ where: siteWhere });
    const activeEmployees = await Employee.count({ where: { ...siteWhere, is_active: true } });
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Departman istatistikleri
    const departmentStats = await Employee.findAll({
      attributes: [
        'department',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']
      ],
      where: { ...siteWhere, is_active: true },
      group: ['department'],
    });

    // Pozisyon istatistikleri
    const positionStats = await Employee.findAll({
      attributes: [
        'position',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']
      ],
      where: { ...siteWhere, is_active: true },
      group: ['position'],
    });

    // Bu ay işe başlayanlar
    const newHiresThisMonth = await Employee.count({
      where: {
        hire_date: {
          [Op.and]: [
            Employee.sequelize.where(
              Employee.sequelize.fn('MONTH', Employee.sequelize.col('hire_date')),
              currentMonth
            ),
            Employee.sequelize.where(
              Employee.sequelize.fn('YEAR', Employee.sequelize.col('hire_date')),
              currentYear
            )
          ]
        }
      }
    });

    const departments = {};
    departmentStats.forEach(stat => {
      departments[stat.department] = stat.dataValues.count;
    });

    const positions = {};
    positionStats.forEach(stat => {
      positions[stat.position] = stat.dataValues.count;
    });

    res.json({
      total_employees: totalEmployees,
      active_employees: activeEmployees,
      inactive_employees: inactiveEmployees,
      departments,
      positions,
      new_hires_this_month: newHiresThisMonth,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Dashboard istatistikleri yüklenirken hata oluştu' });
  }
});

// GET /api/employees/:id/ - Tek çalışan detayı
router.get('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Employee detail error:', error);
    res.status(500).json({ error: 'Çalışan detayı yüklenirken hata oluştu' });
  }
});

// POST /api/employees/ - Yeni çalışan oluştur
router.post('/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employee = await Employee.create({ ...req.body, site_code: siteCode });
    res.status(201).json(employee);
  } catch (error) {
    console.error('Employee create error:', error);
    res.status(400).json({ error: 'Çalışan oluşturulurken hata oluştu', details: error.message });
  }
});

// POST /api/employees/create-user/ - Çalışan ve kullanıcı oluştur (Django uyumluluğu)
router.post('/create-user/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employee = await Employee.create({ ...req.body, site_code: siteCode });
    res.status(201).json(employee);
  } catch (error) {
    console.error('Employee create-user error:', error);
    res.status(400).json({ error: 'Çalışan oluşturulurken hata oluştu', details: error.message });
  }
});

// PUT /api/employees/:id/ - Çalışan güncelle (tam güncelleme)
router.put('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update(req.body);

    // Güncellenmiş veriyi geri döndür
    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(400).json({ error: 'Çalışan güncellenirken hata oluştu', details: error.message });
  }
});

// PATCH /api/employees/:id/ - Çalışan güncelle (kısmi güncelleme)
router.patch('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update(req.body);

    // Güncellenmiş veriyi geri döndür
    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee patch error:', error);
    res.status(400).json({ error: 'Çalışan güncellenirken hata oluştu', details: error.message });
  }
});

// DELETE /api/employees/:id/ - Çalışan sil
router.delete('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Employee delete error:', error);
    res.status(500).json({ error: 'Çalışan silinirken hata oluştu' });
  }
});

// POST /api/employees/:id/activate/ - Çalışanı aktif yap
router.post('/:id/activate/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update({
      is_active: true,
      restored_at: new Date(),
      deactivated_at: null,
    });

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee activate error:', error);
    res.status(500).json({ error: 'Çalışan aktifleştirilirken hata oluştu' });
  }
});

// POST /api/employees/:id/deactivate/ - Çalışanı pasif yap
router.post('/:id/deactivate/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update({
      is_active: false,
      deactivated_at: new Date(),
    });

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee deactivate error:', error);
    res.status(500).json({ error: 'Çalışan pasifleştirilirken hata oluştu' });
  }
});

// PATCH /api/employees/:id/update_crypto/ - Kripto adreslerini güncelle
router.patch('/:id/update_crypto/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    const { crypto_addresses } = req.body;

    if (!crypto_addresses || typeof crypto_addresses !== 'object') {
      return res.status(400).json({ error: 'crypto_addresses must be a dictionary' });
    }

    const updateData = { crypto_addresses };

    // USDT backward compatibility
    if (crypto_addresses.usdt) {
      updateData.usdt_address = crypto_addresses.usdt;
    }

    await employee.update(updateData);

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee update crypto error:', error);
    res.status(500).json({ error: 'Kripto adresleri güncellenirken hata oluştu' });
  }
});

module.exports = router;