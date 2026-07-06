import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  CustomerLookupItemDto,
  SupplierPerformanceCardDto,
  SupplierPerformanceDetailDto,
  SupplierPerformanceDetailHttpRequest,
  SupplierPerformanceEventDto,
  SupplierPerformanceHttpRequest,
  SupplierPerformanceReportDto
} from '@interfaces';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type SupplierPerformanceScope = 'all' | 'current' | 'manual';

interface SupplierPerformanceMetric {
  label: string;
  value: string;
  tone?: 'danger' | 'warning' | 'success';
}

const TASK_ID = 'tedarikci-performans-karnesi';
const PERMISSION_PREFIX = 'rapor-islemleri.tedarikci-performans-karnesi';

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

const MONEY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const PERCENT_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: unknown): string {
  return NUMBER_FORMATTER.format(toNumber(value));
}

function formatMoney(value: unknown): string {
  return `${MONEY_FORMATTER.format(toNumber(value))} TL`;
}

function formatPercent(value: unknown): string {
  return PERCENT_FORMATTER.format(toNumber(value));
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(date);
}

function riskLabel(value: string | null | undefined): string {
  switch (value) {
    case 'Healthy':
      return 'Saglikli';
    case 'Warning':
      return 'Uyari';
    case 'Critical':
      return 'Kritik';
    default:
      return value?.trim() || '-';
  }
}

function eventTypeLabel(value: string | null | undefined): string {
  switch (value) {
    case 'Order':
      return 'Siparis';
    case 'OpenLateOrder':
      return 'Acik Gec Siparis';
    case 'ReceivingDifference':
      return 'Mal Kabul Farki';
    case 'CompanyReturn':
      return 'Firma Iadesi';
    case 'OutageImpact':
      return 'Zayiat Etkisi';
    case 'ExpenseImpact':
      return 'Masraf Etkisi';
    case 'IssuedInvoice':
      return 'Giden Fatura';
    case 'IncomingInvoice':
      return 'Gelen Fatura';
    default:
      return value?.trim() || '-';
  }
}

const TABLE_COLUMNS: readonly ApiListTableColumn<SupplierPerformanceCardDto>[] = [
  {
    key: 'customerTitle',
    label: 'Tedarikci',
    resolveValue: (row) => `${row.customerTitle || '-'} (${row.customerCode || '-'})`
  },
  {
    key: 'score',
    label: 'Skor',
    resolveValue: (row) => `${formatNumber(row.score)} / ${row.grade || '-'}`
  },
  {
    key: 'riskLevel',
    label: 'Risk',
    resolveValue: (row) => riskLabel(row.riskLevel)
  },
  {
    key: 'orders.deliveryRate',
    label: 'Teslimat',
    resolveValue: (row) => formatPercent(row.orders?.deliveryRate)
  },
  {
    key: 'orders.openLateLineCount',
    label: 'Gec Acik',
    resolveValue: (row) => formatNumber(row.orders?.openLateLineCount)
  },
  {
    key: 'receiving.missingQuantity',
    label: 'Eksik/Fazla',
    resolveValue: (row) =>
      `${formatNumber(row.receiving?.missingQuantity)} / ${formatNumber(row.receiving?.excessQuantity)}`
  },
  {
    key: 'returns.returnedQuantity',
    label: 'Iade',
    resolveValue: (row) => formatNumber(row.returns?.returnedQuantity)
  },
  {
    key: 'outageImpact.quantity',
    label: 'Zayiat',
    resolveValue: (row) => formatNumber(row.outageImpact?.quantity)
  },
  {
    key: 'invoices.issuedInvoiceAmount',
    label: 'Bizim Kestigimiz',
    resolveValue: (row) => formatMoney(row.invoices?.issuedInvoiceAmount)
  },
  {
    key: 'invoices.incomingInvoiceAmount',
    label: 'Gelen Fatura',
    resolveValue: (row) => formatMoney(row.invoices?.incomingInvoiceAmount)
  }
];

