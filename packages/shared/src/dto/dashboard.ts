import type { MetricKey } from '../enums';

export interface StatusCountDto {
  status: string;
  count: number;
}

export interface SideDistributionDto {
  /** Counts for scores 1..5 (index 0 = score 1). */
  distribution: [number, number, number, number, number];
  average: number | null;
  n: number;
}

export interface MetricDistributionDto {
  metricKey: MetricKey;
  metricLabel: string;
  self: SideDistributionDto;
  mentor: SideDistributionDto;
}

/** Admin roll-up: goals + cycle completion + rating distribution (no forced curve). */
export interface DashboardDto {
  goalsByStatus: StatusCountDto[];
  cyclesByStatus: StatusCountDto[];
  totalUsers: number;
  metrics: MetricDistributionDto[];
}
