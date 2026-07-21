import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map } from 'rxjs';
import type {
  PromotionBranchPerformanceItemDto,
  PromotionBulletinOptionDto,
  PromotionBulletinOptionHttpRequest,
  PromotionBulletinListHttpRequest,
  PromotionBulletinListItemDto,
  PromotionPerformanceHttpRequest,
  PromotionPerformanceItemDto,
  PromotionPerformanceReportDto,
  PromotionPerformanceSummaryDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserIsAdmin,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../../../core/admin-warehouse.helpers';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type PromotionReportKey = 'bultenler' | 'performans' | 'satis-marj-etkisi' | 'performans-sube';
type PromotionReportMode = 'active-date' | 'date-range';
type PromotionReportScope = 'all' | 'current' | 'manual';

interface PromotionReportDefinition {
  key: PromotionReportKey;
  group: string;
  label: string;
  description: string;
  endpoint: string;
  mode: PromotionReportMode;
  columns: readonly ApiListTableColumn[];
}

interface PromotionReportMetric {
  label: string;
  value: string;
}

interface PromotionReportLoadResult {
  rows: readonly object[];
  metrics: readonly PromotionReportMetric[];
  note?: string;
}

const INTEGER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0
});

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

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value.replace(',', '.'));

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
}

function formatInteger(value: unknown): string {
  return INTEGER_FORMATTER.format(toSafeNumber(value));
}

function formatNumber(value: unknown): string {
  return NUMBER_FORMATTER.format(toSafeNumber(value));
}

function formatMoney(value: unknown): string {
  return `${MONEY_FORMATTER.format(toSafeNumber(value))} TL`;
}

function formatPercent(value: unknown): string {
  return PERCENT_FORMATTER.format(toSafeNumber(value));
}

function formatDateOnly(value: string | null | undefined): string {
  const textValue = value?.trim() ?? '';
  return textValue.includes('T') ? textValue.split('T')[0] ?? textValue : textValue || '-';
}

function formatPromotion(row: {
  promotionCode?: string | null;
  promotionName?: string | null;
  description?: string | null;
}): string {
  const name = row.promotionName?.trim() || row.description?.trim() || '';
  const code = row.promotionCode?.trim() || '';

  if (name && code) {
    return `${name} (${code})`;
  }

  return name || code || '-';
}

function formatPromotionOption(option: PromotionBulletinOptionDto): string {
  const promotion = formatPromotion(option);
  const dateRange = [formatDateOnly(option.startDate), formatDateOnly(option.endDate)]
    .filter((value) => value !== '-')
    .join(' - ');
  const branchCount = Number.isFinite(option.branchCount)
    ? ` - ${formatInteger(option.branchCount)} sube`
    : '';

  return dateRange ? `${promotion} / ${dateRange}${branchCount}` : `${promotion}${branchCount}`;
}

function formatWarehouse(row: {
  warehouseName?: string | null;
  warehouseNo?: number | null;
  branchName?: string | null;
  branchNo?: number | null;
}): string {
  const name = row.warehouseName?.trim() || row.branchName?.trim() || '';
  const no = row.warehouseNo ?? row.branchNo;

  if (name && Number.isFinite(no)) {
    return `${name} (${no})`;
  }

  if (name) {
    return name;
  }

  return Number.isFinite(no) ? `Sube ${no}` : '-';
}

function sumBy<Row>(rows: readonly Row[], selector: (row: Row) => unknown): number {
  return rows.reduce((total, row) => total + toSafeNumber(selector(row)), 0);
}

const BULLETIN_COLUMNS: readonly ApiListTableColumn<PromotionBulletinListItemDto>[] = [
  { key: 'promotionCode', label: 'Kod' },
  { key: 'promotionName', label: 'Promosyon', resolveValue: (row) => formatPromotion(row) },
  { key: 'description', label: 'Aciklama' },
  { key: 'startDate', label: 'Baslangic', resolveValue: (row) => formatDateOnly(row.startDate) },
  { key: 'endDate', label: 'Bitis', resolveValue: (row) => formatDateOnly(row.endDate) },
  {
    key: 'isActive',
    label: 'Durum',
    type: 'status',
    resolveValue: (row) => (row.isActive ? 'Aktif' : 'Pasif')
  },
  { key: 'branchCount', label: 'Sube', resolveValue: (row) => formatInteger(row.branchCount) },
  { key: 'warehouseName', label: 'Kapsam', resolveValue: (row) => formatWarehouse(row) }
];

