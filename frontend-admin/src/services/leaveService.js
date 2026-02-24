import api from './api';

const leaveService = {
  // Tüm izin taleplerini listele
  getAllLeaveRequests: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/leave-requests/', { params });
    return response.data;
  },

  // İzin talebi oluştur
  createLeaveRequest: async (leaveData) => {
    const response = await api.post('/api/leave-requests/', leaveData);
    return response.data;
  },

  // İzin talebi güncelle
  updateLeaveRequest: async (id, leaveData) => {
    const response = await api.patch(`/api/leave-requests/${id}/`, leaveData);
    return response.data;
  },

  // İzin talebi sil
  deleteLeaveRequest: async (id) => {
    const response = await api.delete(`/api/leave-requests/${id}/`);
    return response.data;
  },

  // İzin onayla
  approveLeave: async (id) => {
    const response = await api.post(`/api/leaves/${id}/approve/`);
    return response.data;
  },

  // İzin reddet
  rejectLeave: async (id) => {
    const response = await api.post(`/api/leaves/${id}/reject/`);
    return response.data;
  },

  // İzin istatistikleri
  getLeaveStatistics: async () => {
    const response = await api.get('/api/leaves/statistics/');
    return response.data;
  },
};

export default leaveService;
