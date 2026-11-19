import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  ITrendyolGoBatchItemsRequestApiDto,
  ITrendyolGoInvoiceLinkRequestApiDto,
  ITrendyolGoInvoiceRequestApiDto,
  ITrendyolGoCatalogPreviewItemApiDto,
  ITrendyolGoPriceStockPreviewItemApiDto,
  ITrendyolGoDirectPriceStockItemApiDto,
  ITrendyolGoDirectPriceStockPreviewApiDto,
  ITrendyolGoDirectPriceStockDispatchHttpRequestApiDto,
  ITrendyolGoDirectPriceStockDispatchResultApiDto,
  ITrendyolGoDirectStoreDispatchResultApiDto,
  ITrendyolGoCatalogAutoCreateResultApiDto,
  ITrendyolGoBatchWorkflowApiDto,
  ITrendyolGoBranchPosSyncTaskApiDto,
  ITrendyolGoWorkflowStatusApiDto,
  ITrendyolGoAdministrationOverviewApiDto,
  ITrendyolGoStoreSettingApiDto,
  ITrendyolGoCategorySyncResultApiDto,
  ITrendyolGoCategoryMappingApiDto,
  ITrendyolGoProductCategoryOverrideApiDto
} from '@interfaces';
import { finalize, Observable } from 'rxjs';

