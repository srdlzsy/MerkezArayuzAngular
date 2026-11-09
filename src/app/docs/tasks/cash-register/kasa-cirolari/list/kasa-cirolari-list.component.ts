import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  CashTurnoverOverviewBranchDto,
  CashTurnoverOverviewDto,
  CashTurnoverListItemDto,
  CashTurnoverRouteSource,
  CashTurnoverSource
} from '@interfaces';
import { finalize } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { formatCurrentWarehouseLabel } from '../../../core/admin-warehouse.helpers';
import { ExcelExportButtonComponent } from '../../../core/excel-export/excel-export-button.component';
import {
  ExcelExportColumn,
  ExcelExportSheet,
  exportRowsToExcel
} from '../../../core/excel-export/excel-export.utils';
import { CashTurnoverDetailDialogData } from '../kasa-cirolari.models';
import { KasaCirolariDetailComponent } from '../detail/kasa-cirolari-detail.component';

function toDateOnly(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue.includes('T')
    ? normalizedValue.split('T')[0] ?? normalizedValue
    : normalizedValue;
}

function toFixedNumber(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(digits);
}

function buildWarehouseLabel(row: CashTurnoverListItemDto): string {
  const warehouseName = row.warehouseName?.trim() ?? '';

  if (warehouseName && Number.isFinite(row.warehouseNo)) {
    return `${warehouseName} (${row.warehouseNo})`;
  }

  if (warehouseName) {
    return warehouseName;
  }

  return Number.isFinite(row.warehouseNo) ? String(row.warehouseNo) : '';
}

function getCashTurnoverGrossSalesTotal(row: CashTurnoverListItemDto): number {
  return row.grossSalesTotal ?? row.totalSalesAmount;
}

function getCashTurnoverComparisonTotal(row: CashTurnoverListItemDto): number {
  return row.comparisonTotal ?? row.totalCollectionAmount;
}

function getBranchGrossSalesTotal(row: CashTurnoverOverviewBranchDto): number {
  return row.grossSalesTotal ?? row.overallTotal;
}

function getBranchComparisonTotal(row: CashTurnoverOverviewBranchDto): number {
  return row.comparisonTotal ?? row.collectionTotal ?? row.overallTotal;
}

function getCashTurnoverSourceLabel(
  source: CashTurnoverSource | CashTurnoverRouteSource | null | undefined
): string {
  switch (source) {
    case 'old':
      return 'Eski Kasa';
    case 'total':
      return 'Toplam';
    case 'new':
    default:
      return 'Yeni Kasa';
  }
}

const CASH_TURNOVER_LIST_COLUMNS: readonly ApiListTableColumn<CashTurnoverListItemDto>[] = [
  {
    key: 'businessDate',
    label: 'Tarih',
    resolveValue: (row) => toDateOnly(row.businessDate)
  },
  {
    key: 'warehouseName',
    label: 'Depo',
    resolveValue: (row) => buildWarehouseLabel(row)
  },
  {
    key: 'source',
    label: 'Kaynak',
    resolveValue: (row) => getCashTurnoverSourceLabel(row.source)
  },
  {
    key: 'shiftNo',
    label: 'Vardiya'
  },
  {
    key: 'cashierCode',
    label: 'Kasiyer Kodu'
  },
  {
    key: 'cashierName',
    label: 'Kasiyer'
  },
  {
    key: 'productLineCount',
    label: 'Urun Satiri'
  },
  {
    key: 'totalSalesQuantity',
    label: 'Satis Miktari',
    resolveValue: (row) => toFixedNumber(row.totalSalesQuantity, 2)
  },
  {
    key: 'totalSalesAmount',
    label: 'Brut Satis',
    resolveValue: (row) => toFixedNumber(getCashTurnoverGrossSalesTotal(row), 2)
  },
  {
    key: 'comparisonTotal',
    label: 'Mutabakat',
    resolveValue: (row) => toFixedNumber(getCashTurnoverComparisonTotal(row), 2)
  },
  {
    key: 'paymentLineCount',
    label: 'Odeme Satiri'
  },
  {
    key: 'netCollectionAmount',
    label: 'Net Tahsilat',
    resolveValue: (row) => toFixedNumber(row.netCollectionAmount, 2)
  },
  {
    key: 'paymentDataMissing',
    label: 'Odeme Verisi',
    resolveValue: (row) => row.paymentDataMissing ? 'Eksik' : 'Tam'
  }
];

