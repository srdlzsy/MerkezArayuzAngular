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
import { finalize } from 'rxjs';
import type {
  CompanyDocumentTrackingItemDto,
  CompanyDocumentTrackingKind,
  CompanyDocumentTrackingResponse
} from '@interfaces';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import type { DocsContentPage } from '../../../../models/docs.models';
import {
  currentUserCanUseAllWarehouses,
  currentUserHasPermission,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  normalizePermissionCode
} from '../../../core/admin-warehouse.helpers';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import type { ApiListTableColumn } from '../../../core/api-list-table/api-list-table.types';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type DocumentKindFilter = 'All' | CompanyDocumentTrackingKind;

const TASK_ID = 'firma-evrak-takibi';
const PERMISSION_PREFIX = 'operasyon-islemleri.firma-evrak-takibi';
const ALL_WAREHOUSES_PERMISSION = `${PERMISSION_PREFIX}.all-warehouses`;

@Component({
  selector: 'app-firma-evrak-takibi-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './firma-evrak-takibi-list.component.html',
  styleUrl: './firma-evrak-takibi-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FirmaEvrakTakibiListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly selectedDate = signal(this.getToday());
  protected readonly selectedWarehouseNo = signal<number | null>(null);
  protected readonly documentKindFilter = signal<DocumentKindFilter>('All');
  protected readonly response = signal<CompanyDocumentTrackingResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tableColumns: readonly ApiListTableColumn<CompanyDocumentTrackingItemDto>[] = [
    { key: 'documentKindName', label: 'Tur' },
    { key: 'documentNo', label: 'Evrak' },
    { key: 'customerDisplayName', label: 'Cari' },
    { key: 'customerCode', label: 'Cari Kodu' },
    { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
    { key: 'movementCreateDate', label: 'Sisteme Giris', type: 'date' },
    { key: 'deliverer', label: 'Teslim Eden' },
    { key: 'receiver', label: 'Teslim Alan' },
    { key: 'lineCount', label: 'Kalem' },
    { key: 'totalQuantity', label: 'Miktar' }
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly operasyonIslemleriService = inject(OperasyonIslemleriService);
  private activeRequestId = 0;

  protected readonly canUseAllWarehouses = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      ALL_WAREHOUSES_PERMISSION
    )
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly canList = computed(
    () => this.authService.hasTaskAccess(TASK_ID) || this.hasPermission('list')
  );
  protected readonly visibleItems = computed(() => {
    const kind = this.documentKindFilter();

    return kind === 'All'
      ? this.response()?.items ?? []
      : (this.response()?.items ?? []).filter((item) => item.documentKind === kind);
  });
  protected readonly visibleLineCount = computed(() =>
    this.visibleItems().reduce((total, item) => total + this.toSafeNumber(item.lineCount), 0)
  );
  protected readonly visibleQuantity = computed(() =>
    this.visibleItems().reduce((total, item) => total + this.toSafeNumber(item.totalQuantity), 0)
  );

  constructor() {
    this.selectedWarehouseNo.set(getCurrentWarehouseNo(this.authService.currentUser()));
  }

  ngOnInit(): void {
    if (!this.canList()) {
      this.errorMessage.set('Firma evrak takibi liste yetkiniz bulunmuyor.');
      return;
    }

    this.loadDocuments();
  }

  protected loadDocuments(): void {
    const date = this.selectedDate().trim();

    if (!this.canList()) {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      this.errorMessage.set('Gecerli bir takip tarihi secin.');
      return;
    }

    const requestId = ++this.activeRequestId;
    const warehouseNo = this.resolveWarehouseNo();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.operasyonIslemleriService
      .getCompanyDocumentTracking({
        date,
        warehouseNo: warehouseNo ?? undefined
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.loading.set(false);
          }
        })
      )
      .subscribe({
        next: (response: CompanyDocumentTrackingResponse) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.response.set({ ...response, items: response.items ?? [] });
        },
        error: (error: unknown) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.response.set(null);
          this.errorMessage.set(
            getErrorMessage(error, 'Firma evraklari yuklenirken hata olustu.')
          );
        }
      });
  }

  protected setSelectedDate(value: string): void {
    this.selectedDate.set(value);
  }

  protected setSelectedWarehouseNo(value: string | number | null): void {
    const warehouseNo = Number(value);
    this.selectedWarehouseNo.set(
      Number.isInteger(warehouseNo) && warehouseNo > 0 ? warehouseNo : null
    );
  }

  protected setDocumentKindFilter(value: string): void {
    const allowed: readonly DocumentKindFilter[] = [
      'All',
      'CompanyReceiving',
      'CompanyReturn'
    ];
    this.documentKindFilter.set(
      allowed.includes(value as DocumentKindFilter)
        ? (value as DocumentKindFilter)
        : 'All'
    );
  }

  protected formatDate(value: string | null | undefined): string {
    return this.formatTemporal(value, false);
  }

  private resolveWarehouseNo(): number | null {
    return this.canUseAllWarehouses() ? this.selectedWarehouseNo() : null;
  }

  private hasPermission(action: 'list'): boolean {
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

  private formatTemporal(value: string | null | undefined, includeTime = false): string {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      return '-';
    }

    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
      return normalizedValue;
    }

    return new Intl.DateTimeFormat('tr-TR',
      includeTime
        ? { dateStyle: 'short', timeStyle: 'short' }
        : { dateStyle: 'short' }
    ).format(date);
  }

  private toSafeNumber(value: unknown): number {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private getToday(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }
}
