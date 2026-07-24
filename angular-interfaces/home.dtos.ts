export type HomeWarehousePrioritySeverity = 'critical' | 'warning' | 'info' | 'healthy';

export interface HomeWarehousePrioritiesHttpRequest {
  date?: string | null;
  warehouseNo?: number | null;
}

export interface HomePriorityMetricDto {
  code: string;
  label: string;
  value: number;
  severity: HomeWarehousePrioritySeverity | string;
  route: string | null;
}

export interface HomePriorityItemDto {
  code: string;
  severity: HomeWarehousePrioritySeverity | string;
  title: string;
  description: string;
  count: number;
  route: string;
}

export interface HomeQuickActionDto {
  code: string;
  label: string;
  route: string;
  permissionCode: string | null;
}

export interface HomeWarehousePrioritiesDto {
  date: string;
  generatedAtUtc: string;
  warehouseNo: number | null;
  warehouseName: string | null;
  overallStatus: HomeWarehousePrioritySeverity | string;
  headline: string;
  metrics: HomePriorityMetricDto[];
  priorities: HomePriorityItemDto[];
  quickActions: HomeQuickActionDto[];
}
