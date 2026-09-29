import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  ITrendyolGoBatchItemsRequestApiDto,
  ITrendyolGoInvoiceLinkRequestApiDto,
  ITrendyolGoInvoiceRequestApiDto,
  ITrendyolGoPriceStockPreviewItemApiDto
} from '@interfaces';
import { finalize, firstValueFrom, Observable } from 'rxjs';

import {
  EntegrasyonIslemleriService,
  TrendyolGoConnectionStatusDto,
  TrendyolGoJsonDto,
  TrendyolGoStoreMappingDto,
  TrendyolGoPriceStockPreviewDto,
  TrendyolGoPriceStockDispatchDto
} from '../../../../../core/api/module-services/entegrasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserHasPermission,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

const TASK_ID = 'trendyol-go';
const PERMISSION_PREFIX = 'entegrasyon-islemleri.trendyol-go';

type JsonRecord = Record<string, unknown>;
type FeedbackTone = 'success' | 'error' | 'info';
type ProductBatchAction = 'create' | 'update' | 'price-and-inventory' | 'sale-on' | 'sale-off' | 'seller-attributes';
type PackageAction = 'read' | 'unsupplied' | 'alternative' | 'manual-shipped' | 'manual-delivered' | 'invoice-link';
type ClaimAction = 'read' | 'accept' | 'reject' | 'objectionable' | 'objections';

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

