import api from './api';

const authService = {
  // Giriş yap
  login: async (username, password) => {
    const response = await api.post('/api/auth/login/', {
      username,
      password,
    });
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.employee) {
        localStorage.setItem('employee', JSON.stringify(response.data.employee));
      }
    }
    
    return response.data;
  },

  // Kayıt ol
  register: async (userData) => {
    const response = await api.post('/api/auth/register/', userData);
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Çıkış yap
  logout: async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('employee');
      window.location.href = '/login';
    }
  },

  // Mevcut kullanıcı bilgilerini getir
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/current-user/');
    return response.data;
  },

  // Şifre değiştir
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },

  // Şifre sıfırlama talebi
  resetPasswordRequest: async (email) => {
    const response = await api.post('/api/auth/reset-password/', {
      email,
    });
    return response.data;
  },

  // Token kontrolü
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Kullanıcı bilgilerini getir
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Çalışan bilgilerini getir
  getEmployee: () => {
    const employee = localStorage.getItem('employee');
    return employee ? JSON.parse(employee) : null;
  },
};

export default authService;
