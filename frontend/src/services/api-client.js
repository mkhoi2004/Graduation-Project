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

export const clinicalApi = {
  // EMR
  getEmr: (visitId) => apiClient.get(`/visits/${visitId}/emr`).then(res => res.data),
  updateDraftEmr: (visitId, versionId, data) => apiClient.put(`/visits/${visitId}/emr/${versionId}`, data).then(res => res.data),
  signEmr: (visitId, versionId, data) => apiClient.post(`/visits/${visitId}/emr/${versionId}/sign`, data).then(res => res.data),
  addEmrAddendum: (visitId, versionId, data) => apiClient.post(`/visits/${visitId}/emr/${versionId}/addenda`, data).then(res => res.data),

  // Treatment Plans
  getTreatmentPlans: (visitId) => apiClient.get(`/visits/${visitId}/treatment-plans`).then(res => res.data),
  createTreatmentPlan: (visitId, data) => apiClient.post(`/visits/${visitId}/treatment-plans`, data).then(res => res.data),
  updatePlanStatus: (visitId, planId, status) => apiClient.patch(`/visits/${visitId}/treatment-plans/${planId}/status`, { status }).then(res => res.data),

  // Consents (AT-06)
  getConsentTemplates: () => apiClient.get('/consent-templates').then(res => res.data),
  getConsents: (visitId) => apiClient.get(`/visits/${visitId}/consents`).then(res => res.data),
  createConsent: (visitId, data) => apiClient.post(`/visits/${visitId}/consents`, data).then(res => res.data),
  signConsent: (visitId, consentId, data) => apiClient.post(`/visits/${visitId}/consents/${consentId}/sign`, data).then(res => res.data),
  revokeConsent: (visitId, consentId, data) => apiClient.post(`/visits/${visitId}/consents/${consentId}/revoke`, data).then(res => res.data),

  // Prescriptions & Orders
  getPrescriptions: (visitId) => apiClient.get(`/visits/${visitId}/prescriptions`).then(res => res.data),
  createPrescription: (visitId, data) => apiClient.post(`/visits/${visitId}/prescriptions`, data).then(res => res.data),
  signPrescription: (visitId, id) => apiClient.post(`/visits/${visitId}/prescriptions/${id}/sign`).then(res => res.data),
  getOrders: (visitId) => apiClient.get(`/visits/${visitId}/orders`).then(res => res.data),
  createOrder: (visitId, data) => apiClient.post(`/visits/${visitId}/orders`, data).then(res => res.data),

  // Services & Completion (AT-18)
  getServices: (visitId) => apiClient.get(`/visits/${visitId}/services`).then(res => res.data),
  addService: (visitId, data) => apiClient.post(`/visits/${visitId}/services`, data).then(res => res.data),
  completeService: (visitId, serviceLineId, data) => apiClient.post(`/visits/${visitId}/services/${serviceLineId}/complete`, data).then(res => res.data),

  // SignQueue (AT-13)
  getSignQueue: () => apiClient.get('/sign-queue').then(res => res.data),
  retrySignQueue: (queueId) => apiClient.post(`/sign-queue/${queueId}/retry`).then(res => res.data),
};

export const billingApi = {
  // Cash Shifts
  getCurrentShift: () => apiClient.get('/billing/shifts/current').then(res => res.data),
  openShift: (data) => apiClient.post('/billing/shifts/open', data).then(res => res.data),
  closeShift: (shiftId, data) => apiClient.post(`/billing/shifts/${shiftId}/close`, data).then(res => res.data),

  // Deposits
  createDeposit: (data) => apiClient.post('/billing/deposits', data).then(res => res.data),
  getPatientDeposits: (patientId) => apiClient.get(`/billing/patients/${patientId}/deposits`).then(res => res.data),
  applyDeposit: (invoiceId, data) => apiClient.post(`/billing/invoices/${invoiceId}/apply-deposit`, data).then(res => res.data),

  // Invoices
  createInvoice: (visitId, data) => apiClient.post(`/billing/visits/${visitId}/invoices`, data).then(res => res.data),
  getInvoicesByVisit: (visitId) => apiClient.get(`/billing/visits/${visitId}/invoices`).then(res => res.data),
  getInvoiceById: (invoiceId) => apiClient.get(`/billing/invoices/${invoiceId}`).then(res => res.data),

  // Payments
  payInvoice: (invoiceId, data) => apiClient.post(`/billing/invoices/${invoiceId}/pay`, data).then(res => res.data),

  // Refunds
  requestRefund: (txnId, data) => apiClient.post(`/billing/payments/${txnId}/refunds`, data).then(res => res.data),
  approveRefund: (refundId) => apiClient.post(`/billing/refunds/${refundId}/approve`).then(res => res.data),

  // Discounts
  requestDiscount: (invoiceId, data) => apiClient.post(`/billing/invoices/${invoiceId}/discount-approvals`, data).then(res => res.data),
  approveDiscount: (approvalId) => apiClient.post(`/billing/discount-approvals/${approvalId}/approve`).then(res => res.data),
};