@Component({
  selector: 'app-tedarikci-performans-karnesi-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiListTableComponent],
  templateUrl: './tedarikci-performans-karnesi-list.component.html',
  styleUrl: './tedarikci-performans-karnesi-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TedarikciPerformansKarnesiListComponent implements OnInit, OnDestroy {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly columns = TABLE_COLUMNS;
  protected readonly startDate = signal(this.getDefaultStartDate());
  protected readonly endDate = signal(this.getToday());
  protected readonly scope = signal<SupplierPerformanceScope>('all');
  protected readonly manualWarehouseNo = signal('');
  protected readonly customerCode = signal('');
  protected readonly supplierSearchText = signal('');
  protected readonly supplierSuggestions = signal<readonly CustomerLookupItemDto[]>([]);
  protected readonly supplierSearchLoading = signal(false);
  protected readonly supplierSearchMessage = signal<string | null>(null);
  protected readonly take = signal(100);
  protected readonly eventTake = signal(100);
  protected readonly report = signal<SupplierPerformanceReportDto | null>(null);
  protected readonly rows = signal<readonly SupplierPerformanceCardDto[]>([]);
  protected readonly detail = signal<SupplierPerformanceDetailDto | null>(null);
  protected readonly selectedCustomerCode = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly detailErrorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly aramaService = inject(AramaService);
  private readonly raporIslemleriService = inject(RaporIslemleriService);
  private activeRequestId = 0;
  private activeDetailRequestId = 0;
  private supplierSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSupplierSearchId = 0;

  protected readonly canList = computed(() => this.hasPermission('list'));
  protected readonly canDetail = computed(() => this.hasPermission('detail') || this.canList());
  protected readonly selectedDateRangeLabel = computed(
    () => `${this.startDate() || 'YYYY-MM-DD'} - ${this.endDate() || 'YYYY-MM-DD'}`
  );
  protected readonly scopeLabel = computed(() => {
    switch (this.scope()) {
      case 'current':
        return this.currentWarehouseLabel();
      case 'manual': {
        const warehouseNo = this.resolveWarehouseNo();
        return warehouseNo ? `Depo ${warehouseNo}` : 'Depo no bekleniyor';
      }
      case 'all':
      default:
        return 'Tum Depolar';
    }
  });
  protected readonly selectedSupplierLabel = computed(() => {
    const selectedText = this.supplierSearchText().trim();
    const selectedCode = this.customerCode().trim();
    return selectedCode ? `Tedarikci: ${selectedText || selectedCode}` : 'Tum tedarikciler';
  });
  protected readonly metrics = computed<readonly SupplierPerformanceMetric[]>(() => {
    const summary = this.report()?.summary;

    if (!summary) {
      return [];
    }

    return [
      { label: 'Tedarikci', value: formatNumber(summary.supplierCount) },
      { label: 'Ortalama Skor', value: formatNumber(summary.averageScore), tone: 'success' },
      {
        label: 'Kritik / Uyari',
        value: `${formatNumber(summary.criticalSupplierCount)} / ${formatNumber(summary.warningSupplierCount)}`,
        tone: summary.criticalSupplierCount ? 'danger' : summary.warningSupplierCount ? 'warning' : undefined
      },
      { label: 'Siparis', value: formatNumber(summary.totalOrderedQuantity) },
      { label: 'Kabul', value: formatNumber(summary.totalReceivedQuantity) },
      { label: 'Iade', value: formatNumber(summary.totalReturnedQuantity), tone: 'warning' },
      { label: 'Eksik/Fazla', value: `${formatNumber(summary.totalMissingQuantity)} / ${formatNumber(summary.totalExcessQuantity)}` },
      { label: 'Bizim Kestigimiz', value: formatMoney(summary.totalIssuedInvoiceAmount) },
      { label: 'Gelen Fatura', value: formatMoney(summary.totalIncomingInvoiceAmount) }
    ];
  });

  ngOnInit(): void {
    if (this.canList()) {
      this.loadReport();
    }
  }

  ngOnDestroy(): void {
    if (this.supplierSearchTimer) {
      clearTimeout(this.supplierSearchTimer);
    }
  }

  protected loadReport(): void {
    if (!this.validateRequest() || !this.canList()) {
      return;
    }

    const requestId = ++this.activeRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.clearDetail();

    this.raporIslemleriService
      .getSupplierPerformanceReport(this.buildListRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: SupplierPerformanceReportDto) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.report.set(response);
          this.rows.set(response.items ?? []);
          this.lastLoadedAt.set(new Date().toISOString());
        },
        error: (error: unknown) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.report.set(null);
          this.rows.set([]);
          this.errorMessage.set(getErrorMessage(error, 'Tedarikci performans karnesi yuklenemedi.'));
        }
      });
  }

  protected openDetail(row: SupplierPerformanceCardDto): void {
    if (!this.canDetail()) {
      this.detailErrorMessage.set('Tedarikci performans detayi icin yetkiniz bulunmuyor.');
      return;
    }

    const requestId = ++this.activeDetailRequestId;
    this.selectedCustomerCode.set(row.customerCode);
    this.detail.set(null);
    this.detailErrorMessage.set(null);
    this.detailLoading.set(true);

    this.raporIslemleriService
      .getSupplierPerformanceDetail(row.customerCode, this.buildDetailRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeDetailRequestId) {
            this.detailLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: SupplierPerformanceDetailDto) => {
          if (requestId !== this.activeDetailRequestId) {
            return;
          }

          this.detail.set({
            ...response,
            events: [...(response.events ?? [])].sort((left, right) =>
              this.eventDate(left).localeCompare(this.eventDate(right))
            )
          });
        },
        error: (error: unknown) => {
          if (requestId !== this.activeDetailRequestId) {
            return;
          }

          this.detailErrorMessage.set(getErrorMessage(error, 'Tedarikci detayi yuklenemedi.'));
        }
      });
  }

  protected clearDetail(): void {
    this.activeDetailRequestId++;
    this.selectedCustomerCode.set(null);
    this.detail.set(null);
    this.detailErrorMessage.set(null);
    this.detailLoading.set(false);
  }

  protected updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  protected updateEndDate(value: string): void {
    this.endDate.set(value);
  }

  protected updateSupplierSearch(value: string): void {
    this.supplierSearchText.set(value);
    this.customerCode.set(value.trim());
    this.supplierSearchMessage.set(null);

    if (this.supplierSearchTimer) {
      clearTimeout(this.supplierSearchTimer);
    }

    const query = value.trim();

    if (query.length < 2) {
      this.supplierSuggestions.set([]);
      this.supplierSearchLoading.set(false);
      return;
    }

    this.supplierSearchLoading.set(true);
    this.supplierSearchTimer = setTimeout(() => this.searchSuppliers(query), 350);
  }

  protected selectSupplier(supplier: CustomerLookupItemDto): void {
    this.customerCode.set(supplier.customerCode);
    this.supplierSearchText.set(
      `${supplier.customerCode} - ${supplier.customerDisplayName || supplier.customerTitle || supplier.customerName}`
    );
    this.supplierSuggestions.set([]);
    this.supplierSearchMessage.set(null);
    this.loadReport();
  }

  protected clearSupplierFilter(): void {
    if (this.supplierSearchTimer) {
      clearTimeout(this.supplierSearchTimer);
      this.supplierSearchTimer = null;
    }

    this.customerCode.set('');
    this.supplierSearchText.set('');
    this.supplierSuggestions.set([]);
    this.supplierSearchMessage.set(null);
    this.supplierSearchLoading.set(false);
  }

  protected updateManualWarehouseNo(value: string): void {
    this.manualWarehouseNo.set(value);
  }

  protected updateTake(value: string | number): void {
    this.take.set(this.toLimitedNumber(value, 1, 500, 100));
  }

  protected updateEventTake(value: string | number): void {
    this.eventTake.set(this.toLimitedNumber(value, 1, 500, 100));
  }

  protected selectScope(scope: SupplierPerformanceScope): void {
    this.scope.set(scope);
  }

  protected riskLabel(value: string | null | undefined): string {
    return riskLabel(value);
  }

  protected eventTypeLabel(value: string | null | undefined): string {
    return eventTypeLabel(value);
  }

  protected riskClass(value: string | null | undefined): string {
    return `risk-${(value || 'neutral').toLocaleLowerCase('en-US')}`;
  }

  protected formatNumber(value: unknown): string {
    return formatNumber(value);
  }

  protected formatMoney(value: unknown): string {
    return formatMoney(value);
  }

  protected formatPercent(value: unknown): string {
    return formatPercent(value);
  }

  protected formatDate(value: string | null | undefined): string {
    return formatDate(value);
  }

  protected formatEventTitle(event: SupplierPerformanceEventDto): string {
    const document = [event.documentSerie, event.documentOrderNo].filter(Boolean).join(' / ');
    const stock = event.stockName || event.stockCode;
    return [document, stock].filter(Boolean).join(' - ') || event.message || '-';
  }

  protected eventDate(event: SupplierPerformanceEventDto): string {
    return event.occurredAtUtc || event.documentDate || '';
  }

  protected currentWarehouseLabel(): string {
    const user = this.authService.currentUser();

    if (user?.depoIsmi && user.depoNo !== null && user.depoNo !== undefined) {
      return `${user.depoIsmi} (${user.depoNo})`;
    }

    return user?.depoNo !== null && user?.depoNo !== undefined ? `Depo ${user.depoNo}` : 'Aktif depo okunamadi';
  }

  protected trackByMetric = (_index: number, metric: SupplierPerformanceMetric): string =>
    metric.label;
  protected trackByEvent = (_index: number, event: SupplierPerformanceEventDto): string =>
    `${event.type}-${this.eventDate(event)}-${event.documentSerie ?? ''}-${event.documentOrderNo ?? ''}-${event.stockCode ?? ''}`;
  protected trackBySupplier = (_index: number, supplier: CustomerLookupItemDto): string =>
    supplier.customerCode;

  private searchSuppliers(query: string): void {
    const requestId = ++this.activeSupplierSearchId;

    this.aramaService
      .searchCustomers(query, 8)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeSupplierSearchId) {
            this.supplierSearchLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (items: CustomerLookupItemDto[]) => {
          if (requestId !== this.activeSupplierSearchId) {
            return;
          }

          this.supplierSuggestions.set(items ?? []);
          this.supplierSearchMessage.set(items?.length ? null : 'Tedarikci bulunamadi.');
        },
        error: (error: unknown) => {
          if (requestId !== this.activeSupplierSearchId) {
            return;
          }

          this.supplierSuggestions.set([]);
          this.supplierSearchMessage.set(getErrorMessage(error, 'Tedarikci aramasi yapilamadi.'));
        }
      });
  }

  private buildListRequest(): SupplierPerformanceHttpRequest {
    return {
      startDate: this.startDate(),
      endDate: this.endDate(),
      warehouseNo: this.resolveWarehouseNo(),
      customerCode: this.customerCode().trim() || null,
      take: this.take()
    };
  }

  private buildDetailRequest(): SupplierPerformanceDetailHttpRequest {
    return {
      startDate: this.startDate(),
      endDate: this.endDate(),
      warehouseNo: this.resolveWarehouseNo(),
      eventTake: this.eventTake()
    };
  }

  private resolveWarehouseNo(): number | null {
    if (this.scope() === 'all') {
      return null;
    }

    if (this.scope() === 'current') {
      const warehouseNo = this.authService.currentUser()?.depoNo;
      return Number.isFinite(warehouseNo) ? Number(warehouseNo) : null;
    }

    const value = Number(this.manualWarehouseNo());
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private validateRequest(): boolean {
    if (!this.startDate() || !this.endDate()) {
      this.errorMessage.set('Baslangic ve bitis tarihi zorunludur.');
      return false;
    }

    if (this.scope() === 'manual' && !this.resolveWarehouseNo()) {
      this.errorMessage.set('Manuel kapsam icin depo no girin.');
      return false;
    }

    return true;
  }

  private hasPermission(action: 'list' | 'detail'): boolean {
    const user = this.authService.currentUser();

    if (!user) {
      return false;
    }

    const permissionCode = `${PERMISSION_PREFIX}.${action}`;
    const roles = user.roller ?? [];

    return (
      roles.some((role) => role.toLocaleLowerCase('tr-TR') === 'administrator') ||
      roles.some((role) => role.toLocaleLowerCase('tr-TR') === 'admin') ||
      (user.permissions ?? []).includes(permissionCode) ||
      this.authService.hasTaskAccess(TASK_ID) ||
      this.authService.getTaskPermissionCodes(TASK_ID).includes(permissionCode)
    );
  }

  private toLimitedNumber(
    value: string | number,
    minimum: number,
    maximum: number,
    fallback: number
  ): number {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, Math.trunc(numberValue)));
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  }
}