const PERFORMANCE_COLUMNS: readonly ApiListTableColumn<PromotionPerformanceItemDto>[] = [
  { key: 'promotionName', label: 'Promosyon', resolveValue: (row) => formatPromotion(row) },
  { key: 'usageCount', label: 'Kullanim', resolveValue: (row) => formatInteger(row.usageCount) },
  { key: 'receiptCount', label: 'Fis', resolveValue: (row) => formatInteger(row.receiptCount) },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'netSalesAmount', label: 'Net Satis', resolveValue: (row) => formatMoney(row.netSalesAmount) },
  { key: 'grossSalesAmount', label: 'Brut Satis', resolveValue: (row) => formatMoney(row.grossSalesAmount) },
  { key: 'discountAmount', label: 'Indirim', resolveValue: (row) => formatMoney(row.discountAmount) },
  { key: 'estimatedCostAmount', label: 'Tahmini Maliyet', resolveValue: (row) => formatMoney(row.estimatedCostAmount) },
  { key: 'marginAmount', label: 'Marj', resolveValue: (row) => formatMoney(row.marginAmount) },
  { key: 'marginPercent', label: 'Marj %', resolveValue: (row) => formatPercent(row.marginPercent) }
];

const BRANCH_PERFORMANCE_COLUMNS: readonly ApiListTableColumn<PromotionBranchPerformanceItemDto>[] = [
  { key: 'warehouseName', label: 'Sube', resolveValue: (row) => formatWarehouse(row) },
  { key: 'promotionName', label: 'Promosyon', resolveValue: (row) => formatPromotion(row) },
  { key: 'usageCount', label: 'Kullanim', resolveValue: (row) => formatInteger(row.usageCount) },
  { key: 'receiptCount', label: 'Fis', resolveValue: (row) => formatInteger(row.receiptCount) },
  { key: 'quantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.quantity) },
  { key: 'netSalesAmount', label: 'Net Satis', resolveValue: (row) => formatMoney(row.netSalesAmount) },
  { key: 'discountAmount', label: 'Indirim', resolveValue: (row) => formatMoney(row.discountAmount) },
  { key: 'marginAmount', label: 'Marj', resolveValue: (row) => formatMoney(row.marginAmount) },
  { key: 'marginPercent', label: 'Marj %', resolveValue: (row) => formatPercent(row.marginPercent) }
];

const REPORT_DEFINITIONS: readonly PromotionReportDefinition[] = [
  {
    key: 'bultenler',
    group: 'Bulten',
    label: 'Bultenler',
    description: 'Aktif/pasif promosyon bultenlerini ve sube kapsamlarini listeler.',
    endpoint: '/api/rapor-islemleri/promosyon-raporlari/bultenler',
    mode: 'active-date',
    columns: BULLETIN_COLUMNS
  },
  {
    key: 'performans',
    group: 'Performans',
    label: 'Performans',
    description: 'Promosyon bazli kullanim, satis, indirim ve tahmini marj ozeti.',
    endpoint: '/api/rapor-islemleri/promosyon-raporlari/performans',
    mode: 'date-range',
    columns: PERFORMANCE_COLUMNS
  },
  {
    key: 'satis-marj-etkisi',
    group: 'Performans',
    label: 'Satis Marj Etkisi',
    description: 'Promosyon satis ve marj etkisini ayni response modeliyle getirir.',
    endpoint: '/api/rapor-islemleri/promosyon-raporlari/satis-marj-etkisi',
    mode: 'date-range',
    columns: PERFORMANCE_COLUMNS
  },
  {
    key: 'performans-sube',
    group: 'Sube',
    label: 'Sube Kirilimi',
    description: 'Promosyon performansini promosyon + sube kiriliminda listeler.',
    endpoint: '/api/rapor-islemleri/promosyon-raporlari/performans/sube',
    mode: 'date-range',
    columns: BRANCH_PERFORMANCE_COLUMNS
  }
];

@Component({
  selector: 'app-promosyon-raporlari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './promosyon-raporlari-list.component.html',
  styleUrl: './promosyon-raporlari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromosyonRaporlariListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['promosyon-raporlari'];
  protected readonly reportDefinitions = REPORT_DEFINITIONS;
  protected readonly selectedReport = signal<PromotionReportKey>('bultenler');
  protected readonly activeOn = signal(this.getToday());
  protected readonly startDate = signal(this.getRelativeDate(-20));
  protected readonly endDate = signal(this.getToday());
  protected readonly scope = signal<PromotionReportScope>('all');
  protected readonly manualWarehouseNo = signal('');
  protected readonly promotionCode = signal('');
  protected readonly searchText = signal('');
  protected readonly onlyActive = signal(true);
  protected readonly take = signal(250);
  protected readonly rows = signal<readonly object[]>([]);
  protected readonly metrics = signal<readonly PromotionReportMetric[]>([]);
  protected readonly bulletinOptions = signal<readonly PromotionBulletinOptionDto[]>([]);
  protected readonly isBulletinOptionsLoading = signal(false);
  protected readonly bulletinOptionsError = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);
  protected readonly resultNote = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly raporIslemleriService = inject(RaporIslemleriService);
  private activeRequestId = 0;
  private activeBulletinOptionsRequestId = 0;

  protected readonly selectedDefinition = computed(
    () =>
      this.reportDefinitions.find((report) => report.key === this.selectedReport()) ??
      this.reportDefinitions[0]
  );
  protected readonly tableColumns = computed(() => this.selectedDefinition().columns);
  protected readonly isAdminUser = computed(() => currentUserIsAdmin(this.authService.currentUser()));
  protected readonly usesDateRange = computed(() => this.selectedDefinition().mode === 'date-range');
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly scopeLabel = computed(() => {
    if (!this.isAdminUser()) {
      return this.currentWarehouseLabel();
    }

    switch (this.scope()) {
      case 'current':
        return this.currentWarehouseLabel();
      case 'manual': {
        const warehouseNo = this.getManualWarehouseNo();
        return warehouseNo ? `Sube ${warehouseNo}` : 'Sube no bekleniyor';
      }
      case 'all':
      default:
        return 'Tum Subeler';
    }
  });
  protected readonly selectedDateLabel = computed(() =>
    this.usesDateRange()
      ? this.formatPerformanceDateLabel()
      : this.activeOn() || 'YYYY-MM-DD'
  );
  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly requestPreview = computed(() => {
    const params = this.usesDateRange() ? this.buildPerformanceRequest() : this.buildBulletinRequest();
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }

    const queryText = query.toString();
    return queryText ? `${this.selectedDefinition().endpoint}?${queryText}` : this.selectedDefinition().endpoint;
  });

  ngOnInit(): void {
    this.loadBulletinOptions();
    this.loadRows();
  }

  protected selectReport(reportKey: PromotionReportKey): void {
    if (this.selectedReport() === reportKey) {
      return;
    }

    this.selectedReport.set(reportKey);
    this.rows.set([]);
    this.metrics.set([]);
    this.resultNote.set(null);

    if (this.usesDateRange()) {
      this.loadBulletinOptions();
    }

    this.loadRows();
  }

  protected selectScope(scope: PromotionReportScope): void {
    this.scope.set(scope);

    if (scope !== 'manual' || this.getManualWarehouseNo()) {
      this.loadRows();
    }
  }

  protected selectBulletin(row: object): void {
    const promotionCode = (row as PromotionBulletinListItemDto).promotionCode?.trim();

    if (!promotionCode) {
      return;
    }

    this.promotionCode.set(promotionCode);
    this.selectedReport.set('performans');
    this.loadBulletinOptions();
    this.loadRows();
  }

  protected updateActiveOn(value: string): void {
    this.activeOn.set(value);
  }

  protected updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  protected updateEndDate(value: string): void {
    this.endDate.set(value);
  }

  protected updateManualWarehouseNo(value: string): void {
    this.manualWarehouseNo.set(value);
  }

  protected updatePromotionCode(value: string): void {
    this.promotionCode.set(value);
  }

  protected clearPromotionCode(): void {
    this.promotionCode.set('');
    this.loadRows();
  }

  protected updateSearchText(value: string): void {
    this.searchText.set(value);
  }

  protected updateOnlyActive(value: boolean): void {
    this.onlyActive.set(value);
  }

  protected updateTake(value: string | number): void {
    this.take.set(this.toLimitedNumber(value, 1, 1000, 250));
  }

  protected loadBulletinOptions(): void {
    const requestId = ++this.activeBulletinOptionsRequestId;

    this.isBulletinOptionsLoading.set(true);
    this.bulletinOptionsError.set(null);

    this.raporIslemleriService
      .getPromotionBulletinOptions(this.buildBulletinOptionRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeBulletinOptionsRequestId) {
            this.isBulletinOptionsLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (options: PromotionBulletinOptionDto[]) => {
          if (requestId !== this.activeBulletinOptionsRequestId) {
            return;
          }

          this.bulletinOptions.set(options ?? []);
        },
        error: (error: unknown) => {
          if (requestId !== this.activeBulletinOptionsRequestId) {
            return;
          }

          this.bulletinOptions.set([]);
          this.bulletinOptionsError.set(getErrorMessage(error, 'Promosyon secenekleri yuklenemedi.'));
        }
      });
  }

  protected loadRows(): void {
    if (!this.validateRequest()) {
      return;
    }

    const requestId = ++this.activeRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resultNote.set(null);

    this.fetchSelectedReport()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (result: PromotionReportLoadResult) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set(result.rows ?? []);
          this.metrics.set(result.metrics ?? []);
          this.resultNote.set(result.note ?? null);
          this.lastLoadedAt.set(new Date().toISOString());
        },
        error: (error: unknown) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set([]);
          this.metrics.set([]);
          this.errorMessage.set(getErrorMessage(error, `${this.selectedDefinition().label} raporu yuklenemedi.`));
        }
      });
  }

  protected formatDate(value: string | null | undefined): string {
    const textValue = value?.trim() ?? '';

    if (!textValue) {
      return '-';
    }

    const date = new Date(textValue);

    if (Number.isNaN(date.getTime())) {
      return textValue;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: textValue.includes('T') ? 'short' : undefined
    }).format(date);
  }

  protected readonly trackByReport = (_index: number, report: PromotionReportDefinition): string =>
    report.key;
  protected readonly trackByMetric = (_index: number, metric: PromotionReportMetric): string =>
    metric.label;
  protected readonly trackByBulletinOption = (
    _index: number,
    option: PromotionBulletinOptionDto
  ): string => option.promotionCode ?? option.promotionName ?? String(_index);
  protected readonly formatPromotionOption = formatPromotionOption;

  private fetchSelectedReport(): Observable<PromotionReportLoadResult> {
    switch (this.selectedReport()) {
      case 'performans':
        return this.raporIslemleriService
          .getPromotionPerformance(this.buildPerformanceRequest())
          .pipe(
            map((report: PromotionPerformanceReportDto) =>
              this.buildPerformanceResult(report)
            )
          );
      case 'satis-marj-etkisi':
        return this.raporIslemleriService
          .getPromotionSalesMarginImpact(this.buildPerformanceRequest())
          .pipe(
            map((report: PromotionPerformanceReportDto) =>
              this.buildPerformanceResult(
                report,
                'Maliyet kartta yoksa tahmini maliyet 0 okunur; marj tahmini olarak degerlendirilir.'
              )
            )
          );
      case 'performans-sube':
        return this.raporIslemleriService
          .getPromotionBranchPerformance(this.buildPerformanceRequest())
          .pipe(
            map((rows: PromotionBranchPerformanceItemDto[]) =>
              this.buildBranchPerformanceResult(rows ?? [])
            )
          );
      case 'bultenler':
      default:
        return this.raporIslemleriService
          .getPromotionBulletins(this.buildBulletinRequest())
          .pipe(
            map((rows: PromotionBulletinListItemDto[]) =>
              this.buildBulletinResult(rows ?? [])
            )
          );
    }
  }

  private buildBulletinResult(rows: readonly PromotionBulletinListItemDto[]): PromotionReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Bulten', value: formatInteger(rows.length) },
        { label: 'Aktif', value: formatInteger(rows.filter((row) => row.isActive).length) },
        { label: 'Sube Kapsami', value: formatInteger(sumBy(rows, (row) => row.branchCount)) },
        { label: 'Kapsam', value: this.scopeLabel() }
      ],
      note: 'Bulten satiri secilirse performans raporu ayni promosyon koduyla acilir.'
    };
  }

  private buildPerformanceResult(
    report: PromotionPerformanceReportDto | null | undefined,
    note?: string
  ): PromotionReportLoadResult {
    const rows = report?.items ?? [];
    const summary = report?.summary;

    return {
      rows,
      metrics: this.buildPerformanceMetrics(rows, summary),
      note
    };
  }

  private buildBranchPerformanceResult(
    rows: readonly PromotionBranchPerformanceItemDto[]
  ): PromotionReportLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.warehouseNo ?? row.branchNo)).size) },
        { label: 'Kullanim', value: formatInteger(sumBy(rows, (row) => row.usageCount)) },
        { label: 'Net Satis', value: formatMoney(sumBy(rows, (row) => row.netSalesAmount)) },
        { label: 'Marj', value: formatMoney(sumBy(rows, (row) => row.marginAmount)) }
      ]
    };
  }

  private buildPerformanceMetrics(
    rows: readonly PromotionPerformanceItemDto[],
    summary: PromotionPerformanceSummaryDto | null | undefined
  ): PromotionReportMetric[] {
    return [
      { label: 'Promosyon', value: formatInteger(summary?.promotionCount ?? rows.length) },
      { label: 'Kullanim', value: formatInteger(summary?.usageCount ?? sumBy(rows, (row) => row.usageCount)) },
      { label: 'Fis', value: formatInteger(summary?.receiptCount ?? sumBy(rows, (row) => row.receiptCount)) },
      { label: 'Net Satis', value: formatMoney(summary?.netSalesAmount ?? sumBy(rows, (row) => row.netSalesAmount)) },
      { label: 'Indirim', value: formatMoney(summary?.discountAmount ?? sumBy(rows, (row) => row.discountAmount)) },
      { label: 'Marj', value: formatMoney(summary?.marginAmount ?? sumBy(rows, (row) => row.marginAmount)) }
    ];
  }

  private buildBulletinRequest(): PromotionBulletinListHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      activeOn: this.activeOn() || null,
      onlyActive: this.onlyActive(),
      search: this.searchText().trim() || this.promotionCode().trim() || null,
      take: this.take()
    };
  }

  private buildBulletinOptionRequest(): PromotionBulletinOptionHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      activeOn: this.activeOn() || null,
      onlyActive: this.onlyActive(),
      search: this.searchText().trim() || this.promotionCode().trim() || null,
      take: 75
    };
  }

  private buildPerformanceRequest(): PromotionPerformanceHttpRequest {
    return {
      warehouseNo: this.resolveWarehouseNo(),
      startDate: this.startDate().trim() || null,
      endDate: this.endDate().trim() || null,
      promotionCode: this.promotionCode().trim() || null,
      search: this.searchText().trim() || null,
      take: this.take()
    };
  }

  private validateRequest(): boolean {
    if (this.scope() === 'manual' && !this.resolveWarehouseNo()) {
      this.failValidation('Manuel kapsam icin gecerli bir sube no girin.');
      return false;
    }

    if (this.usesDateRange()) {
      if (this.startDate().trim() && this.endDate().trim() && this.startDate().trim() > this.endDate().trim()) {
        this.failValidation('Baslangic tarihi bitis tarihinden buyuk olamaz.');
        return false;
      }
    } else if (!this.activeOn().trim()) {
      this.failValidation('Aktiflik tarihi secin.');
      return false;
    }

    return true;
  }

  private failValidation(message: string): void {
    this.rows.set([]);
    this.metrics.set([]);
    this.resultNote.set(null);
    this.errorMessage.set(message);
  }

  private resolveWarehouseNo(): number | undefined {
    if (!this.isAdminUser()) {
      return undefined;
    }

    if (this.scope() === 'manual') {
      return this.getManualWarehouseNo() ?? undefined;
    }

    if (this.scope() === 'current') {
      return getCurrentWarehouseNo(this.authService.currentUser()) ?? undefined;
    }

    return undefined;
  }

  private getManualWarehouseNo(): number | null {
    return toPositiveWarehouseNo(this.manualWarehouseNo());
  }

  private formatPerformanceDateLabel(): string {
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();

    if (!startDate && !endDate) {
      return 'Varsayilan aralik';
    }

    return `${startDate || 'endDate - 30 gun'} - ${endDate || 'Bugun'}`;
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

  private getRelativeDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().slice(0, 10);
  }
}
