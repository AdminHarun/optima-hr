import api from './api';

const payrollService = {
  // Tüm maaş kayıtlarını listele
  getAllPayrolls: async (month = null, employeeId = null) => {
    const params = {};
    if (month) params.month = month;
    if (employeeId) params.employee = employeeId;
    
    const response = await api.get('/api/payrolls/', { params });
    return response.data;
  },

  // Maaş detayı
  getPayroll: async (id) => {
    const response = await api.get(`/api/payrolls/${id}/`);
    return response.data;
  },

  // Maaş hesapla
  calculatePayroll: async (payrollData) => {
    const response = await api.post('/api/payroll/calculate/', payrollData);
    return response.data;
  },

  // Maaş özeti
  getPayrollSummary: async () => {
    const response = await api.get('/api/payroll/summary/');
    return response.data;
  },

  // Maaş kayıt oluştur
  createPayroll: async (payrollData) => {
    const response = await api.post('/api/payrolls/', payrollData);
    return response.data;
  },

  // Maaş kayıt güncelle
  updatePayroll: async (id, payrollData) => {
    const response = await api.patch(`/api/payrolls/${id}/`, payrollData);
    return response.data;
  },

  // Maaş kayıt sil
  deletePayroll: async (id) => {
    const response = await api.delete(`/api/payrolls/${id}/`);
    return response.data;
  },
};

export default payrollService;