@Component({
  selector: 'app-kasa-cirolari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent, ExcelExportButtonComponent],
  templateUrl: './kasa-cirolari-list.component.html',
  styleUrl: './kasa-cirolari-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KasaCirolariListComponent extends ApiTaskListPageBase<
  CashTurnoverListItemDto,
  CashTurnoverDetailDialogData
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['kasa-cirolari'];
  protected readonly tableColumns = CASH_TURNOVER_LIST_COLUMNS;
  protected readonly detailComponent = KasaCirolariDetailComponent;
  protected readonly createComponent = KasaCirolariDetailComponent;
  protected override readonly canCreate = false;
  protected readonly selectedSource = signal<CashTurnoverRouteSource>('new');
  protected readonly overviewScope = signal<'all' | 'current'>('current');
  protected readonly overviewPanelOpen = signal(false);
  protected readonly overviewExporting = signal(false);
  protected readonly excelExportErrorMessage = signal<string | null>(null);

  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private overviewRequestId = 0;

  protected override readonly currentWarehouseLabel = computed(() => {
    return formatCurrentWarehouseLabel(this.authService.currentUser());
  });
  protected readonly selectedSourceLabel = computed(() =>
    getCashTurnoverSourceLabel(this.selectedSource())
  );
  protected readonly selectedDateRangeLabel = computed(() => {
    const startDate = this.startDate().trim() || 'YYYY-MM-DD';
    const endDate = this.endDate().trim() || 'YYYY-MM-DD';

    return `${startDate} - ${endDate}`;
  });
  protected readonly overview = signal<CashTurnoverOverviewDto | null>(null);
  protected readonly overviewLoading = signal(false);
  protected readonly overviewError = signal<string | null>(null);
  protected readonly newRowCount = computed(
    () => this.rows().filter((row) => row.source === 'new').length
  );
  protected readonly oldRowCount = computed(
    () => this.rows().filter((row) => row.source === 'old').length
  );
  protected readonly totalNetCollection = computed(() =>
    this.rows().reduce((total, row) => total + this.toSafeNumber(row.netCollectionAmount), 0)
  );
  protected readonly totalSalesAmount = computed(() =>
    this.rows().reduce((total, row) => total + this.toSafeNumber(getCashTurnoverGrossSalesTotal(row)), 0)
  );
  protected readonly totalComparisonAmount = computed(() =>
    this.rows().reduce((total, row) => total + this.toSafeNumber(getCashTurnoverComparisonTotal(row)), 0)
  );
  protected readonly paymentDataMissingCount = computed(() =>
    this.rows().filter((row) => row.paymentDataMissing).length
  );
  protected readonly averageNetCollection = computed(() => {
    const totalCount = this.totalCount();

    if (!totalCount) {
      return 0;
    }

    return this.totalNetCollection() / totalCount;
  });
  protected readonly totalPaymentLineCount = computed(() =>
    this.rows().reduce((total, row) => total + this.toSafeNumber(row.paymentLineCount), 0)
  );
  protected readonly salesCollectionGap = computed(() =>
    this.totalSalesAmount() - this.totalNetCollection()
  );
  protected readonly collectionRate = computed(() => {
    const salesAmount = this.totalSalesAmount();

    if (!salesAmount) {
      return 0;
    }

    return (this.totalNetCollection() / salesAmount) * 100;
  });
  protected readonly sourceDistributionLabel = computed(
    () => `${this.newRowCount()} yeni / ${this.oldRowCount()} eski`
  );
  protected readonly overviewScopeLabel = computed(() =>
    this.overviewScope() === 'all' ? 'Tum Subeler' : this.currentWarehouseLabel()
  );

  // Sıralama durumları
  protected readonly sortField = signal<'collection' | 'sales' | 'comparison' | 'gap' | 'date' | 'warehouse'>('collection');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected readonly branchSortField = signal<'sales' | 'collection' | 'comparison' | 'customer' | 'basket' | 'cash' | 'credit' | 'name'>('sales');
  protected readonly branchSortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly branchViewMode = signal<'table' | 'cards'>('table');

  protected readonly sortedRows = computed<CashTurnoverListItemDto[]>(() => {
    const list = [...this.rows()];
    const field = this.sortField();
    const isAsc = this.sortDirection() === 'asc';
    const mult = isAsc ? 1 : -1;

    return list.sort((a, b) => {
      switch (field) {
        case 'collection':
          return (this.toSafeNumber(a.netCollectionAmount) - this.toSafeNumber(b.netCollectionAmount)) * mult;
        case 'sales':
          return (this.toSafeNumber(getCashTurnoverGrossSalesTotal(a)) - this.toSafeNumber(getCashTurnoverGrossSalesTotal(b))) * mult;
        case 'comparison':
          return (this.toSafeNumber(getCashTurnoverComparisonTotal(a)) - this.toSafeNumber(getCashTurnoverComparisonTotal(b))) * mult;
        case 'gap': {
          const gapA = this.toSafeNumber(getCashTurnoverGrossSalesTotal(a)) - this.toSafeNumber(a.netCollectionAmount);
          const gapB = this.toSafeNumber(getCashTurnoverGrossSalesTotal(b)) - this.toSafeNumber(b.netCollectionAmount);
          return (gapA - gapB) * mult;
        }
        case 'date':
          return ((a.businessDate || '').localeCompare(b.businessDate || '')) * mult;
        case 'warehouse':
          return ((a.warehouseNo ?? 0) - (b.warehouseNo ?? 0)) * mult;
        default:
          return 0;
      }
    });
  });

  protected readonly sortedBranchOverviewRows = computed<CashTurnoverOverviewBranchDto[]>(() => {
    const list = [...(this.overview()?.subeCirolari ?? [])];
    const field = this.branchSortField();
    const isAsc = this.branchSortDirection() === 'asc';
    const mult = isAsc ? 1 : -1;

    return list.sort((a, b) => {
      switch (field) {
        case 'sales':
          return (this.toSafeNumber(getBranchGrossSalesTotal(a)) - this.toSafeNumber(getBranchGrossSalesTotal(b))) * mult;
        case 'collection':
          return (this.toSafeNumber(this.getBranchCollectionTotal(a)) - this.toSafeNumber(this.getBranchCollectionTotal(b))) * mult;
        case 'comparison':
          return (this.toSafeNumber(this.getBranchComparisonTotal(a)) - this.toSafeNumber(this.getBranchComparisonTotal(b))) * mult;
        case 'customer':
          return (this.toSafeNumber(a.customerCount) - this.toSafeNumber(b.customerCount)) * mult;
        case 'basket':
          return (this.toSafeNumber(a.averageBasketAmount) - this.toSafeNumber(b.averageBasketAmount)) * mult;
        case 'cash':
          return (this.toSafeNumber(a.cashTotal) - this.toSafeNumber(b.cashTotal)) * mult;
        case 'credit':
          return (this.toSafeNumber(a.creditTotal) - this.toSafeNumber(b.creditTotal)) * mult;
        case 'name':
          return ((a.branchName || '').localeCompare(b.branchName || '', 'tr')) * mult;
        default:
          return 0;
      }
    });
  });

  protected readonly branchOverviewRows = computed(() => this.sortedBranchOverviewRows());
  protected readonly branchOverviewCount = computed(() => this.sortedBranchOverviewRows().length);

  protected toggleSort(field: 'collection' | 'sales' | 'comparison' | 'gap' | 'date' | 'warehouse'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }

  protected toggleBranchSort(field: 'sales' | 'collection' | 'comparison' | 'customer' | 'basket' | 'cash' | 'credit' | 'name'): void {
    if (this.branchSortField() === field) {
      this.branchSortDirection.set(this.branchSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.branchSortField.set(field);
      this.branchSortDirection.set('desc');
    }
  }

  protected setBranchViewMode(mode: 'table' | 'cards'): void {
    this.branchViewMode.set(mode);
  }
  protected readonly overviewCashRate = computed(() => {
    const overview = this.overview();
    const dailyTotal = overview?.dailyComparisonTotal ?? overview?.dailyCollectionTotal ?? overview?.dailyTotal;

    if (!dailyTotal) {
      return 0;
    }

    return (this.toSafeNumber(overview?.dailyCashPayment) / this.toSafeNumber(dailyTotal)) * 100;
  });
  protected readonly overviewCreditRate = computed(() => {
    const overview = this.overview();
    const dailyTotal = overview?.dailyComparisonTotal ?? overview?.dailyCollectionTotal ?? overview?.dailyTotal;

    if (!dailyTotal) {
      return 0;
    }

    return (this.toSafeNumber(overview?.dailyCreditCardPayment) / this.toSafeNumber(dailyTotal)) * 100;
  });

  protected override fetchRows(_zamanlama: string, warehouseNo?: number) {
    if (this.overviewPanelOpen()) {
      this.loadOverview();
    }

    return this.kasaIslemleriService.getKasaCirolari({
      warehouseNo,
      startDate: this.startDate().trim(),
      endDate: this.endDate().trim()
    }, this.selectedSource());
  }

  protected selectSource(source: CashTurnoverRouteSource): void {
    if (this.selectedSource() === source) {
      return;
    }

    this.selectedSource.set(source);
    this.loadRows();
  }

  protected selectOverviewScope(scope: 'all' | 'current'): void {
    if (!this.isAdminUser() && scope === 'all') {
      scope = 'current';
    }

    if (this.overviewScope() === scope) {
      return;
    }

    this.overviewScope.set(scope);

    if (this.overviewPanelOpen()) {
      this.loadOverview();
    }
  }

  protected toggleOverviewPanel(): void {
    const nextOpenState = !this.overviewPanelOpen();
    this.overviewPanelOpen.set(nextOpenState);

    if (nextOpenState) {
      this.loadOverview();
    }
  }

  protected getSourcePillCount(source: CashTurnoverRouteSource): number {
    switch (source) {
      case 'old':
        return this.oldRowCount();
      case 'total':
        return this.totalCount();
      case 'new':
      default:
        return this.newRowCount();
    }
  }

  protected getDailyGrossSalesTotal(overview: CashTurnoverOverviewDto): number {
    return overview.dailyGrossSalesTotal ?? overview.dailyTotal;
  }

  protected getDailyCollectionTotal(overview: CashTurnoverOverviewDto): number {
    return overview.dailyCollectionTotal ?? overview.dailyTotal;
  }

  protected getDailyComparisonTotal(overview: CashTurnoverOverviewDto): number {
    return overview.dailyComparisonTotal ?? overview.dailyCollectionTotal ?? overview.dailyTotal;
  }

  protected getDailyPaymentDataMissingBranchCount(overview: CashTurnoverOverviewDto): number {
    return overview.dailyPaymentDataMissingBranchCount ?? 0;
  }

  protected getBranchCollectionTotal(branch: CashTurnoverOverviewBranchDto): number {
    return branch.collectionTotal ?? getBranchComparisonTotal(branch);
  }

  protected getBranchGrossSalesTotal(branch: CashTurnoverOverviewBranchDto): number {
    return getBranchGrossSalesTotal(branch);
  }

  protected getBranchComparisonTotal(branch: CashTurnoverOverviewBranchDto): number {
    return getBranchComparisonTotal(branch);
  }

  protected override getLoadingMessage(): string {
    return `${this.selectedSourceLabel()} icin secilen tarih araligindaki kasa ciro kayitlari getiriliyor.`;
  }

  protected override getEmptyMessage(): string {
    return `${this.selectedSourceLabel()} icin secilen tarih araliginda kasa ciro kaydi bulunmuyor.`;
  }

  protected override getTableFilterPlaceholder(): string {
    return 'Tarih, kaynak, depo, vardiya, kasiyer veya tutar ara';
  }

  protected getListExportFileName(): string {
    return [
      'Kasa Cirolari',
      this.selectedSourceLabel(),
      this.selectedDateRangeLabel(),
      this.selectedWarehouseLabel()
    ].join(' ');
  }

  protected async exportOverview(): Promise<void> {
    const overview = this.overview();

    if (!overview || this.overviewExporting()) {
      return;
    }

    const sheets: ExcelExportSheet<object>[] = [
      {
        sheetName: 'Gunluk Ozet',
        rows: [overview],
        columns: this.getOverviewSummaryExportColumns()
      },
      {
        sheetName: 'Sube Toplamlari',
        rows: this.branchOverviewRows(),
        columns: this.getBranchOverviewExportColumns()
      }
    ];

    this.overviewExporting.set(true);
    this.excelExportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: [
          'Kasa Ciro Ozeti',
          this.selectedSourceLabel(),
          this.selectedDateRangeLabel(),
          this.overviewScopeLabel()
        ].join(' '),
        sheets: sheets.filter((sheet) => sheet.rows.length > 0)
      });
    } catch {
      this.excelExportErrorMessage.set('Excel dosyasi olusturulamadi.');
    } finally {
      this.overviewExporting.set(false);
    }
  }

  protected override buildDetailData(row: CashTurnoverListItemDto): CashTurnoverDetailDialogData {
    return {
      summary: row,
      routeSource: this.selectedSource()
    };
  }

  protected override getTrackId(_index: number, row: CashTurnoverListItemDto): string {
    return [
      toDateOnly(row.businessDate),
      row.warehouseNo,
      row.shiftNo,
      row.cashierCode,
      row.source
    ].join('|');
  }

  protected readonly trackByBranch = (_index: number, row: CashTurnoverOverviewBranchDto): string =>
    `${row.branchNo}-${row.region}`;

  private loadOverview(): void {
    const requestId = ++this.overviewRequestId;

    this.overviewLoading.set(true);
    this.overviewError.set(null);

    this.kasaIslemleriService
      .getKasaCiroOzeti(
        {
          startDate: this.startDate().trim(),
          endDate: this.endDate().trim(),
          warehouseNo:
            this.isAdminUser() && this.overviewScope() === 'all'
              ? undefined
              : this.resolveListWarehouseNo()
        },
        this.selectedSource()
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.overviewRequestId) {
            this.overviewLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (overview: CashTurnoverOverviewDto) => {
          if (requestId !== this.overviewRequestId) {
            return;
          }

          this.overview.set(overview);
        },
        error: (error: unknown) => {
          if (requestId !== this.overviewRequestId) {
            return;
          }

          this.overview.set(null);
          this.overviewError.set(
            this.resolveHttpErrorMessage(
              error,
              'Kasa ciro ozeti getirilemedi. Tarih araligini ve kaynak secimini kontrol edin.'
            )
          );
        }
      });
  }

  private toSafeNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    return 0;
  }

  private getOverviewSummaryExportColumns(): readonly ExcelExportColumn<CashTurnoverOverviewDto>[] {
    return [
      { label: 'Kaynak', value: () => this.selectedSourceLabel() },
      { label: 'Kapsam', value: () => this.overviewScopeLabel() },
      { label: 'Tarih Araligi', value: () => this.selectedDateRangeLabel() },
      { label: 'Brut Satis', value: (row) => row.dailyGrossSalesTotal ?? row.dailyTotal, type: 'currency' },
      { label: 'Tahsilat', value: (row) => row.dailyCollectionTotal ?? row.dailyTotal, type: 'currency' },
      { label: 'Mutabakat Toplami', value: (row) => row.dailyComparisonTotal ?? row.dailyTotal, type: 'currency' },
      { label: 'Musteri', value: 'dailyCustomerCount', type: 'number' },
      { label: 'Nakit', value: 'dailyCashPayment', type: 'currency' },
      { label: 'Kredi', value: 'dailyCreditCardPayment', type: 'currency' },
      { label: 'Veresiye', value: 'dailyFuturesSalesTotal', type: 'currency' },
      { label: 'Odeme Verisi Eksik Sube', value: (row) => row.dailyPaymentDataMissingBranchCount ?? 0, type: 'number' },
      { label: 'Ort. Sepet', value: 'averageBasketAmount', type: 'currency' },
      { label: 'Nakit Orani', value: () => this.overviewCashRate(), type: 'number' },
      { label: 'Kredi Orani', value: () => this.overviewCreditRate(), type: 'number' }
    ];
  }

  private getBranchOverviewExportColumns(): readonly ExcelExportColumn<CashTurnoverOverviewBranchDto>[] {
    return [
      { label: 'Sube No', value: 'branchNo', type: 'number' },
      { label: 'Sube', value: 'branchName' },
      { label: 'Bolge', value: 'region' },
      { label: 'Musteri', value: 'customerCount', type: 'number' },
      { label: 'Son Fis', value: 'lastBillTime' },
      { label: 'Nakit', value: 'cashTotal', type: 'currency' },
      { label: 'Kredi', value: 'creditTotal', type: 'currency' },
      { label: 'Tahsilat', value: (row) => row.collectionTotal ?? getBranchComparisonTotal(row), type: 'currency' },
      { label: 'Brut Satis', value: (row) => getBranchGrossSalesTotal(row), type: 'currency' },
      { label: 'Mutabakat', value: (row) => getBranchComparisonTotal(row), type: 'currency' },
      { label: 'Veresiye', value: 'futuresSalesTotal', type: 'currency' },
      { label: 'Odeme Verisi Eksik', value: (row) => row.paymentDataMissing ? 'Evet' : 'Hayir' },
      { label: 'Ort. Sepet', value: 'averageBasketAmount', type: 'currency' }
    ];
  }
}
