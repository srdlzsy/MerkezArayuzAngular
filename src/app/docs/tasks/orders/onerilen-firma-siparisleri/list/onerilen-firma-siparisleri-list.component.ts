import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  ConvertSuggestedCompanyOrderHttpRequest,
  CreateIssuedCompanyOrderResponse,
  CustomerLookupItemDto,
  SuggestedCompanyOrderListItemDto
} from '@interfaces';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

interface SuggestedCompanyLineState {
  item: SuggestedCompanyOrderListItemDto;
  selected: boolean;
  quantity: number;
}

interface PageFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

@Component({
  selector: 'app-onerilen-firma-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onerilen-firma-siparisleri-list.component.html',
  styleUrl: '../../_suggested-orders-page.scss'
})
export class OnerilenFirmaSiparisleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['onerilen-firma-siparisleri'];
  private readonly aramaService = inject(AramaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly today = formatDateOnly(new Date());
  private requestId = 0;
  private supplierRequestId = 0;

  protected readonly filterForm = new FormGroup({
    supplierCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)]
    }),
    lookbackDays: new FormControl<number>(43, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(365)]
    }),
    fallbackRecommendedDay: new FormControl<number>(7, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(60)]
    }),
    orderDate: new FormControl<string>(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    deliveryDate: new FormControl<string>(this.today, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    description1: new FormControl<string>('Onerilen siparisten olustu', {
      nonNullable: true,
      validators: [Validators.maxLength(250)]
    }),
    description2: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)]
    }),
    deliverer: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    }),
    receiver: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    })
  });
  protected readonly supplierQuery = new FormControl<string>('', { nonNullable: true });

  protected readonly lines = signal<SuggestedCompanyLineState[]>([]);
  protected readonly supplierResults = signal<CustomerLookupItemDto[]>([]);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly convertFeedback = signal<PageFeedback | null>(null);
  protected readonly supplierFeedback = signal<string>('');
  protected readonly isLoading = signal(false);
  protected readonly isSupplierLoading = signal(false);
  protected readonly isConverting = signal(false);
  protected readonly isConvertDialogOpen = signal(false);
  protected readonly lastResponse = signal<CreateIssuedCompanyOrderResponse | null>(null);

  protected readonly selectedLines = computed(() => this.lines().filter((line) => line.selected));
  protected readonly selectedCount = computed(() => this.selectedLines().length);
  protected readonly totalSuggested = computed(() =>
    this.lines().reduce((total, line) => total + this.safeNumber(line.item.suggestedOrderQuantity), 0)
  );
  protected readonly totalNeed = computed(() =>
    this.lines().reduce((total, line) => total + this.safeNumber(line.item.needQuantity), 0)
  );
  protected readonly selectedQuantity = computed(() =>
    this.selectedLines().reduce((total, line) => total + this.safeNumber(line.quantity), 0)
  );
  protected readonly selectedAmount = computed(() =>
    this.selectedLines().reduce(
      (total, line) => total + this.safeNumber(line.quantity) * this.safeNumber(line.item.purchasePrice),
      0
    )
  );
  protected readonly selectedSupplierCodes = computed(() => {
    const codes = new Set<string>();

    for (const line of this.selectedLines()) {
      const supplierCode = line.item.supplierCode?.trim();

      if (supplierCode) {
        codes.add(supplierCode);
      }
    }

    return Array.from(codes).sort((left, right) => left.localeCompare(right, 'tr'));
  });
  protected readonly requestPath = computed(() => {
    const formValue = this.filterForm.getRawValue();
    const supplierCode = formValue.supplierCode.trim() || '...';
    const params = [`SupplierCode=${encodeURIComponent(supplierCode)}`];

    params.push(`LookbackDays=${formValue.lookbackDays}`);
    params.push(`FallbackRecommendedDay=${formValue.fallbackRecommendedDay}`);

    return `/api/siparis-islemleri/onerilen-firma-siparisleri?${params.join('&')}`;
  });

  constructor() {
    this.feedback.set({
      tone: 'info',
      title: 'Tedarikci secin',
      message: 'Onerilen firma siparislerini listelemek icin once firma/tedarikci kodu secilmelidir.'
    });
  }

  protected searchSupplier(): void {
    const query = this.supplierQuery.value.trim();

    this.supplierResults.set([]);
    this.supplierFeedback.set('');

    if (query.length < 2) {
      this.supplierFeedback.set('Tedarikci aramak icin en az 2 karakter girin.');
      return;
    }

    const requestId = ++this.supplierRequestId;
    this.isSupplierLoading.set(true);

    this.aramaService
      .searchCustomerAccount(query, 20)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.supplierRequestId) {
            this.isSupplierLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (results: CustomerLookupItemDto[]) => {
          if (requestId !== this.supplierRequestId) {
            return;
          }

          this.supplierResults.set(results ?? []);

          if (!results?.length) {
            this.supplierFeedback.set('Aramaya uygun tedarikci bulunamadi.');
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.supplierRequestId) {
            return;
          }

          this.supplierFeedback.set(this.resolveErrorMessage(error, 'Tedarikci aramasi yapilamadi.'));
        }
      });
  }

  protected selectSupplier(supplier: CustomerLookupItemDto): void {
    this.filterForm.controls.supplierCode.setValue(supplier.customerCode ?? '');
    this.supplierQuery.setValue(this.getSupplierLabel(supplier));
    this.supplierResults.set([]);
    this.supplierFeedback.set('');
  }

  protected loadSuggestions(): void {
    this.lastResponse.set(null);
    this.convertFeedback.set(null);

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Tedarikci gerekli',
        message: 'Firma siparisi onerileri firma bazli calisir; SupplierCode zorunludur.'
      });
      return;
    }

    const requestId = ++this.requestId;
    const formValue = this.filterForm.getRawValue();

    this.isLoading.set(true);
    this.feedback.set(null);

    this.siparisIslemleriService
      .listSuggestedCompanyOrders({
        supplierCode: formValue.supplierCode.trim(),
        lookbackDays: formValue.lookbackDays,
        fallbackRecommendedDay: formValue.fallbackRecommendedDay
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.requestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (items: SuggestedCompanyOrderListItemDto[]) => {
          if (requestId !== this.requestId) {
            return;
          }

          this.lines.set(
            (items ?? []).map((item) => ({
              item,
              selected: this.safeNumber(item.suggestedOrderQuantity) > 0,
              quantity: this.safeNumber(item.suggestedOrderQuantity)
            }))
          );

          if (!items?.length) {
            this.feedback.set({
              tone: 'info',
              title: 'Oneri bulunamadi',
              message: 'Secilen filtrelerle firma siparisi onerisi donmedi.'
            });
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) {
            return;
          }

          this.lines.set([]);
          this.feedback.set({
            tone: 'error',
            title: 'Liste yuklenemedi',
            message: this.resolveErrorMessage(error, 'Onerilen firma siparisleri alinamadi.')
          });
        }
      });
  }

  protected openConvertDialog(): void {
    this.lastResponse.set(null);
    this.convertFeedback.set(null);

    const selectedLines = this.selectedLines().filter((line) => this.safeNumber(line.quantity) > 0);
    const supplierCode = this.resolveConvertSupplierCode(selectedLines);

    if (!selectedLines.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Satir secilmedi',
        message: 'Siparise cevirmek icin en az bir satir secin.'
      });
      return;
    }

    if (!supplierCode) {
      this.feedback.set({
        tone: 'error',
        title: 'Tedarikci belirsiz',
        message: 'Siparise cevrilecek satirlar tek tedarikciye ait olmalidir.'
      });
      return;
    }

    this.isConvertDialogOpen.set(true);
  }

  protected closeConvertDialog(): void {
    if (this.isConverting()) {
      return;
    }

    this.isConvertDialogOpen.set(false);
    this.convertFeedback.set(null);
  }

  protected convertToOrder(): void {
    if (this.isConverting()) {
      return;
    }

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.convertFeedback.set({
        tone: 'error',
        title: 'Siparis bilgisi eksik',
        message: 'Siparis tarihi, teslim tarihi ve aciklama alanlarini kontrol edin.'
      });
      return;
    }

    const selectedLines = this.selectedLines().filter((line) => this.safeNumber(line.quantity) > 0);
    const supplierCode = this.resolveConvertSupplierCode(selectedLines);

    if (!selectedLines.length) {
      this.convertFeedback.set({
        tone: 'error',
        title: 'Satir secilmedi',
        message: 'Siparise cevirmek icin en az bir satir secin.'
      });
      return;
    }

    if (!supplierCode) {
      this.convertFeedback.set({
        tone: 'error',
        title: 'Tedarikci belirsiz',
        message: 'Siparise cevrilecek satirlar tek tedarikciye ait olmalidir.'
      });
      return;
    }

    const request = this.buildConvertRequest(supplierCode, selectedLines);

    this.isConverting.set(true);
    this.convertFeedback.set(null);
    this.lastResponse.set(null);

    this.siparisIslemleriService
      .convertSuggestedCompanyOrder(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isConverting.set(false))
      )
      .subscribe({
        next: (response: CreateIssuedCompanyOrderResponse) => {
          this.lastResponse.set(response);
          this.convertFeedback.set({
            tone: 'success',
            title: 'Siparis olustu',
            message: `${response.documentSerie}-${response.documentOrderNo} belge no ile ${response.lineCount} satir kaydedildi.`
          });
          this.feedback.set({
            tone: 'success',
            title: 'Siparis olustu',
            message: `${response.documentSerie}-${response.documentOrderNo} belge no ile ${response.lineCount} satir kaydedildi.`
          });
        },
        error: (error: unknown) => {
          this.convertFeedback.set({
            tone: 'error',
            title: 'Siparis olusturulamadi',
            message: this.resolveErrorMessage(error, 'Oneriler siparise cevrilirken hata olustu.')
          });
        }
      });
  }

  protected setLineSelected(stockCode: string, supplierCode: string, selected: boolean): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.item.stockCode === stockCode && line.item.supplierCode === supplierCode
          ? { ...line, selected }
          : line
      )
    );
  }

  protected updateQuantity(stockCode: string, supplierCode: string, value: string): void {
    const quantity = Math.max(0, Number(value) || 0);
    this.lines.update((lines) =>
      lines.map((line) =>
        line.item.stockCode === stockCode && line.item.supplierCode === supplierCode
          ? { ...line, quantity }
          : line
      )
    );
  }

  protected selectAll(): void {
    this.lines.update((lines) =>
      lines.map((line) => ({
        ...line,
        selected: this.safeNumber(line.quantity) > 0
      }))
    );
  }

  protected clearSelection(): void {
    this.lines.update((lines) => lines.map((line) => ({ ...line, selected: false })));
  }

  protected getSupplierLabel(supplier: CustomerLookupItemDto): string {
    const displayName =
      supplier.customerDisplayName?.trim() ||
      supplier.customerName?.trim() ||
      supplier.customerTitle?.trim() ||
      'Tedarikci';

    return `${supplier.customerCode} - ${displayName}`;
  }

  protected formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 2
    }).format(this.safeNumber(value));
  }

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2
    }).format(this.safeNumber(value));
  }

  protected readonly trackByLine = (_index: number, line: SuggestedCompanyLineState): string =>
    `${line.item.supplierCode}-${line.item.stockCode || _index}`;

  protected readonly trackBySupplier = (_index: number, supplier: CustomerLookupItemDto): string =>
    supplier.customerCode || `${_index}`;

  private resolveConvertSupplierCode(selectedLines: SuggestedCompanyLineState[]): string {
    const explicitSupplierCode = this.filterForm.controls.supplierCode.value.trim();

    if (explicitSupplierCode) {
      return explicitSupplierCode;
    }

    const supplierCodes = Array.from(
      new Set(
        selectedLines
          .map((line) => line.item.supplierCode?.trim())
          .filter((value): value is string => !!value)
      )
    );

    return supplierCodes.length === 1 ? supplierCodes[0] : '';
  }

  private buildConvertRequest(
    supplierCode: string,
    selectedLines: SuggestedCompanyLineState[]
  ): ConvertSuggestedCompanyOrderHttpRequest {
    const formValue = this.filterForm.getRawValue();

    return {
      supplierCode,
      orderDate: formValue.orderDate,
      deliveryDate: formValue.deliveryDate,
      description1: formValue.description1.trim(),
      description2: formValue.description2.trim(),
      deliverer: formValue.deliverer.trim(),
      receiver: formValue.receiver.trim(),
      lines: selectedLines.map((line) => ({
        stockCode: line.item.stockCode,
        quantity: this.safeNumber(line.quantity),
        recommendedQuantity: this.safeNumber(line.item.suggestedOrderQuantity),
        unitPrice: this.safeNumber(line.item.purchasePrice),
        unitPointer: 1,
        description1: '',
        description2: '',
        packageCode: '',
        projectCode: '',
        customerResponsibilityCenter: '',
        productResponsibilityCenter: ''
      }))
    };
  }

  private safeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (typeof error.error === 'object' && error.error !== null) {
        const body = error.error as Record<string, unknown>;
        const message = body['detail'] ?? body['message'] ?? body['title'];

        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    return fallback;
  }
}
