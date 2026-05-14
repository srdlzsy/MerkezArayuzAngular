import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
    label: 'Satis Tutari',
    resolveValue: (row) => toFixedNumber(row.totalSalesAmount, 2)
  },
  {
    key: 'paymentLineCount',
    label: 'Odeme Satiri'
  },
  {
    key: 'netCollectionAmount',
    label: 'Net Tahsilat',
    resolveValue: (row) => toFixedNumber(row.netCollectionAmount, 2)
  }
];

@Component({
  selector: 'app-kasa-cirolari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './kasa-cirolari-list.component.html',
  styleUrl: './kasa-cirolari-list.component.scss'
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
  protected readonly overviewScope = signal<'all' | 'current'>('all');

  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);
  private overviewRequestId = 0;

  protected readonly currentWarehouseLabel = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return 'JWT deposu okunamadi';
    }

    if (user.depoIsmi?.trim() && user.depoNo !== null && user.depoNo !== undefined) {
      return `${user.depoIsmi} (${user.depoNo})`;
    }

    if (user.depoIsmi?.trim()) {
      return user.depoIsmi;
    }

    if (user.depoNo !== null && user.depoNo !== undefined) {
      return `Depo ${user.depoNo}`;
    }

    return 'JWT deposu okunamadi';
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
    this.rows().reduce((total, row) => total + this.toSafeNumber(row.totalSalesAmount), 0)
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
  protected readonly sourceDistributionLabel = computed(
    () => `${this.newRowCount()} yeni / ${this.oldRowCount()} eski`
  );
  protected readonly overviewScopeLabel = computed(() =>
    this.overviewScope() === 'all' ? 'Tum Subeler' : this.currentWarehouseLabel()
  );
  protected readonly branchOverviewRows = computed(() =>
    [...(this.overview()?.subeCirolari ?? [])].sort(
      (left, right) => this.toSafeNumber(right.overallTotal) - this.toSafeNumber(left.overallTotal)
    )
  );
  protected readonly branchOverviewCount = computed(() => this.branchOverviewRows().length);
  protected readonly overviewCashRate = computed(() => {
    const overview = this.overview();

    if (!overview?.dailyTotal) {
      return 0;
    }

    return (this.toSafeNumber(overview.dailyCashPayment) / this.toSafeNumber(overview.dailyTotal)) * 100;
  });
  protected readonly overviewCreditRate = computed(() => {
    const overview = this.overview();

    if (!overview?.dailyTotal) {
      return 0;
    }

    return (this.toSafeNumber(overview.dailyCreditCardPayment) / this.toSafeNumber(overview.dailyTotal)) * 100;
  });

  protected override fetchRows(_zamanlama: string) {
    this.loadOverview();

    return this.kasaIslemleriService.getKasaCirolari({
      warehouseNo: this.authService.currentUser()?.depoNo ?? undefined,
      startDate: this.startDate().trim(),
      endDate: this.endDate().trim()
    }, this.selectedSource());
  }

  protected override getInitialStartDate(): string {
    return this.getRelativeDate(-6);
  }

  protected selectSource(source: CashTurnoverRouteSource): void {
    if (this.selectedSource() === source) {
      return;
    }

    this.selectedSource.set(source);
    this.loadRows();
  }

  protected selectOverviewScope(scope: 'all' | 'current'): void {
    if (this.overviewScope() === scope) {
      return;
    }

    this.overviewScope.set(scope);
    this.loadOverview();
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

  protected override getLoadingMessage(): string {
    return `${this.selectedSourceLabel()} icin secilen tarih araligindaki kasa ciro kayitlari getiriliyor.`;
  }

  protected override getEmptyMessage(): string {
    return `${this.selectedSourceLabel()} icin secilen tarih araliginda kasa ciro kaydi bulunmuyor.`;
  }

  protected override getTableFilterPlaceholder(): string {
    return 'Tarih, kaynak, depo, vardiya, kasiyer veya tutar ara';
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
            this.overviewScope() === 'current'
              ? this.authService.currentUser()?.depoNo ?? undefined
              : undefined
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
}
