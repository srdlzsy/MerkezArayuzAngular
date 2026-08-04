import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type {
  GreenGrocerOperationsAdjustmentApplyDto,
  GreenGrocerOperationsAdjustmentApplyHttpRequest,
  GreenGrocerOperationsAdjustmentDirection,
  GreenGrocerOperationsAdjustmentLineHttpRequest,
  GreenGrocerOperationsAdjustmentPreviewDto,
  GreenGrocerOperationsAdjustmentPreviewHttpRequest,
  GreenGrocerOperationsOverviewDto,
  GreenGrocerOperationsOverviewHttpRequest,
  GreenGrocerOperationsOverviewItemDto,
  GreenGrocerOperationsStatusSummaryDto,
  GreenGrocerOperationsTypeCode
} from '@interfaces';
import { finalize } from 'rxjs';

import { GreenGrocerService } from '../../../../../core/api/module-services/green-grocer.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  toPositiveWarehouseNo
} from '../../../core/admin-warehouse.helpers';

type FeedbackTone = 'error' | 'info' | 'success';
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'status'
  | 'stock'
  | 'purchase'
  | 'adjustment'
  | 'order'
  | 'estimated'
  | 'shipment'
  | 'currentStock'
  | 'count';

interface PageFeedback {
  tone: FeedbackTone;
  title: string;
  message: string;
}

interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

interface MetricCard {
  label: string;
  value: string;
  hint: string;
}

const TASK_ID = 'green-grocer-operations';
const LIST_PERMISSION = 'green-grocer.operations.list';
const CREATE_PERMISSION = 'green-grocer.operations.create';
const ALL_WAREHOUSES_PERMISSION = 'green-grocer.operations.all-warehouses';

const TYPE_OPTIONS: readonly SelectOption<GreenGrocerOperationsTypeCode>[] = [
  { value: 'all', label: 'Tum Tipler' },
  { value: '10', label: '10 Manav' },
  { value: '11', label: '11 Paket' },
  { value: '12', label: '12 Yesillik' },
  { value: '23', label: '23 Sarf' }
];

const DIRECTION_OPTIONS: readonly SelectOption<GreenGrocerOperationsAdjustmentDirection>[] = [
  { value: 'increase', label: 'Stok Artis' },
  { value: 'decrease', label: 'Stok Azalis' }
];

