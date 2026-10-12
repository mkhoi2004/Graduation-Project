import axios from 'axios';
import type { Dashboard, Patient, PatientInput, Service, Visit } from '../types';

export const client = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5089/api', timeout: 15000 });
client.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(cause: unknown): Error {
  if (axios.isAxiosError(cause)) {
    const data = cause.response?.data as { title?: string; errors?: Record<string, string[]> } | undefined;
    const first = data?.errors && Object.values(data.errors).flat()[0];
    return new Error(first ?? data?.title ?? (cause.response?.status === 409 ? 'Bản ghi đang được tham chiếu hoặc đã thay đổi.' : 'Không thể kết nối API.'));
  }
  return cause instanceof Error ? cause : new Error('Đã xảy ra lỗi.');
}

export const authApi = {
  async login(username: string, password: string) {
    const { data } = await client.post<{ token: string; username: string; roles: string[] }>('/auth/login', { username, password });
    return data;
  }
};
export const dashboardApi = { async get() { return (await client.get<Dashboard>('/dashboard')).data; } };
export const patientApi = {
  async list(search: string, page: number, size = 20) { return (await client.get<Patient[]>('/patients', { params: { search, page, size } })).data; },
  async create(input: PatientInput) { return (await client.post<Patient>('/patients', input)).data; },
  async update(id: number, input: PatientInput & { version: number }) { await client.put(`/patients/${id}`, input); },
  async remove(id: number, reason: string) { await client.delete(`/patients/${id}`, { params: { reason } }); }
};
export const serviceApi = {
  async list(search: string, page: number, size = 20) { return (await client.get<Service[]>('/services', { params: { search, page, size } })).data; },
  async create(input: { code: string; name: string; requiresConsent: boolean }) { await client.post('/services', input); },
  async remove(id: number, reason: string) { await client.delete(`/services/${id}`, { params: { reason } }); }
};
export const visitApi = {
  async list(patientId: string, page: number, size = 20) { return (await client.get<Visit[]>('/visits', { params: { patientId: patientId || undefined, page, size } })).data; },
  async create(input: { patientId: number; doctorUserId: number | null; branchCode: string; visitType: string }) { await client.post('/visits', input); },
  async remove(id: number, reason: string) { await client.delete(`/visits/${id}`, { params: { reason } }); }
};
export const userApi = {
  async list() { return (await client.get<Array<{ id: number; username: string; displayName: string; isActive: boolean }>>('/users')).data; },
  async roles() { return (await client.get<Array<{ id: number; code: string; name: string }>>('/users/roles')).data; },
  async create(input: { username: string; displayName: string; password: string; roles: string[] }) { await client.post('/users', input); }
};
