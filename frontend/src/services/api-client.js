import axios from 'axios';

// No secrets, tokens or patient data in this environment page.
export const apiClient = axios.create({ baseURL: '/api', timeout: 10000 });