@Component({
  selector: 'app-green-grocer-operations-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './green-grocer-operations-list.component.html',
  styleUrl: './green-grocer-operations-list.component.scss'
})
export class GreenGrocerOperationsListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly directionOptions = DIRECTION_OPTIONS;
  protected readonly maxDate = this.getToday();

  protected readonly filtersForm = new FormGroup({
    startDate: new FormControl(this.addDays(this.getToday(), -7), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    endDate: new FormControl(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    warehouseNo: new FormControl<number | null>(56, {
      validators: [Validators.min(1)]
    }),
    typeCode: new FormControl<GreenGrocerOperationsTypeCode>('all', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    onlyWithActivity: new FormControl(true, { nonNullable: true }),
    take: new FormControl(500, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(2000)]
    })
  });

  protected readonly adjustmentForm = new FormGroup({
    warehouseNo: new FormControl<number | null>(56, {
      validators: [Validators.min(1)]
    }),
    stockCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)]
    }),
    direction: new FormControl<GreenGrocerOperationsAdjustmentDirection>('increase', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    quantity: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.0001)]
    }),
    movementDate: new FormControl(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentDate: new FormControl(this.getToday(), { nonNullable: true }),
    documentNo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    documentSerie: new FormControl('MNVE', {
      nonNullable: true,
      validators: [Validators.maxLength(12)]
    }),
    counterWarehouseNo: new FormControl<number | null>(1, { validators: [Validators.min(1)] }),
    reasonCode: new FormControl('weighing-difference', {
      nonNullable: true,
      validators: [Validators.maxLength(80)]
    }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
    creator: new FormControl('MANAV', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    acceptor: new FormControl('MERKEZ', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    unitPointer: new FormControl<number | null>(1, { validators: [Validators.min(1)] }),
    unitPrice: new FormControl<number | null>(0, { validators: [Validators.min(0)] })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly greenGrocerService = inject(GreenGrocerService);
  private readonly quantityFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private readonly amountFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private loadSequence = 0;

  protected readonly overview = signal<GreenGrocerOperationsOverviewDto | null>(null);
  protected readonly feedback = signal<PageFeedback | null>(null);
  protected readonly adjustmentFeedback = signal<PageFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isPreviewing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly sortKey = signal<SortKey>('stock');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly selectedDetail = signal<GreenGrocerOperationsOverviewItemDto | null>(null);
  protected readonly adjustmentSourceItem = signal<GreenGrocerOperationsOverviewItemDto | null>(null);
  protected readonly isDetailDialogOpen = signal(false);
  protected readonly isAdjustmentDialogOpen = signal(false);
  protected readonly adjustmentPreview = signal<GreenGrocerOperationsAdjustmentPreviewDto | null>(null);
  protected readonly adjustmentResult = signal<GreenGrocerOperationsAdjustmentApplyDto | null>(null);
  protected readonly clientRequestId = signal('');
  protected readonly adjustmentClientRequestId = computed(() => this.clientRequestId());
  protected readonly previewSignature = signal('');

  protected readonly permissionCodes = computed(() =>
    this.uniquePermissionCodes(this.authService.getTaskPermissionCodes(TASK_ID))
  );
  protected readonly currentUser = computed(() => this.authService.currentUser());
  protected readonly canOpenPage = computed(() => this.authService.hasTaskAccess(TASK_ID));
  protected readonly canListOperations = computed(() => this.hasPermission(LIST_PERMISSION));
  protected readonly canCreateAdjustment = computed(() => this.hasPermission(CREATE_PERMISSION));
  protected readonly canUseAllWarehouses = computed(() =>
    currentUserHasPermission(this.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );
  protected readonly warehouseScopeLabel = computed(() => {
    if (this.canUseAllWarehouses()) {
      return 'Depo secilebilir';
    }

    return formatCurrentWarehouseLabel(this.currentUser());
  });
  protected readonly userWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.currentUser())
  );
  protected readonly pageRangeLabel = computed(() => {
    const overview = this.overview();
    const startDate = overview?.startDate ?? this.filtersForm.controls.startDate.value;
    const endDate = overview?.endDate ?? this.filtersForm.controls.endDate.value;

    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  });
  protected readonly metricCards = computed<MetricCard[]>(() => {
    const current = this.overview();

    return [
      {
        label: 'Urun',
        value: String(current?.productCount ?? 0),
        hint: 'Aktif satir'
      },
      {
        label: 'Alis',
        value: this.formatQuantity(current?.totalPurchaseQuantity),
        hint: this.formatMoney(current?.totalPurchaseAmount)
      },
      {
        label: 'MNV Net',
        value: this.formatQuantity(current?.totalAdjustmentNetQuantity),
        hint: 'Artis - azalis'
      },
      {
        label: 'Talep',
        value: this.formatQuantity(current?.totalOrderInputQuantity),
        hint: 'Kasa/adet girisi'
      },
      {
        label: 'Tahmini',
        value: this.formatQuantity(current?.totalOrderEstimatedQuantity),
        hint: 'Mikro miktar'
      },
      {
        label: 'Sevk',
        value: this.formatQuantity(current?.totalShipmentQuantity),
        hint: 'Gerceklesen'
      },
      {
        label: 'Stok',
        value: this.formatQuantity(current?.totalCurrentStockQuantity),
        hint: current?.warehouseName?.trim() || 'Depo'
      }
    ];
  });
  protected readonly sortedItems = computed(() => {
    const rows = [...(this.overview()?.items ?? [])];
    const key = this.sortKey();
    const directionMultiplier = this.sortDirection() === 'asc' ? 1 : -1;

    return rows.sort((left, right) => this.compareRows(left, right, key) * directionMultiplier);
  });
  protected readonly statusSummaries = computed(() => this.overview()?.statusSummaries ?? []);
  protected readonly selectedDetailTitle = computed(() => {
    const item = this.selectedDetail();
    return item ? this.getProductTitle(item) : 'Satir Detayi';
  });
  protected readonly adjustmentDialogTitle = computed(() => {
    const item = this.adjustmentSourceItem();
    return item ? this.getProductTitle(item) : 'MNV Duzeltme';
  });
  protected readonly selectedDetailItem = computed(() => this.selectedDetail());
  protected readonly selectedAdjustmentItem = computed(() => this.adjustmentSourceItem());
  protected readonly preview = computed(() => this.adjustmentPreview());
  protected readonly isPreviewFresh = computed(
    () => !!this.adjustmentPreview() && this.previewSignature() === this.buildAdjustmentSignature()
  );

  protected readonly trackByMetric = (_index: number, item: MetricCard): string => item.label;
  protected readonly trackByStatus = (_index: number, item: GreenGrocerOperationsStatusSummaryDto): string =>
    item.statusCode;
  protected readonly trackByItem = (_index: number, item: GreenGrocerOperationsOverviewItemDto): string =>
    item.stockCode;
  protected readonly trackByOption = (_index: number, item: SelectOption): string => item.value;

  constructor() {
    this.adjustmentForm.controls.direction.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((direction: GreenGrocerOperationsAdjustmentDirection) =>
        this.syncDocumentSerie(direction)
      );

    this.adjustmentForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.adjustmentPreview.set(null);
        this.adjustmentResult.set(null);
        this.previewSignature.set('');
      });

    this.loadOverview();
  }

  protected loadOverview(successFeedback?: PageFeedback): void {
    if (!this.canListOperations()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki Yok',
        message: 'Manav operasyon ozetini listelemek icin list yetkisi gerekiyor.'
      });
      return;
    }

    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      this.feedback.set({
        tone: 'error',
        title: 'Filtre Eksik',
        message: 'Tarih araligi, limit ve depo alanlarini kontrol edin.'
      });
      return;
    }

    const request = this.buildOverviewRequest();
    const sequence = ++this.loadSequence;

    this.feedback.set(null);
    this.isLoading.set(true);
    this.greenGrocerService
      .getOperationsOverview(request)
      .pipe(
        finalize(() => {
          if (sequence === this.loadSequence) {
            this.isLoading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (overview: GreenGrocerOperationsOverviewDto) => {
          if (sequence !== this.loadSequence) {
            return;
          }

          this.overview.set(this.normalizeOverview(overview));
          this.feedback.set(successFeedback ?? null);
        },
        error: (error: unknown) => {
          if (sequence !== this.loadSequence) {
            return;
          }

          this.overview.set(null);
          this.feedback.set({
            tone: 'error',
            title: 'Liste Alinamadi',
            message: this.getErrorMessage(error)
          });
        }
      });
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set(key === 'stock' || key === 'status' ? 'asc' : 'desc');
  }

  protected getSortMark(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ^' : ' v';
  }

  protected setSort(key: SortKey): void {
    this.sortBy(key);
  }

  protected getSortLabel(key: SortKey): string {
    return this.getSortMark(key);
  }

  protected openDetail(item: GreenGrocerOperationsOverviewItemDto): void {
    this.selectedDetail.set(item);
    this.isDetailDialogOpen.set(true);
  }

  protected openDetailDialog(item: GreenGrocerOperationsOverviewItemDto): void {
    this.openDetail(item);
  }

  protected closeDetailDialog(): void {
    this.isDetailDialogOpen.set(false);
    this.selectedDetail.set(null);
  }

  protected openAdjustmentDialog(item: GreenGrocerOperationsOverviewItemDto | null = null): void {
    if (!this.canCreateAdjustment()) {
      this.feedback.set({
        tone: 'error',
        title: 'Yetki Yok',
        message: 'MNV duzeltmesi kaydetmek icin create yetkisi gerekiyor.'
      });
      return;
    }

    const suggestedQuantity = this.getSuggestedAdjustmentQuantity(item);
    const direction: GreenGrocerOperationsAdjustmentDirection = suggestedQuantity < 0 ? 'decrease' : 'increase';
    const quantity = Math.abs(suggestedQuantity) || null;
    const warehouseNo = this.getEffectiveWarehouseNo();

    this.adjustmentSourceItem.set(item);
    this.clientRequestId.set(this.generateClientRequestId());
    this.adjustmentPreview.set(null);
    this.adjustmentResult.set(null);
    this.previewSignature.set('');
    this.adjustmentFeedback.set(null);
    this.adjustmentForm.reset({
      warehouseNo,
      stockCode: item?.stockCode ?? '',
      direction,
      quantity,
      movementDate: this.getToday(),
      documentDate: this.getToday(),
      documentNo: '',
      documentSerie: this.getDefaultDocumentSerie(direction),
      counterWarehouseNo: 1,
      reasonCode: 'weighing-difference',
      description: item ? `${item.stockCode} ic tartim farki` : '',
      creator: 'MANAV',
      acceptor: 'MERKEZ',
      unitPointer: 1,
      unitPrice: 0
    });
    this.isAdjustmentDialogOpen.set(true);
  }

  protected closeAdjustmentDialog(): void {
    if (this.isSaving() || this.isPreviewing()) {
      return;
    }

    this.isAdjustmentDialogOpen.set(false);
    this.adjustmentSourceItem.set(null);
    this.adjustmentFeedback.set(null);
    this.adjustmentPreview.set(null);
    this.adjustmentResult.set(null);
    this.previewSignature.set('');
  }

  protected applyDirectionDefaults(): void {
    this.syncDocumentSerie(this.adjustmentForm.controls.direction.value);
  }

  protected previewAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      this.adjustmentFeedback.set({
        tone: 'error',
        title: 'Bilgi Eksik',
        message: 'Stok kodu, yon, tarih ve miktar alanlarini kontrol edin.'
      });
      return;
    }

    const request = this.buildAdjustmentPreviewRequest();
    const signature = this.buildAdjustmentSignature();

    this.isPreviewing.set(true);
    this.adjustmentFeedback.set(null);
    this.greenGrocerService
      .previewOperationsAdjustment(request)
      .pipe(
        finalize(() => this.isPreviewing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (preview: GreenGrocerOperationsAdjustmentPreviewDto) => {
          this.adjustmentPreview.set(preview);
          this.previewSignature.set(signature);
          this.adjustmentFeedback.set({
            tone: 'success',
            title: 'Onizleme Hazir',
            message: `${preview.directionName} / ${preview.documentSerie} / ${this.formatQuantity(preview.totalQuantity)}`
          });
        },
        error: (error: unknown) => {
          this.adjustmentPreview.set(null);
          this.previewSignature.set('');
          this.adjustmentFeedback.set({
            tone: 'error',
            title: 'Onizleme Alinamadi',
            message: this.getErrorMessage(error)
          });
        }
      });
  }

  protected saveAdjustment(): void {
    if (!this.canCreateAdjustment()) {
      return;
    }

    if (!this.isPreviewFresh()) {
      this.adjustmentFeedback.set({
        tone: 'error',
        title: 'Onizleme Gerekli',
        message: 'Kaydetmeden once guncel bilgilerle onizleme alin.'
      });
      return;
    }

    const request = this.buildAdjustmentApplyRequest();

    this.isSaving.set(true);
    this.adjustmentFeedback.set(null);
    this.greenGrocerService
      .applyOperationsAdjustment(request)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result: GreenGrocerOperationsAdjustmentApplyDto) => {
          this.adjustmentResult.set(result);
          this.adjustmentFeedback.set({
            tone: 'success',
            title: 'Duzeltme Yazildi',
            message: `${result.documentSerie}/${result.documentOrderNo} olustu.`
          });
          this.loadOverview({
            tone: 'success',
            title: 'Panel Guncellendi',
            message: 'MNV duzeltmesi sonrasi operasyon ozeti yenilendi.'
          });
        },
        error: (error: unknown) => {
          this.adjustmentFeedback.set({
            tone: 'error',
            title: 'Kayit Basarisiz',
            message: this.getErrorMessage(error)
          });
        }
      });
  }

  protected formatQuantity(value: number | null | undefined): string {
    return this.quantityFormatter.format(this.toNumber(value));
  }

  protected formatSignedQuantity(value: number | null | undefined): string {
    const numberValue = this.toNumber(value);
    const prefix = numberValue > 0 ? '+' : '';
    return `${prefix}${this.formatQuantity(numberValue)}`;
  }

  protected formatMoney(value: number | null | undefined): string {
    return `${this.amountFormatter.format(this.toNumber(value))} TL`;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    return value.slice(0, 10).split('-').reverse().join('.');
  }

  protected getProductTitle(item: GreenGrocerOperationsOverviewItemDto): string {
    return item.stockName?.trim() || item.stockCode;
  }

  protected getTypeLabel(typeCode: string | null | undefined): string {
    switch (typeCode?.trim()) {
      case '10':
        return '10 Manav';
      case '11':
        return '11 Paket';
      case '12':
        return '12 Yesillik';
      case '23':
        return '23 Sarf';
      default:
        return typeCode?.trim() || '-';
    }
  }

  protected getStatusClass(
    itemOrStatusCode: GreenGrocerOperationsOverviewItemDto | string | null | undefined
  ): string {
    const status =
      typeof itemOrStatusCode === 'string'
        ? itemOrStatusCode.toLowerCase()
        : itemOrStatusCode?.primaryStatusCode?.toLowerCase() ?? '';

    if (status.includes('risk') || status.includes('negative') || status.includes('problem')) {
      return 'status-danger';
    }

    if (status.includes('missing') || status.includes('warning') || status.includes('open')) {
      return 'status-warning';
    }

    return 'status-balanced';
  }

  protected getFlagText(item: GreenGrocerOperationsOverviewItemDto): string {
    return item.flags?.length ? item.flags.join(', ') : '-';
  }

  private buildOverviewRequest(): GreenGrocerOperationsOverviewHttpRequest {
    const raw = this.filtersForm.getRawValue();
    const warehouseNo = this.canUseAllWarehouses()
      ? toPositiveWarehouseNo(raw.warehouseNo)
      : null;
    const typeCode = raw.typeCode === 'all' || raw.typeCode === 'tum' ? null : raw.typeCode;
    const take = Math.min(Math.max(Number(raw.take) || 500, 1), 2000);

    return {
      startDate: raw.startDate,
      endDate: raw.endDate,
      warehouseNo,
      typeCode,
      search: raw.search.trim() || null,
      onlyWithActivity: raw.onlyWithActivity,
      take
    };
  }

  private buildAdjustmentPreviewRequest(): GreenGrocerOperationsAdjustmentPreviewHttpRequest {
    const raw = this.adjustmentForm.getRawValue();

    return {
      warehouseNo: this.canUseAllWarehouses() ? toPositiveWarehouseNo(raw.warehouseNo) : null,
      direction: raw.direction,
      movementDate: raw.movementDate,
      documentSerie: raw.documentSerie.trim() || null,
      reasonCode: raw.reasonCode.trim() || null,
      lines: [this.buildAdjustmentLine()]
    };
  }

  private buildAdjustmentApplyRequest(): GreenGrocerOperationsAdjustmentApplyHttpRequest {
    const raw = this.adjustmentForm.getRawValue();

    return {
      ...this.buildAdjustmentPreviewRequest(),
      clientRequestId: this.clientRequestId(),
      documentDate: raw.documentDate || null,
      documentNo: raw.documentNo.trim() || null,
      counterWarehouseNo: toPositiveWarehouseNo(raw.counterWarehouseNo),
      description: raw.description.trim() || null,
      creator: raw.creator.trim() || null,
      acceptor: raw.acceptor.trim() || null
    };
  }

  private buildAdjustmentLine(): GreenGrocerOperationsAdjustmentLineHttpRequest {
    const raw = this.adjustmentForm.getRawValue();

    return {
      stockCode: raw.stockCode.trim(),
      quantity: Number(raw.quantity) || 0,
      unitPointer: raw.unitPointer,
      unitPrice: raw.unitPrice,
      description: raw.description.trim() || null
    };
  }

  private buildAdjustmentSignature(): string {
    const raw = this.adjustmentForm.getRawValue();

    return JSON.stringify({
      warehouseNo: this.canUseAllWarehouses() ? toPositiveWarehouseNo(raw.warehouseNo) : null,
      stockCode: raw.stockCode.trim(),
      direction: raw.direction,
      quantity: Number(raw.quantity) || 0,
      movementDate: raw.movementDate,
      documentSerie: raw.documentSerie.trim(),
      reasonCode: raw.reasonCode.trim(),
      unitPointer: raw.unitPointer,
      unitPrice: raw.unitPrice,
      description: raw.description.trim()
    });
  }

  private getEffectiveWarehouseNo(): number | null {
    if (this.canUseAllWarehouses()) {
      return toPositiveWarehouseNo(this.filtersForm.controls.warehouseNo.value) ?? 56;
    }

    return null;
  }

  private getSuggestedAdjustmentQuantity(
    item: GreenGrocerOperationsOverviewItemDto | null
  ): number {
    const countDifference = this.toNumber(item?.countDifferenceAtCountDate);

    if (countDifference !== 0) {
      return countDifference;
    }

    return 0;
  }

  private syncDocumentSerie(direction: GreenGrocerOperationsAdjustmentDirection): void {
    this.adjustmentForm.controls.documentSerie.setValue(this.getDefaultDocumentSerie(direction), {
      emitEvent: false
    });
  }

  private getDefaultDocumentSerie(direction: GreenGrocerOperationsAdjustmentDirection): string {
    return direction === 'decrease' ? 'MNVF' : 'MNVE';
  }

  private normalizeOverview(
    overview: GreenGrocerOperationsOverviewDto | null | undefined
  ): GreenGrocerOperationsOverviewDto {
    return {
      warehouseNo: overview?.warehouseNo ?? null,
      warehouseName: overview?.warehouseName ?? null,
      startDate: overview?.startDate ?? this.filtersForm.controls.startDate.value,
      endDate: overview?.endDate ?? this.filtersForm.controls.endDate.value,
      productCount: overview?.productCount ?? overview?.items?.length ?? 0,
      totalCurrentStockQuantity: this.toNumber(overview?.totalCurrentStockQuantity),
      totalPurchaseQuantity: this.toNumber(overview?.totalPurchaseQuantity),
      totalPurchaseAmount: this.toNumber(overview?.totalPurchaseAmount),
      totalAdjustmentInQuantity: this.toNumber(overview?.totalAdjustmentInQuantity),
      totalAdjustmentOutQuantity: this.toNumber(overview?.totalAdjustmentOutQuantity),
      totalAdjustmentNetQuantity: this.toNumber(overview?.totalAdjustmentNetQuantity),
      totalOrderInputQuantity: this.toNumber(overview?.totalOrderInputQuantity),
      totalOrderEstimatedQuantity: this.toNumber(overview?.totalOrderEstimatedQuantity),
      totalShipmentQuantity: this.toNumber(overview?.totalShipmentQuantity),
      totalLatestCountQuantity: this.toNumber(overview?.totalLatestCountQuantity),
      statusSummaries: overview?.statusSummaries ?? [],
      items: overview?.items ?? []
    };
  }

  private compareRows(
    left: GreenGrocerOperationsOverviewItemDto,
    right: GreenGrocerOperationsOverviewItemDto,
    key: SortKey
  ): number {
    switch (key) {
      case 'status':
        return (left.primaryStatusName || '').localeCompare(right.primaryStatusName || '', 'tr-TR');
      case 'stock':
        return this.getProductTitle(left).localeCompare(this.getProductTitle(right), 'tr-TR', {
          numeric: true,
          sensitivity: 'base'
        });
      case 'purchase':
        return this.toNumber(left.purchaseQuantity) - this.toNumber(right.purchaseQuantity);
      case 'adjustment':
        return this.toNumber(left.adjustmentNetQuantity) - this.toNumber(right.adjustmentNetQuantity);
      case 'order':
        return this.toNumber(left.orderInputQuantity) - this.toNumber(right.orderInputQuantity);
      case 'estimated':
        return this.toNumber(left.orderEstimatedQuantity) - this.toNumber(right.orderEstimatedQuantity);
      case 'shipment':
        return this.toNumber(left.shipmentQuantity) - this.toNumber(right.shipmentQuantity);
      case 'currentStock':
        return this.toNumber(left.currentStockQuantity) - this.toNumber(right.currentStockQuantity);
      case 'count':
        return this.toNumber(left.lastCountQuantity) - this.toNumber(right.lastCountQuantity);
      default:
        return 0;
    }
  }

  private hasPermission(permissionCode: string): boolean {
    const normalizedCode = this.normalizePermission(permissionCode);

    return (
      this.permissionCodes().some((code) => this.normalizePermission(code) === normalizedCode) ||
      currentUserHasPermission(this.currentUser(), permissionCode)
    );
  }

  private uniquePermissionCodes(values: readonly string[]): string[] {
    return values.filter((value, index, items) => !!value && items.indexOf(value) === index);
  }

  private normalizePermission(value: string): string {
    return value.trim().toLocaleLowerCase('tr-TR');
  }

  private toNumber(value: number | null | undefined): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = this.readErrorMessage(error.error);
      return message || `API hatasi: ${error.status}`;
    }

    return error instanceof Error ? error.message : 'Islem tamamlanamadi.';
  }

  private readErrorMessage(errorBody: unknown): string {
    if (!errorBody) {
      return '';
    }

    if (typeof errorBody === 'string') {
      return errorBody;
    }

    if (typeof errorBody === 'object') {
      const body = errorBody as { message?: unknown; detail?: unknown; title?: unknown };
      return String(body.message ?? body.detail ?? body.title ?? '');
    }

    return '';
  }

  private generateClientRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(dateValue: string, days: number): string {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
