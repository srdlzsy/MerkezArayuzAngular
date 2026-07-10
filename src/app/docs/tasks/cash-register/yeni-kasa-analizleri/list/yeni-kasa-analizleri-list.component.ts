import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import type {
  YeniKasaAnalizHttpRequest,
  YeniKasaAnomalyItemDto,
  YeniKasaCiroOzetItemDto,
  YeniKasaFisMutabakatItemDto,
  YeniKasaKasaOzetItemDto,
  YeniKasaPaymentMethodItemDto
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';

type YeniKasaAnalizTab =
  | 'ciro-ozeti'
  | 'kasa-ozeti'
  | 'fis-mutabakat'
  | 'anomaliler'
  | 'odeme-tipleri';

type YeniKasaAnalizRow =
  | YeniKasaCiroOzetItemDto
  | YeniKasaKasaOzetItemDto
  | YeniKasaFisMutabakatItemDto
  | YeniKasaAnomalyItemDto
  | YeniKasaPaymentMethodItemDto;

interface TabDefinition {
  id: YeniKasaAnalizTab;
  label: string;
  summary: string;
}

type RowsByTab = Record<YeniKasaAnalizTab, YeniKasaAnalizRow[]>;

const EMPTY_ROWS_BY_TAB: RowsByTab = {
  'ciro-ozeti': [],
  'kasa-ozeti': [],
  'fis-mutabakat': [],
  anomaliler: [],
  'odeme-tipleri': []
};

function formatDateOnly(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '-';
  }

  return normalizedValue.includes('T')
    ? normalizedValue.split('T')[0] ?? normalizedValue
    : normalizedValue;
}

function formatDateTime(value: string | null | undefined): string {
  const normalizedValue = value?.trim() ?? '';

  if (!normalizedValue) {
    return '-';
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function buildWarehouseLabel(row: { warehouseNo?: number; warehouseName?: string }): string {
  const warehouseName = row.warehouseName?.trim() ?? '';
  const warehouseNo = row.warehouseNo;

  if (warehouseName && Number.isFinite(warehouseNo)) {
    return `${warehouseName} (${warehouseNo})`;
  }

  if (warehouseName) {
    return warehouseName;
  }

  return Number.isFinite(warehouseNo) ? String(warehouseNo) : '-';
}

const CIRO_OZETI_COLUMNS: readonly ApiListTableColumn<YeniKasaCiroOzetItemDto>[] = [
  { key: 'businessDate', label: 'Tarih', resolveValue: (row) => formatDateOnly(row.businessDate) },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => buildWarehouseLabel(row) },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'cashierCode', label: 'Kasiyer Kodu' },
  { key: 'cashierName', label: 'Kasiyer' },
  { key: 'receiptCount', label: 'Fis' },
  { key: 'saleRowCount', label: 'Satis Satiri' },
  { key: 'productLineCount', label: 'Urun Satiri' },
  { key: 'productQuantity', label: 'Miktar', resolveValue: (row) => formatNumber(row.productQuantity) },
  { key: 'saleTotal', label: 'Satis', resolveValue: (row) => formatNumber(row.saleTotal) },
  { key: 'paymentTotal', label: 'Odeme', resolveValue: (row) => formatNumber(row.paymentTotal) },
  { key: 'difference', label: 'Fark', resolveValue: (row) => formatNumber(row.difference) },
  { key: 'lastSaleAt', label: 'Son Satis', resolveValue: (row) => formatDateTime(row.lastSaleAt) }
];

const KASA_OZETI_COLUMNS: readonly ApiListTableColumn<YeniKasaKasaOzetItemDto>[] = [
  { key: 'businessDate', label: 'Tarih', resolveValue: (row) => formatDateOnly(row.businessDate) },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => buildWarehouseLabel(row) },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'receiptCount', label: 'Fis' },
  { key: 'cashierCount', label: 'Kasiyer' },
  { key: 'saleTotal', label: 'Satis', resolveValue: (row) => formatNumber(row.saleTotal) },
  { key: 'paymentTotal', label: 'Odeme', resolveValue: (row) => formatNumber(row.paymentTotal) },
  { key: 'cashTotal', label: 'Nakit', resolveValue: (row) => formatNumber(row.cashTotal) },
  { key: 'creditCardTotal', label: 'Kart', resolveValue: (row) => formatNumber(row.creditCardTotal) },
  { key: 'giftCardTotal', label: 'Yemek/Gift', resolveValue: (row) => formatNumber(row.giftCardTotal) },
  { key: 'unknownPaymentTotal', label: 'Bilinmeyen', resolveValue: (row) => formatNumber(row.unknownPaymentTotal) },
  { key: 'difference', label: 'Fark', resolveValue: (row) => formatNumber(row.difference) },
  { key: 'lastSaleAt', label: 'Son Satis', resolveValue: (row) => formatDateTime(row.lastSaleAt) }
];

