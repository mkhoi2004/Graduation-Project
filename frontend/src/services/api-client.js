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

export const catalogApi = {
  getServices: (params) => apiClient.get('/catalog/services', { params }).then(res => res.data),
  getServiceById: (id) => apiClient.get(`/catalog/services/${id}`).then(res => res.data),
  createService: (data) => apiClient.post('/catalog/services', data).then(res => res.data),
  updateService: (id, data) => apiClient.put(`/catalog/services/${id}`, data).then(res => res.data),
  deleteService: (id) => apiClient.delete(`/catalog/services/${id}`).then(res => res.data),
  getDeletedServices: () => apiClient.get('/catalog/services/deleted').then(res => res.data),
  restoreService: (id) => apiClient.post(`/catalog/services/${id}/restore`).then(res => res.data),
  createPriceVersion: (serviceId, data) => apiClient.post(`/catalog/services/${serviceId}/prices`, data).then(res => res.data),
  approvePriceVersion: (serviceId, versionId) => apiClient.post(`/catalog/services/${serviceId}/prices/${versionId}/approve`).then(res => res.data),
  getRooms: (params) => apiClient.get('/catalog/rooms', { params }).then(res => res.data),
  createRoom: (data) => apiClient.post('/catalog/rooms', data).then(res => res.data),
  deleteRoom: (id) => apiClient.delete(`/catalog/rooms/${id}`).then(res => res.data),
  getSuppliers: (params) => apiClient.get('/catalog/suppliers', { params }).then(res => res.data),
  createSupplier: (data) => apiClient.post('/catalog/suppliers', data).then(res => res.data),
  deleteSupplier: (id) => apiClient.delete(`/catalog/suppliers/${id}`).then(res => res.data),
  getConfigs: () => apiClient.get('/catalog/configs').then(res => res.data),
};

export const patientApi = {
  getPatients: (params) => apiClient.get('/patients', { params }).then(res => res.data),
  getPatientById: (id) => apiClient.get(`/patients/${id}`).then(res => res.data),
  createPatient: (data) => apiClient.post('/patients', data).then(res => res.data),
  updatePatient: (id, data) => apiClient.put(`/patients/${id}`, data).then(res => res.data),
  deletePatient: (id) => apiClient.delete(`/patients/${id}`).then(res => res.data),
};

export const visitApi = {
  getAppointments: (params) => apiClient.get('/visits/appointments', { params }).then(res => res.data),
  createAppointment: (data) => apiClient.post('/visits/appointments', data).then(res => res.data),
  getVisits: (params) => apiClient.get('/visits', { params }).then(res => res.data),
  getVisitById: (id) => apiClient.get(`/visits/${id}`).then(res => res.data),
  createVisit: (data) => apiClient.post('/visits', data).then(res => res.data),
  updateVisitStatus: (id, data) => apiClient.patch(`/visits/${id}/status`, data).then(res => res.data),
};