@Component({
  selector: 'app-trendyol-go-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trendyol-go-list.component.html',
  styleUrl: './trendyol-go-list.component.scss'
})
export class TrendyolGoListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly service = inject(EntegrasyonIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private previewRequestId = 0;

  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly statuses = [
    'Created',
    'Picking',
    'Invoiced',
    'Shipped',
    'Cancelled',
    'Delivered',
    'Returned',
    'UnPacked',
    'UnSupplied'
  ] as const;
  protected readonly pageSizes = [20, 50, 100, 200] as const;

  protected readonly connectionStatus = signal<TrendyolGoConnectionStatusDto | null>(null);
  protected readonly stores = signal<TrendyolGoStoreMappingDto[]>([]);
  protected readonly selectedStoreId = signal<number | null>(null);
  protected readonly activeView = signal<'orders' | 'price-stock' | 'advanced'>('orders');
  protected readonly priceStockPreview = signal<TrendyolGoPriceStockPreviewDto | null>(null);
  protected readonly selectedBarcodes = signal<ReadonlySet<string>>(new Set());
  protected readonly priceStockBatchIds = signal<readonly string[]>([]);
  protected readonly priceStockBatchResults = signal<Readonly<Record<string, TrendyolGoJsonDto>>>({});
  protected readonly loadingPriceStock = signal(false);
  protected readonly orders = signal<JsonRecord[]>([]);
  protected readonly orderResponse = signal<TrendyolGoJsonDto | null>(null);
  protected readonly selectedOrder = signal<JsonRecord | null>(null);
  protected readonly orderDetail = signal<TrendyolGoJsonDto | null>(null);
  protected readonly invoiceLimits = signal<TrendyolGoJsonDto | null>(null);
  protected readonly catalogResponse = signal<TrendyolGoJsonDto | null>(null);
  protected readonly operationResponse = signal<TrendyolGoJsonDto | null>(null);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly loadingStatus = signal(false);
  protected readonly loadingStores = signal(false);
  protected readonly loadingOrders = signal(false);
  protected readonly loadingDetail = signal(false);
  protected readonly busyAction = signal<string | null>(null);

  protected readonly canList = computed(
    () => this.authService.hasTaskAccess(TASK_ID) || this.hasPermission('list')
  );
  protected readonly canDetail = computed(() => this.canList() || this.hasPermission('detail'));
  protected readonly canUpdate = computed(() => this.hasPermission('update'));
  protected readonly connectionLabel = computed(() => {
    const status = this.connectionStatus();

    if (!status) {
      return 'Bilinmiyor';
    }

    if (status.isConnected === true) {
      return 'Bagli';
    }

    if (status.enabled === false) {
      return 'Kapali';
    }

    return status.message?.trim() || 'Kontrol gerekli';
  });
  protected readonly selectedStore = computed(() => {
    const storeId = this.selectedStoreId();
    return this.stores().find((store) => store.storeId === storeId) ?? null;
  });
  protected readonly readyItems = computed(() =>
    this.priceStockPreview()?.items.filter((item) => item.status === 'Ready' && !!item.barcode) ?? []
  );
  protected readonly selectedReadyCount = computed(() =>
    this.readyItems().filter((item) => this.selectedBarcodes().has(item.barcode)).length
  );
  protected readonly selectedOrderJson = computed(() =>
    this.selectedOrder() ? JSON.stringify(this.selectedOrder(), null, 2) : ''
  );
  protected readonly detailJson = computed(() =>
    this.orderDetail() ? JSON.stringify(this.orderDetail(), null, 2) : ''
  );
  protected readonly invoiceLimitsJson = computed(() =>
    this.invoiceLimits() ? JSON.stringify(this.invoiceLimits(), null, 2) : ''
  );
  protected readonly catalogResponseJson = computed(() =>
    this.catalogResponse() ? JSON.stringify(this.catalogResponse(), null, 2) : ''
  );
  protected readonly operationResponseJson = computed(() =>
    this.operationResponse() ? JSON.stringify(this.operationResponse(), null, 2) : ''
  );

  protected readonly filterForm = new FormGroup({
    storeId: new FormControl<number | null>(null, Validators.required),
    startDate: new FormControl(this.getToday(), { nonNullable: true }),
    endDate: new FormControl(this.getToday(), { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    page: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    size: new FormControl(50, { nonNullable: true, validators: [Validators.min(1), Validators.max(200)] }),
    sortDirection: new FormControl<'ASC' | 'DESC'>('DESC', { nonNullable: true })
  });
  protected readonly priceStockForm = new FormGroup({
    view: new FormControl<'actionable' | 'issues' | 'all'>('actionable', { nonNullable: true })
  });
  protected readonly detailForm = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: Validators.required })
  });
  protected readonly invoiceForm = new FormGroup({
    invoiceAmount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    bagCount: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10)] }),
    receiptLink: new FormControl('', { nonNullable: true }),
    invoiceTaxAmount: new FormControl<number | null>(null, Validators.min(0))
  });
  protected readonly catalogForm = new FormGroup({
    resource: new FormControl<'products' | 'brands'>('products', { nonNullable: true }),
    storeId: new FormControl<number | null>(null),
    barcode: new FormControl('', { nonNullable: true }),
    stockCode: new FormControl('', { nonNullable: true }),
    brandName: new FormControl('', { nonNullable: true }),
    page: new FormControl(0, { nonNullable: true }),
    size: new FormControl(50, { nonNullable: true })
  });
  protected readonly productBatchForm = new FormGroup({
    action: new FormControl<ProductBatchAction>('price-and-inventory', { nonNullable: true }),
    body: new FormControl('{\n  "items": []\n}', { nonNullable: true }),
    batchRequestId: new FormControl('', { nonNullable: true })
  });
  protected readonly packageForm = new FormGroup({
    action: new FormControl<PackageAction>('read', { nonNullable: true }),
    packageIds: new FormControl('', { nonNullable: true }),
    body: new FormControl('{}', { nonNullable: true })
  });
  protected readonly claimForm = new FormGroup({
    action: new FormControl<ClaimAction>('read', { nonNullable: true }),
    claimId: new FormControl('', { nonNullable: true }),
    claimItemStatus: new FormControl('', { nonNullable: true }),
    body: new FormControl('{}', { nonNullable: true })
  });

  constructor() {
    if (this.canList()) {
      this.loadConnectionStatus();
      this.loadStores();
    }

    this.catalogForm.controls.storeId.setValue(this.filterForm.controls.storeId.value);
    this.filterForm.controls.storeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((storeId: number | null) => {
        this.selectedStoreId.set(storeId);
        this.catalogForm.controls.storeId.setValue(storeId, { emitEvent: false });
        this.invalidatePriceStockPreview();
      });
    this.priceStockForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidatePriceStockPreview());
  }

  protected loadConnectionStatus(): void {
    this.loadingStatus.set(true);
    this.service
      .getTrendyolGoStatus()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingStatus.set(false))
      )
      .subscribe({
        next: (status: TrendyolGoConnectionStatusDto) => this.connectionStatus.set(status),
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Baglanti durumu alinamadi.'))
      });
  }

  protected loadStores(): void {
    this.loadingStores.set(true);
    this.service
      .getTrendyolGoStores()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingStores.set(false))
      )
      .subscribe({
        next: (stores: TrendyolGoStoreMappingDto[]) => {
          const items = stores ?? [];
          this.stores.set(items);
          const currentStoreId = this.filterForm.controls.storeId.value;

          if (!items.some((store: TrendyolGoStoreMappingDto) => store.storeId === currentStoreId)) {
            this.filterForm.controls.storeId.setValue(items[0]?.storeId ?? null);
          }
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Magaza eslemeleri alinamadi.'))
      });
  }

  protected testConnection(): void {
    const storeId = this.filterForm.controls.storeId.value;

    if (!storeId || !this.canDetail()) {
      return;
    }

    this.busyAction.set('connection');
    this.service
      .testTrendyolGoConnection(storeId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (status: TrendyolGoConnectionStatusDto) => {
          this.connectionStatus.set(status);
          this.setFeedback(status.isConnected === false ? 'error' : 'success', status.message?.trim() || 'Baglanti testi tamamlandi.');
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Baglanti testi basarisiz.'))
      });
  }

  protected loadOrders(clearFeedback = true): void {
    if (this.filterForm.invalid || !this.canList()) {
      this.filterForm.markAllAsTouched();
      this.setFeedback('error', 'Magaza ve sayfalama bilgilerini kontrol edin.');
      return;
    }

    const value = this.filterForm.getRawValue();
    const storeId = value.storeId;

    if (!storeId) {
      return;
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      this.setFeedback('error', 'Baslangic tarihi bitis tarihinden buyuk olamaz.');
      return;
    }

    this.loadingOrders.set(true);
    if (clearFeedback) {
      this.feedback.set(null);
    }
    this.selectedOrder.set(null);
    this.orderDetail.set(null);
    this.invoiceLimits.set(null);

    this.service
      .getTrendyolGoOrders({
        storeId,
        startDate: this.toTimestamp(value.startDate, false),
        endDate: this.toTimestamp(value.endDate, true),
        page: value.page,
        size: value.size,
        status: value.status ? [value.status] : [],
        sortDirection: value.sortDirection
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingOrders.set(false))
      )
      .subscribe({
        next: (response: TrendyolGoJsonDto) => {
          this.orderResponse.set(response);
          const rows = this.extractRows(response);
          this.orders.set(rows);

          if (!rows.length) {
            this.setFeedback('info', 'Secili filtrelerde siparis bulunamadi.');
          }
        },
        error: (error: unknown) => {
          this.orders.set([]);
          this.orderResponse.set(null);
          this.setFeedback('error', getErrorMessage(error, 'Siparisler alinamadi.'));
        }
      });
  }

  protected changePage(offset: number): void {
    const nextPage = Math.max(0, this.filterForm.controls.page.value + offset);
    this.filterForm.controls.page.setValue(nextPage);
    this.loadOrders();
  }

  protected selectOrder(order: JsonRecord): void {
    this.selectedOrder.set(order);
    this.invoiceLimits.set(null);
    const orderNumber = this.getOrderNumber(order);
    this.detailForm.controls.orderNumber.setValue(orderNumber);
  }

  protected loadSelectedOrderDetail(order?: JsonRecord): void {
    if (order) {
      this.selectOrder(order);
    }

    const orderNumber = this.detailForm.controls.orderNumber.value.trim();

    if (!orderNumber || !this.canDetail()) {
      this.detailForm.markAllAsTouched();
      return;
    }

    this.loadingDetail.set(true);
    this.service
      .getTrendyolGoOrderByNumber(orderNumber)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingDetail.set(false))
      )
      .subscribe({
        next: (detail: TrendyolGoJsonDto) => this.orderDetail.set(detail),
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Siparis detayi alinamadi.'))
      });
  }

  protected async markPicked(order: JsonRecord): Promise<void> {
    const packageId = this.getPackageId(order);

    if (!packageId || !this.canUpdate()) {
      this.setFeedback('error', packageId ? 'Guncelleme yetkiniz yok.' : 'Paket kimligi bulunamadi.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Siparis kabul edilsin mi?',
      message: `${this.getOrderNumber(order) || packageId} siparisi hazirlama asamasina alinacak.`,
      confirmText: 'Kabul Et',
      tone: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.runUpdateAction(
      `picked:${packageId}`,
      this.service.markTrendyolGoPackagePicked(packageId),
      'Siparis kabul edildi.'
    );
  }

  protected prepareInvoice(order: JsonRecord): void {
    this.selectOrder(order);
    const orderId = this.getOrderId(order);

    if (!orderId || !this.canDetail()) {
      this.setFeedback('error', orderId ? 'Detay yetkiniz yok.' : 'Siparis kimligi bulunamadi.');
      return;
    }

    this.busyAction.set(`limits:${orderId}`);
    this.service
      .getTrendyolGoInvoiceAmount(orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (limits: TrendyolGoJsonDto) => {
          this.invoiceLimits.set(limits);
          const suggestedAmount = this.getNumericValue(limits, 'invoiceAmount', 'maxAmount', 'maximumAmount');
          if (suggestedAmount !== null && this.invoiceForm.controls.invoiceAmount.value === null) {
            this.invoiceForm.controls.invoiceAmount.setValue(suggestedAmount);
          }
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Fatura tutar araligi alinamadi.'))
      });
  }

  protected async submitInvoice(): Promise<void> {
    const order = this.selectedOrder();
    const packageId = order ? this.getPackageId(order) : '';

    if (!order || !packageId || this.invoiceForm.invalid || !this.canUpdate()) {
      this.invoiceForm.markAllAsTouched();
      this.setFeedback('error', !packageId ? 'Paket kimligi bulunamadi.' : 'Fatura bilgilerini kontrol edin.');
      return;
    }

    const value = this.invoiceForm.getRawValue();
    const request: ITrendyolGoInvoiceRequestApiDto = {
      invoiceAmount: value.invoiceAmount as number,
      bagCount: value.bagCount,
      receiptLink: value.receiptLink.trim() || null,
      invoiceTaxAmount: value.invoiceTaxAmount
    };
    const confirmed = await this.confirmDialog.confirm({
      title: 'Fatura bildirilsin mi?',
      message: `${this.getOrderNumber(order) || packageId} siparisi ${request.invoiceAmount.toLocaleString('tr-TR')} TL ile faturalandi olarak bildirilecek.`,
      confirmText: 'Bildir',
      tone: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.runUpdateAction(
      `invoice:${packageId}`,
      this.service.markTrendyolGoPackageInvoiced(packageId, request),
      'Fatura bilgisi Trendyol Go sistemine bildirildi.'
    );
  }

  protected closeDetail(): void {
    this.selectedOrder.set(null);
    this.orderDetail.set(null);
    this.invoiceLimits.set(null);
  }

  protected loadCatalog(): void {
    if (!this.canList()) {
      return;
    }

    const value = this.catalogForm.getRawValue();
    this.busyAction.set('catalog');
    const request$ = value.resource === 'brands'
      ? this.service.getTrendyolGoBrands({ page: value.page, size: value.size, name: value.brandName.trim() || null })
      : value.storeId
        ? this.service.getTrendyolGoProducts({
            storeId: value.storeId,
            barcode: value.barcode.trim() || null,
            stockCode: value.stockCode.trim() || null,
            page: value.page,
            size: Math.min(100, value.size)
          })
        : null;

    if (!request$) {
      this.busyAction.set(null);
      this.setFeedback('error', 'Urun katalogu icin magaza secin.');
      return;
    }

    request$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (response: TrendyolGoJsonDto) => this.catalogResponse.set(response),
        error: (error: unknown) => this.setFeedback('error', getErrorMessage(error, 'Katalog sonucu alinamadi.'))
      });
  }

  protected submitProductBatch(): void {
    if (!this.canUpdate()) {
      return;
    }

    const value = this.productBatchForm.getRawValue();
    if (value.batchRequestId.trim()) {
      this.executeOperation(
        'batch-result',
        this.service.getTrendyolGoProductBatchRequest(value.batchRequestId.trim()),
        'Batch sonucu alindi.'
      );
      return;
    }

    const request = this.parseBatchRequest(value.body);
    if (!request) {
      return;
    }

    const request$ = this.resolveProductBatchRequest(value.action, request);
    this.executeOperation('product-batch', request$, 'Urun batch istegi gonderildi. Batch sonucunu ID ile takip edin.');
  }

  protected loadPriceStockPreview(): void {
    const storeId = this.selectedStoreId();
    if (!storeId || !this.canList()) {
      this.setFeedback('error', 'Fiyat/stok onizlemesi icin magaza secin.');
      return;
    }

    const view = this.priceStockForm.controls.view.value;
    const requestId = ++this.previewRequestId;
    this.priceStockPreview.set(null);
    this.selectedBarcodes.set(new Set());
    this.loadingPriceStock.set(true);
    this.service.getTrendyolGoPriceStockPreview(
      storeId,
      view === 'actionable' ? undefined : view
    )
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
        if (requestId === this.previewRequestId) this.loadingPriceStock.set(false);
      }))
      .subscribe({
        next: (preview: TrendyolGoPriceStockPreviewDto) => {
          if (requestId !== this.previewRequestId || this.selectedStoreId() !== storeId) return;
          this.priceStockPreview.set(preview);
        },
        error: (error: unknown) => {
          if (requestId === this.previewRequestId) {
            this.setFeedback('error', getErrorMessage(error, 'Fiyat/stok onizlemesi alinamadi.'));
          }
        }
      });
  }

  protected togglePriceStockItem(item: ITrendyolGoPriceStockPreviewItemApiDto): void {
    if (item.status !== 'Ready' || !item.barcode) return;
    const next = new Set(this.selectedBarcodes());
    if (next.has(item.barcode)) next.delete(item.barcode);
    else next.add(item.barcode);
    this.selectedBarcodes.set(next);
  }

  protected toggleAllReadyItems(): void {
    const ready = this.readyItems();
    const allSelected = ready.every((item) => this.selectedBarcodes().has(item.barcode));
    this.selectedBarcodes.set(allSelected ? new Set() : new Set(ready.map((item) => item.barcode)));
  }

  protected async dispatchPriceStock(): Promise<void> {
    const preview = this.priceStockPreview();
    const barcodes = Array.from(new Set(this.readyItems()
      .filter((item) => this.selectedBarcodes().has(item.barcode))
      .map((item) => item.barcode)));
    if (!this.canUpdate() || !preview || !barcodes.length || this.busyAction()) return;
    if (preview.storeId !== this.selectedStoreId() ||
      preview.view !== this.priceStockForm.controls.view.value) {
      this.invalidatePriceStockPreview();
      this.setFeedback('error', 'Magaza veya gorunum degisti. Onizlemeyi yenileyin.');
      return;
    }
    const batches = this.splitIntoBatches(barcodes, 100);
    const confirmed = await this.confirmDialog.confirm({
      title: 'Fiyat ve stok gonderilsin mi?',
      message: `${preview.storeName}: ${barcodes.length} hazir urun Trendyol Go'ya ${batches.length} paket halinde gonderilecek.`,
      confirmText: 'Gonder',
      tone: 'warning'
    });
    if (!confirmed || this.priceStockPreview() !== preview) return;

    this.busyAction.set('price-stock-dispatch');
    const batchIds: string[] = [];

    try {
      for (const batch of batches) {
        const result: TrendyolGoPriceStockDispatchDto = await firstValueFrom(
          this.service.dispatchTrendyolGoPriceStock({
            storeId: preview.storeId,
            page: preview.page,
            size: preview.size,
            previewHash: preview.previewHash,
            barcodes: batch
          })
        );
        const batchId = result.upstreamResponse?.['batchRequestId'];
        if (batchId !== null && batchId !== undefined) {
          batchIds.push(String(batchId));
        }
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.invalidatePriceStockPreview();
        this.setFeedback('error', 'Veri degisti. Onizleme yenileniyor; secimi tekrar yapin.');
        this.loadPriceStockPreview();
        return;
      }
      this.setFeedback('error', getErrorMessage(error, 'Fiyat/stok gonderilemedi.'));
      return;
    } finally {
      this.busyAction.set(null);
    }

    this.priceStockBatchIds.set(batchIds);
    this.priceStockBatchResults.set({});
    this.invalidatePriceStockPreview();
    this.setFeedback('success', batchIds.length
      ? `${batches.length} gonderim kabul edildi. Batch sonuclarini kontrol edin.`
      : `${batches.length} gonderim kabul edildi. Guncel onizlemeyi kontrol edin.`);
  }

  protected checkPriceStockBatch(batchId: string): void {
    if (!batchId || !this.canDetail()) return;
    this.busyAction.set('price-stock-batch');
    this.service.getTrendyolGoProductBatchRequest(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (result: TrendyolGoJsonDto) => this.priceStockBatchResults.update((current) => ({
          ...current,
          [batchId]: result
        })),
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Batch sonucu alinamadi.'))
      });
  }

  private invalidatePriceStockPreview(): void {
    this.previewRequestId++;
    this.priceStockPreview.set(null);
    this.selectedBarcodes.set(new Set());
    this.loadingPriceStock.set(false);
  }

  private splitIntoBatches<T>(items: readonly T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let index = 0; index < items.length; index += batchSize) {
      batches.push(items.slice(index, index + batchSize));
    }
    return batches;
  }

  protected async submitPackageAction(): Promise<void> {
    const value = this.packageForm.getRawValue();
    const packageIds = this.splitIdentifiers(value.packageIds);
    if (!packageIds.length) {
      this.setFeedback('error', 'En az bir paket kimligi girin.');
      return;
    }

    if (value.action === 'read') {
      this.executeOperation('package-read', this.service.getTrendyolGoPackagesByIds(packageIds), 'Paketler yeniden okundu.');
      return;
    }

    if (!this.canUpdate()) {
      return;
    }

    if (packageIds.length !== 1) {
      this.setFeedback('error', 'Durum degistiren paket islemleri tek paketle yapilir.');
      return;
    }

    const packageId = packageIds[0];
    const confirmed = await this.confirmDialog.confirm({
      title: 'Dis sistem islemi onayi',
      message: `${packageId} paketi icin ${this.getPackageActionLabel(value.action)} islemi uygulanacak.`,
      confirmText: 'Devam Et',
      tone: 'warning'
    });
    if (!confirmed) {
      return;
    }

    const request$ = this.resolvePackageRequest(value.action, packageId, value.body);
    if (!request$) {
      return;
    }
    this.executeOperation(`package:${packageId}`, request$, 'Paket islemi tamamlandi. Yeni paket kimligi olusmus olabilecegi icin paketi yeniden okuyun.');
  }

  protected async submitClaimAction(): Promise<void> {
    const value = this.claimForm.getRawValue();
    if (value.action === 'read') {
      this.executeOperation(
        'claims-read',
        this.service.getTrendyolGoClaims({ claimItemStatus: value.claimItemStatus.trim() || null, page: 0, size: 50 }),
        'Iade kayitlari alindi.'
      );
      return;
    }

    const claimId = value.claimId.trim();
    if (!claimId) {
      this.setFeedback('error', 'Claim kimligi gerekli.');
      return;
    }

    if (value.action === 'objectionable') {
      this.executeOperation('claim-items', this.service.getTrendyolGoObjectionableClaimItems(claimId), 'Itiraz edilebilir kalemler alindi.');
      return;
    }

    if (!this.canUpdate()) {
      return;
    }
    const body = this.parseJsonBody(value.body);
    if (!body) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Iade islemi onayi',
      message: `${claimId} iade kaydi icin ${this.getClaimActionLabel(value.action)} islemi uygulanacak.`,
      confirmText: 'Devam Et',
      tone: 'warning'
    });
    if (!confirmed) {
      return;
    }
    const request$ = value.action === 'objections'
      ? this.service.createTrendyolGoClaimObjections(claimId, body)
      : this.service.updateTrendyolGoClaim(claimId, value.action, body);
    this.executeOperation(`claim:${claimId}`, request$, 'Iade islemi tamamlandi.');
  }

  protected getOrderNumber(order: JsonRecord): string {
    return this.getTextValue(order, 'orderNumber', 'orderNo', 'order.number', 'id');
  }

  protected getPackageId(order: JsonRecord): string {
    const direct = this.getTextValue(order, 'packageId', 'package.id', 'shipmentPackageId');
    if (direct) {
      return direct;
    }

    const packages = order['packages'];
    return Array.isArray(packages) && this.isRecord(packages[0])
      ? this.getTextValue(packages[0], 'packageId', 'id')
      : '';
  }

  protected getOrderId(order: JsonRecord): string {
    return this.getTextValue(order, 'orderId', 'order.id', 'id');
  }

  protected getOrderStatus(order: JsonRecord): string {
    return this.getTextValue(order, 'status', 'orderStatus', 'package.status') || '-';
  }

  protected getCustomerName(order: JsonRecord): string {
    const fullName = this.getTextValue(order, 'customerName', 'customer.name', 'customer.fullName');
    if (fullName) {
      return fullName;
    }

    return [
      this.getTextValue(order, 'customer.firstName'),
      this.getTextValue(order, 'customer.lastName')
    ].filter(Boolean).join(' ') || '-';
  }

  protected getOrderDate(order: JsonRecord): string {
    const value = this.readPath(order, 'orderDate') ?? this.readPath(order, 'createdDate') ?? this.readPath(order, 'createdAt');
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const date = new Date(typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : (value as string | number));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('tr-TR');
  }

  protected getOrderAmount(order: JsonRecord): string {
    const value = this.getNumericValue(order, 'totalAmount', 'totalPrice', 'invoiceAmount', 'price');
    return value === null ? '-' : `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  }

  protected isBusy(prefix: string, order: JsonRecord): boolean {
    const packageId = this.getPackageId(order);
    const orderId = this.getOrderId(order);
    return this.busyAction() === `${prefix}:${prefix === 'limits' ? orderId : packageId}`;
  }

  protected trackByStore = (_index: number, store: TrendyolGoStoreMappingDto): number => store.storeId;
  protected trackByOrder = (index: number, order: JsonRecord): string =>
    this.getPackageId(order) || this.getOrderId(order) || this.getOrderNumber(order) || `${index}`;

  private runUpdateAction(
    actionKey: string,
    request$: Observable<TrendyolGoJsonDto | null>,
    successMessage: string
  ): void {
    this.busyAction.set(actionKey);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: () => {
          this.setFeedback('success', successMessage);
          this.loadOrders(false);
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Trendyol Go islemi tamamlanamadi.'))
      });
  }

  private executeOperation(
    actionKey: string,
    request$: Observable<TrendyolGoJsonDto | null>,
    successMessage: string
  ): void {
    this.busyAction.set(actionKey);
    request$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (response: TrendyolGoJsonDto | null) => {
          this.operationResponse.set(response);
          this.setFeedback('success', successMessage);
        },
        error: (error: unknown) => this.setFeedback('error', getErrorMessage(error, 'Trendyol Go islemi tamamlanamadi.'))
      });
  }

  private resolveProductBatchRequest(
    action: ProductBatchAction,
    request: ITrendyolGoBatchItemsRequestApiDto
  ): Observable<TrendyolGoJsonDto | null> {
    switch (action) {
      case 'create': return this.service.createTrendyolGoProducts(request);
      case 'update': return this.service.updateTrendyolGoProducts(request);
      case 'price-and-inventory': return this.service.updateTrendyolGoProductPriceAndInventory(request);
      case 'sale-on': return this.service.setTrendyolGoProductsSaleState('on', request);
      case 'sale-off': return this.service.setTrendyolGoProductsSaleState('off', request);
      case 'seller-attributes': return this.service.updateTrendyolGoProductSellerAttributes(request);
    }
  }

  private resolvePackageRequest(
    action: Exclude<PackageAction, 'read'>,
    packageId: string,
    rawBody: string
  ): Observable<TrendyolGoJsonDto | null> | null {
    if (action === 'manual-shipped' || action === 'manual-delivered') {
      return this.service.markTrendyolGoPackageManualState(packageId, action === 'manual-shipped' ? 'shipped' : 'delivered');
    }
    const body = this.parseJsonBody(rawBody);
    if (!body) {
      return null;
    }
    if (action === 'unsupplied') return this.service.markTrendyolGoPackageUnsupplied(packageId, body);
    if (action === 'alternative') return this.service.markTrendyolGoPackageAlternative(packageId, body);
    const invoiceLink = String(body['invoiceLink'] ?? '').trim();
    const shipmentPackageId = Number(body['shipmentPackageId'] ?? packageId);
    if (!invoiceLink || !Number.isSafeInteger(shipmentPackageId) || shipmentPackageId <= 0) {
      this.setFeedback('error', 'Fatura linki ve shipmentPackageId gerekli.');
      return null;
    }
    return this.service.createTrendyolGoInvoiceLink({ invoiceLink, shipmentPackageId });
  }

  private parseBatchRequest(rawValue: string): ITrendyolGoBatchItemsRequestApiDto | null {
    const body = this.parseJsonBody(rawValue);
    const items = body?.['items'];
    if (!Array.isArray(items) || items.length < 1 || items.length > 1000 || !items.every((item) => this.isRecord(item))) {
      this.setFeedback('error', 'Batch body 1 ile 1000 arasinda nesne iceren items dizisi olmali.');
      return null;
    }
    return { items };
  }

  private parseJsonBody(rawValue: string): JsonRecord | null {
    try {
      const body: unknown = JSON.parse(rawValue);
      if (!this.isRecord(body)) throw new Error('JSON nesnesi bekleniyor');
      return body;
    } catch {
      this.setFeedback('error', 'Gecerli bir JSON nesnesi girin.');
      return null;
    }
  }

  private splitIdentifiers(value: string): string[] {
    return Array.from(new Set(value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)));
  }

  private getPackageActionLabel(action: Exclude<PackageAction, 'read'>): string {
    return ({ unsupplied: 'tedarik edememe', alternative: 'alternatif urun', 'manual-shipped': 'manuel sevk', 'manual-delivered': 'manuel teslimat', 'invoice-link': 'fatura linki' } as const)[action];
  }

  private getClaimActionLabel(action: Exclude<ClaimAction, 'read' | 'objectionable'>): string {
    return ({ accept: 'kabul', reject: 'red', objections: 'itiraz' } as const)[action];
  }

  private extractRows(response: TrendyolGoJsonDto | null): JsonRecord[] {
    if (Array.isArray(response)) {
      return response.filter((item): item is JsonRecord => this.isRecord(item));
    }

    if (!this.isRecord(response)) {
      return [];
    }

    for (const key of ['content', 'items', 'orders', 'packages', 'results']) {
      const value = response[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is JsonRecord => this.isRecord(item));
      }
    }

    const data = response['data'];
    return this.isRecord(data) ? this.extractRows(data) : [];
  }

  private getTextValue(record: JsonRecord, ...paths: string[]): string {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return '';
  }

  private getNumericValue(record: JsonRecord | TrendyolGoJsonDto, ...paths: string[]): number | null {
    if (!this.isRecord(record)) {
      return null;
    }

    for (const path of paths) {
      const rawValue = this.readPath(record, path);
      const value = Number(rawValue);
      if (rawValue !== null && rawValue !== undefined && rawValue !== '' && Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  }

  private readPath(record: JsonRecord, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) =>
      this.isRecord(current) ? current[key] : undefined, record);
  }

  private isRecord(value: unknown): value is JsonRecord {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private toTimestamp(value: string, endOfDay: boolean): number | null {
    if (!value) {
      return null;
    }
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  private hasPermission(action: 'list' | 'detail' | 'update'): boolean {
    const user = this.authService.currentUser();
    const permissionCode = `${PERMISSION_PREFIX}.${action}`;
    const permissionKeys = [
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => normalizePermissionCode(permission));

    return (
      currentUserHasPermission(user, permissionCode) ||
      permissionKeys.includes(normalizePermissionCode(permissionCode)) ||
      permissionKeys.includes(normalizePermissionCode(action))
    );
  }

  private setFeedback(tone: FeedbackTone, message: string): void {
    this.feedback.set({ tone, message });
  }

  private getToday(): string {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
