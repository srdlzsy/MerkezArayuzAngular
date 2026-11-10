import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import type {
  DocumentFlowDetailDto,
  DocumentFlowEventDto,
  DocumentFlowListHttpRequest,
  DocumentFlowListItemDto,
  DocumentFlowListResponse,
  DocumentFlowPreset
} from '@interfaces';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import {
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel
} from '../../../core/admin-warehouse.helpers';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

interface DocumentFlowFilterOption {
  value: string;
  label: string;
}

interface DocumentFlowFilters {
  warehouseNo: string;
  direction: string;
  preset: string;
  category: string;
  startDate: string;
  endDate: string;
  documentType: string;
  currentStep: string;
  status: string;
  search: string;
}

interface DocumentFlowMetric {
  label: string;
  value: string;
  tone?: 'danger' | 'success' | 'warn';
}

interface PresetChip {
  value: DocumentFlowPreset;
  label: string;
  count: number;
  tone: 'neutral' | 'warning' | 'danger' | 'info';
  icon: string;
}

const TASK_ID = 'belge-akis-takibi';
const PERMISSION_PREFIX = 'operasyon-islemleri.belge-akis-takibi';
const ALL_WAREHOUSES_PERMISSION = `${PERMISSION_PREFIX}.all-warehouses`;
const DOCUMENT_FLOW_PAGE_SIZE = 500;

const DIRECTION_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Giris + Cikis (Tumu)' },
  { value: 'Incoming', label: 'Bana Gelen (Hedef Depo)' },
  { value: 'Outgoing', label: 'Benden Cikan (Kaynak Depo)' }
];

const PRESET_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: 'all', label: 'Tum Akislar' },
  { value: 'action-required', label: 'Aksiyon Bekleyen Eksikler' },
  { value: 'pending-receiving', label: 'Kabul Bekleyen Gelen Sevk/Iade' },
  { value: 'unaccepted-outgoing', label: 'Karsi Depoda Kabul Bekleyen Cikis' },
  { value: 'pending-edespatch', label: 'E-Irsaliye Eksik veya Hatali' },
  { value: 'failed-edespatch', label: 'Sadece E-Irsaliye Hatasi Alanlar' },
  { value: 'open-orders', label: 'Acik Siparisler' },
  { value: 'failed-only', label: 'Tum Hatali Islemler' },
  { value: 'today-shipments', label: 'Secili Gun Sevkleri' },
  { value: 'today-returns', label: 'Secili Gun Iadeleri' },
  { value: 'today-receivings', label: 'Secili Gun Mal Kabulleri' }
];

const CATEGORY_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Tum Kategoriler' },
  { value: 'ShipmentsAndReceiving', label: 'Sevk ve Mal Kabul' },
  { value: 'Returns', label: 'Iade Islemleri' },
  { value: 'Orders', label: 'Siparis Islemleri' },
  { value: 'CashAndStore', label: 'Kasa ve Magaza Evraklari' },
  { value: 'StockAndCounting', label: 'Stok, Sayim ve Kartlar' }
];

const STEP_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Tum Adimlar' },
  { value: 'DocumentCreated', label: 'Belge Olustu' },
  { value: 'OrderCreated', label: 'Siparis Olustu' },
  { value: 'EDespatchSubmission', label: 'E-Irsaliye Gonderimi' },
  { value: 'WarehouseReceivingAccepted', label: 'Depo Kabul Edildi' },
  { value: 'AxataOrderSent', label: 'AXATA Siparisi Gonderildi' },
  { value: 'AxataDocumentImported', label: "AXATA Belgesi Mikro'ya Aktarildi" },
  { value: 'DocumentUpdated', label: 'Belge Guncellendi' },
  { value: 'DocumentDeleted', label: 'Belge Silindi' }
];

