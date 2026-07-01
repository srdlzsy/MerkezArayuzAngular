import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  ConvertSuggestedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  SuggestedWarehouseOrderListItemDto
} from '@interfaces';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';

interface SuggestedWarehouseLineState {
  item: SuggestedWarehouseOrderListItemDto;
  selected: boolean;
  quantity: number;
}

interface PageFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

@Component({
  selector: 'app-onerilen-depo-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onerilen-depo-siparisleri-list.component.html',
  styleUrl: '../../_suggested-orders-page.scss'
})
export class OnerilenDepoSiparisleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['onerilen-depo-siparisleri'];
  private readonly destroyRef = inject(DestroyRef);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);
  private readonly today = formatDateOnly(new Date());
  private requestId = 0;

  protected readonly filterForm = new FormGroup({
    sourceWarehouseNo: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)]
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
    description: new FormControl<string>('Onerilen siparisten olustu', {
      nonNullable: true,
      validators: [Validators.maxLength(250)]
    })
  });

  protected readonly lines = signal<SuggestedWarehouseLineState[]>([]);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isConverting = signal(false);
  protected readonly lastResponse = signal<CreateIssuedWarehouseOrderResponse | null>(null);

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
  protected readonly requestPath = computed(() => {
    const formValue = this.filterForm.getRawValue();
    const sourceWarehouseNo = formValue.sourceWarehouseNo ?? '...';
    const params = [`SourceWarehouseNo=${sourceWarehouseNo}`];

    params.push(`LookbackDays=${formValue.lookbackDays}`);
    params.push(`FallbackRecommendedDay=${formValue.fallbackRecommendedDay}`);

    return `/api/siparis-islemleri/onerilen-depo-siparisleri?${params.join('&')}`;
  });

  constructor() {
    this.loadSuggestions();
  }

  protected loadSuggestions(): void {
    this.lastResponse.set(null);

    if (this.filterForm.controls.sourceWarehouseNo.invalid) {
      this.filterForm.controls.sourceWarehouseNo.markAsTouched();
      this.lines.set([]);
      this.feedback.set({
        tone: 'info',
        title: 'Kaynak depo gerekli',
        message: 'Oneri listesi icin kaynak depo no girilmelidir.'
      });
      return;
    }

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Filtre hatali',
        message: 'Gun ve depo alanlarini kontrol edin.'
      });
      return;
    }

    const requestId = ++this.requestId;
    const formValue = this.filterForm.getRawValue();

    this.isLoading.set(true);
    this.feedback.set(null);

    this.siparisIslemleriService
      .listSuggestedWarehouseOrders({
        sourceWarehouseNo: Number(formValue.sourceWarehouseNo),
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
        next: (items: SuggestedWarehouseOrderListItemDto[]) => {
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
              message: 'Secilen kaynak depo icin siparise cevrilecek satir donmedi.'
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
            message: this.resolveErrorMessage(error, 'Onerilen depo siparisleri alinamadi.')
          });
        }
      });
  }

  protected convertToOrder(): void {
    if (this.isConverting()) {
      return;
    }

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Siparis bilgisi eksik',
        message: 'Kaynak depo, siparis tarihi ve teslim tarihi zorunludur.'
      });
      return;
    }

    const selectedLines = this.selectedLines().filter((line) => this.safeNumber(line.quantity) > 0);

    if (!selectedLines.length) {
      this.feedback.set({
        tone: 'error',
        title: 'Satir secilmedi',
        message: 'Siparise cevirmek icin en az bir satir secin.'
      });
      return;
    }

    const request = this.buildConvertRequest(selectedLines);

    this.isConverting.set(true);
    this.feedback.set(null);
    this.lastResponse.set(null);

    this.siparisIslemleriService
      .convertSuggestedWarehouseOrder(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isConverting.set(false))
      )
      .subscribe({
        next: (response: CreateIssuedWarehouseOrderResponse) => {
          this.lastResponse.set(response);
          this.feedback.set({
            tone: 'success',
            title: 'Siparis olustu',
            message: `${response.documentSerie}-${response.documentOrderNo} belge no ile ${response.lineCount} satir kaydedildi.`
          });
        },
        error: (error: unknown) => {
          this.feedback.set({
            tone: 'error',
            title: 'Siparis olusturulamadi',
            message: this.resolveErrorMessage(error, 'Oneriler siparise cevrilirken hata olustu.')
          });
        }
      });
  }

  protected setLineSelected(stockCode: string, selected: boolean): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.item.stockCode === stockCode ? { ...line, selected } : line
      )
    );
  }

  protected updateQuantity(stockCode: string, value: string): void {
    const quantity = Math.max(0, Number(value) || 0);
    this.lines.update((lines) =>
      lines.map((line) =>
        line.item.stockCode === stockCode ? { ...line, quantity } : line
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

  protected formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 2
    }).format(this.safeNumber(value));
  }

  protected readonly trackByLine = (_index: number, line: SuggestedWarehouseLineState): string =>
    line.item.stockCode || `${_index}`;

  private buildConvertRequest(
    selectedLines: SuggestedWarehouseLineState[]
  ): ConvertSuggestedWarehouseOrderHttpRequest {
    const formValue = this.filterForm.getRawValue();

    return {
      sourceWarehouseNo: Number(formValue.sourceWarehouseNo),
      orderDate: formValue.orderDate,
      deliveryDate: formValue.deliveryDate,
      description: formValue.description.trim(),
      lines: selectedLines.map((line) => ({
        stockCode: line.item.stockCode,
        quantity: this.safeNumber(line.quantity),
        recommendedQuantity: this.safeNumber(line.item.suggestedOrderQuantity),
        unitPrice: 0,
        unitPointer: 1,
        description: '',
        packageCode: '',
        projectCode: '',
        responsibilityCenter: ''
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