const FIS_MUTABAKAT_COLUMNS: readonly ApiListTableColumn<YeniKasaFisMutabakatItemDto>[] = [
  { key: 'businessDate', label: 'Tarih', resolveValue: (row) => formatDateOnly(row.businessDate) },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => buildWarehouseLabel(row) },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'cashierCode', label: 'Kasiyer' },
  { key: 'receiptNumber', label: 'Fis No' },
  { key: 'uuid', label: 'Uuid' },
  { key: 'status', label: 'Durum', type: 'status' },
  { key: 'saleTotal', label: 'Satis', resolveValue: (row) => formatNumber(row.saleTotal) },
  { key: 'productLineTotal', label: 'Urun Toplami', resolveValue: (row) => formatNumber(row.productLineTotal) },
  { key: 'paymentTotal', label: 'Odeme', resolveValue: (row) => formatNumber(row.paymentTotal) },
  { key: 'salePaymentDifference', label: 'Odeme Farki', resolveValue: (row) => formatNumber(row.salePaymentDifference) },
  { key: 'saleLineDifference', label: 'Satir Farki', resolveValue: (row) => formatNumber(row.saleLineDifference) },
  { key: 'issues', label: 'Sorunlar', resolveValue: (row) => row.issues?.join(', ') || '-' },
  { key: 'receivedAt', label: 'Alinma', resolveValue: (row) => formatDateTime(row.receivedAt) }
];

const ANOMALI_COLUMNS: readonly ApiListTableColumn<YeniKasaAnomalyItemDto>[] = [
  { key: 'severity', label: 'Seviye', type: 'status' },
  { key: 'type', label: 'Tip' },
  { key: 'businessDate', label: 'Tarih', resolveValue: (row) => formatDateOnly(row.businessDate) },
  { key: 'warehouseName', label: 'Depo', resolveValue: (row) => buildWarehouseLabel(row) },
  { key: 'cashRegisterNo', label: 'Kasa' },
  { key: 'cashierCode', label: 'Kasiyer' },
  { key: 'receiptNumber', label: 'Fis No' },
  { key: 'saleTotal', label: 'Satis', resolveValue: (row) => formatNumber(row.saleTotal) },
  { key: 'paymentTotal', label: 'Odeme', resolveValue: (row) => formatNumber(row.paymentTotal) },
  { key: 'difference', label: 'Fark', resolveValue: (row) => formatNumber(row.difference) },
  { key: 'description', label: 'Aciklama' }
];

const ODEME_TIPI_COLUMNS: readonly ApiListTableColumn<YeniKasaPaymentMethodItemDto>[] = [
  { key: 'paymentMethodCode', label: 'Kod' },
  { key: 'paymentMethodName', label: 'Odeme Tipi' },
  { key: 'category', label: 'Kategori', type: 'status' },
  { key: 'paymentMethodId', label: 'Method Id' },
  { key: 'pavoMediator', label: 'Pavo Mediator' },
  { key: 'pavoType', label: 'Pavo Type' },
  { key: 'paymentLineCount', label: 'Satir' },
  { key: 'amount', label: 'Tutar', resolveValue: (row) => formatNumber(row.amount) },
  { key: 'isKnown', label: 'Eslesme', resolveValue: (row) => (row.isKnown ? 'Biliniyor' : 'Bilinmiyor') }
];