const DOCUMENT_TYPE_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Tum Belge Tipleri' },
  { value: 'CompanyShipment', label: 'Firma Sevki' },
  { value: 'InterWarehouseShipment', label: 'Depolar Arasi Sevk' },
  { value: 'CompanyReturn', label: 'Firma Iadesi' },
  { value: 'WarehouseReturn', label: 'Depo Iadesi' },
  { value: 'CompanyReceiving', label: 'Firma Mal Kabul' },
  { value: 'IssuedCompanyOrder', label: 'Verilen Firma Siparisi' },
  { value: 'ReceivedCompanyOrder', label: 'Alinan Firma Siparisi' },
  { value: 'IssuedWarehouseOrder', label: 'Verilen Depo Siparisi' },
  { value: 'ReceivedWarehouseOrder', label: 'Alinan Depo Siparisi' },
  { value: 'StockCard', label: 'Stok Karti' },
  { value: 'WarehouseCard', label: 'Depo Karti' },
  { value: 'CustomerCard', label: 'Cari Karti' },
  { value: 'StockSalesPrice', label: 'Stok Satis Fiyati' },
  { value: 'StockMovementDocument', label: 'Stok Hareket Evraki' },
  { value: 'CustomerMovementDocument', label: 'Cari Hareket Evraki' },
  { value: 'CashSummary', label: 'Kasa Icmali' },
  { value: 'OutageReceipt', label: 'Zayiat Fisi' },
  { value: 'ExpenseReceipt', label: 'Masraf Fisi' },
  { value: 'Virman', label: 'Stok Virmani' },
  { value: 'InventoryCount', label: 'Stok Sayimi' }
];

const STATUS_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Tum Durumlar' },
  { value: 'Succeeded', label: 'Basarili' },
  { value: 'Failed', label: 'Hatali' }
];

const LIST_COLUMNS: readonly ApiListTableColumn<DocumentFlowListItemDto>[] = [
  {
    key: 'documentType',
    label: 'Belge Tipi',
    resolveValue: (row) => resolveDocumentTypeLabel(row.documentType)
  },
  { key: 'sourceWarehouseNo', label: 'Kaynak' },
  {
    key: 'targetWarehouseNo',
    label: 'Hedef',
    resolveValue: (row) => row.targetWarehouseNo ?? '-'
  },
  {
    key: 'documentNo',
    label: 'Belge No',
    resolveValue: (row) =>
      row.documentNo?.trim() || `${row.documentSerie || '-'} / ${row.documentOrderNo || '-'}`
  },
  { key: 'externalDocumentNo', label: 'E-Belge', emptyValue: '-' },
  {
    key: 'currentStep',
    label: 'Son Adim',
    resolveValue: (row) => resolveStepLabel(row.currentStep)
  },
  {
    key: 'status',
    label: 'Durum',
    type: 'status',
    resolveValue: (row) => resolveStatusGridLabel(row.status)
  },
  {
    key: 'lastError',
    label: 'Son Hata',
    resolveValue: (row) => row.lastError?.trim() || '-'
  },
  { key: 'updatedAtUtc', label: 'Guncelleme', type: 'date' }
];

function normalize(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('tr-TR') ?? '';
}

function resolveDocumentTypeLabel(value: string | null | undefined): string {
  switch (value) {
    case 'CompanyShipment':
      return 'Firma Sevki';
    case 'InterWarehouseShipment':
      return 'Depolar Arasi Sevk';
    case 'CompanyReturn':
      return 'Firma Iadesi';
    case 'WarehouseReturn':
      return 'Depo Iadesi';
    case 'CompanyReceiving':
      return 'Firma Mal Kabul';
    case 'IssuedCompanyOrder':
      return 'Verilen Firma Siparisi';
    case 'ReceivedCompanyOrder':
      return 'Alinan Firma Siparisi';
    case 'IssuedWarehouseOrder':
      return 'Verilen Depo Siparisi';
    case 'ReceivedWarehouseOrder':
      return 'Alinan Depo Siparisi';
    case 'StockCard':
      return 'Stok Karti';
    case 'WarehouseCard':
      return 'Depo Karti';
    case 'CustomerCard':
      return 'Cari Karti';
    case 'StockSalesPrice':
      return 'Stok Satis Fiyati';
    case 'StockMovementDocument':
      return 'Stok Hareket Evraki';
    case 'CustomerMovementDocument':
      return 'Cari Hareket Evraki';
    case 'CashSummary':
      return 'Kasa Icmali';
    case 'OutageReceipt':
      return 'Zayiat Fisi';
    case 'ExpenseReceipt':
      return 'Masraf Fisi';
    case 'Virman':
      return 'Stok Virmani';
    case 'InventoryCount':
      return 'Stok Sayimi';
    default:
      return value?.trim() || '-';
  }
}

