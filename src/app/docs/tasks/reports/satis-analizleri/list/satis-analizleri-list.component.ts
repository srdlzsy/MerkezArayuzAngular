import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map } from 'rxjs';
import type {
  BankMovementAnalysisItemDto,
  BankPaymentSummaryReportDto,
  BankPaymentSummaryItemDto,
  BranchBankMovementSummaryItemDto,
  DiscountCardDetailItemDto,
  FoodCheckReportDto,
  FoodCheckReportItemDto,
  MerchantPaymentSummaryItemDto,
  MerchantPaymentSummaryReportDto,
  MissingTurnoverBranchItemDto,
  MyoSalesByBranchItemDto,
  MyoSalesReportDto,
  MyoSalesReportItemDto,
  SalesAnalysisDateRangeHttpRequest,
  ValorPaymentSummaryItemDto,
  ValorPaymentSummaryReportDto,
  ZReportBankAnalysisItemDto
} from '@interfaces';

import { RaporIslemleriService } from '../../../../../core/api/module-services/rapor-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';

type SalesAnalysisReportKey =
  | 'bank-movements'
  | 'bank-branch-summary'
  | 'bank-payment-summary'
  | 'merchant-payment-summary'
  | 'valor-payment-summary'
  | 'food-checks'
  | 'marketyo-sales'
  | 'marketyo-branch'
  | 'z-report-bank'
  | 'discount-cards'
  | 'missing-turnovers';

type SalesAnalysisScope = 'all' | 'current' | 'manual';

interface SalesAnalysisReportDefinition {
  key: SalesAnalysisReportKey;
  group: string;
  label: string;
  description: string;
  endpoint: string;
  columns: readonly ApiListTableColumn[];
}

interface SalesAnalysisMetric {
  label: string;
  value: string;
}

interface SalesAnalysisLoadResult {
  rows: readonly object[];
  metrics: readonly SalesAnalysisMetric[];
  note?: string;
}

const MONEY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const INTEGER_FORMATTER = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0
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

function toDateOnly(value: string | null | undefined): string {
  const textValue = value?.trim() ?? '';
  return textValue.includes('T') ? textValue.split('T')[0] ?? textValue : textValue;
}

function formatMoney(value: unknown): string {
  return `${MONEY_FORMATTER.format(toSafeNumber(value))} TL`;
}

function formatInteger(value: unknown): string {
  return INTEGER_FORMATTER.format(toSafeNumber(value));
}

function formatBranch(row: { branchName?: string; branchNo?: number }): string {
  const branchName = row.branchName?.trim() ?? '';

  if (branchName && Number.isFinite(row.branchNo)) {
    return `${branchName} (${row.branchNo})`;
  }

  if (branchName) {
    return branchName;
  }

  return Number.isFinite(row.branchNo) ? `Sube ${row.branchNo}` : '-';
}

function sumBy<Row>(rows: readonly Row[], selector: (row: Row) => unknown): number {
  return rows.reduce((total, row) => total + toSafeNumber(selector(row)), 0);
}

const BANK_MOVEMENT_COLUMNS: readonly ApiListTableColumn<BankMovementAnalysisItemDto>[] = [
  { key: 'date', label: 'Tarih', type: 'date' },
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'zNo', label: 'Z No' },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'bank', label: 'Banka' },
  { key: 'bankAmount', label: 'Tutar', resolveValue: (row) => formatMoney(row.bankAmount) },
  { key: 'bankingNumber', label: 'Slip' },
  { key: 'terminalId', label: 'Terminal' }
];

const BANK_BRANCH_COLUMNS: readonly ApiListTableColumn<BranchBankMovementSummaryItemDto>[] = [
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'bank', label: 'Banka' },
  { key: 'bankAmount', label: 'Tutar', resolveValue: (row) => formatMoney(row.bankAmount) },
  { key: 'bankingNumber', label: 'Slip' }
];

const BANK_PAYMENT_COLUMNS: readonly ApiListTableColumn<BankPaymentSummaryItemDto>[] = [
  { key: 'bank', label: 'Banka' },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatMoney(row.amount) },
  { key: 'slipNumber', label: 'Slip' }
];

