import axios from 'axios';

// API Base URL - from centralized config with production auto-detection
import { API_BASE_URL } from '../config/config';
const API_URL = API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add site header
api.interceptors.request.use(
  (config) => {
    // Get current site from localStorage
    const currentSite = localStorage.getItem('optima_current_site') || 'FXB';

    // Add site header
    config.headers['X-Site-Id'] = currentSite;

    // Add auth token if exists
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;
