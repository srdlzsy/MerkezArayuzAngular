import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { HttpErrorResponse } from '@angular/common/http';
import { Directive, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';

import { DocsContentPage } from '../../../models/docs.models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  ApiListTableActionEvent,
  ApiListTableColumn,
  ApiListTableRowAction
} from '../api-list-table/api-list-table.types';
import { openDocsTaskDialog } from '../task-dialog.config';
import {
  PdfPreviewDialogComponent,
  PdfPreviewDialogData
} from '../pdf-preview-dialog/pdf-preview-dialog.component';
import {
  currentUserIsAdmin,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../admin-warehouse.helpers';

@Directive()
export abstract class ApiTaskListPageBase<
  Row extends object,
  DetailData extends object = { seri: string; sira: number }
> implements OnInit {
  protected abstract readonly page: DocsContentPage;
  protected abstract readonly tableColumns: readonly ApiListTableColumn<Row>[];
  protected abstract readonly detailComponent: ComponentType<unknown>;
  protected abstract readonly createComponent: ComponentType<unknown>;
  protected readonly canCreate: boolean = true;
  protected readonly unknownStatusLabel: string | null = null;

  protected readonly dialog = inject(Dialog);
  protected readonly destroyRef = inject(DestroyRef);
  private readonly listAuthService = inject(AuthService);
  private activeRequestId = 0;

  protected readonly startDate = signal(this.getdayoffsetfromtoday(-0));
  protected readonly endDate = signal(this.getInitialEndDate());
  protected readonly adminWarehouseNo = signal('');
  protected readonly rows = signal<Row[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);
  protected readonly isAdminUser = computed(() =>
    currentUserIsAdmin(this.listAuthService.currentUser())
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.listAuthService.currentUser())
  );
  protected readonly selectedWarehouseLabel = computed(() => {
    if (!this.isAdminUser()) {
      return this.currentWarehouseLabel();
    }

    const warehouseNo = this.getAdminWarehouseNo();
    return warehouseNo ? `Depo ${warehouseNo}` : 'Tum Depolar';
  });
  protected readonly zamanlama = computed(() => {
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();

    if (!startDate || !endDate) {
      return '';
    }

    return `aralik-${startDate}-${endDate}`;
  });
  protected readonly requestPath = computed(() => {
    const preview = this.buildRequestPreviewPath();
    return preview || this.page.baseRouteOrFile;
  });
  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly statusSummary = computed(() => {
    const counts = new Map<string, number>();

    for (const row of this.rows()) {
      const status = this.getStatusLabel(row);

      if (!status) {
        continue;
      }

      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'tr'))
      .slice(0, 3);
  });

  ngOnInit(): void {
    this.loadRows();
  }

  protected abstract fetchRows(zamanlama: string, warehouseNo?: number): Observable<Row[]>;

  protected getInitialStartDate(): string {
    return this.getFirstDayOfMonthOffset(-2);
  }

  protected getInitialEndDate(): string {
    return this.formatAsInputDate(new Date());
  }

  protected getStatusLabel(row: Row): string | null {
    const statusColumn = this.tableColumns.find((column) => column.type === 'status');

    if (statusColumn) {
      const statusValue = statusColumn.resolveValue
        ? statusColumn.resolveValue(row)
        : (row as Record<string, unknown>)[statusColumn.key];

      if (typeof statusValue === 'string') {
        const normalized = statusValue.trim();
        return normalized ? normalized : this.unknownStatusLabel;
      }
    }

    const record = row as Record<string, unknown>;
    const value = record['durumu'];

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized ? normalized : this.unknownStatusLabel;
    }

    const isClosed = record['isClosed'];
    if (typeof isClosed === 'boolean') {
      return isClosed ? 'Kapali' : 'Acik';
    }

    return this.unknownStatusLabel;
  }

  protected getLoadingTitle(): string {
    return 'Liste Yukleniyor';
  }

  protected getLoadingMessage(): string {
    return 'Secilen tarih araligi icin kayitlar getiriliyor.';
  }

  protected getErrorTitle(): string {
    return 'Liste Yuklenemedi';
  }

  protected getEmptyTitle(): string {
    return 'Kayit Bulunamadi';
  }

  protected getEmptyMessage(): string {
    return 'Secilen tarih araliginda kayit bulunmuyor.';
  }

  protected getTableFilterPlaceholder(): string {
    return 'Seri, sira, firma, depo veya durum ara';
  }

  protected getCreateButtonLabel(): string {
    return 'Olustur';
  }

  protected getAdditionalRowActions(): readonly ApiListTableRowAction<Row>[] {
    return [];
  }

  protected handleAdditionalRowAction(_event: ApiListTableActionEvent<Row>): void {}

  protected buildDetailData(row: Row): DetailData {
    const record = row as Record<string, unknown>;
    const seri = record['seri'] ?? record['documentSerie'] ?? '';
    const sira = record['sira'] ?? record['documentOrderNo'] ?? Number.NaN;
    const warehouseNo = this.resolveDetailWarehouseNo(row);

    const detailData: Record<string, unknown> = {
      seri: String(seri),
      sira: Number(sira)
    };

    if (warehouseNo !== undefined) {
      detailData['warehouseNo'] = warehouseNo;
    }

    return detailData as DetailData;
  }

  protected resolveDetailWarehouseNo(row: Row): number | undefined {
    const record = row as Record<string, unknown>;

    return (
      this.getPositiveRowNumber(record, 'warehouseNo') ??
      this.getPositiveRowNumber(record, 'sourceWarehouseNo') ??
      this.getPositiveRowNumber(record, 'inWarehouseNo') ??
      this.getPositiveRowNumber(record, 'targetWarehouseNo') ??
      this.getPositiveRowNumber(record, 'outWarehouseNo') ??
      this.getPositiveRowNumber(record, 'shippingWarehouseNo') ??
      this.getPositiveRowNumber(record, 'relatedWarehouseNo') ??
      undefined
    );
  }

  protected getTrackId(index: number, row: Row): string | number {
    const record = row as Record<string, unknown>;
    const seri = record['seri'] ?? record['documentSerie'];
    const sira = record['sira'] ?? record['documentOrderNo'];

    if (
      typeof seri === 'string' &&
      seri.trim() &&
      typeof sira === 'number' &&
      Number.isFinite(sira)
    ) {
      return `${seri}-${sira}`;
    }

    return index;
  }

  protected openDetail(row: Row): void {
    openDocsTaskDialog(this.dialog, this.detailComponent, {
      width: 'min(1180px, 96vw)',
      maxWidth: '96vw',
      data: this.buildDetailData(row)
    });
  }

  protected openCreate(): void {
    openDocsTaskDialog(this.dialog, this.createComponent)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (!result) {
          return;
        }

        this.loadRows();
      });
  }

  protected updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  protected updateEndDate(value: string): void {
    this.endDate.set(value);
  }

  protected updateAdminWarehouseNo(value: string): void {
    this.adminWarehouseNo.set(value);
  }

  protected resolveListWarehouseNo(): number | undefined {
    if (this.isAdminUser()) {
      return this.getAdminWarehouseNo() ?? undefined;
    }

    return getCurrentWarehouseNo(this.listAuthService.currentUser()) ?? undefined;
  }

  protected loadRows(): void {
    const zamanlama = this.zamanlama().trim();
    const warehouseNo = this.resolveListWarehouseNo();

    if (!zamanlama) {
      this.rows.set([]);
      this.errorMessage.set('Listeleme icin baslangic ve bitis tarihi secin.');
      return;
    }

    if (this.startDate().trim() > this.endDate().trim()) {
      this.rows.set([]);
      this.errorMessage.set('Baslangic tarihi bitis tarihinden buyuk olamaz.');
      return;
    }

    const requestId = ++this.activeRequestId;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fetchRows(zamanlama, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.activeRequestId) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (rows: Row[]) => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set(rows ?? []);
          this.lastLoadedAt.set(new Date().toISOString());
        },
        error: () => {
          if (requestId !== this.activeRequestId) {
            return;
          }

          this.rows.set([]);
          this.errorMessage.set(
            `${this.page.title} listesi yuklenemedi. Tarih araligini kontrol edip tekrar deneyin.`
          );
        }
      });
  }

  protected formatDate(value: string): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  protected readonly trackByRow = (index: number, row: Row): string | number =>
    this.getTrackId(index, row);

  protected openBlobInDialog(blob: Blob, title = 'PDF Onizleme'): void {
    this.dialog.open<void, PdfPreviewDialogData>(PdfPreviewDialogComponent, {
      data: { blob, title },
      hasBackdrop: false
    });
  }

  protected resolveHttpErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (
        typeof error.error === 'object' &&
        error.error !== null &&
        'detail' in error.error &&
        typeof error.error.detail === 'string' &&
        error.error.detail.trim()
      ) {
        return error.error.detail;
      }

      if (
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        typeof error.error.message === 'string' &&
        error.error.message.trim()
      ) {
        return error.error.message;
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
    }

    return fallback;
  }

  protected getFirstDayOfMonthOffset(monthOffset: number): string {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + monthOffset);
    return this.formatAsInputDate(date);
  }
 protected getdayoffsetfromtoday(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return this.formatAsInputDate(date);
  }
  protected getRelativeDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return this.formatAsInputDate(date);
  }

  protected formatAsInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildRequestPreviewPath(): string {
    const startDate = this.startDate().trim() || 'YYYY-MM-DD';
    const endDate = this.endDate().trim() || 'YYYY-MM-DD';
    const zamanlama = this.zamanlama().trim() || 'aralik-YYYY-MM-DD-YYYY-MM-DD';
    const listEndpoint = this.page.items
      .flatMap((item) => item.endpoints ?? [])
      .find(
        (endpoint) =>
          endpoint.method === 'GET' &&
          (endpoint.path.includes('{zamanlama}') ||
            endpoint.path.includes('StartDate=...') ||
            endpoint.path.includes('dateToGet=...') ||
            endpoint.path.includes('dateTimeFilter=...'))
      );

    if (listEndpoint) {
      return this.appendWarehousePreviewQuery(
        this.populateRequestPreview(listEndpoint.path, startDate, endDate, zamanlama)
      );
    }

    if (!this.page.baseRouteOrFile.startsWith('/api/')) {
      return this.page.baseRouteOrFile;
    }

    const separator = this.page.baseRouteOrFile.includes('?') ? '&' : '?';
    return this.appendWarehousePreviewQuery(
      `${this.page.baseRouteOrFile}${separator}StartDate=${startDate}&EndDate=${endDate}`
    );
  }

  private populateRequestPreview(
    path: string,
    startDate: string,
    endDate: string,
    zamanlama: string
  ): string {
    return path
      .replace(/\{zamanlama\}/g, encodeURIComponent(zamanlama))
      .replace(/StartDate=\.\.\./g, `StartDate=${startDate}`)
      .replace(/EndDate=\.\.\./g, `EndDate=${endDate}`)
      .replace(/dateToGet=\.\.\./g, `dateToGet=${endDate}`)
      .replace(/dateTimeFilter=\.\.\./g, `dateTimeFilter=${startDate}T00:00:00`)
      .replace(/documentDate=\.\.\./g, `documentDate=${startDate}`);
  }

  private appendWarehousePreviewQuery(path: string): string {
    const warehouseNo = this.resolveListWarehouseNo();

    if (!warehouseNo) {
      return path;
    }

    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}WarehouseNo=${warehouseNo}`;
  }

  private getAdminWarehouseNo(): number | null {
    return toPositiveWarehouseNo(this.adminWarehouseNo());
  }

  private getPositiveRowNumber(record: Record<string, unknown>, key: string): number | null {
    const value = record[key];

    return typeof value === 'string' ||
      typeof value === 'number' ||
      value === null ||
      value === undefined
      ? toPositiveWarehouseNo(value)
      : null;
  }
}