const MERCHANT_PAYMENT_COLUMNS: readonly ApiListTableColumn<MerchantPaymentSummaryItemDto>[] = [
  { key: 'bank', label: 'Banka' },
  { key: 'merchantNo', label: 'Uye Isyeri' },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatMoney(row.amount) },
  { key: 'slipNumber', label: 'Slip' }
];

const VALOR_PAYMENT_COLUMNS: readonly ApiListTableColumn<ValorPaymentSummaryItemDto>[] = [
  { key: 'bank', label: 'Banka' },
  { key: 'valorDay', label: 'Valor Gunu' },
  { key: 'amount', label: 'Yatacak Tutar', resolveValue: (row) => formatMoney(row.amount) },
  { key: 'slipNumber', label: 'Slip' }
];

const FOOD_CHECK_COLUMNS: readonly ApiListTableColumn<FoodCheckReportItemDto>[] = [
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'metropol', label: 'Metropol', resolveValue: (row) => formatMoney(row.metropol) },
  { key: 'multinet', label: 'Multinet', resolveValue: (row) => formatMoney(row.multinet) },
  { key: 'setcard', label: 'Setcard', resolveValue: (row) => formatMoney(row.setcard) },
  { key: 'sodexoKupon', label: 'Sodexo Kupon', resolveValue: (row) => formatMoney(row.sodexoKupon) },
  { key: 'sodexoPos', label: 'Sodexo POS', resolveValue: (row) => formatMoney(row.sodexoPos) },
  { key: 'ticketKupon', label: 'Ticket Kupon', resolveValue: (row) => formatMoney(row.ticketKupon) },
  { key: 'ticketPos', label: 'Ticket POS', resolveValue: (row) => formatMoney(row.ticketPos) },
  { key: 'total', label: 'Toplam', resolveValue: (row) => formatMoney(row.total) }
];

const MARKETYO_COLUMNS: readonly ApiListTableColumn<MyoSalesReportItemDto>[] = [
  { key: 'documentDate', label: 'Tarih', type: 'date' },
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'documentNo', label: 'Belge No' },
  { key: 'customerCode', label: 'Cari Kod' },
  { key: 'paymentDescription', label: 'Odeme' },
  { key: 'subTotal', label: 'Ara Toplam', resolveValue: (row) => formatMoney(row.subTotal) },
  { key: 'discountTotal', label: 'Indirim', resolveValue: (row) => formatMoney(row.discountTotal) },
  { key: 'netAmount', label: 'Net', resolveValue: (row) => formatMoney(row.netAmount) },
  { key: 'totalTax', label: 'KDV', resolveValue: (row) => formatMoney(row.totalTax) },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatMoney(row.amount) }
];

const MARKETYO_BRANCH_COLUMNS: readonly ApiListTableColumn<MyoSalesByBranchItemDto>[] = [
  { key: 'documentDate', label: 'Tarih', resolveValue: (row) => toDateOnly(row.documentDate) },
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatMoney(row.amount) }
];

const Z_REPORT_BANK_COLUMNS: readonly ApiListTableColumn<ZReportBankAnalysisItemDto>[] = [
  { key: 'date', label: 'Tarih', type: 'date' },
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'zNo', label: 'Z No' },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'bank', label: 'Banka' },
  { key: 'bankAmount', label: 'Tutar', resolveValue: (row) => formatMoney(row.bankAmount) },
  { key: 'bankingNumber', label: 'Slip' },
  { key: 'terminalId', label: 'Terminal' },
  { key: 'merchantNo', label: 'Merchant' }
];

const DISCOUNT_CARD_COLUMNS: readonly ApiListTableColumn<DiscountCardDetailItemDto>[] = [
  { key: 'cardNumber', label: 'Kart No' },
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'usageCount', label: 'Kullanim' },
  { key: 'usageTotal', label: 'Tutar', resolveValue: (row) => formatMoney(row.usageTotal) }
];

const MISSING_TURNOVER_COLUMNS: readonly ApiListTableColumn<MissingTurnoverBranchItemDto>[] = [
  { key: 'branchName', label: 'Sube', resolveValue: (row) => formatBranch(row) },
  { key: 'region', label: 'Bolge' }
];