function resolveStepLabel(value: string | null | undefined): string {
  switch (value) {
    case 'DocumentCreated':
      return 'Belge Olustu';
    case 'OrderCreated':
      return 'Siparis Olustu';
    case 'EDespatchSubmission':
      return 'E-Irsaliye Gonderimi';
    case 'WarehouseReceivingAccepted':
      return 'Depo Kabul Edildi';
    case 'DocumentUpdated':
      return 'Belge Guncellendi';
    case 'DocumentDeleted':
      return 'Belge Silindi';
    case 'AxataOrderSent':
      return 'AXATA Siparisi Gonderildi';
    case 'AxataDocumentImported':
      return "AXATA Belgesi Mikro'ya Aktarildi";
    default:
      return value?.trim() || '-';
  }
}

function resolveStatusGridLabel(value: string | null | undefined): string {
  return value === 'Succeeded' ? 'Tamamlandi' : value === 'Failed' ? 'Iptal / Hata' : value || '-';
}

function resolveStatusLabel(value: string | null | undefined): string {
  return value === 'Succeeded' ? 'Basarili' : value === 'Failed' ? 'Hatali' : value || '-';
}

@Component({
  selector: 'app-belge-akis-takibi-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiListTableComponent],
  templateUrl: './belge-akis-takibi-list.component.html',
  styleUrl: './belge-akis-takibi-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BelgeAkisTakibiListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly directionOptions = DIRECTION_OPTIONS;
  protected readonly presetOptions = PRESET_OPTIONS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly stepOptions = STEP_OPTIONS;
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly columns = LIST_COLUMNS;
  protected readonly filters: DocumentFlowFilters = {
    warehouseNo: '',
    direction: '',
    preset: 'all',
    category: '',
    startDate: this.getToday(),
    endDate: this.getToday(),
    documentType: '',
    currentStep: '',
    status: '',
    search: ''
  };

  protected readonly listResponse = signal<DocumentFlowListResponse | null>(null);
  protected readonly rows = signal<readonly DocumentFlowListItemDto[]>([]);
  protected readonly selectedDetail = signal<DocumentFlowDetailDto | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isLoadingMore = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly detailErrorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly operasyonIslemleriService = inject(OperasyonIslemleriService);
  private activeListRequestId = 0;
  private activeDetailRequestId = 0;

  protected readonly isAdminUser = computed(() =>
    currentUserCanUseAllWarehouses(this.authService.currentUser(), ALL_WAREHOUSES_PERMISSION)
  );
  protected readonly canList = computed(
    () =>
      !!this.authService.currentUser() &&
      (this.authService.hasTaskAccess(TASK_ID) || this.hasFlowPermission('list'))
  );
  protected readonly canDetail = computed(
    () => this.hasFlowPermission('detail') || this.hasFlowPermission('list')
  );
  protected readonly trackingEnabled = computed(
    () => this.listResponse()?.trackingEnabled ?? true
  );
  protected readonly totalCount = computed(
    () => this.listResponse()?.totalCount ?? this.rows().length
  );
  protected readonly hasMore = computed(
    () => this.totalCount() > this.rows().length
  );
  protected readonly presetChips = computed<readonly PresetChip[]>(() => {
    const summary = this.listResponse()?.summary;
    const rows = this.rows();

    const total = summary?.totalCount ?? this.totalCount();
    const actionRequired = summary?.actionRequiredCount ?? 0;
    const pendingReceiving = summary?.pendingReceivingCount ?? 0;
    const unacceptedOutgoing = summary?.unacceptedOutgoingCount ?? 0;
    const pendingEDespatch = summary?.pendingEDespatchCount ?? 0;
    const openOrders = summary?.openOrderCount ?? 0;
    const failed = summary?.failedCount ?? rows.filter((row) => row.status === 'Failed').length;

    return [
      {
        value: 'all',
        label: 'Tum Akislar',
        count: total,
        tone: 'neutral',
        icon: 'fa-layer-group'
      },
      {
        value: 'action-required',
        label: 'Aksiyon Bekleyen',
        count: actionRequired,
        tone: actionRequired > 0 ? 'warning' : 'neutral',
        icon: 'fa-list-check'
      },
      {
        value: 'pending-receiving',
        label: 'Bekleyen Kabul (Gelen)',
        count: pendingReceiving,
        tone: pendingReceiving > 0 ? 'warning' : 'neutral',
        icon: 'fa-hourglass-half'
      },
      {
        value: 'unaccepted-outgoing',
        label: 'Kabul Bekleyen Cikis',
        count: unacceptedOutgoing,
        tone: unacceptedOutgoing > 0 ? 'info' : 'neutral',
        icon: 'fa-truck-arrow-right'
      },
      {
        value: 'pending-edespatch',
        label: 'E-Irsaliye Eksik / Hata',
        count: pendingEDespatch,
        tone: pendingEDespatch > 0 ? 'danger' : 'neutral',
        icon: 'fa-file-circle-exclamation'
      },
      {
        value: 'open-orders',
        label: 'Acik Siparisler',
        count: openOrders,
        tone: openOrders > 0 ? 'info' : 'neutral',
        icon: 'fa-cart-flatbed'
      },
      {
        value: 'failed-only',
        label: 'Hatali Islemler',
        count: failed,
        tone: failed > 0 ? 'danger' : 'neutral',
        icon: 'fa-triangle-exclamation'
      }
    ];
  });
  protected readonly metrics = computed<readonly DocumentFlowMetric[]>(() => {
    const summary = this.listResponse()?.summary;
    const rows = this.rows();
    const failedCount = summary?.failedCount ?? rows.filter((row) => row.status === 'Failed').length;
    const succeededCount =
      summary?.succeededCount ?? rows.filter((row) => row.status === 'Succeeded').length;
    const actionRequiredCount = summary?.actionRequiredCount ?? 0;

    return [
      { label: 'Listelenen', value: String(this.totalCount()) },
      { label: 'Basarili', value: String(succeededCount), tone: 'success' },
      {
        label: 'Eksik / Bekleyen',
        value: String(actionRequiredCount),
        tone: actionRequiredCount ? 'warn' : undefined
      },
      { label: 'Hatali', value: String(failedCount), tone: failedCount ? 'danger' : undefined }
    ];
  });

  ngOnInit(): void {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyRouteFilters();
        if (this.canList()) {
          this.loadFlows();
        }
      });
  }

  protected selectPreset(preset: DocumentFlowPreset | string): void {
    this.filters.preset = preset || 'all';

    if (preset === 'pending-receiving' || preset === 'today-receivings') {
      this.filters.direction = 'Incoming';
    } else if (
      preset === 'unaccepted-outgoing' ||
      preset === 'pending-edespatch' ||
      preset === 'failed-edespatch' ||
      preset === 'today-shipments' ||
      preset === 'today-returns'
    ) {
      this.filters.direction = 'Outgoing';
    } else if (preset === 'all' || preset === 'action-required') {
      this.filters.direction = '';
    }

    if (
      (preset === 'action-required' ||
        preset === 'pending-receiving' ||
        preset === 'unaccepted-outgoing' ||
        preset === 'pending-edespatch' ||
        preset === 'failed-edespatch' ||
        preset === 'open-orders' ||
        preset === 'failed-only') &&
      this.filters.startDate === this.filters.endDate &&
      this.filters.startDate === this.getToday()
    ) {
      this.setQuickDateRange(30, false);
    }

    this.loadFlows();
  }

  protected setQuickDateRange(days: 0 | 7 | 30, reload = true): void {
    const today = this.getToday();
    this.filters.endDate = today;

    if (days === 0) {
      this.filters.startDate = today;
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const localStart = new Date(start.getTime() - start.getTimezoneOffset() * 60_000);
      const computedStart = localStart.toISOString().slice(0, 10);
      this.filters.startDate = computedStart < '2026-10-01' ? '2026-10-01' : computedStart;
    }

    if (reload) {
      this.loadFlows();
    }
  }

  private applyRouteFilters(): void {
    const query = this.activatedRoute.snapshot.queryParamMap;
    const warehouseNo = query.get('warehouseNo')?.trim() ?? '';
    const date = query.get('date')?.trim() ?? '';
    const startDate = query.get('startDate')?.trim() ?? '';
    const endDate = query.get('endDate')?.trim() ?? '';
    const status = query.get('status')?.trim() ?? '';
    const documentType = query.get('documentType')?.trim() ?? '';
    const direction = query.get('direction')?.trim() ?? '';
    const category = query.get('category')?.trim() ?? '';
    const currentStep = query.get('currentStep')?.trim() ?? '';
    const preset = query.get('preset')?.trim() ?? '';

    if (this.isAdminUser() && /^\d+$/.test(warehouseNo) && Number(warehouseNo) > 0) {
      this.filters.warehouseNo = warehouseNo;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.filters.startDate = date;
      this.filters.endDate = date;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      this.filters.startDate = startDate;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      this.filters.endDate = endDate;
    }

    if (STATUS_OPTIONS.some((option) => option.value === status)) {
      this.filters.status = status;
    }

    if (DOCUMENT_TYPE_OPTIONS.some((option) => option.value === documentType)) {
      this.filters.documentType = documentType;
    }

    if (DIRECTION_OPTIONS.some((option) => option.value === direction)) {
      this.filters.direction = direction;
    }

    if (CATEGORY_OPTIONS.some((option) => option.value === category)) {
      this.filters.category = category;
    }

    if (STEP_OPTIONS.some((option) => option.value === currentStep)) {
      this.filters.currentStep = currentStep;
    }

    if (PRESET_OPTIONS.some((option) => option.value === preset)) {
      this.filters.preset = preset;
    }
  }

  protected loadFlows(append = false): void {
    if (!this.canList()) {
      this.errorMessage.set('Belge akislarini goruntuleme yetkiniz bulunmuyor.');
      return;
    }

    if (!this.validateFilters()) {
      return;
    }

    const requestId = ++this.activeListRequestId;

    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoading.set(true);
    }
    this.errorMessage.set(null);
    this.detailErrorMessage.set(null);

    this.operasyonIslemleriService
      .getDocumentFlows(this.buildRequest(append ? this.rows().length : 0))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeListRequestId) {
            this.isLoading.set(false);
            this.isLoadingMore.set(false);
          }
        })
      )
      .subscribe({
        next: (response: DocumentFlowListResponse) => {
          if (requestId !== this.activeListRequestId) {
            return;
          }

          const items = response?.items ?? [];
          const visibleRows = append ? this.mergeRows(this.rows(), items) : items;
          this.listResponse.set(response);
          this.rows.set(visibleRows);
          this.lastLoadedAt.set(new Date().toISOString());

          const selectedId = this.selectedId();
          if (
            selectedId &&
            !visibleRows.some((row: DocumentFlowListItemDto) => row.id === selectedId)
          ) {
            this.selectedId.set(null);
            this.selectedDetail.set(null);
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.activeListRequestId) {
            return;
          }

          if (!append) {
            this.rows.set([]);
            this.listResponse.set(null);
          }
          this.errorMessage.set(
            getErrorMessage(error, 'Belge akis kayitlari yuklenemedi.')
          );
        }
      });
  }

  protected loadMoreFlows(): void {
    if (!this.hasMore() || this.isLoading() || this.isLoadingMore()) {
      return;
    }

    this.loadFlows(true);
  }

  protected openDetail(row: DocumentFlowListItemDto): void {
    if (!this.canDetail()) {
      this.detailErrorMessage.set('Belge akis detayini goruntuleme yetkiniz bulunmuyor.');
      return;
    }

    const requestId = ++this.activeDetailRequestId;

    this.selectedId.set(row.id);
    this.selectedDetail.set(null);
    this.detailErrorMessage.set(null);
    this.detailLoading.set(true);

    this.operasyonIslemleriService
      .getDocumentFlowDetail(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeDetailRequestId) {
            this.detailLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (detail: DocumentFlowDetailDto) => {
          if (requestId !== this.activeDetailRequestId) {
            return;
          }

          this.selectedDetail.set({
            ...detail,
            events: [...(detail.events ?? [])].sort((left, right) =>
              (left.occurredAtUtc || '').localeCompare(right.occurredAtUtc || '')
            )
          });
        },
        error: (error: unknown) => {
          if (requestId !== this.activeDetailRequestId) {
            return;
          }

          this.detailErrorMessage.set(
            getErrorMessage(error, 'Belge akis detayi yuklenemedi.')
          );
        }
      });
  }

  protected closeDetail(): void {
    this.activeDetailRequestId++;
    this.selectedId.set(null);
    this.selectedDetail.set(null);
    this.detailErrorMessage.set(null);
    this.detailLoading.set(false);
  }

  protected clearFilters(): void {
    this.filters.warehouseNo = '';
    this.filters.direction = '';
    this.filters.preset = 'all';
    this.filters.category = '';
    this.filters.startDate = this.getToday();
    this.filters.endDate = this.getToday();
    this.filters.documentType = '';
    this.filters.currentStep = '';
    this.filters.status = '';
    this.filters.search = '';
    this.loadFlows();
  }

  protected buildRequestPreview(): string {
    const request = this.buildRequest();
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(request)) {
      if (value !== null && value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }

    const queryText = query.toString();
    return `/api/operasyon-islemleri/belge-akis-takibi${queryText ? `?${queryText}` : ''}`;
  }

  protected flowScopeLabel(): string {
    const baseLabel = this.isAdminUser()
      ? this.filters.warehouseNo.trim()
        ? `Depo ${this.filters.warehouseNo.trim()}`
        : 'Tum Depolar'
      : this.currentWarehouseLabel();

    if (this.filters.direction === 'Incoming') {
      return `${baseLabel} (Gelen / Hedef)`;
    }

    if (this.filters.direction === 'Outgoing') {
      return `${baseLabel} (Cikan / Kaynak)`;
    }

    return baseLabel;
  }

  protected resolveDocumentTypeLabel(value: string | null | undefined): string {
    return resolveDocumentTypeLabel(value);
  }

  protected resolveStepLabel(value: string | null | undefined): string {
    return resolveStepLabel(value);
  }

  protected resolveStatusLabel(value: string | null | undefined): string {
    return resolveStatusLabel(value);
  }

  protected statusTone(value: string | null | undefined): string {
    return value === 'Succeeded' ? 'is-success' : value === 'Failed' ? 'is-danger' : 'is-neutral';
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(date);
  }

  protected formatUser(value: string | null | undefined): string {
    return value?.trim() || 'Sistem';
  }

  protected currentWarehouseLabel(): string {
    return formatCurrentWarehouseLabel(this.authService.currentUser());
  }

  protected copyText(value: string | null | undefined): void {
    const text = value?.trim();

    if (!text || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(text);
  }

  protected readonly trackByMetric = (_index: number, metric: DocumentFlowMetric): string =>
    metric.label;

  protected readonly trackByPresetChip = (_index: number, chip: PresetChip): string =>
    chip.value;

  protected readonly trackByOption = (
    _index: number,
    option: DocumentFlowFilterOption
  ): string => option.value || option.label;

  protected readonly trackByEvent = (_index: number, event: DocumentFlowEventDto): string =>
    event.id;

  private validateFilters(): boolean {
    if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
      this.rows.set([]);
      this.errorMessage.set('Baslangic tarihi bitis tarihinden buyuk olamaz.');
      return false;
    }

    if (this.isAdminUser() && this.filters.warehouseNo.trim()) {
      const warehouseNo = Number(this.filters.warehouseNo);

      if (!Number.isInteger(warehouseNo) || warehouseNo <= 0) {
        this.rows.set([]);
        this.errorMessage.set('Depo filtresi icin gecerli bir depo no girin.');
        return false;
      }
    }

    return true;
  }

  private buildRequest(skip = 0): DocumentFlowListHttpRequest {
    return {
      warehouseNo: this.isAdminUser() ? this.toOptionalPositiveInteger(this.filters.warehouseNo) : null,
      direction: this.filters.direction || null,
      preset: this.filters.preset && this.filters.preset !== 'all' ? this.filters.preset : null,
      category: this.filters.category || null,
      startDate: this.filters.startDate || null,
      endDate: this.filters.endDate || null,
      documentType: this.filters.documentType || null,
      currentStep: this.filters.currentStep || null,
      status: this.filters.status || null,
      search: this.filters.search.trim() || null,
      skip,
      take: DOCUMENT_FLOW_PAGE_SIZE
    };
  }

  private mergeRows(
    currentRows: readonly DocumentFlowListItemDto[],
    nextRows: readonly DocumentFlowListItemDto[]
  ): readonly DocumentFlowListItemDto[] {
    const rowsById = new Map(currentRows.map((row) => [row.id, row]));

    for (const row of nextRows) {
      rowsById.set(row.id, row);
    }

    return [...rowsById.values()];
  }

  private toOptionalPositiveInteger(value: string): number | null {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  private hasFlowPermission(action: 'list' | 'detail'): boolean {
    const actionKey = normalize(action);
    const permissionKeys = [
      ...(this.authService.currentUser()?.permissions ?? []),
      ...this.authService.getTaskPermissionCodes(TASK_ID),
      ...this.authService.getTaskPermissionKeys(TASK_ID)
    ].map((permission) => normalize(permission));

    return permissionKeys.some(
      (permission) =>
        permission === actionKey ||
        permission === normalize(`${PERMISSION_PREFIX}.${action}`) ||
        permission.endsWith(`.${actionKey}`)
    );
  }

  private getToday(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
