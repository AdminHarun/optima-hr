const Employee = require('./Employee');
const EmployeeDocument = require('./EmployeeDocument');

// Model ilişkileri
Employee.hasMany(EmployeeDocument, {
  foreignKey: 'employee_id',
  as: 'documents',
  onDelete: 'CASCADE',
});

EmployeeDocument.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});

module.exports = {
  Employee,
  EmployeeDocument,
};