const REPORT_DEFINITIONS: readonly SalesAnalysisReportDefinition[] = [
  {
    key: 'bank-movements',
    group: 'Banka',
    label: 'Banka Hareketleri',
    description: 'Z no, sube, kasa, banka ve terminal bazinda banka odemeleri.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/banka-hareketleri',
    columns: BANK_MOVEMENT_COLUMNS
  },
  {
    key: 'bank-branch-summary',
    group: 'Banka',
    label: 'Sube Banka Ozeti',
    description: 'Banka hareketlerini sube ve banka bazinda toplar.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/banka-hareketleri/sube',
    columns: BANK_BRANCH_COLUMNS
  },
  {
    key: 'bank-payment-summary',
    group: 'Banka',
    label: 'Banka Odeme Ozeti',
    description: 'Banka adina gore toplam tutar ve slip sayisi.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/banka',
    columns: BANK_PAYMENT_COLUMNS
  },
  {
    key: 'merchant-payment-summary',
    group: 'Banka',
    label: 'Merchant Ozeti',
    description: 'Banka ve uye isyeri no bazinda odeme toplamlarini verir.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/merchant',
    columns: MERCHANT_PAYMENT_COLUMNS
  },
  {
    key: 'valor-payment-summary',
    group: 'Banka',
    label: 'Valor Ozeti',
    description: 'Banka ve valor gunu bazinda yatacak tutarlari gosterir.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/banka-odeme-ozetleri/valor',
    columns: VALOR_PAYMENT_COLUMNS
  },
  {
    key: 'food-checks',
    group: 'Yemek',
    label: 'Yemek Cekleri',
    description: 'Metropol, Multinet, Setcard, Sodexo ve Ticket tutarlari.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/yemek-cekleri',
    columns: FOOD_CHECK_COLUMNS
  },
  {
    key: 'marketyo-sales',
    group: 'MarketYo',
    label: 'MarketYo Satislari',
    description: 'MYO seri evraklarinin belge ve odeme kirilimi.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/marketyo-satislari',
    columns: MARKETYO_COLUMNS
  },
  {
    key: 'marketyo-branch',
    group: 'MarketYo',
    label: 'MarketYo Sube Ozeti',
    description: 'MarketYo satislarini sube ve tarih bazinda toplar.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/marketyo-satislari/sube',
    columns: MARKETYO_BRANCH_COLUMNS
  },
  {
    key: 'z-report-bank',
    group: 'Kontrol',
    label: 'Z Rapor Banka Analizi',
    description: 'Z rapor banka detaylari ve merchant eslesmeleri.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/z-rapor-banka-analizi',
    columns: Z_REPORT_BANK_COLUMNS
  },
  {
    key: 'discount-cards',
    group: 'Kontrol',
    label: 'Indirim Kartlari',
    description: 'Kart numarasi ve sube bazinda kullanim adedi/tutari.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/indirim-kartlari',
    columns: DISCOUNT_CARD_COLUMNS
  },
  {
    key: 'missing-turnovers',
    group: 'Kontrol',
    label: 'Eksik Cirolar',
    description: 'Secilen tarih araliginda TurnoverTotals kaydi olmayan aktif subeler.',
    endpoint: '/api/rapor-islemleri/satis-analizleri/eksik-cirolar',
    columns: MISSING_TURNOVER_COLUMNS
  }
];

