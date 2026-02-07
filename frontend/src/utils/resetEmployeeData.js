// src/utils/resetEmployeeData.js
// Çalışan verilerini sıfırlama ve yeniden başlatma

const resetEmployeeData = () => {
  // Mevcut verileri temizle
  const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
  localStorage.removeItem('employees');
  localStorage.removeItem(`payroll_data_${siteCode}`);
  
  // Yeni demo verileri oluştur
  const demoEmployees = [
    {
      id: 1,
      employee_id: 'EMP001',
      email: 'admin@company.com',
      passwordHash: btoa(unescape(encodeURIComponent('admin123'))),
      first_name: 'Admin',
      last_name: 'User',
      role: 'SUPER_ADMIN',
      position: 'MANAGER',
      siteId: 'ALL',
      isActive: true,
      hire_date: '2023-01-15',
      net_salary: 5000,
      usdt_address: 'TXkJqDHQmwNYBNZR3VRV8jCZwRKc8uyEMj',
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    {
      id: 2,
      employee_id: 'EMP002',
      email: 'ayse@optima.com',
      passwordHash: btoa(unescape(encodeURIComponent('ayse123'))),
      first_name: 'Ayşe',
      last_name: 'Yılmaz',
      role: 'HR_MANAGER',
      position: 'HR',
      siteId: 'SITE_A',
      isActive: true,
      hire_date: '2023-03-20',
      net_salary: 3500,
      usdt_address: 'TRxJqDHQmwNYBNZR3VRV8jCZwRKc8uyXYZ',
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    {
      id: 3,
      employee_id: 'EMP003',
      email: 'mehmet@optima.com',
      passwordHash: btoa(unescape(encodeURIComponent('mehmet123'))),
      first_name: 'Mehmet',
      last_name: 'Demir',
      role: 'USER',
      position: 'X_OPERATOR',
      siteId: 'SITE_A',
      isActive: true,
      hire_date: '2024-06-10',
      net_salary: 2500,
      usdt_address: 'TAbCqDHQmwNYBNZR3VRV8jCZwRKc8uyABC',
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  ];
  
  localStorage.setItem('employees', JSON.stringify(demoEmployees));
  
  console.log('✅ Çalışan verileri sıfırlandı ve yeniden oluşturuldu');
  console.log('Mevcut çalışanlar:');
  demoEmployees.forEach(emp => {
    console.log(`- ${emp.first_name} ${emp.last_name} (${emp.position}) - $${emp.net_salary}`);
  });
  
  // Sayfayı yenile
  window.location.reload();
};

// Otomatik çalıştır
resetEmployeeData();

export default resetEmployeeData;