import {
  EntegrasyonIslemleriService,
  TrendyolGoConnectionStatusDto,
  TrendyolGoJsonDto,
  TrendyolGoStoreMappingDto,
  TrendyolGoPriceStockPreviewDto,
  TrendyolGoPriceStockRefreshStatusDto,
  TrendyolGoPriceStockDispatchDto,
  TrendyolGoCatalogPreviewDto,
  TrendyolGoCatalogDispatchDto
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
import {
  buildTrendyolGoClaimTemplate,
  buildTrendyolGoDirectDispatchSummary,
  buildTrendyolGoPackageTemplate,
  buildTrendyolGoProductBatchTemplate,
  calculateTrendyolGoPriceDelta,
  calculateTrendyolGoStockDelta,
  type ClaimAction,
  type DirectTargetScope,
  extractTrendyolGoBatchIds,
  extractTrendyolGoOrderLines,
  extractTrendyolGoRows,
  formatTrendyolGoBatchWorkflowKindLabel,
  formatTrendyolGoBatchWorkflowLabel,
  formatTrendyolGoDateIso,
  formatTrendyolGoDirectStoreStatusLabel,
  getTrendyolGoCustomerName,
  getTrendyolGoNumericValue,
  getTrendyolGoOrderAmount,
  getTrendyolGoOrderDate,
  getTrendyolGoOrderId,
  getTrendyolGoOrderNumber,
  getTrendyolGoOrderStatus,
  getTrendyolGoOrderStatusLabel,
  getTrendyolGoOrderStatusTone,
  getTrendyolGoPackageId,
  isTrendyolGoCatalogPending,
  isTrendyolGoRecord,
  type ITrendyolGoBatchFailedItemView,
  type ITrendyolGoBatchSummary,
  type ITrendyolGoDirectStoreLiveStatus,
  type ITrendyolGoInvoiceLimitSummary,
  type ITrendyolGoOrderLineView,
  type JsonRecord,
  type PackageAction,
  parseTrendyolGoBatchFailedItems,
  parseTrendyolGoBatchSummary,
  parseTrendyolGoMissingCatalogInfo,
  type PriceStockDispatchMode,
  type ProductBatchAction,
  type ReadyCatalogItem,
  resolveTrendyolGoBatchChipTone,
  resolveTrendyolGoDirectStoreLiveStatus,
  shortTrendyolGoBatchId,
  splitTrendyolGoIdentifiers,
  toTrendyolGoTimestamp,
  type TrendyolGoLiveTone
} from './trendyol-go-batch.helpers';

const TASK_ID = 'trendyol-go';
const PERMISSION_PREFIX = 'entegrasyon-islemleri.trendyol-go';

type FeedbackTone = 'success' | 'error' | 'info';

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
  private directPreviewRequestId = 0;
  private priceStockPollTimer: number | undefined;
  private workflowPollTimer: number | undefined;
  private workflowPollAttempt = 0;
  private directDispatchCompletionNotified = false;

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
  protected readonly directTargetScope = signal<DirectTargetScope>('single');
  protected readonly selectedDirectStoreIds = signal<ReadonlySet<number>>(new Set());
  protected readonly activeView = signal<'orders' | 'price-stock' | 'catalog-sync' | 'workflows' | 'management' | 'advanced'>('orders');
  protected readonly priceStockSubView = signal<'direct' | 'snapshot'>('direct');
  protected readonly directPreview = signal<ITrendyolGoDirectPriceStockPreviewApiDto | null>(null);
  protected readonly selectedDirectBarcodes = signal<ReadonlySet<string>>(new Set());
  protected readonly loadingDirectPreview = signal(false);
  protected readonly directDispatchResult = signal<ITrendyolGoDirectPriceStockDispatchResultApiDto | null>(null);
  protected readonly directDispatchAutoCatalogEnabled = signal(false);
  protected readonly batchWorkflows = signal<ITrendyolGoBatchWorkflowApiDto[]>([]);
  protected readonly branchPosSyncTasks = signal<ITrendyolGoBranchPosSyncTaskApiDto[]>([]);
  protected readonly loadingBatchWorkflows = signal(false);
  protected readonly managementOverview = signal<ITrendyolGoAdministrationOverviewApiDto | null>(null);
  protected readonly loadingManagement = signal(false);
  protected readonly priceStockPreview = signal<TrendyolGoPriceStockPreviewDto | null>(null);
  protected readonly selectedBarcodes = signal<ReadonlySet<string>>(new Set());
  protected readonly priceStockBatchIds = signal<readonly string[]>([]);
  protected readonly priceStockBatchResults = signal<Readonly<Record<string, TrendyolGoJsonDto>>>({});
  protected readonly loadingPriceStock = signal(false);
  protected readonly catalogSyncPreview = signal<TrendyolGoCatalogPreviewDto | null>(null);
  protected readonly selectedCatalogBarcodes = signal<ReadonlySet<string>>(new Set());
  protected readonly catalogBatchIds = signal<readonly string[]>([]);
  protected readonly catalogBatchResults = signal<Readonly<Record<string, TrendyolGoJsonDto>>>({});
  protected readonly loadingCatalogSync = signal(false);
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
  protected readonly activeWorkflowCount = computed(() =>
    this.batchWorkflows().filter((item) =>
      item.status === 'Pending' || item.status === 'Processing'
    ).length
  );
  protected readonly activeBranchPosSyncCount = computed(() =>
    this.branchPosSyncTasks().filter((item) => item.status === 'Pending' || item.status === 'Processing').length
  );
  protected readonly activeTrackingCount = computed(() =>
    this.activeWorkflowCount() + this.activeBranchPosSyncCount()
  );
  protected readonly branchPosRetryTasks = computed(() =>
    this.branchPosSyncTasks().filter((item) =>
      (item.status === 'Pending' || item.status === 'Processing') && !!item.lastError
    )
  );
  protected readonly branchPosFailedTasks = computed(() =>
    this.branchPosSyncTasks().filter((item) => item.status === 'Failed')
  );
  protected readonly issueWorkflowCount = computed(() =>
    this.batchWorkflows().filter((item) =>
      item.status === 'Failed' || item.status === 'PartiallySucceeded'
    ).length + this.branchPosRetryTasks().length + this.branchPosFailedTasks().length
  );
  protected readonly completedWorkflowCount = computed(() =>
    this.batchWorkflows().filter((item) => item.status === 'Succeeded').length
  );
  protected readonly workflowByBatchId = computed(() => {
    const map = new Map<string, ITrendyolGoBatchWorkflowApiDto>();
    for (const item of this.batchWorkflows()) {
      if (item.batchRequestId) {
        map.set(item.batchRequestId, item);
      }
    }
    return map;
  });
  protected readonly directDispatchSummary = computed(() => {
    const res = this.directDispatchResult();
    if (!res) {
      return null;
    }

    return buildTrendyolGoDirectDispatchSummary(
      res,
      this.workflowByBatchId(),
      (id) => this.getManualBatchSummary(id)
    );
  });
  protected readonly directStoreLiveStatusByStoreId = computed(() => {
    const result = this.directDispatchResult();
    const statuses = new Map<number, ITrendyolGoDirectStoreLiveStatus>();
    if (!result) {
      return statuses;
    }

    const workflows = this.workflowByBatchId();
    for (const storeResult of result.storeResults) {
      statuses.set(
        storeResult.storeId,
        resolveTrendyolGoDirectStoreLiveStatus(
          storeResult,
          workflows,
          (id) => this.getManualBatchSummary(id)
        )
      );
    }
    return statuses;
  });
  protected readonly batchChipToneById = computed(() => {
    const result = this.directDispatchResult();
    const tones = new Map<string, TrendyolGoLiveTone>();
    if (!result) {
      return tones;
    }

    const workflows = this.workflowByBatchId();
    for (const batchId of result.storeResults.flatMap((storeResult) => [
      ...(storeResult.batchRequestIds || []),
      ...(storeResult.catalogBatchRequestIds || [])
    ])) {
      tones.set(
        batchId,
        resolveTrendyolGoBatchChipTone(batchId, workflows, this.getManualBatchSummary(batchId))
      );
    }
    return tones;
  });
  protected readonly directItems = computed<ITrendyolGoDirectPriceStockItemApiDto[]>(
    () => this.directPreview()?.items ?? []
  );
  protected readonly directChangedCount = computed(
    () => this.directItems().filter((item) => item.priceChangedFlag).length
  );
  protected readonly directSaleBlockedCount = computed(
    () => this.directItems().filter((item) => (item.salesBlocked ?? 0) !== 0).length
  );
  protected readonly directZeroStockCount = computed(
    () => this.directItems().filter((item) => item.quantity <= 0).length
  );
  protected readonly selectedDirectCount = computed(
    () => this.selectedDirectBarcodes().size
  );
  protected readonly selectedDirectStores = computed(() => {
    const selectedIds = this.selectedDirectStoreIds();
    return this.stores().filter((store) => selectedIds.has(store.storeId));
  });
  protected readonly canDispatchDirect = computed(
    () => {
      if (!this.canUpdate() || this.directPreview() === null) return false;

      return this.directTargetScope() === 'all' ||
        (this.directTargetScope() === 'multiple'
          ? this.selectedDirectStoreIds().size > 0
          : this.selectedStore() !== null);
    }
  );
  protected readonly readyItems = computed(() =>
    this.priceStockPreview()?.items.filter((item) => item.status === 'Ready' && !!item.barcode) ?? []
  );
  protected readonly selectedReadyCount = computed(() =>
    this.readyItems().filter((item) => this.selectedBarcodes().has(item.barcode)).length
  );
  protected readonly canDispatchPriceStock = computed(() => {
    const preview = this.priceStockPreview();
    return !!preview && preview.snapshotStatus === 'Ready' && !!preview.previewHash;
  });
  protected readonly priceStockDispatchCount = computed(() => {
    const preview = this.priceStockPreview();
    if (!preview) return 0;

    switch (this.priceStockForm.controls.dispatchMode.value) {
      case 'selected': return this.selectedReadyCount();
      case 'changed': return preview.readyCount;
      case 'all-existing': return preview.readyCount + preview.unchangedCount;
    }
  });
  protected readonly canSubmitPriceStock = computed(
    () => this.canDispatchPriceStock() && this.priceStockDispatchCount() > 0
  );
  protected readonly catalogReadyItems = computed<ReadyCatalogItem[]>(() =>
    (this.catalogSyncPreview()?.items ?? []).filter(
      (item): item is ReadyCatalogItem => item.status === 'Ready' && !!item.barcode
    )
  );
  protected readonly selectedCatalogReadyCount = computed(() =>
    this.catalogReadyItems().filter((item) => this.selectedCatalogBarcodes().has(item.barcode)).length
  );
  protected readonly canDispatchCatalog = computed(() => {
    const preview = this.catalogSyncPreview();
    return !!preview && !!preview.previewHash && preview.readyCount > 0;
  });
  protected readonly selectedOrderLines = computed<ITrendyolGoOrderLineView[]>(() => {
    const detail = this.orderDetail();
    const order = this.selectedOrder();
    const source = this.isRecord(detail) ? detail : order;
    if (!source) {
      return [];
    }
    return this.extractOrderLinesFromRecord(source);
  });
  protected readonly invoiceLimitSummary = computed<ITrendyolGoInvoiceLimitSummary | null>(() => {
    const limits = this.invoiceLimits();
    if (!limits || !this.isRecord(limits)) {
      return null;
    }
    return {
      minAmount: this.getNumericValue(limits, 'minAmount', 'minimumAmount', 'minInvoiceAmount', 'lowerLimit'),
      maxAmount: this.getNumericValue(limits, 'maxAmount', 'maximumAmount', 'maxInvoiceAmount', 'upperLimit'),
      suggestedAmount: this.getNumericValue(limits, 'invoiceAmount', 'suggestedAmount', 'totalPrice', 'maxAmount')
    };
  });
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
  protected readonly managementLeafCategories = computed(() =>
    (this.managementOverview()?.categories ?? []).filter((item) => item.isActive && item.isLeaf)
  );
  protected readonly branchPosAttentionTasks = computed(() =>
    this.branchPosSyncTasks()
      .filter((item) => item.status !== 'Succeeded' && !!item.lastError)
  );
  protected readonly branchPosPendingTasks = computed(() =>
    this.branchPosSyncTasks()
      .filter((item) => item.status !== 'Succeeded' && !item.lastError)
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
    view: new FormControl<'actionable' | 'issues' | 'all'>('actionable', { nonNullable: true }),
    dispatchMode: new FormControl<PriceStockDispatchMode>('selected', { nonNullable: true })
  });
  protected readonly directPriceStockForm = new FormGroup({
    targetScope: new FormControl<DirectTargetScope>('single', { nonNullable: true }),
    mode: new FormControl<'changed' | 'all'>('changed', { nonNullable: true }),
    sinceDate: new FormControl(this.getToday(), { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    take: new FormControl(500, { nonNullable: true, validators: [Validators.min(1), Validators.max(5000)] }),
    autoCreateMissingCatalog: new FormControl<boolean>(true, { nonNullable: true })
  });
  protected readonly catalogSyncForm = new FormGroup({
    view: new FormControl<'actionable' | 'issues' | 'all' | 'existing'>('actionable', { nonNullable: true }),
    search: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)]
    }),
    take: new FormControl(500, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(5000)]
    })
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
  protected readonly managementSettingsForm = new FormGroup({
    priceListNo: new FormControl(3, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(1000)] }),
    paymentPlanNo: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100000)] }),
    stockReserveQuantity: new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100000)] }),
    branchPosPriceSyncEnabled: new FormControl(true, { nonNullable: true })
  });
  protected readonly managementStoreForm = new FormGroup({
    storeId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    warehouseNo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    storeName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    stockReserveQuantity: new FormControl<number | null>(null, [Validators.min(0), Validators.max(100000)]),
    isActive: new FormControl(true, { nonNullable: true })
  });
  protected readonly managementCategorySearch = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] });
  protected readonly managementCategoryMappingForm = new FormGroup({
    id: new FormControl<string | null>(null),
    mikroCategoryCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    mikroMainGroupCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    categoryId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)])
  });
  protected readonly managementProductOverrideForm = new FormGroup({
    id: new FormControl<string | null>(null),
    stockCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    categoryId: new FormControl<number | null>(null, [Validators.required, Validators.min(1)])
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearPriceStockPolling();
      if (this.workflowPollTimer !== undefined) {
        window.clearTimeout(this.workflowPollTimer);
      }
    });
    if (this.canList()) {
      this.loadConnectionStatus();
      this.loadStores();
    }
    if (this.canDetail()) {
      this.loadBatchWorkflows();
    }

    this.catalogForm.controls.storeId.setValue(this.filterForm.controls.storeId.value);
    this.filterForm.controls.storeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((storeId: number | null) => {
        this.selectedStoreId.set(storeId);
        this.catalogForm.controls.storeId.setValue(storeId, { emitEvent: false });
        this.invalidatePriceStockPreview();
        this.invalidateCatalogSyncPreview();
        this.invalidateDirectPreview();
      });
    this.priceStockForm.controls.view.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidatePriceStockPreview());
    this.catalogSyncForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidateCatalogSyncPreview());
    this.directPriceStockForm.controls.targetScope.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((scope: DirectTargetScope) => this.directTargetScope.set(scope));
    this.directPriceStockForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.invalidateDirectPreview());
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
          const validStoreIds = new Set(items.map((store) => store.storeId));
          this.selectedDirectStoreIds.update((current) =>
            new Set([...current].filter((storeId) => validStoreIds.has(storeId)))
          );
          const currentStoreId = this.filterForm.controls.storeId.value;

          if (!items.some((store: TrendyolGoStoreMappingDto) => store.storeId === currentStoreId)) {
            this.filterForm.controls.storeId.setValue(items[0]?.storeId ?? null);
          }
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Magaza eslemeleri alinamadi.'))
      });
  }

  protected openManagement(): void {
    this.activeView.set('management');
    if (!this.managementOverview()) {
      this.loadManagement();
    }
  }

  protected loadManagement(): void {
    if (!this.canDetail() || this.loadingManagement()) return;

    this.loadingManagement.set(true);
    this.service
      .getTrendyolGoManagement(this.managementCategorySearch.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingManagement.set(false))
      )
      .subscribe({
        next: (overview: ITrendyolGoAdministrationOverviewApiDto) => {
          this.managementOverview.set(overview);
          this.branchPosSyncTasks.set(overview.branchPosSyncTasks ?? []);
          this.managementSettingsForm.patchValue({
            priceListNo: overview.runtimeSettings.priceListNo,
            paymentPlanNo: overview.runtimeSettings.paymentPlanNo,
            stockReserveQuantity: overview.runtimeSettings.stockReserveQuantity,
            branchPosPriceSyncEnabled: overview.runtimeSettings.branchPosPriceSyncEnabled
          }, { emitEvent: false });
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Trendyol Go yonetim bilgileri alinamadi.'))
      });
  }

  protected saveManagementSettings(): void {
    if (!this.canUpdate() || this.managementSettingsForm.invalid || this.busyAction()) {
      this.managementSettingsForm.markAllAsTouched();
      return;
    }

    this.busyAction.set('management-settings');
    this.service.updateTrendyolGoManagementSettings(this.managementSettingsForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: () => {
          this.setFeedback('success', 'Genel Trendyol Go gonderim ayarlari kaydedildi.');
          this.loadManagement();
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Genel ayarlar kaydedilemedi.'))
      });
  }

  protected editManagementStore(store: ITrendyolGoStoreSettingApiDto): void {
    this.managementStoreForm.reset({
      storeId: store.storeId,
      warehouseNo: store.warehouseNo,
      storeName: store.storeName,
      stockReserveQuantity: store.stockReserveQuantity ?? null,
      isActive: store.isActive
    });
  }

  protected resetManagementStoreForm(): void {
    this.managementStoreForm.reset({
      storeId: null,
      warehouseNo: null,
      storeName: '',
      stockReserveQuantity: null,
      isActive: true
    });
  }

  protected saveManagementStore(): void {
    if (!this.canUpdate() || this.managementStoreForm.invalid || this.busyAction()) {
      this.managementStoreForm.markAllAsTouched();
      return;
    }

    const value = this.managementStoreForm.getRawValue();
    if (!value.storeId || !value.warehouseNo) return;

    this.busyAction.set('management-store');
    this.service.upsertTrendyolGoManagementStore({
      storeId: value.storeId,
      warehouseNo: value.warehouseNo,
      storeName: value.storeName.trim(),
      stockReserveQuantity: value.stockReserveQuantity,
      isActive: value.isActive
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busyAction.set(null))
    ).subscribe({
      next: () => {
        this.setFeedback('success', 'Magaza ve Mikro depo eslesmesi kaydedildi.');
        this.resetManagementStoreForm();
        this.loadManagement();
        this.loadStores();
      },
      error: (error: unknown) =>
        this.setFeedback('error', getErrorMessage(error, 'Magaza eslesmesi kaydedilemedi.'))
    });
  }

  protected async deactivateManagementStore(store: ITrendyolGoStoreSettingApiDto): Promise<void> {
    if (!this.canUpdate() || this.busyAction()) return;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Magaza devre disi birakilsin mi?',
      message: `${store.storeName} / Depo ${store.warehouseNo} yeni Trendyol Go islemlerinde kullanilmayacak. Gecmis kuyruk kayitlari korunur.`,
      confirmText: 'Devre Disi Birak',
      tone: 'danger'
    });
    if (!confirmed) return;

    this.busyAction.set('management-store-delete');
    this.service.deleteTrendyolGoManagementStore(store.storeId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: () => {
          this.setFeedback('success', 'Magaza devre disi birakildi.');
          this.loadManagement();
          this.loadStores();
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Magaza devre disi birakilamadi.'))
      });
  }

  protected refreshManagementCategories(): void {
    if (!this.canUpdate() || this.busyAction()) return;
    this.busyAction.set('management-categories');
    this.service.refreshTrendyolGoManagementCategories()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (result: ITrendyolGoCategorySyncResultApiDto) => {
          this.setFeedback('success', `${result.activeCount} aktif Trendyol Go kategorisi yenilendi.`);
          this.loadManagement();
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Kategori agaci yenilenemedi.'))
      });
  }

  protected editCategoryMapping(item: ITrendyolGoCategoryMappingApiDto): void {
    this.managementCategoryMappingForm.reset({
      id: item.id,
      mikroCategoryCode: item.mikroCategoryCode,
      mikroMainGroupCode: item.mikroMainGroupCode ?? '',
      categoryId: item.categoryId
    });
  }

  protected resetCategoryMappingForm(): void {
    this.managementCategoryMappingForm.reset({
      id: null,
      mikroCategoryCode: '',
      mikroMainGroupCode: '',
      categoryId: null
    });
  }

  protected saveCategoryMapping(): void {
    if (!this.canUpdate() || this.managementCategoryMappingForm.invalid || this.busyAction()) {
      this.managementCategoryMappingForm.markAllAsTouched();
      return;
    }
    const value = this.managementCategoryMappingForm.getRawValue();
    if (!value.categoryId) return;

    this.busyAction.set('management-category-mapping');
    this.service.upsertTrendyolGoCategoryMapping({
      id: value.id,
      mikroCategoryCode: value.mikroCategoryCode.trim(),
      mikroMainGroupCode: value.mikroMainGroupCode.trim() || null,
      categoryId: value.categoryId
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busyAction.set(null))
    ).subscribe({
      next: () => {
        this.setFeedback('success', 'Mikro kategori eslemesi kaydedildi.');
        this.resetCategoryMappingForm();
        this.loadManagement();
      },
      error: (error: unknown) =>
        this.setFeedback('error', getErrorMessage(error, 'Kategori eslemesi kaydedilemedi.'))
    });
  }

  protected async deleteCategoryMapping(item: ITrendyolGoCategoryMappingApiDto): Promise<void> {
    if (!this.canUpdate() || this.busyAction()) return;
    if (!await this.confirmDialog.confirm({
      title: 'Kategori eslemesi kaldirilsin mi?',
      message: `${item.mikroCategoryCode} eslemesi kaldirilinca ilgili yeni urunler tekrar esleme bekler.`,
      confirmText: 'Kaldir',
      tone: 'danger'
    })) return;

    this.busyAction.set('management-category-delete');
    this.service.deleteTrendyolGoCategoryMapping(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: () => {
          this.setFeedback('success', 'Kategori eslemesi kaldirildi.');
          this.loadManagement();
        },
        error: (error: unknown) => this.setFeedback('error', getErrorMessage(error, 'Esleme kaldirilamadi.'))
      });
  }

  protected editProductOverride(item: ITrendyolGoProductCategoryOverrideApiDto): void {
    this.managementProductOverrideForm.reset({
      id: item.id,
      stockCode: item.stockCode,
      categoryId: item.categoryId
    });
  }

  protected resetProductOverrideForm(): void {
    this.managementProductOverrideForm.reset({ id: null, stockCode: '', categoryId: null });
  }

  protected saveProductOverride(): void {
    if (!this.canUpdate() || this.managementProductOverrideForm.invalid || this.busyAction()) {
      this.managementProductOverrideForm.markAllAsTouched();
      return;
    }
    const value = this.managementProductOverrideForm.getRawValue();
    if (!value.categoryId) return;

    this.busyAction.set('management-product-override');
    this.service.upsertTrendyolGoProductCategoryOverride({
      id: value.id,
      stockCode: value.stockCode.trim(),
      categoryId: value.categoryId
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busyAction.set(null))
    ).subscribe({
      next: () => {
        this.setFeedback('success', 'Urun kategori istisnasi kaydedildi.');
        this.resetProductOverrideForm();
        this.loadManagement();
      },
      error: (error: unknown) =>
        this.setFeedback('error', getErrorMessage(error, 'Urun istisnasi kaydedilemedi.'))
    });
  }

  protected async deleteProductOverride(item: ITrendyolGoProductCategoryOverrideApiDto): Promise<void> {
    if (!this.canUpdate() || this.busyAction()) return;
    if (!await this.confirmDialog.confirm({
      title: 'Urun istisnasi kaldirilsin mi?',
      message: `${item.stockCode} bundan sonra kategori kurallariyla degerlendirilecek.`,
      confirmText: 'Kaldir',
      tone: 'danger'
    })) return;

    this.busyAction.set('management-override-delete');
    this.service.deleteTrendyolGoProductCategoryOverride(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: () => {
          this.setFeedback('success', 'Urun istisnasi kaldirildi.');
          this.loadManagement();
        },
        error: (error: unknown) => this.setFeedback('error', getErrorMessage(error, 'Urun istisnasi kaldirilamadi.'))
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

  protected filterOrdersByStatus(status: string): void {
    this.filterForm.controls.status.setValue(status);
    this.filterForm.controls.page.setValue(0);
    if (this.selectedStoreId()) {
      this.loadOrders();
    }
  }

  protected setOrderDatePreset(preset: 'today' | 'yesterday' | 'last7days'): void {
    const today = new Date();
    const endStr = this.formatDateIso(today);
    if (preset === 'today') {
      this.filterForm.controls.startDate.setValue(endStr);
      this.filterForm.controls.endDate.setValue(endStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today.getTime() - 86_400_000);
      const yStr = this.formatDateIso(y);
      this.filterForm.controls.startDate.setValue(yStr);
      this.filterForm.controls.endDate.setValue(yStr);
    } else {
      const w = new Date(today.getTime() - 7 * 86_400_000);
      this.filterForm.controls.startDate.setValue(this.formatDateIso(w));
      this.filterForm.controls.endDate.setValue(endStr);
    }
    this.filterForm.controls.page.setValue(0);
    if (this.selectedStoreId()) {
      this.loadOrders();
    }
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

  protected applyInvoiceLimitAmount(amount: number | null): void {
    if (amount !== null && Number.isFinite(amount) && amount > 0) {
      this.invoiceForm.controls.invoiceAmount.setValue(amount);
    }
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

  protected applyProductBatchTemplate(): void {
    const action = this.productBatchForm.controls.action.value;
    const storeId = this.selectedStoreId() ?? 402535;
    this.productBatchForm.controls.body.setValue(buildTrendyolGoProductBatchTemplate(action, storeId));
  }

  protected applyPackageTemplate(): void {
    const template = buildTrendyolGoPackageTemplate(this.packageForm.controls.action.value);
    if (template) {
      this.packageForm.controls.body.setValue(template);
    }
  }

  protected applyClaimTemplate(): void {
    const template = buildTrendyolGoClaimTemplate(this.claimForm.controls.action.value);
    if (template) {
      this.claimForm.controls.body.setValue(template);
    }
  }

  protected loadPriceStockPreview(silent = false): void {
    const storeId = this.selectedStoreId();
    if (!storeId || !this.canList()) {
      this.setFeedback('error', 'Fiyat/stok onizlemesi icin magaza secin.');
      return;
    }

    const view = this.priceStockForm.controls.view.value;
    const requestId = ++this.previewRequestId;
    this.loadingPriceStock.set(true);
    this.service.getTrendyolGoPriceStockPreview(
      storeId,
      view
    )
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
        if (requestId === this.previewRequestId) this.loadingPriceStock.set(false);
      }))
      .subscribe({
        next: (preview: TrendyolGoPriceStockPreviewDto) => {
          if (requestId !== this.previewRequestId || this.selectedStoreId() !== storeId) return;
          this.priceStockPreview.set(preview);
          this.keepSelectableBarcodes(preview);
          this.schedulePriceStockPolling(preview);
        },
        error: (error: unknown) => {
          if (!silent && requestId === this.previewRequestId) {
            this.setFeedback('error', getErrorMessage(error, 'Fiyat/stok onizlemesi alinamadi.'));
          }
        }
      });
  }

  protected refreshPriceStockPreview(): void {
    const storeId = this.selectedStoreId();
    if (!storeId || !this.canList() || this.busyAction()) return;

    this.clearPriceStockPolling();
    this.busyAction.set('price-stock-refresh');
    this.service.refreshTrendyolGoPriceStockPreview(storeId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (result: TrendyolGoPriceStockRefreshStatusDto) => {
          this.setFeedback('info', result.message?.trim() || 'Onizleme yenilemesi arka planda hazirlaniyor.');
          this.loadPriceStockPreview(true);
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Fiyat/stok yenilemesi baslatilamadi.'))
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
    const mode = this.priceStockForm.controls.dispatchMode.value;
    const barcodes = Array.from(new Set(this.readyItems()
      .filter((item) => this.selectedBarcodes().has(item.barcode))
      .map((item) => item.barcode)));
    if (!this.canUpdate() || !this.canSubmitPriceStock() || !preview || this.busyAction()) return;
    if (preview.storeId !== this.selectedStoreId() ||
      preview.view !== this.priceStockForm.controls.view.value) {
      this.invalidatePriceStockPreview();
      this.setFeedback('error', 'Magaza veya gorunum degisti. Onizlemeyi yenileyin.');
      return;
    }
    const dispatchCount = this.priceStockDispatchCount();
    const confirmed = await this.confirmDialog.confirm({
      title: 'Fiyat ve stok gonderilsin mi?',
      message: `${preview.storeName}: ${dispatchCount} urun "${this.getPriceStockDispatchModeLabel(mode)}" kapsaminda Trendyol Go'ya gonderilecek. Paketleme sistem tarafinda yapilacak.`,
      confirmText: 'Gonder',
      tone: 'warning'
    });
    if (!confirmed || this.priceStockPreview() !== preview) return;

    this.busyAction.set('price-stock-dispatch');
    this.service.dispatchTrendyolGoPriceStock({
      storeId: preview.storeId,
      previewHash: preview.previewHash,
      mode,
      sendAll: mode === 'changed',
      barcodes: mode === 'selected' ? barcodes : []
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (result: TrendyolGoPriceStockDispatchDto) => {
          const batchIds = this.extractBatchIds(result.upstreamResponses);
          this.priceStockBatchIds.set(batchIds);
          this.priceStockBatchResults.set({});
          this.invalidatePriceStockPreview();
          this.loadBatchWorkflows();
          this.setFeedback('info', batchIds.length
            ? `Gonderim kuyruga alindi. ${batchIds.length} TGO batch sonucu backend tarafindan otomatik izleniyor.`
            : 'Gonderim kuyruga alindi. Otomatik akis durumunu kontrol edin.');
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.invalidatePriceStockPreview();
            this.setFeedback('error', 'Veri degisti. Onizleme yenileniyor; secimi tekrar yapin.');
            this.loadPriceStockPreview();
            return;
          }
          this.setFeedback('error', getErrorMessage(error, 'Fiyat/stok gonderilemedi.'));
        }
      });
  }

  protected getPriceStockDispatchModeLabel(mode = this.priceStockForm.controls.dispatchMode.value): string {
    return ({
      selected: 'Secili hazir urunler',
      changed: 'Tum fiyat/stok farklari',
      'all-existing': 'TGO\'da mevcut tum gecerli urunler'
    } as const)[mode];
  }

  protected checkPriceStockBatch(batchId: string): void {
    if (!batchId || !this.canDetail()) return;
    this.busyAction.set(`batch-query-${batchId}`);
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

  protected getBatchFailedItems(batchResult: unknown): ITrendyolGoBatchFailedItemView[] {
    return parseTrendyolGoBatchFailedItems(batchResult);
  }

  protected getMissingCatalogInfo(batchResult: unknown): { storeId: number | null; barcodes: string[] } {
    return parseTrendyolGoMissingCatalogInfo(batchResult, this.selectedStoreId());
  }

  protected catalogRecoveryMessage(batchId: string): string {
    if (!this.directDispatchAutoCatalogEnabled()) {
      return '';
    }

    const workflow = this.batchWorkflows().find((item) => item.batchRequestId === batchId);
    if (!workflow || workflow.status === 'Pending' || workflow.status === 'Processing') {
      return 'Otomatik katalog kontrolü devam ediyor. Sonuç kesinleşene kadar yeniden göndermeyin.';
    }

    const details = `${workflow.resultSummary || ''} ${workflow.lastError || ''}`
      .toLocaleLowerCase('tr-TR');
    if (details.includes('otomatik katalog akisina alindi')) {
      return 'Eksik ürünler otomatik katalog akışına alındı. Katalog onayından sonra fiyat ve stok gönderimi kendiliğinden devam edecek; yeniden göndermeyin.';
    }

    return 'Ürünlerin stok kodları Trendyol kataloğunda farklı barkodlarla mevcut. Barkod eşleştirmesi kontrol edilmeli.';
  }

  protected async autoCreateFromBatch(storeId: number | null, barcodes: string[]): Promise<void> {
    const targetStoreId = storeId || this.selectedStoreId();
    if (!targetStoreId || !barcodes.length || !this.canUpdate() || this.busyAction()) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Eksik Urunleri Kataloga Aktar',
      message: `Trendyol Go'da bulunamayan ${barcodes.length} adet urun, Mikro ERP'den okunup Trendyol Go kataloguna olusturulacak. Devam edilsin mi?`,
      confirmText: 'Kataloga Aktar',
      tone: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.busyAction.set('auto-create-catalog');
    this.service
      .autoCreateTrendyolGoCatalog({ storeId: targetStoreId, barcodes })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (result: ITrendyolGoCatalogAutoCreateResultApiDto) => {
          if (result.errorMessage) {
            this.setFeedback('error', result.errorMessage);
            return;
          }
          const batchInfo = result.batchRequestIds?.length
            ? ` (Batch ID: ${result.batchRequestIds.join(', ')})`
            : '';
          this.setFeedback(
            'success',
            `${result.createdCount} adet eksik urun Trendyol Go kataloguna gonderildi!${batchInfo} Trendyol katalogu onayladiktan sonra fiyat/stok gonderimini tekrarlayabilirsiniz.`
          );
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Eksik urunler kataloga aktarilamadi.'))
      });
  }

  protected getBatchSummary(result: unknown): ITrendyolGoBatchSummary | null {
    return parseTrendyolGoBatchSummary(result);
  }

  protected loadDirectPreview(): void {
    const storeId = this.selectedStoreId();
    if (!storeId || !this.canList()) {
      this.setFeedback('error', 'Mikro fiyat onizlemesi icin magaza secin.');
      return;
    }

    const { mode, sinceDate, search, take } = this.directPriceStockForm.getRawValue();
    const requestId = ++this.directPreviewRequestId;
    this.loadingDirectPreview.set(true);
    this.directDispatchResult.set(null);

    this.service
      .getTrendyolGoDirectPriceStockPreview({
        storeId,
        mode,
        sinceDate: mode === 'changed' ? sinceDate : null,
        search: search.trim() || null,
        take
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.directPreviewRequestId) this.loadingDirectPreview.set(false);
        })
      )
      .subscribe({
        next: (preview: ITrendyolGoDirectPriceStockPreviewApiDto) => {
          if (requestId !== this.directPreviewRequestId || this.selectedStoreId() !== storeId) return;
          this.directPreview.set(preview);
          this.selectedDirectBarcodes.set(new Set());
          if (!preview.items?.length) {
            this.setFeedback('info', 'Secilen kriterlerde Mikro urun kaydi bulunamadi.');
          }
        },
        error: (error: unknown) => {
          if (requestId === this.directPreviewRequestId) {
            this.setFeedback('error', getErrorMessage(error, 'Mikro fiyat onizlemesi alinamadi.'));
          }
        }
      });
  }

  protected toggleDirectItem(barcode: string): void {
    if (!barcode) return;
    const next = new Set(this.selectedDirectBarcodes());
    if (next.has(barcode)) {
      next.delete(barcode);
    } else {
      next.add(barcode);
    }
    this.selectedDirectBarcodes.set(next);
  }

  protected toggleAllDirectItems(): void {
    const items = this.directItems();
    const allSelected = items.length > 0 && items.every((item) => this.selectedDirectBarcodes().has(item.barcode));
    this.selectedDirectBarcodes.set(allSelected ? new Set() : new Set(items.map((i) => i.barcode)));
  }

  protected toggleDirectStore(storeId: number): void {
    const next = new Set(this.selectedDirectStoreIds());
    if (next.has(storeId)) {
      next.delete(storeId);
    } else {
      next.add(storeId);
    }
    this.selectedDirectStoreIds.set(next);
  }

  protected selectAllDirectStores(): void {
    this.selectedDirectStoreIds.set(new Set(this.stores().map((store) => store.storeId)));
  }

  protected clearDirectStores(): void {
    this.selectedDirectStoreIds.set(new Set());
  }

  protected previewDirectStore(storeId: number): void {
    if (this.loadingDirectPreview()) return;

    this.filterForm.controls.storeId.setValue(storeId);
    this.loadDirectPreview();
  }

  protected async dispatchDirectPriceStock(): Promise<void> {
    if (!this.canUpdate() || this.busyAction()) {
      return;
    }

    const { targetScope, mode, sinceDate, search, autoCreateMissingCatalog } = this.directPriceStockForm.getRawValue();
    const isAllStores = targetScope === 'all';
    const isMultipleStores = targetScope === 'multiple';
    const storeId = this.selectedStoreId();
    const targetStoreIds = isAllStores
      ? []
      : isMultipleStores
        ? this.selectedDirectStores().map((store) => store.storeId)
        : storeId ? [storeId] : [];

    if (!isAllStores && targetStoreIds.length === 0) {
      this.setFeedback('error', isMultipleStores
        ? 'Toplu gonderim icin en az bir magaza secin.'
        : 'Gonderim icin magaza secin veya toplu gonderim kapsami belirleyin.');
      return;
    }

    const selectedBarcodes = Array.from(this.selectedDirectBarcodes());
    const preview = this.directPreview();
    const modeLabel = mode === 'changed' ? 'Degisen Fiyatlar ve Stoklar' : 'Tum Aktif Fiyatlar ve Stoklar';
    const targetLabel = isAllStores
      ? 'TUM MAGAZALAR / SUBELER'
      : isMultipleStores
        ? `${targetStoreIds.length} SECILI MAGAZA / SUBE`
        : (this.selectedStore()?.storeName ?? `Magaza #${storeId}`);
    const scopeDetail = selectedBarcodes.length > 0
      ? `Secili ${selectedBarcodes.length} adet barkod`
      : preview
        ? `Onizlemedeki ${preview.totalCount} adet urun (veya filtreye uyan tumu)`
        : 'Filtreye uyan tum urunler';

    const confirmed = await this.confirmDialog.confirm({
      title: 'Trendyol Go Dogrudan Gonderim Onayi',
      message: `${targetLabel} icin ${scopeDetail} (${modeLabel}) dogrudan Mikro ERP'den okunup Trendyol Go'ya aktarilacak. Devam edilsin mi?`,
      confirmText: 'Dogrudan Gonder',
      tone: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.busyAction.set('direct-price-stock-dispatch');
    const request: ITrendyolGoDirectPriceStockDispatchHttpRequestApiDto = {
      allStores: isAllStores,
      storeIds: targetStoreIds,
      mode,
      sinceDate: mode === 'changed' ? sinceDate : null,
      search: search.trim() || null,
      barcodes: selectedBarcodes.length > 0 ? selectedBarcodes : [],
      autoCreateMissingCatalog
    };

    this.service
      .dispatchTrendyolGoDirectPriceStock(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (result: ITrendyolGoDirectPriceStockDispatchResultApiDto) => {
          this.workflowPollAttempt = 0;
          this.directDispatchCompletionNotified = false;
          this.directDispatchResult.set(result);
          this.directDispatchAutoCatalogEnabled.set(autoCreateMissingCatalog);
          const allBatchIds = result.storeResults.flatMap((storeResult) => [
            ...(storeResult.batchRequestIds || []),
            ...(storeResult.catalogBatchRequestIds || [])
          ]);
          if (allBatchIds.length > 0) {
            this.priceStockBatchIds.set([...new Set(allBatchIds)]);
          }
          this.loadBatchWorkflows();
          const warningStores = result.storeResults.filter((item) => item.workflowStatus === 'QueuedWithWarnings');
          const failedStores = result.storeResults.filter((item) =>
            !item.success && item.workflowStatus !== 'QueuedWithWarnings'
          );
          if (failedStores.length > 0) {
            const catalogPendingStores = failedStores.filter((item) => this.isCatalogPending(item));
            const failedStoreCount = failedStores.length - catalogPendingStores.length;
            if (failedStoreCount === 0) {
              this.setFeedback(
                'info',
                `${catalogPendingStores.length} magazada eksik urunler katalog kuyruguna alindi. Fiyat/stok adimi katalog onayindan sonra otomatik calisacak.`
              );
              return;
            }
            this.setFeedback(
              'error',
              `Gonderim kismen tamamlandi: ${result.targetStoresCount - failedStores.length} magaza basarili, ${catalogPendingStores.length} magaza katalog onayi bekliyor, ${failedStoreCount} magaza hatali.`
            );
            return;
          }
          if (warningStores.length > 0) {
            this.setFeedback(
              'error',
              `${warningStores.length} magazada uygun urunler kuyruga alindi; katalog kurallarini gecemeyen urunler icin satir sonucunu kontrol edin.`
            );
            return;
          }
          const catalogNote = result.totalCatalogCreated && result.totalCatalogCreated > 0
            ? ` ${result.totalCatalogCreated} eksik urun icin katalog ve devam fiyat/stok akisi otomatik izlenecek.`
            : '';
          this.setFeedback(
            'info',
            `Dogrudan aktarim kuyruga alindi: ${result.targetStoresCount} magaza, ${result.totalItemsDispatched} urun TGO batch sonucunu bekliyor.${catalogNote}`
          );
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Dogrudan fiyat ve stok gonderilemedi.'))
      });
  }

  private getManualBatchSummary(batchId: string): ITrendyolGoBatchSummary | null {
    const manual = this.priceStockBatchResults()[batchId];
    return manual ? this.getBatchSummary(manual) : null;
  }

  protected shortBatchId(batchId: string): string {
    return shortTrendyolGoBatchId(batchId);
  }

  protected getBatchChipTone(batchId: string): TrendyolGoLiveTone {
    return this.batchChipToneById().get(batchId) ?? 'info';
  }

  protected getDirectStoreLiveStatus(sr: ITrendyolGoDirectStoreDispatchResultApiDto): ITrendyolGoDirectStoreLiveStatus {
    return this.directStoreLiveStatusByStoreId().get(sr.storeId) ??
      resolveTrendyolGoDirectStoreLiveStatus(sr, this.workflowByBatchId(), (id) => this.getManualBatchSummary(id));
  }

  protected trackDirectStoreResult = (_index: number, result: ITrendyolGoDirectStoreDispatchResultApiDto): number =>
    result.storeId;

  protected trackBatchId = (_index: number, batchId: string): string => batchId;

  protected isCatalogPending(result: ITrendyolGoDirectStoreDispatchResultApiDto): boolean {
    return isTrendyolGoCatalogPending(result);
  }

  protected directStoreStatusLabel(result: ITrendyolGoDirectStoreDispatchResultApiDto): string {
    return formatTrendyolGoDirectStoreStatusLabel(result);
  }

  protected loadBatchWorkflows(): void {
    if (!this.canDetail() || this.loadingBatchWorkflows()) return;

    this.loadingBatchWorkflows.set(true);
    this.service.getTrendyolGoWorkflowStatus(100)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingBatchWorkflows.set(false))
      )
      .subscribe({
        next: (status: ITrendyolGoWorkflowStatusApiDto) => {
          this.batchWorkflows.set(status.batchWorkflows ?? []);
          this.branchPosSyncTasks.set(status.branchPosSyncTasks ?? []);
          const summary = this.directDispatchSummary();
          if (summary && !summary.isPending && !this.directDispatchCompletionNotified) {
            this.directDispatchCompletionNotified = true;
            this.setFeedback(
              summary.tone === 'success' ? 'success' : 'error',
              `${summary.title}: ${summary.subtitle}`
            );
          }
          this.scheduleBatchWorkflowPolling();
        },
        error: () => this.scheduleBatchWorkflowPolling()
      });
  }

  protected batchWorkflowLabel(item: ITrendyolGoBatchWorkflowApiDto): string {
    return formatTrendyolGoBatchWorkflowLabel(item);
  }

  protected batchWorkflowKindLabel(item: ITrendyolGoBatchWorkflowApiDto): string {
    return formatTrendyolGoBatchWorkflowKindLabel(item);
  }

  protected getStoreLabelForWarehouse(warehouseNo: number, storeId?: number): string {
    const matched = this.stores().find(
      (s) => (storeId && s.storeId === storeId) || s.warehouseNo === warehouseNo
    );
    return matched ? `${matched.storeName} (Depo ${warehouseNo})` : `Depo ${warehouseNo}`;
  }

  protected getPriceDelta(item: ITrendyolGoPriceStockPreviewItemApiDto): number | null {
    return calculateTrendyolGoPriceDelta(item);
  }

  protected getStockDelta(item: ITrendyolGoPriceStockPreviewItemApiDto): number | null {
    return calculateTrendyolGoStockDelta(item);
  }

  private scheduleBatchWorkflowPolling(): void {
    if (this.workflowPollTimer !== undefined) {
      window.clearTimeout(this.workflowPollTimer);
      this.workflowPollTimer = undefined;
    }

    if (this.activeTrackingCount() === 0) {
      this.workflowPollAttempt = 0;
      return;
    }

    const visibleDelay = Math.min(15_000, 5_000 + this.workflowPollAttempt * 2_500);
    const delay = document.hidden ? 30_000 : visibleDelay;
    this.workflowPollAttempt++;
    this.workflowPollTimer = window.setTimeout(() => {
      this.workflowPollTimer = undefined;
      this.loadBatchWorkflows();
    }, delay);
  }

  protected trackBranchPosTask = (_index: number, task: ITrendyolGoBranchPosSyncTaskApiDto): string => task.id;

  private invalidateDirectPreview(): void {
    this.directPreviewRequestId++;
    this.loadingDirectPreview.set(false);
    this.directPreview.set(null);
    this.selectedDirectBarcodes.set(new Set());
    this.directDispatchResult.set(null);
    this.directDispatchAutoCatalogEnabled.set(false);
  }

  protected loadCatalogSyncPreview(): void {
    const storeId = this.selectedStoreId();
    if (!storeId || !this.canList() || this.catalogSyncForm.invalid) {
      this.setFeedback('error', 'Katalog aktarim onizlemesi icin magaza ve gecerli limit secin.');
      return;
    }

    const { view, take, search } = this.catalogSyncForm.getRawValue();
    this.loadingCatalogSync.set(true);
    this.service.getTrendyolGoCatalogPreview(storeId, view, take, search)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingCatalogSync.set(false))
      )
      .subscribe({
        next: (preview: TrendyolGoCatalogPreviewDto) => {
          if (this.selectedStoreId() !== storeId) return;
          this.catalogSyncPreview.set(preview);
          this.keepSelectableCatalogBarcodes(preview);
        },
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Katalog aktarim onizlemesi alinamadi.'))
      });
  }

  protected toggleCatalogItem(item: ITrendyolGoCatalogPreviewItemApiDto): void {
    if (item.status !== 'Ready' || !item.barcode) return;
    const next = new Set(this.selectedCatalogBarcodes());
    if (next.has(item.barcode)) next.delete(item.barcode);
    else next.add(item.barcode);
    this.selectedCatalogBarcodes.set(next);
  }

  protected toggleAllCatalogReadyItems(): void {
    const ready = this.catalogReadyItems();
    const allSelected = ready.length > 0 && ready.every((item) =>
      this.selectedCatalogBarcodes().has(item.barcode)
    );
    this.selectedCatalogBarcodes.set(
      allSelected ? new Set() : new Set(ready.map((item) => item.barcode))
    );
  }

  protected async dispatchCatalog(sendAll: boolean): Promise<void> {
    const preview = this.catalogSyncPreview();
    const barcodes = Array.from(new Set(this.catalogReadyItems()
      .filter((item) => this.selectedCatalogBarcodes().has(item.barcode))
      .map((item) => item.barcode)));

    if (!this.canUpdate() || !this.canDispatchCatalog() || !preview ||
      (!sendAll && !barcodes.length) || this.busyAction()) {
      return;
    }

    if (preview.storeId !== this.selectedStoreId()) {
      this.invalidateCatalogSyncPreview();
      this.setFeedback('error', 'Magaza degisti. Katalog onizlemesini yeniden alin.');
      return;
    }

    const previewHash = preview.previewHash?.trim();
    if (!previewHash) {
      this.invalidateCatalogSyncPreview();
      this.setFeedback('error', 'Katalog onizlemesi gecersiz. Onizlemeyi yeniden alin.');
      return;
    }

    const dispatchCount = sendAll ? preview.readyCount : barcodes.length;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Yeni urunler TGO kataloguna gonderilsin mi?',
      message: `${preview.storeName || this.selectedStore()?.storeName || 'Secili magaza'}: ${dispatchCount} yeni urun olusturma icin gonderilecek. Batch sonucu tamamlanmadan fiyat/stok gondermeyin.`,
      confirmText: 'Gonder',
      tone: 'warning'
    });
    if (!confirmed || this.catalogSyncPreview() !== preview) return;

    this.busyAction.set('catalog-sync-dispatch');
    this.service.dispatchTrendyolGoCatalog({
      storeId: preview.storeId,
      previewHash,
      sendAll,
      barcodes: sendAll ? [] : barcodes
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (result: TrendyolGoCatalogDispatchDto) => {
          const batchIds = this.extractBatchIds(result.upstreamResponses);
          this.catalogBatchIds.set(batchIds);
          this.catalogBatchResults.set({});
          this.invalidateCatalogSyncPreview();
          const sentCount = result.sentCount ?? dispatchCount;
          const nextStep = result.nextStep?.trim();
          this.setFeedback('success', batchIds.length
            ? `${sentCount} urun katalog aktarimina alindi. ${batchIds.length} batch sonucunu kontrol edin.${nextStep ? ` ${nextStep}` : ''}`
            : `${sentCount} urun katalog aktarimina alindi.${nextStep ? ` ${nextStep}` : ' Guncel katalog onizlemesini kontrol edin.'}`);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.invalidateCatalogSyncPreview();
            this.setFeedback('error', 'Katalog verisi degisti. Yeni onizleme alin ve secimi tekrarlayin.');
            return;
          }
          this.setFeedback('error', getErrorMessage(error, 'Katalog urunleri gonderilemedi.'));
        }
      });
  }

  protected checkCatalogBatch(batchId: string): void {
    if (!batchId || !this.canDetail() || this.busyAction()) return;
    this.busyAction.set(`batch-query-${batchId}`);
    this.service.getTrendyolGoProductBatchRequest(batchId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (result: TrendyolGoJsonDto) => this.catalogBatchResults.update((current) => ({
          ...current,
          [batchId]: result
        })),
        error: (error: unknown) =>
          this.setFeedback('error', getErrorMessage(error, 'Katalog batch sonucu alinamadi.'))
      });
  }

  private invalidatePriceStockPreview(): void {
    this.previewRequestId++;
    this.clearPriceStockPolling();
    this.priceStockPreview.set(null);
    this.selectedBarcodes.set(new Set());
    this.loadingPriceStock.set(false);
  }

  private invalidateCatalogSyncPreview(): void {
    this.catalogSyncPreview.set(null);
    this.selectedCatalogBarcodes.set(new Set());
    this.loadingCatalogSync.set(false);
  }

  private keepSelectableBarcodes(preview: TrendyolGoPriceStockPreviewDto): void {
    const selectable = new Set(preview.items
      .filter((item) => item.status === 'Ready' && !!item.barcode)
      .map((item) => item.barcode));
    this.selectedBarcodes.update((current) => new Set([...current].filter((barcode) => selectable.has(barcode))));
  }

  private keepSelectableCatalogBarcodes(preview: TrendyolGoCatalogPreviewDto): void {
    const selectable = new Set((preview.items ?? [])
      .filter((item) => item.status === 'Ready' && !!item.barcode)
      .map((item) => item.barcode as string));
    this.selectedCatalogBarcodes.update((current) =>
      new Set([...current].filter((barcode) => selectable.has(barcode)))
    );
  }

  private schedulePriceStockPolling(preview: TrendyolGoPriceStockPreviewDto): void {
    this.clearPriceStockPolling();
    if (preview.snapshotStatus !== 'Preparing' && preview.snapshotStatus !== 'Refreshing') return;

    const requestId = this.previewRequestId;
    this.priceStockPollTimer = window.setTimeout(() => {
      if (requestId === this.previewRequestId) this.loadPriceStockPreview(true);
    }, 3_000);
  }

  private clearPriceStockPolling(): void {
    if (this.priceStockPollTimer !== undefined) {
      window.clearTimeout(this.priceStockPollTimer);
      this.priceStockPollTimer = undefined;
    }
  }

  private extractBatchIds(responses: readonly JsonRecord[] | null | undefined): string[] {
    return extractTrendyolGoBatchIds(responses);
  }

  protected async submitPackageAction(): Promise<void> {
    const value = this.packageForm.getRawValue();
    const packageIds = splitTrendyolGoIdentifiers(value.packageIds);
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
    return getTrendyolGoOrderNumber(order);
  }

  protected getPackageId(order: JsonRecord): string {
    return getTrendyolGoPackageId(order);
  }

  protected getOrderId(order: JsonRecord): string {
    return getTrendyolGoOrderId(order);
  }

  protected getOrderStatus(order: JsonRecord): string {
    return getTrendyolGoOrderStatus(order);
  }

  protected getOrderStatusLabel(rawStatus: string): string {
    return getTrendyolGoOrderStatusLabel(rawStatus);
  }

  protected getOrderStatusTone(rawStatus: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
    return getTrendyolGoOrderStatusTone(rawStatus);
  }

  protected getCustomerName(order: JsonRecord): string {
    return getTrendyolGoCustomerName(order);
  }

  protected getOrderItemCount(order: JsonRecord): number {
    return extractTrendyolGoOrderLines(order).length;
  }

  protected getOrderDate(order: JsonRecord): string {
    return getTrendyolGoOrderDate(order);
  }

  protected getOrderAmount(order: JsonRecord): string {
    return getTrendyolGoOrderAmount(order);
  }

  protected isBusy(prefix: string, order: JsonRecord): boolean {
    const packageId = this.getPackageId(order);
    const orderId = this.getOrderId(order);
    return this.busyAction() === `${prefix}:${prefix === 'limits' ? orderId : packageId}`;
  }

  protected trackByStore = (_index: number, store: TrendyolGoStoreMappingDto): number => store.storeId;
  protected trackByOrder = (index: number, order: JsonRecord): string =>
    this.getPackageId(order) || this.getOrderId(order) || this.getOrderNumber(order) || `${index}`;

  private extractOrderLinesFromRecord(record: JsonRecord): ITrendyolGoOrderLineView[] {
    return extractTrendyolGoOrderLines(record);
  }

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

  private getPackageActionLabel(action: Exclude<PackageAction, 'read'>): string {
    return ({ unsupplied: 'tedarik edememe', alternative: 'alternatif urun', 'manual-shipped': 'manuel sevk', 'manual-delivered': 'manuel teslimat', 'invoice-link': 'fatura linki' } as const)[action];
  }

  private getClaimActionLabel(action: Exclude<ClaimAction, 'read' | 'objectionable'>): string {
    return ({ accept: 'kabul', reject: 'red', objections: 'itiraz' } as const)[action];
  }

  private extractRows(response: TrendyolGoJsonDto | null): JsonRecord[] {
    return extractTrendyolGoRows(response);
  }

  private getNumericValue(record: JsonRecord | TrendyolGoJsonDto, ...paths: string[]): number | null {
    return getTrendyolGoNumericValue(record, ...paths);
  }

  private isRecord(value: unknown): value is JsonRecord {
    return isTrendyolGoRecord(value);
  }

  private toTimestamp(value: string, endOfDay: boolean): number | null {
    return toTrendyolGoTimestamp(value, endOfDay);
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

  private formatDateIso(date: Date): string {
    return formatTrendyolGoDateIso(date);
  }

  private getToday(): string {
    return this.formatDateIso(new Date());
  }
}