@Component({
  selector: 'app-satis-analizleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './satis-analizleri-list.component.html',
  styleUrl: './satis-analizleri-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SatisAnalizleriListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES['satis-analizleri'];
  protected readonly reportDefinitions = REPORT_DEFINITIONS;
  protected readonly selectedReport = signal<SalesAnalysisReportKey>('bank-movements');
  protected readonly startDate = signal(this.getRelativeDate(-6));
  protected readonly endDate = signal(this.getToday());
  protected readonly scope = signal<SalesAnalysisScope>('all');
  protected readonly manualWarehouseNo = signal('');
  protected readonly rows = signal<readonly object[]>([]);
  protected readonly metrics = signal<readonly SalesAnalysisMetric[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);
  protected readonly resultNote = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly raporIslemleriService = inject(RaporIslemleriService);
  private activeRequestId = 0;

  protected readonly selectedDefinition = computed(
    () =>
      this.reportDefinitions.find((report) => report.key === this.selectedReport()) ??
      this.reportDefinitions[0]
  );
  protected readonly tableColumns = computed(() => this.selectedDefinition().columns);
  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly selectedDateRangeLabel = computed(
    () => `${this.startDate() || 'YYYY-MM-DD'} - ${this.endDate() || 'YYYY-MM-DD'}`
  );
  protected readonly currentWarehouseLabel = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return 'Aktif depo okunamadi';
    }

    if (user.depoIsmi?.trim() && user.depoNo !== null && user.depoNo !== undefined) {
      return `${user.depoIsmi} (${user.depoNo})`;
    }

    if (user.depoNo !== null && user.depoNo !== undefined) {
      return `Depo ${user.depoNo}`;
    }

    return 'Aktif depo okunamadi';
  });
  protected readonly scopeLabel = computed(() => {
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
  protected readonly requestPreview = computed(() => {
    const request = this.buildRequest();
    const query = new URLSearchParams({
      startDate: request.startDate || 'YYYY-MM-DD',
      endDate: request.endDate || 'YYYY-MM-DD'
    });

    if (request.warehouseNo) {
      query.set('warehouseNo', String(request.warehouseNo));
    }

    return `${this.selectedDefinition().endpoint}?${query.toString()}`;
  });

  ngOnInit(): void {
    this.loadRows();
  }

  protected selectReport(reportKey: SalesAnalysisReportKey): void {
    if (this.selectedReport() === reportKey) {
      return;
    }

    this.selectedReport.set(reportKey);
    this.rows.set([]);
    this.metrics.set([]);
    this.resultNote.set(null);
    this.loadRows();
  }

  protected selectScope(scope: SalesAnalysisScope): void {
    if (this.scope() === scope) {
      return;
    }

    this.scope.set(scope);

    if (scope !== 'manual' || this.getManualWarehouseNo()) {
      this.loadRows();
    }
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

  protected loadRows(): void {
    if (!this.validateRequest()) {
      return;
    }

    const requestId = ++this.activeRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.resultNote.set(null);

    this.fetchSelectedReport(this.buildRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (result: SalesAnalysisLoadResult) => {
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
          this.errorMessage.set(
            this.getErrorMessage(error, `${this.selectedDefinition().label} raporu yuklenemedi.`)
          );
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
      timeStyle: 'short'
    }).format(date);
  }

  protected readonly trackByReport = (
    _index: number,
    report: SalesAnalysisReportDefinition
  ): string => report.key;

  protected readonly trackByMetric = (_index: number, metric: SalesAnalysisMetric): string =>
    metric.label;

  private fetchSelectedReport(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<SalesAnalysisLoadResult> {
    switch (this.selectedReport()) {
      case 'bank-branch-summary':
        return this.raporIslemleriService
          .getBankaHareketleriSubeOzeti(request)
          .pipe(
            map((rows: BranchBankMovementSummaryItemDto[]) =>
              this.buildBankBranchResult(rows ?? [])
            )
          );
      case 'bank-payment-summary':
        return this.raporIslemleriService
          .getBankaOdemeOzeti(request)
          .pipe(
            map((report: BankPaymentSummaryReportDto) =>
              this.buildPaymentSummaryResult(report?.items ?? [], report?.totalAmount, report?.totalSlipNumber)
            )
          );
      case 'merchant-payment-summary':
        return this.raporIslemleriService
          .getMerchantOdemeOzeti(request)
          .pipe(
            map((report: MerchantPaymentSummaryReportDto) =>
              this.buildPaymentSummaryResult(report?.items ?? [], report?.totalAmount, report?.totalSlipNumber)
            )
          );
      case 'valor-payment-summary':
        return this.raporIslemleriService
          .getValorOdemeOzeti(request)
          .pipe(
            map((report: ValorPaymentSummaryReportDto) =>
              this.buildPaymentSummaryResult(report?.items ?? [], report?.totalAmount, report?.totalSlipNumber)
            )
          );
      case 'food-checks':
        return this.raporIslemleriService
          .getYemekCekleri(request)
          .pipe(map((report: FoodCheckReportDto) => this.buildFoodCheckResult(report)));
      case 'marketyo-sales':
        return this.raporIslemleriService
          .getMarketYoSatislari(request)
          .pipe(map((report: MyoSalesReportDto) => this.buildMarketYoResult(report)));
      case 'marketyo-branch':
        return this.raporIslemleriService
          .getMarketYoSatislariSubeOzeti(request)
          .pipe(
            map((rows: MyoSalesByBranchItemDto[]) =>
              this.buildMarketYoBranchResult(rows ?? [])
            )
          );
      case 'z-report-bank':
        return this.raporIslemleriService
          .getZRaporBankaAnalizi(request)
          .pipe(
            map((rows: ZReportBankAnalysisItemDto[]) =>
              this.buildZReportBankResult(rows ?? [])
            )
          );
      case 'discount-cards':
        return this.raporIslemleriService
          .getIndirimKartlari(request)
          .pipe(
            map((rows: DiscountCardDetailItemDto[]) =>
              this.buildDiscountCardResult(rows ?? [])
            )
          );
      case 'missing-turnovers':
        return this.raporIslemleriService
          .getEksikCirolar(request)
          .pipe(
            map((rows: MissingTurnoverBranchItemDto[]) =>
              this.buildMissingTurnoverResult(rows ?? [])
            )
          );
      case 'bank-movements':
      default:
        return this.raporIslemleriService
          .getBankaHareketleri(request)
          .pipe(
            map((rows: BankMovementAnalysisItemDto[]) =>
              this.buildBankMovementResult(rows ?? [])
            )
          );
    }
  }

  private buildBankMovementResult(rows: readonly BankMovementAnalysisItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Banka Toplami', value: formatMoney(sumBy(rows, (row) => row.bankAmount)) },
        { label: 'Slip', value: formatInteger(sumBy(rows, (row) => row.bankingNumber)) },
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.branchNo)).size) },
        { label: 'Kayit', value: formatInteger(rows.length) }
      ]
    };
  }

  private buildBankBranchResult(rows: readonly BranchBankMovementSummaryItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Banka Toplami', value: formatMoney(sumBy(rows, (row) => row.bankAmount)) },
        { label: 'Slip', value: formatInteger(sumBy(rows, (row) => row.bankingNumber)) },
        { label: 'Banka', value: formatInteger(new Set(rows.map((row) => row.bank)).size) },
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.branchNo)).size) }
      ]
    };
  }

  private buildPaymentSummaryResult(
    rows: readonly (BankPaymentSummaryItemDto | MerchantPaymentSummaryItemDto | ValorPaymentSummaryItemDto)[],
    totalAmount: unknown,
    totalSlipNumber: unknown
  ): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Toplam Tutar', value: formatMoney(totalAmount) },
        { label: 'Toplam Slip', value: formatInteger(totalSlipNumber) },
        { label: 'Banka', value: formatInteger(new Set(rows.map((row) => row.bank)).size) },
        { label: 'Satir', value: formatInteger(rows.length) }
      ]
    };
  }

  private buildFoodCheckResult(report: FoodCheckReportDto | null | undefined): SalesAnalysisLoadResult {
    const rows = report?.items ?? [];
    const totals = report?.totals;

    return {
      rows,
      metrics: [
        { label: 'Genel Toplam', value: formatMoney(totals?.total) },
        { label: 'Metropol', value: formatMoney(totals?.metropol) },
        { label: 'Multinet', value: formatMoney(totals?.multinet) },
        { label: 'Ticket', value: formatMoney(toSafeNumber(totals?.ticketKupon) + toSafeNumber(totals?.ticketPos)) }
      ],
      note: 'Yemek ceki tekil toplam endpointleri servis katmaninda ayrica hazir.'
    };
  }

  private buildMarketYoResult(report: MyoSalesReportDto | null | undefined): SalesAnalysisLoadResult {
    return {
      rows: report?.items ?? [],
      metrics: [
        { label: 'Toplam Tutar', value: formatMoney(report?.amountTotal) },
        { label: 'Net Tutar', value: formatMoney(report?.netAmountTotal) },
        { label: 'KDV', value: formatMoney(report?.totalTaxTotal) },
        { label: 'Kapida Kredi', value: formatMoney(report?.doorCreditCardTotal) }
      ]
    };
  }

  private buildMarketYoBranchResult(rows: readonly MyoSalesByBranchItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Toplam Tutar', value: formatMoney(sumBy(rows, (row) => row.amount)) },
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.branchNo)).size) },
        { label: 'Gun', value: formatInteger(new Set(rows.map((row) => toDateOnly(row.documentDate))).size) },
        { label: 'Satir', value: formatInteger(rows.length) }
      ]
    };
  }

  private buildZReportBankResult(rows: readonly ZReportBankAnalysisItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Banka Toplami', value: formatMoney(sumBy(rows, (row) => row.bankAmount)) },
        { label: 'Slip', value: formatInteger(sumBy(rows, (row) => row.bankingNumber)) },
        { label: 'Z Rapor', value: formatInteger(new Set(rows.map((row) => `${row.branchNo}-${row.zNo}`)).size) },
        { label: 'Terminal', value: formatInteger(new Set(rows.map((row) => row.terminalId)).size) }
      ]
    };
  }

  private buildDiscountCardResult(rows: readonly DiscountCardDetailItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Kullanim Tutar', value: formatMoney(sumBy(rows, (row) => row.usageTotal)) },
        { label: 'Kullanim', value: formatInteger(sumBy(rows, (row) => row.usageCount)) },
        { label: 'Kart', value: formatInteger(new Set(rows.map((row) => row.cardNumber)).size) },
        { label: 'Sube', value: formatInteger(new Set(rows.map((row) => row.branchNo)).size) }
      ]
    };
  }

  private buildMissingTurnoverResult(rows: readonly MissingTurnoverBranchItemDto[]): SalesAnalysisLoadResult {
    return {
      rows,
      metrics: [
        { label: 'Eksik Sube', value: formatInteger(rows.length) },
        { label: 'Bolge', value: formatInteger(new Set(rows.map((row) => row.region)).size) },
        { label: 'Tarih Araligi', value: this.selectedDateRangeLabel() },
        { label: 'Kapsam', value: this.scopeLabel() }
      ]
    };
  }

  private validateRequest(): boolean {
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();

    if (!startDate || !endDate) {
      this.rows.set([]);
      this.metrics.set([]);
      this.errorMessage.set('Rapor icin baslangic ve bitis tarihi secin.');
      return false;
    }

    if (startDate > endDate) {
      this.rows.set([]);
      this.metrics.set([]);
      this.errorMessage.set('Baslangic tarihi bitis tarihinden buyuk olamaz.');
      return false;
    }

    if (this.scope() === 'manual' && !this.getManualWarehouseNo()) {
      this.rows.set([]);
      this.metrics.set([]);
      this.errorMessage.set('Manuel sube kapsaminda gecerli bir sube no girin.');
      return false;
    }

    return true;
  }

  private buildRequest(): SalesAnalysisDateRangeHttpRequest {
    return {
      startDate: this.startDate().trim(),
      endDate: this.endDate().trim(),
      warehouseNo: this.resolveWarehouseNo()
    };
  }

  private resolveWarehouseNo(): number | undefined {
    if (this.scope() === 'current') {
      return this.authService.currentUser()?.depoNo ?? undefined;
    }

    if (this.scope() === 'manual') {
      return this.getManualWarehouseNo() ?? undefined;
    }

    return undefined;
  }

  private getManualWarehouseNo(): number | null {
    const parsedValue = Number(this.manualWarehouseNo());

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getRelativeDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().slice(0, 10);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }

    const httpError = error as { error?: unknown; message?: unknown };

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error;
    }

    if (typeof httpError.error === 'object' && httpError.error !== null) {
      const body = httpError.error as Record<string, unknown>;
      const bodyMessage = body['detail'] ?? body['message'] ?? body['title'];

      if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
        return bodyMessage;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message;
    }

    return fallback;
  }
}
