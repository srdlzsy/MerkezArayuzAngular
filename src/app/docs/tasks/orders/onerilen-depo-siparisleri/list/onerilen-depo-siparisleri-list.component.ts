import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  ConvertSuggestedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  IFurpaSourceWarehouseSearchItemApiDto,
  SuggestedWarehouseOrderListItemDto
} from '@interfaces';

import { formatDateOnly } from '../../../../../core/api/furpa-merkez-api.utils';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
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
  private readonly aramaService = inject(AramaService);
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
  protected readonly convertFeedback = signal<PageFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly sourceWarehouses = signal<IFurpaSourceWarehouseSearchItemApiDto[]>([]);
  protected readonly sourceWarehousesLoading = signal(false);
  protected readonly sourceWarehousesError = signal('');
  protected readonly isConverting = signal(false);
  protected readonly isConvertDialogOpen = signal(false);
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
    this.loadSourceWarehouses();
  }

  protected loadSourceWarehouses(): void {
    this.sourceWarehousesLoading.set(true);
    this.sourceWarehousesError.set('');

    this.aramaService
      .searchSourceWarehouses(undefined, 100)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sourceWarehousesLoading.set(false))
      )
      .subscribe({
        next: (warehouses: IFurpaSourceWarehouseSearchItemApiDto[]) => {
          const normalizedWarehouses = this.normalizeSourceWarehouses(warehouses ?? []);
          this.sourceWarehouses.set(normalizedWarehouses);

          if (!normalizedWarehouses.length) {
            this.lines.set([]);
            this.feedback.set({
              tone: 'info',
              title: 'Kaynak depo yok',
              message: 'Siparis verilebilir kaynak depo bulunamadi.'
            });
            return;
          }

          const currentWarehouseNo = this.filterForm.controls.sourceWarehouseNo.value;
          const selectedWarehouse = normalizedWarehouses.find(
            (warehouse) => warehouse.sourceWarehouseNo === currentWarehouseNo
          ) ?? normalizedWarehouses[0];

          this.filterForm.controls.sourceWarehouseNo.setValue(selectedWarehouse.sourceWarehouseNo);
          this.loadSuggestions();
        },
        error: (error: unknown) => {
          this.sourceWarehouses.set([]);
          this.sourceWarehousesError.set(this.resolveErrorMessage(error, 'Kaynak depo listesi alinamadi.'));
        }
      });
  }

  protected loadSuggestions(): void {
    this.lastResponse.set(null);
    this.convertFeedback.set(null);

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

  protected openConvertDialog(): void {
    this.lastResponse.set(null);
    this.convertFeedback.set(null);

    if (this.filterForm.controls.sourceWarehouseNo.invalid) {
      this.filterForm.controls.sourceWarehouseNo.markAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Kaynak depo eksik',
        message: 'Siparise cevirmek icin once kaynak depo no girin.'
      });
      return;
    }

    if (!this.selectedLines().filter((line) => this.safeNumber(line.quantity) > 0).length) {
      this.feedback.set({
        tone: 'error',
        title: 'Satir secilmedi',
        message: 'Siparise cevirmek icin en az bir satir secin.'
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
        message: 'Kaynak depo, siparis tarihi ve teslim tarihi zorunludur.'
      });
      return;
    }

    const selectedLines = this.selectedLines().filter((line) => this.safeNumber(line.quantity) > 0);

    if (!selectedLines.length) {
      this.convertFeedback.set({
        tone: 'error',
        title: 'Satir secilmedi',
        message: 'Siparise cevirmek icin en az bir satir secin.'
      });
      return;
    }

    const request = this.buildConvertRequest(selectedLines);

    this.isConverting.set(true);
    this.convertFeedback.set(null);
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

  protected readonly trackBySourceWarehouse = (
    _index: number,
    warehouse: IFurpaSourceWarehouseSearchItemApiDto
  ): string => `${warehouse.sourceWarehouseNo}-${warehouse.displayName?.trim() || _index}`;

  protected getSourceWarehouseLabel(warehouse: IFurpaSourceWarehouseSearchItemApiDto): string {
    return warehouse.displayName?.trim()
      || `${warehouse.sourceWarehouseNo} - ${warehouse.sourceWarehouseName?.trim() || 'Depo'}`;
  }

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

  private normalizeSourceWarehouses(
    warehouses: IFurpaSourceWarehouseSearchItemApiDto[]
  ): IFurpaSourceWarehouseSearchItemApiDto[] {
    const uniqueWarehouses = new Map<number, IFurpaSourceWarehouseSearchItemApiDto>();

    for (const warehouse of warehouses) {
      if (
        !Number.isFinite(warehouse.sourceWarehouseNo)
        || uniqueWarehouses.has(warehouse.sourceWarehouseNo)
      ) {
        continue;
      }

      uniqueWarehouses.set(warehouse.sourceWarehouseNo, warehouse);
    }

    return Array.from(uniqueWarehouses.values()).sort(
      (left, right) => left.sourceWarehouseNo - right.sourceWarehouseNo
    );
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
