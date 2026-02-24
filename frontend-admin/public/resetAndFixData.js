// resetAndFixData.js - Çalışan verilerini düzeltme scripti
(() => {
  // Mevcut veriyi temizle
  localStorage.removeItem('employees');
  localStorage.removeItem('payroll_data');
  
  // Yeni çalışan verileri oluştur
  const employees = [
    {
      id: 1,
      employee_id: 'EMP001',
      first_name: 'Ahmet',
      last_name: 'Yılmaz',
      email: 'ahmet@optima.com',
      position: 'MANAGER',
      hire_date: '2023-01-15',
      net_salary: 5000,
      usdt_address: 'TXkJqDHQmwNYBNZR3VRV8jCZwRKc8uyEMj',
      is_active: true,
      phone: '0532 123 4567',
      department: 'Yönetim',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      employee_id: 'EMP002',
      first_name: 'Ayşe',
      last_name: 'Demir',
      email: 'ayse@optima.com',
      position: 'X_OPERATOR',
      hire_date: '2024-06-10',
      net_salary: 2500,
      usdt_address: 'TAbCqDHQmwNYBNZR3VRV8jCZwRKc8uyABC',
      is_active: true,
      phone: '0533 234 5678',
      department: 'Operasyon',
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      employee_id: 'EMP003',
      first_name: 'Mehmet',
      last_name: 'Kaya',
      email: 'mehmet@optima.com',
      position: 'CHAT_OPERATOR',
      hire_date: '2024-11-01',
      net_salary: 2000,
      usdt_address: 'TZeynepDHQmwNYBNZR3VRV8jCZwRKc8uyZ',
      is_active: true,
      phone: '0534 345 6789',
      department: 'Müşteri Hizmetleri',
      createdAt: new Date().toISOString()
    }
  ];
  
  // Veriyi kaydet
  localStorage.setItem('employees', JSON.stringify(employees));
  
  console.log('✅ Çalışan verileri başarıyla yüklendi!');
  console.log('Yüklenen çalışanlar:');
  employees.forEach(emp => {
    console.log(`- ${emp.first_name} ${emp.last_name} (${emp.position}) - $${emp.net_salary}`);
  });
  
  // Sayfayı yenile
  window.location.reload();
})();
