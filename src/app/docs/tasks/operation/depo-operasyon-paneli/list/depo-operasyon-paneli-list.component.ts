import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  WarehouseOperationPanelItemDto,
  WarehouseOperationPanelResponse,
  WarehouseOperationPanelSummaryDto
} from '@interfaces';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import type { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type HealthFilter = 'All' | 'Critical' | 'Warning' | 'Healthy';
type SortKey =
  | 'warehouseNo'
  | 'warehouseName'
  | 'todayShipmentCount'
  | 'todayReceivingCount'
  | 'pendingReceivingCount'
  | 'incompleteOperationCount'
  | 'failedEDespatchCount'
  | 'averageReceivingMinutes'
  | 'healthStatus';
type SortDirection = 'asc' | 'desc';

interface SummaryMetric {
  key: keyof WarehouseOperationPanelSummaryDto;
  label: string;
  icon: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

const TASK_ID = 'depo-operasyon-paneli';
const PERMISSION_PREFIX = 'operasyon-islemleri.depo-operasyon-paneli';

const SUMMARY_METRICS: readonly SummaryMetric[] = [
  { key: 'warehouseCount', label: 'Aktif Depo', icon: 'fa-warehouse', tone: 'neutral' },
  { key: 'todayShipmentCount', label: 'Bugunku Sevk', icon: 'fa-truck-fast', tone: 'neutral' },
  { key: 'todayReceivingCount', label: 'Mal Kabul', icon: 'fa-box-open', tone: 'success' },
  { key: 'pendingReceivingCount', label: 'Bekleyen Kabul', icon: 'fa-hourglass-half', tone: 'warning' },
  { key: 'incompleteOperationCount', label: 'Eksik Operasyon', icon: 'fa-list-check', tone: 'warning' },
  { key: 'failedEDespatchCount', label: 'E-Irsaliye Hatasi', icon: 'fa-triangle-exclamation', tone: 'danger' }
];

@Component({
  selector: 'app-depo-operasyon-paneli-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './depo-operasyon-paneli-list.component.html',
  styleUrl: './depo-operasyon-paneli-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepoOperasyonPaneliListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly summaryMetrics = SUMMARY_METRICS;
  protected readonly selectedDate = signal(this.getToday());
  protected readonly searchText = signal('');
  protected readonly healthFilter = signal<HealthFilter>('All');
  protected readonly response = signal<WarehouseOperationPanelResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly sortKey = signal<SortKey | null>(null);
  protected readonly sortDirection = signal<SortDirection>('asc');

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly operasyonIslemleriService = inject(OperasyonIslemleriService);
  private readonly router = inject(Router);
  private activeRequestId = 0;

  protected readonly isAdminUser = computed(
    () => this.hasRole('administrator') || this.hasRole('admin')
  );
  protected readonly canList = computed(
    () =>
      this.isAdminUser() &&
      (this.authService.hasTaskAccess(TASK_ID) || this.hasPanelListPermission())
  );
  protected readonly filteredWarehouses = computed(() => {
    const query = this.normalize(this.searchText());
    const health = this.healthFilter();
    const rows = (this.response()?.warehouses ?? []).filter((warehouse) => {
      const matchesQuery =
        !query ||
        String(warehouse.warehouseNo).includes(query) ||
        this.normalize(warehouse.warehouseName).includes(query);
      const matchesHealth = health === 'All' || warehouse.healthStatus === health;

      return matchesQuery && matchesHealth;
    });
    const key = this.sortKey();

    if (!key) {
      return rows;
    }

    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) =>
      this.compareValues(left[key], right[key]) * direction
    );
  });
  protected readonly criticalCount = computed(
    () => this.response()?.warehouses.filter((item) => item.healthStatus === 'Critical').length ?? 0
  );
  protected readonly warningCount = computed(
    () => this.response()?.warehouses.filter((item) => item.healthStatus === 'Warning').length ?? 0
  );

  ngOnInit(): void {
    if (this.canList()) {
      this.loadPanel();
    } else {
      this.errorMessage.set(
        'Bu panel icin Admin rolu ve depo operasyon paneli liste yetkisi gereklidir.'
      );
    }
  }

  protected loadPanel(): void {
    if (!this.canList()) {
      return;
    }

    const date = this.selectedDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.errorMessage.set('Gecerli bir panel tarihi secin.');
      return;
    }

    const requestId = ++this.activeRequestId;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.operasyonIslemleriService
      .getWarehouseOperationPanel({ date })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.loading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: WarehouseOperationPanelResponse) => {
          if (requestId === this.activeRequestId) {
            this.response.set(response);
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.response.set(null);
          this.errorMessage.set(
            getErrorMessage(error, 'Depo operasyon paneli yuklenemedi.')
          );
        }
      });
  }

  protected setSelectedDate(value: string): void {
    this.selectedDate.set(value);
  }

  protected setSearchText(value: string): void {
    this.searchText.set(value);
  }

  protected setHealthFilter(value: string): void {
    const allowed: readonly HealthFilter[] = ['All', 'Critical', 'Warning', 'Healthy'];
    this.healthFilter.set(allowed.includes(value as HealthFilter) ? (value as HealthFilter) : 'All');
  }

  protected setSort(key: SortKey): void {
    if (this.sortKey() !== key) {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
      return;
    }

    if (this.sortDirection() === 'asc') {
      this.sortDirection.set('desc');
      return;
    }

    this.sortKey.set(null);
    this.sortDirection.set('asc');
  }

  protected sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) {
      return 'fa-sort';
    }

    return this.sortDirection() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  protected metricValue(key: keyof WarehouseOperationPanelSummaryDto): number {
    return this.response()?.summary[key] ?? 0;
  }

  protected healthLabel(status: string): string {
    switch (status) {
      case 'Critical':
        return 'Kritik';
      case 'Warning':
        return 'Uyari';
      case 'Healthy':
        return 'Saglikli';
      default:
        return status || '-';
    }
  }

  protected healthClass(status: string): string {
    return `health-${status.toLocaleLowerCase('tr-TR')}`;
  }

  protected formatMinutes(value: number | null | undefined): string {
    return Number.isFinite(value) ? `${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} dk` : '-';
  }

  protected formatGeneratedAt(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
  }

  protected openWarehouseFlows(warehouse: WarehouseOperationPanelItemDto): void {
    void this.router.navigate(['/docs/api/belge-akis-takibi'], {
      queryParams: {
        warehouseNo: warehouse.warehouseNo,
        date: this.response()?.date || this.selectedDate()
      }
    });
  }

  protected trackByMetric = (_index: number, metric: SummaryMetric): string => metric.key;
  protected trackByWarehouse = (
    _index: number,
    warehouse: WarehouseOperationPanelItemDto
  ): number => warehouse.warehouseNo;

  private hasRole(roleName: string): boolean {
    const expected = this.normalize(roleName);
    return (this.authService.currentUser()?.roller ?? []).some(
      (role) => this.normalize(role) === expected
    );
  }

  private hasPanelListPermission(): boolean {
    const permissions = [
      ...(this.authService.currentUser()?.permissions ?? []),
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => this.normalize(permission));

    return permissions.some(
      (permission) =>
        permission === 'list' ||
        permission === this.normalize(`${PERMISSION_PREFIX}.list`) ||
        permission.endsWith('.list')
    );
  }

  private compareValues(left: string | number, right: string | number): number {
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    return String(left).localeCompare(String(right), 'tr-TR', { numeric: true });
  }

  private normalize(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private getToday(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
