import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';
import type { DashboardDto } from '@perf-tracker/shared';

const DASHBOARD_KEY = ['dashboard'] as const;

export function useDashboard() {
  return useQuery<DashboardDto, Error>({
    queryKey: DASHBOARD_KEY,
    queryFn: () => get<DashboardDto>('/dashboard/overview'),
  });
}