@Component({
  selector: 'app-yeni-kasa-analizleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ApiListTableComponent],
  templateUrl: './yeni-kasa-analizleri-list.component.html',
  styleUrl: './yeni-kasa-analizleri-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YeniKasaAnalizleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['yeni-kasa-analizleri'];
  protected readonly tabs: readonly TabDefinition[] = [
    {
      id: 'ciro-ozeti',
      label: 'Ciro Ozeti',
      summary: 'Sube, kasa ve kasiyer bazli satis/odeme mutabakati'
    },
    {
      id: 'kasa-ozeti',
      label: 'Kasa Ozeti',
      summary: 'Kasa bazli nakit, kart, yemek/gift ve bilinmeyen odeme toplamlari'
    },
    {
      id: 'fis-mutabakat',
      label: 'Fis Mutabakat',
      summary: 'Fis header, urun satiri ve odeme toplami karsilastirmasi'
    },
    {
      id: 'anomaliler',
      label: 'Anomaliler',
      summary: 'Duplicate, bilinmeyen odeme ve tutarsal sorunlar'
    },
    {
      id: 'odeme-tipleri',
      label: 'Odeme Tipleri',
      summary: 'Shopigo odeme kodu ve payment_methods eslesmeleri'
    }
  ];

  protected readonly filterForm = new FormGroup({
    startDate: new FormControl<string>(this.getRelativeDate(0), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl<string>(this.getRelativeDate(0), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(null),
    cashRegisterNo: new FormControl<string>('', { nonNullable: true }),
    cashierCode: new FormControl<string>('', { nonNullable: true }),
    take: new FormControl<number>(500, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(2000)]
    }),
    onlyProblematic: new FormControl<boolean>(false, { nonNullable: true })
  });

  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);

  protected readonly activeTab = signal<YeniKasaAnalizTab>('ciro-ozeti');
  protected readonly rowsByTab = signal<RowsByTab>({ ...EMPTY_ROWS_BY_TAB });
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);

  protected readonly activeRows = computed(() => this.rowsByTab()[this.activeTab()]);
  protected readonly activeColumns = computed<readonly ApiListTableColumn[]>(() => {
    switch (this.activeTab()) {
      case 'kasa-ozeti':
        return KASA_OZETI_COLUMNS;
      case 'fis-mutabakat':
        return FIS_MUTABAKAT_COLUMNS;
      case 'anomaliler':
        return ANOMALI_COLUMNS;
      case 'odeme-tipleri':
        return ODEME_TIPI_COLUMNS;
      case 'ciro-ozeti':
      default:
        return CIRO_OZETI_COLUMNS;
    }
  });
  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTab()) ?? this.tabs[0]
  );
  protected readonly totalSale = computed(() =>
    this.activeRows().reduce((total, row) => total + this.toSafeNumber(this.readRowNumber(row, 'saleTotal')), 0)
  );
  protected readonly totalPayment = computed(() =>
    this.activeRows().reduce((total, row) => total + this.toSafeNumber(this.readRowNumber(row, 'paymentTotal')), 0)
  );
  protected readonly totalDifference = computed(() =>
    this.activeRows().reduce((total, row) => total + this.toSafeNumber(this.readRowNumber(row, 'difference')), 0)
  );
  protected readonly problemCount = computed(() =>
    this.activeRows().filter((row) => this.isProblemRow(row)).length
  );
  protected readonly scopeLabel = computed(() => {
    const warehouseNo = this.toOptionalNumber(this.filterForm.controls.warehouseNo.value);

    if (warehouseNo) {
      return `Depo ${warehouseNo}`;
    }

    const user = this.authService.currentUser();

    if (user?.depoNo) {
      return `${user.depoIsmi || 'JWT Deposu'} (${user.depoNo})`;
    }

    return 'Genel kapsam';
  });

  constructor() {
    const warehouseNo = this.authService.currentUser()?.depoNo ?? null;

    if (warehouseNo) {
      this.filterForm.controls.warehouseNo.setValue(warehouseNo, { emitEvent: false });
    }

    this.loadRows();
  }

  protected selectTab(tab: YeniKasaAnalizTab): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);

    if (!this.rowsByTab()[tab].length && !this.isLoading()) {
      this.loadRows();
    }
  }

  protected loadRows(): void {
    const request = this.buildRequest();

    if (!request) {
      return;
    }

    const activeTab = this.activeTab();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fetchRows(activeTab, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (rows: YeniKasaAnalizRow[]) => {
          this.rowsByTab.update((currentRows) => ({
            ...currentRows,
            [activeTab]: rows ?? []
          }));
          this.lastLoadedAt.set(formatDateTime(new Date().toISOString()));
        },
        error: (error: unknown) => {
          this.rowsByTab.update((currentRows) => ({
            ...currentRows,
            [activeTab]: []
          }));
          this.errorMessage.set(
            this.getErrorMessage(error, 'Yeni kasa analiz kayitlari getirilemedi.')
          );
        }
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      startDate: this.getRelativeDate(0),
      endDate: this.getRelativeDate(0),
      warehouseNo: this.authService.currentUser()?.depoNo ?? null,
      cashRegisterNo: '',
      cashierCode: '',
      take: 500,
      onlyProblematic: false
    });
    this.rowsByTab.set({ ...EMPTY_ROWS_BY_TAB });
    this.loadRows();
  }

  protected getTabCount(tab: YeniKasaAnalizTab): number {
    return this.rowsByTab()[tab].length;
  }

  protected getSearchPlaceholder(): string {
    switch (this.activeTab()) {
      case 'odeme-tipleri':
        return 'Odeme kodu, ad veya kategori ara';
      case 'anomaliler':
        return 'Seviye, tip, fis, depo veya aciklama ara';
      case 'fis-mutabakat':
        return 'Fis no, uuid, sorun, kasa veya kasiyer ara';
      default:
        return 'Tarih, depo, kasa, kasiyer veya tutar ara';
    }
  }

  private buildRequest(): YeniKasaAnalizHttpRequest | null {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.errorMessage.set('Baslangic/bitis tarihi zorunlu; take degeri 1 ile 2000 arasinda olmalidir.');
      return null;
    }

    const formValue = this.filterForm.getRawValue();

    return {
      startDate: formValue.startDate.trim(),
      endDate: formValue.endDate.trim(),
      warehouseNo: this.toOptionalNumber(formValue.warehouseNo),
      cashRegisterNo: formValue.cashRegisterNo.trim() || null,
      cashierCode: formValue.cashierCode.trim() || null,
      take: this.toOptionalNumber(formValue.take) ?? 500,
      onlyProblematic: formValue.onlyProblematic
    };
  }

  private fetchRows(
    tab: YeniKasaAnalizTab,
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaAnalizRow[]> {
    switch (tab) {
      case 'kasa-ozeti':
        return this.kasaIslemleriService.getYeniKasaKasaOzeti(request);
      case 'fis-mutabakat':
        return this.kasaIslemleriService.getYeniKasaFisMutabakat(request);
      case 'anomaliler':
        return this.kasaIslemleriService.getYeniKasaAnomaliler(request);
      case 'odeme-tipleri':
        return this.kasaIslemleriService.getYeniKasaOdemeTipleri(request);
      case 'ciro-ozeti':
      default:
        return this.kasaIslemleriService.getYeniKasaCiroOzeti(request);
    }
  }

  private isProblemRow(row: YeniKasaAnalizRow): boolean {
    const status = this.readRowText(row, 'status').toLocaleLowerCase('tr-TR');
    const severity = this.readRowText(row, 'severity').toLocaleLowerCase('tr-TR');
    const issues = (row as Partial<YeniKasaFisMutabakatItemDto>).issues ?? [];
    const difference = this.toSafeNumber(this.readRowNumber(row, 'difference'));
    const salePaymentDifference = this.toSafeNumber(this.readRowNumber(row, 'salePaymentDifference'));
    const saleLineDifference = this.toSafeNumber(this.readRowNumber(row, 'saleLineDifference'));

    return (
      status.includes('problem') ||
      !!severity ||
      issues.length > 0 ||
      Math.abs(difference) > 0.004 ||
      Math.abs(salePaymentDifference) > 0.004 ||
      Math.abs(saleLineDifference) > 0.004
    );
  }

  private readRowText(row: YeniKasaAnalizRow, key: string): string {
    const value = (row as unknown as Record<string, unknown>)[key];

    return typeof value === 'string' ? value : '';
  }

  private readRowNumber(row: YeniKasaAnalizRow, key: string): number | null {
    const value = (row as unknown as Record<string, unknown>)[key];

    return typeof value === 'number' ? value : null;
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  private getRelativeDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
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
      const bodyMessage = body['message'] ?? body['title'] ?? body['detail'];

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
