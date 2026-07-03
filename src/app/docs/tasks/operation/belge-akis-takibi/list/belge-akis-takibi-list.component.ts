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
  DocumentFlowListResponse
} from '@interfaces';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

interface DocumentFlowFilterOption {
  value: string;
  label: string;
}

interface DocumentFlowFilters {
  warehouseNo: string;
  startDate: string;
  endDate: string;
  documentType: string;
  status: string;
  search: string;
  take: number;
}

interface DocumentFlowMetric {
  label: string;
  value: string;
  tone?: 'danger' | 'success' | 'warn';
}

const TASK_ID = 'belge-akis-takibi';
const PERMISSION_PREFIX = 'operasyon-islemleri.belge-akis-takibi';

const DOCUMENT_TYPE_OPTIONS: readonly DocumentFlowFilterOption[] = [
  { value: '', label: 'Tum Belge Tipleri' },
  { value: 'CompanyShipment', label: 'Firma Sevki' },
  { value: 'InterWarehouseShipment', label: 'Depolar Arasi Sevk' },
  { value: 'CompanyReturn', label: 'Firma Iadesi' },
  { value: 'WarehouseReturn', label: 'Depo Iadesi' },
  { value: 'CompanyReceiving', label: 'Firma Mal Kabul' },
  { value: 'IssuedCompanyOrder', label: 'Verilen Firma Siparisi' },
  { value: 'IssuedWarehouseOrder', label: 'Verilen Depo Siparisi' },
  { value: 'StockCard', label: 'Stok Karti' },
  { value: 'WarehouseCard', label: 'Depo Karti' },
  { value: 'CustomerCard', label: 'Cari Karti' },
  { value: 'StockSalesPrice', label: 'Stok Satis Fiyati' },
  { value: 'StockMovementDocument', label: 'Stok Hareket Evraki' },
  { value: 'CustomerMovementDocument', label: 'Cari Hareket Evraki' }
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
    case 'IssuedWarehouseOrder':
      return 'Verilen Depo Siparisi';
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
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly columns = LIST_COLUMNS;
  protected readonly filters: DocumentFlowFilters = {
    warehouseNo: '',
    startDate: this.getToday(),
    endDate: this.getToday(),
    documentType: '',
    status: '',
    search: '',
    take: 100
  };

  protected readonly listResponse = signal<DocumentFlowListResponse | null>(null);
  protected readonly rows = signal<readonly DocumentFlowListItemDto[]>([]);
  protected readonly selectedDetail = signal<DocumentFlowDetailDto | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly isLoading = signal(false);
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

  protected readonly isAdminUser = computed(() => this.hasRole('administrator') || this.hasRole('admin'));
  protected readonly canList = computed(
    () =>
      !!this.authService.currentUser() &&
      (this.isAdminUser() ||
        this.authService.hasTaskAccess(TASK_ID) ||
        this.hasFlowPermission('list'))
  );
  protected readonly canDetail = computed(
    () => this.isAdminUser() || this.hasFlowPermission('detail') || this.hasFlowPermission('list')
  );
  protected readonly trackingEnabled = computed(
    () => this.listResponse()?.trackingEnabled ?? true
  );
  protected readonly totalCount = computed(
    () => this.listResponse()?.totalCount ?? this.rows().length
  );
  protected readonly metrics = computed<readonly DocumentFlowMetric[]>(() => {
    const rows = this.rows();
    const failedCount = rows.filter((row) => row.status === 'Failed').length;
    const succeededCount = rows.filter((row) => row.status === 'Succeeded').length;
    const warehouseCount = new Set(
      rows.flatMap((row) => [row.sourceWarehouseNo, row.targetWarehouseNo].filter(Boolean))
    ).size;

    return [
      { label: 'Kayit', value: String(this.totalCount()) },
      { label: 'Basarili', value: String(succeededCount), tone: 'success' },
      { label: 'Hatali', value: String(failedCount), tone: failedCount ? 'danger' : undefined },
      { label: 'Depo', value: String(warehouseCount || 0), tone: 'warn' }
    ];
  });

  ngOnInit(): void {
    this.applyRouteFilters();

    if (this.canList()) {
      this.loadFlows();
    }
  }

  private applyRouteFilters(): void {
    const query = this.activatedRoute.snapshot.queryParamMap;
    const warehouseNo = query.get('warehouseNo')?.trim() ?? '';
    const date = query.get('date')?.trim() ?? '';

    if (this.isAdminUser() && /^\d+$/.test(warehouseNo) && Number(warehouseNo) > 0) {
      this.filters.warehouseNo = warehouseNo;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.filters.startDate = date;
      this.filters.endDate = date;
    }
  }

  protected loadFlows(): void {
    if (!this.canList()) {
      this.errorMessage.set('Belge akislarini goruntuleme yetkiniz bulunmuyor.');
      return;
    }

    if (!this.validateFilters()) {
      return;
    }

    const requestId = ++this.activeListRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.detailErrorMessage.set(null);

    this.operasyonIslemleriService
      .getDocumentFlows(this.buildRequest())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeListRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: DocumentFlowListResponse) => {
          if (requestId !== this.activeListRequestId) {
            return;
          }

          const items = response?.items ?? [];
          this.listResponse.set(response);
          this.rows.set(items);
          this.lastLoadedAt.set(new Date().toISOString());

          const selectedId = this.selectedId();
          if (selectedId && !items.some((row: DocumentFlowListItemDto) => row.id === selectedId)) {
            this.selectedId.set(null);
            this.selectedDetail.set(null);
          }
        },
        error: (error: unknown) => {
          if (requestId !== this.activeListRequestId) {
            return;
          }

          this.rows.set([]);
          this.listResponse.set(null);
          this.errorMessage.set(
            getErrorMessage(error, 'Belge akis kayitlari yuklenemedi.')
          );
        }
      });
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
    this.filters.startDate = this.getToday();
    this.filters.endDate = this.getToday();
    this.filters.documentType = '';
    this.filters.status = '';
    this.filters.search = '';
    this.filters.take = 100;
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

  protected copyText(value: string | null | undefined): void {
    const text = value?.trim();

    if (!text || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(text);
  }

  protected readonly trackByMetric = (_index: number, metric: DocumentFlowMetric): string =>
    metric.label;

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

    if (!Number.isFinite(Number(this.filters.take)) || this.filters.take < 1 || this.filters.take > 500) {
      this.rows.set([]);
      this.errorMessage.set('Kayit limiti 1 ile 500 arasinda olmalidir.');
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

  private buildRequest(): DocumentFlowListHttpRequest {
    return {
      warehouseNo: this.isAdminUser() ? this.toOptionalPositiveInteger(this.filters.warehouseNo) : null,
      startDate: this.filters.startDate || null,
      endDate: this.filters.endDate || null,
      documentType: this.filters.documentType || null,
      status: this.filters.status || null,
      search: this.filters.search.trim() || null,
      take: Number(this.filters.take) || 100
    };
  }

  private toOptionalPositiveInteger(value: string): number | null {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  private hasRole(roleName: string): boolean {
    const expectedRole = normalize(roleName);
    return (this.authService.currentUser()?.roller ?? []).some(
      (role) => normalize(role) === expectedRole
    );
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
    return new Date().toISOString().slice(0, 10);
  }
}
