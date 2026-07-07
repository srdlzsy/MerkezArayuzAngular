import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  StockAnomalyDetailDto,
  StockAnomalyListHttpRequest,
  StockAnomalyListItemDto,
  StockAnomalyListResponse,
  StockAnomalyProductManagerLookupDto,
  StockAnomalyProductManagerLookupHttpRequest,
  StockAnomalyScanHttpRequest,
  StockAnomalyScanResponse,
  StockAnomalySeverity,
  StockAnomalyStatus,
  StockAnomalyStatusUpdateHttpRequest,
  StockAnomalyType
} from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import type { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type OptionalFilter<T extends string> = 'All' | T;
type ProductManagerFilter = 'All' | '__unassigned__' | string;
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'severity'
  | 'status'
  | 'warehouseNo'
  | 'productCode'
  | 'productManagerCode'
  | 'quantity'
  | 'firstDetectedAtUtc'
  | 'lastDetectedAtUtc';

interface SummaryCard {
  key: keyof StockAnomalyListResponse['summary'];
  label: string;
  icon: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
}

interface DetailPair {
  label: string;
  value: string;
}

const TASK_ID = 'stok-anomali-merkezi';
const PERMISSION_PREFIX = 'stok-islemleri.stok-anomali-merkezi';

const TYPE_OPTIONS: readonly StockAnomalyType[] = [
  'NegativeStock',
  'DuplicateDocument',
  'ReceivingDifference',
  'HighQuantity',
  'DormantStock',
  'PendingInterWarehouseTransfer'
];

const STATUS_OPTIONS: readonly StockAnomalyStatus[] = [
  'Open',
  'Acknowledged',
  'Resolved',
  'Ignored'
];

const UPDATE_STATUS_OPTIONS: readonly Exclude<StockAnomalyStatus, 'Open'>[] = [
  'Acknowledged',
  'Resolved',
  'Ignored'
];

const SEVERITY_OPTIONS: readonly StockAnomalySeverity[] = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

const SUMMARY_CARDS: readonly SummaryCard[] = [
  { key: 'openCount', label: 'Acik', icon: 'fa-circle-exclamation', tone: 'danger' },
  { key: 'acknowledgedCount', label: 'Inceleniyor', icon: 'fa-eye', tone: 'warning' },
  { key: 'resolvedCount', label: 'Cozuldu', icon: 'fa-circle-check', tone: 'success' },
  { key: 'ignoredCount', label: 'Yok Sayildi', icon: 'fa-ban', tone: 'neutral' },
  { key: 'criticalCount', label: 'Kritik', icon: 'fa-triangle-exclamation', tone: 'danger' },
  { key: 'highCount', label: 'Yuksek', icon: 'fa-arrow-trend-up', tone: 'warning' }
];

@Component({
  selector: 'app-stok-anomali-merkezi-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stok-anomali-merkezi-list.component.html',
  styleUrl: './stok-anomali-merkezi-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StokAnomaliMerkeziListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly summaryCards = SUMMARY_CARDS;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly updateStatusOptions = UPDATE_STATUS_OPTIONS;
  protected readonly severityOptions = SEVERITY_OPTIONS;

  protected readonly warehouseNoInput = signal('');
  protected readonly typeFilter = signal<OptionalFilter<StockAnomalyType>>('All');
  protected readonly statusFilter = signal<OptionalFilter<StockAnomalyStatus>>('Open');
  protected readonly severityFilter = signal<OptionalFilter<StockAnomalySeverity>>('All');
  protected readonly productManagerFilter = signal<ProductManagerFilter>('All');
  protected readonly startDate = signal(this.getDaysAgo(7));
  protected readonly endDate = signal(this.getToday());
  protected readonly searchText = signal('');
  protected readonly takeInput = signal('100');

  protected readonly dormantDaysInput = signal('90');
  protected readonly pendingTransferHoursInput = signal('24');
  protected readonly highQuantityLookbackDaysInput = signal('30');
  protected readonly highQuantityMultiplierInput = signal('3');
  protected readonly highQuantityMinimumInput = signal('100');
  protected readonly takePerRuleInput = signal('250');

  protected readonly response = signal<StockAnomalyListResponse | null>(null);
  protected readonly productManagers = signal<StockAnomalyProductManagerLookupDto[]>([]);
  protected readonly selectedItem = signal<StockAnomalyListItemDto | null>(null);
  protected readonly detail = signal<StockAnomalyDetailDto | null>(null);
  protected readonly scanResponse = signal<StockAnomalyScanResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly productManagersLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly detailDialogOpen = signal(false);
  protected readonly scanning = signal(false);
  protected readonly updatingStatus = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);
  protected readonly statusNote = signal('');
  protected readonly nextStatus = signal<Exclude<StockAnomalyStatus, 'Open'>>('Acknowledged');
  protected readonly sortKey = signal<SortKey>('lastDetectedAtUtc');
  protected readonly sortDirection = signal<SortDirection>('desc');

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected readonly currentWarehouseNo = computed(() => this.authService.currentUser()?.depoNo ?? null);
  protected readonly currentWarehouseLabel = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return 'Depo okunamadi';
    }

    if (user.depoIsmi && user.depoNo !== null) {
      return `${user.depoIsmi} (${user.depoNo})`;
    }

    return user.depoNo !== null ? `Depo ${user.depoNo}` : 'Depo okunamadi';
  });
  protected readonly isAdminUser = computed(
    () => this.hasRole('administrator') || this.hasRole('admin')
  );
  protected readonly canList = computed(
    () => this.authService.hasTaskAccess(TASK_ID) || this.hasActionPermission('list')
  );
  protected readonly canScan = computed(() => this.hasActionPermission('scan'));
  protected readonly canUpdate = computed(() => this.hasActionPermission('update'));
  protected readonly rows = computed(() => {
    const items = this.response()?.items ?? [];
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...items].sort((left, right) => this.compareValues(left[key], right[key]) * direction);
  });

  ngOnInit(): void {
    if (!this.isAdminUser() && this.currentWarehouseNo()) {
      this.warehouseNoInput.set(String(this.currentWarehouseNo()));
    }

    if (this.canList()) {
      this.loadAnomalies();
    } else {
      this.errorMessage.set('Stok anomali merkezi liste yetkisi bulunamadi.');
    }
  }

  protected loadAnomalies(): void {
    if (!this.canList()) {
      return;
    }

    const request = this.buildListRequest();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.loadProductManagers();

    this.stokIslemleriService
      .getStockAnomalies(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response: StockAnomalyListResponse) => {
          this.response.set(response);
          this.syncSelectedRow(response.items);
        },
        error: (error: unknown) => {
          this.response.set(null);
          this.selectedItem.set(null);
          this.detail.set(null);
          this.errorMessage.set(getErrorMessage(error, 'Stok anomalileri yuklenemedi.'));
        }
      });
  }

  protected loadProductManagers(): void {
    if (!this.canList()) {
      return;
    }

    const status = this.statusFilter();
    const request: StockAnomalyProductManagerLookupHttpRequest = {
      warehouseNo: this.resolveWarehouseNo(),
      status: status === 'All' ? null : status
    };

    this.productManagersLoading.set(true);

    this.stokIslemleriService
      .getStockAnomalyProductManagers(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.productManagersLoading.set(false))
      )
      .subscribe({
        next: (items: StockAnomalyProductManagerLookupDto[]) => {
          this.productManagers.set(items);
          this.pruneProductManagerFilter(items);
        },
        error: () => {
          this.productManagers.set([]);
          this.pruneProductManagerFilter([]);
        }
      });
  }

  protected scanAnomalies(): void {
    if (this.scanning()) {
      return;
    }

    if (!this.canScan()) {
      this.errorMessage.set('Stok anomalisi tarama yetkisi bulunamadi.');
      return;
    }

    const request = this.buildScanRequest();
    this.scanning.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.scanResponse.set(null);

    this.stokIslemleriService
      .scanStockAnomalies(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.scanning.set(false))
      )
      .subscribe({
        next: (response: StockAnomalyScanResponse) => {
          this.scanResponse.set(response);
          this.infoMessage.set(`${response.detectedCount} anomali yakalandi veya guncellendi.`);
          this.loadAnomalies();
        },
        error: (error: unknown) => {
          this.errorMessage.set(getErrorMessage(error, 'Stok anomalisi taramasi basarisiz oldu.'));
        }
      });
  }

  protected openDetail(item: StockAnomalyListItemDto): void {
    this.selectedItem.set(item);
    this.detail.set(null);
    this.detailDialogOpen.set(true);
    this.detailLoading.set(true);
    this.errorMessage.set(null);
    this.statusNote.set('');
    this.nextStatus.set(item.status === 'Open' ? 'Acknowledged' : 'Resolved');

    this.stokIslemleriService
      .getStockAnomalyDetail(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.detailLoading.set(false))
      )
      .subscribe({
        next: (detail: StockAnomalyDetailDto) => this.detail.set(detail),
        error: (error: unknown) =>
          this.errorMessage.set(getErrorMessage(error, 'Anomali detayi yuklenemedi.'))
      });
  }

  protected closeDetail(): void {
    this.detailDialogOpen.set(false);
    this.selectedItem.set(null);
    this.detail.set(null);
    this.detailLoading.set(false);
    this.statusNote.set('');
  }

  @HostListener('document:keydown.escape')
  protected closeDetailOnEscape(): void {
    if (this.detailDialogOpen()) {
      this.closeDetail();
    }
  }

  protected updateStatus(): void {
    const anomaly = this.detail() ?? this.selectedItem();

    if (!anomaly || !this.canUpdate()) {
      return;
    }

    const request: StockAnomalyStatusUpdateHttpRequest = {
      status: this.nextStatus(),
      note: this.statusNote().trim() || null
    };

    this.updatingStatus.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.stokIslemleriService
      .updateStockAnomalyStatus(anomaly.id, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingStatus.set(false))
      )
      .subscribe({
        next: (detail: StockAnomalyDetailDto) => {
          this.detail.set(detail);
          this.selectedItem.set(detail);
          this.statusNote.set('');
          this.infoMessage.set('Anomali durumu guncellendi.');
          this.loadAnomalies();
        },
        error: (error: unknown) =>
          this.errorMessage.set(getErrorMessage(error, 'Anomali durumu guncellenemedi.'))
      });
  }

  protected setWarehouseNo(value: string): void {
    if (this.isAdminUser()) {
      this.warehouseNoInput.set(value);
    }
  }

  protected setTypeFilter(value: string): void {
    this.typeFilter.set(this.toOption(value, TYPE_OPTIONS));
  }

  protected setStatusFilter(value: string): void {
    this.statusFilter.set(this.toOption(value, STATUS_OPTIONS));
  }

  protected setSeverityFilter(value: string): void {
    this.severityFilter.set(this.toOption(value, SEVERITY_OPTIONS));
  }

  protected setProductManagerFilter(value: string): void {
    if (value === 'All' || value === '__unassigned__') {
      this.productManagerFilter.set(value);
      return;
    }

    const hasManager = this.productManagers().some((manager) => manager.code === value);
    this.productManagerFilter.set(hasManager ? value : 'All');
  }

  protected setStartDate(value: string): void {
    this.startDate.set(value);
  }

  protected setEndDate(value: string): void {
    this.endDate.set(value);
  }

  protected setSearchText(value: string): void {
    this.searchText.set(value);
  }

  protected setTake(value: string): void {
    this.takeInput.set(value);
  }

  protected setScanNumber(field: string, value: string): void {
    switch (field) {
      case 'dormantDays':
        this.dormantDaysInput.set(value);
        break;
      case 'pendingTransferHours':
        this.pendingTransferHoursInput.set(value);
        break;
      case 'highQuantityLookbackDays':
        this.highQuantityLookbackDaysInput.set(value);
        break;
      case 'highQuantityMultiplier':
        this.highQuantityMultiplierInput.set(value);
        break;
      case 'highQuantityMinimum':
        this.highQuantityMinimumInput.set(value);
        break;
      case 'takePerRule':
        this.takePerRuleInput.set(value);
        break;
    }
  }

  protected setNextStatus(value: string): void {
    this.nextStatus.set(
      UPDATE_STATUS_OPTIONS.includes(value as Exclude<StockAnomalyStatus, 'Open'>)
        ? (value as Exclude<StockAnomalyStatus, 'Open'>)
        : 'Acknowledged'
    );
  }

  protected setStatusNote(value: string): void {
    this.statusNote.set(value);
  }

  protected setSort(key: SortKey): void {
    if (this.sortKey() !== key) {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
      return;
    }

    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  protected sortIcon(key: SortKey): string {
    if (this.sortKey() !== key) {
      return 'fa-sort';
    }

    return this.sortDirection() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  protected summaryValue(key: keyof StockAnomalyListResponse['summary']): number {
    return this.response()?.summary[key] ?? 0;
  }

  protected scanRuleErrorCount(scan: StockAnomalyScanResponse): number {
    return scan.rules.filter((rule) => !!rule.error).length;
  }

  protected typeLabel(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      NegativeStock: 'Eksi Stok',
      DuplicateDocument: 'Tekrar Belge',
      ReceivingDifference: 'Kabul Farki',
      HighQuantity: 'Yuksek Miktar',
      DormantStock: 'Hareketsiz Stok',
      PendingInterWarehouseTransfer: 'Bekleyen Transfer'
    };

    return value ? labels[value] ?? value : '-';
  }

  protected statusLabel(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      Open: 'Acik',
      Acknowledged: 'Inceleniyor',
      Resolved: 'Cozuldu',
      Ignored: 'Yok Sayildi'
    };

    return value ? labels[value] ?? value : '-';
  }

  protected severityLabel(value: string | null | undefined): string {
    const labels: Record<string, string> = {
      Low: 'Dusuk',
      Medium: 'Orta',
      High: 'Yuksek',
      Critical: 'Kritik'
    };

    return value ? labels[value] ?? value : '-';
  }

  protected productManagerLabel(
    value: Pick<StockAnomalyListItemDto, 'productManagerCode' | 'productManagerName'>
  ): string {
    if (!value.productManagerCode && !value.productManagerName) {
      return 'ATANMAMIS';
    }

    return [value.productManagerCode, value.productManagerName].filter(Boolean).join(' - ');
  }

  protected toneClass(kind: 'status' | 'severity', value: string | null | undefined): string {
    return `${kind}-${this.normalize(value) || 'empty'}`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  protected formatNumber(value: number | null | undefined): string {
    return Number.isFinite(value) ? Number(value).toLocaleString('tr-TR') : '-';
  }

  protected documentLabel(item: StockAnomalyListItemDto): string {
    if (item.documentSerie || item.documentOrderNo) {
      return `${item.documentSerie ?? ''}${item.documentOrderNo ?? ''}`.trim();
    }

    return item.documentNo || '-';
  }

  protected detailPairs(detail: StockAnomalyDetailDto): DetailPair[] {
    return [
      { label: 'Depo', value: `${detail.warehouseName || 'Depo'} (${detail.warehouseNo})` },
      { label: 'Iliskili Depo', value: detail.relatedWarehouseNo ? `${detail.relatedWarehouseName || 'Depo'} (${detail.relatedWarehouseNo})` : '-' },
      { label: 'Stok', value: [detail.productCode, detail.productName].filter(Boolean).join(' - ') || '-' },
      { label: 'Satin Almaci', value: this.productManagerLabel(detail) },
      { label: 'Belge', value: this.documentLabel(detail) },
      { label: 'Miktar', value: this.formatNumber(detail.quantity) },
      { label: 'Beklenen', value: this.formatNumber(detail.expectedQuantity) },
      { label: 'Gerceklesen', value: this.formatNumber(detail.actualQuantity) },
      { label: 'Ortalama', value: this.formatNumber(detail.averageQuantity) },
      { label: 'Ilk Tespit', value: this.formatDate(detail.firstDetectedAtUtc) },
      { label: 'Son Tespit', value: this.formatDate(detail.lastDetectedAtUtc) }
    ];
  }

  protected evidenceBlocks(detail: StockAnomalyDetailDto): Array<Record<string, unknown>> {
    const evidence = detail.evidence;

    if (!evidence) {
      return [];
    }

    return Array.isArray(evidence) ? evidence : [evidence];
  }

  protected objectEntries(value: Record<string, unknown>): DetailPair[] {
    return Object.entries(value)
      .filter(([key]) => key !== 'fields')
      .map(([key, rawValue]) => ({ label: key, value: this.toDisplayValue(rawValue) }));
  }

  protected trackById = (_index: number, item: StockAnomalyListItemDto): string => item.id;
  protected trackBySummary = (_index: number, item: SummaryCard): string => item.key;
  protected trackByRule = (_index: number, item: { type: string }): string => item.type;
  protected trackByPair = (_index: number, item: DetailPair): string => item.label;
  protected trackByProductManager = (
    _index: number,
    item: StockAnomalyProductManagerLookupDto
  ): string => item.isAssigned ? item.code : '__unassigned__';

  private buildListRequest(): StockAnomalyListHttpRequest {
    const type = this.typeFilter();
    const status = this.statusFilter();
    const severity = this.severityFilter();
    const productManager = this.productManagerFilter();

    return {
      warehouseNo: this.resolveWarehouseNo(),
      type: type === 'All' ? null : type,
      status: status === 'All' ? null : status,
      severity: severity === 'All' ? null : severity,
      productManagerCode:
        productManager === 'All' || productManager === '__unassigned__' ? null : productManager,
      hasProductManager: productManager === '__unassigned__' ? false : null,
      startDate: this.validDateOrNull(this.startDate()),
      endDate: this.validDateOrNull(this.endDate()),
      search: this.searchText().trim() || null,
      take: this.clampNumber(this.takeInput(), 1, 500, 100)
    };
  }

  private buildScanRequest(): StockAnomalyScanHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.validDateOrNull(this.startDate()),
      endDate: this.validDateOrNull(this.endDate()),
      dormantDays: this.clampNumber(this.dormantDaysInput(), 1, 3650, 90),
      pendingTransferHours: this.clampNumber(this.pendingTransferHoursInput(), 1, 720, 24),
      highQuantityLookbackDays: this.clampNumber(this.highQuantityLookbackDaysInput(), 1, 365, 30),
      highQuantityMultiplier: this.clampNumber(this.highQuantityMultiplierInput(), 1, 100, 3),
      highQuantityMinimum: this.clampNumber(this.highQuantityMinimumInput(), 1, 1_000_000, 100),
      takePerRule: this.clampNumber(this.takePerRuleInput(), 1, 500, 250)
    };
  }

  private resolveWarehouseNo(): number | null {
    if (!this.isAdminUser()) {
      return this.currentWarehouseNo();
    }

    const value = Number(this.warehouseNoInput());
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private syncSelectedRow(items: StockAnomalyListItemDto[]): void {
    const selected = this.selectedItem();

    if (!selected) {
      return;
    }

    const nextSelected = items.find((item) => item.id === selected.id) ?? null;
    this.selectedItem.set(nextSelected);

    if (!nextSelected) {
      this.detail.set(null);
    }
  }

  private pruneProductManagerFilter(items: StockAnomalyProductManagerLookupDto[]): void {
    const selectedFilter = this.productManagerFilter();

    if (selectedFilter === 'All') {
      return;
    }

    if (selectedFilter === '__unassigned__') {
      if (!items.some((item) => !item.isAssigned)) {
        this.productManagerFilter.set('All');
      }
      return;
    }

    if (!items.some((item) => item.code === selectedFilter)) {
      this.productManagerFilter.set('All');
    }
  }

  private hasRole(roleName: string): boolean {
    const expected = this.normalize(roleName);
    return (this.authService.currentUser()?.roller ?? []).some(
      (role) => this.normalize(role) === expected
    );
  }

  private hasActionPermission(action: string): boolean {
    const normalizedAction = this.normalize(action);
    const fullPermission = this.normalize(`${PERMISSION_PREFIX}.${action}`);
    const permissions = [
      ...(this.authService.currentUser()?.permissions ?? []),
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => this.normalize(permission));

    return permissions.some(
      (permission) =>
        permission === normalizedAction ||
        permission === fullPermission ||
        permission.endsWith(`.${normalizedAction}`)
    );
  }

  private compareValues(left: unknown, right: unknown): number {
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    return String(left ?? '').localeCompare(String(right ?? ''), 'tr-TR', { numeric: true });
  }

  private toOption<T extends string>(value: string, options: readonly T[]): OptionalFilter<T> {
    return options.includes(value as T) ? (value as T) : 'All';
  }

  private validDateOrNull(value: string): string | null {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  private clampNumber(value: string, min: number, max: number, fallback: number): number {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(numericValue), min), max);
  }

  private toDisplayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private normalize(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
  }

  private getToday(): string {
    return this.toLocalDate(new Date());
  }

  private getDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.toLocalDate(date);
  }

  private toLocalDate(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
