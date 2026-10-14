import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client.js';

export function useEnvironment() {
  const api = useQuery({ queryKey: ['health', 'live'], queryFn: async () => (await apiClient.get('/health')).data });
  const database = useQuery({ queryKey: ['health', 'ready'], queryFn: async () => (await apiClient.get('/health/ready')).data });
  return { api, database, refresh: () => Promise.all([api.refetch(), database.refetch()]) };
}
