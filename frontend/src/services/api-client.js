import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration or unauthenticated responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials).then(res => res.data),
  me: () => apiClient.get('/auth/me').then(res => res.data),
  logout: () => apiClient.post('/auth/logout').then(res => res.data),
};

export const userApi = {
  getUsers: (params) => apiClient.get('/users', { params }).then(res => res.data),
  getUserById: (id) => apiClient.get(`/users/${id}`).then(res => res.data),
  createUser: (data) => apiClient.post('/users', data).then(res => res.data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data).then(res => res.data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`).then(res => res.data),
  getDeletedUsers: () => apiClient.get('/users/deleted').then(res => res.data),
  restoreUser: (id) => apiClient.post(`/users/${id}/restore`).then(res => res.data),
  getRoles: () => apiClient.get('/users/roles').then(res => res.data),
  getBranches: () => apiClient.get('/users/branches').then(res => res.data),
  getAuditLogs: (params) => apiClient.get('/users/audit-logs', { params }).then(res => res.data),
};
