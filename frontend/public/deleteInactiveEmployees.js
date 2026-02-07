// Tüm pasif çalışanları sil
(() => {
  // Mevcut çalışanları al
  const employees = JSON.parse(localStorage.getItem('company_employees') || '[]');
  
  // Sadece aktif çalışanları tut
  const activeEmployees = employees.filter(emp => emp.is_active !== false);
  
  // Silinen çalışan sayısı
  const deletedCount = employees.length - activeEmployees.length;
  
  // Aktif çalışanları kaydet
  localStorage.setItem('company_employees', JSON.stringify(activeEmployees));
  
  // Payroll'u da temizle
  const payrollData = JSON.parse(localStorage.getItem('payroll_data') || '[]');
  
  // Sadece aktif çalışanların payroll verilerini tut
  const activePayroll = payrollData.filter(p => {
    return activeEmployees.some(e => e.id === p.id || e.employee_id === p.employee_id);
  });
  
  localStorage.setItem('payroll_data', JSON.stringify(activePayroll));
  
  console.log(`✅ ${deletedCount} pasif çalışan kalıcı olarak silindi!`);
  console.log(`Kalan aktif çalışan sayısı: ${activeEmployees.length}`);
  
  // Sayfayı yenile
  location.reload();
})();
