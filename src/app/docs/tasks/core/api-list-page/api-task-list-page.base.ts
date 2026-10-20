import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { HttpErrorResponse } from '@angular/common/http';
import { Directive, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, timer } from 'rxjs';
import type {
  IOfflineOperationResponseApiDto,
  SafeWriteReviewResultDto
} from '@interfaces';

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
import { PdfPrintService } from '../document-print/pdf-print.service';
import {
  buildAllWarehousesPermissionCode,
  currentUserHasPermission,
  currentUserCanUseAllWarehouses,
  formatCurrentWarehouseLabel,
  getCurrentWarehouseNo,
  toPositiveWarehouseNo
} from '../admin-warehouse.helpers';
import {
  SafeCreatePendingStore,
  buildSafeCreateUserId,
  type SafeCreatePendingRecord
} from '../safe-create-pending.store';
import { SafeCreateRecoveryService } from '../safe-create-recovery.service';
import {
  classifySafeCreateFailure,
  type ClientRequestPayload
} from '../safe-create-retry.helpers';

export interface ApiListQueryAction {
  key: string;
  label: string;
  iconClass?: string;
  title?: string;
}

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
  protected readonly fitTableToWidth: boolean = false;
  protected readonly unknownStatusLabel: string | null = null;
  protected readonly activityMessage = signal<string | null>(null);
  protected readonly tableSelectionKeyResolver = (row: object): string | null =>
    this.getTableSelectionKey(row as Row);

  protected readonly dialog = inject(Dialog);
  protected readonly destroyRef = inject(DestroyRef);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly listAuthService = inject(AuthService);
  private readonly safeCreatePendingStore = inject(SafeCreatePendingStore);
  private readonly safeCreateRecoveryService = inject(SafeCreateRecoveryService);
  private readonly safeCreateRecoveryInProgressId = signal<string | null>(null);
  private readonly scheduledSafeCreateChecks = new Set<string>();
  private activeRequestId = 0;

  protected readonly startDate = signal(this.getInitialStartDate());
  protected readonly endDate = signal(this.getInitialEndDate());
  protected readonly adminWarehouseNo = signal('');
  protected readonly rows = signal<Row[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastLoadedAt = signal<string | null>(null);
  protected readonly allWarehousesPermissionCode = computed(() =>
    buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
  );
  protected readonly createPermissionCode = computed(() =>
    this.buildActionPermissionCode('create')
  );
  protected readonly canOpenCreate = computed(() =>
    this.canCreate && this.hasTaskActionPermission('create')
  );
  protected readonly isAdminUser = computed(() =>
    currentUserCanUseAllWarehouses(
      this.listAuthService.currentUser(),
      this.allWarehousesPermissionCode()
    )
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
  private readonly safeCreateOperationCode = computed(() =>
    this.safeCreateRecoveryService.getOperationCode(this.page.id)
  );
  protected readonly safeCreatePendingRecords = computed(() => {
    const operationCode = this.safeCreateOperationCode();
    const warehouseNo = this.isAdminUser()
      ? toPositiveWarehouseNo(this.adminWarehouseNo())
      : getCurrentWarehouseNo(this.listAuthService.currentUser());

    if (!operationCode || !warehouseNo) {
      return [];
    }

    return this.safeCreatePendingStore
      .findForOperation<ClientRequestPayload>(
        buildSafeCreateUserId(this.listAuthService.currentUser()),
        'web',
        operationCode
      )
      .filter((record) => record.scope.warehouseNo === warehouseNo);
  });
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
    const pending = this.safeCreatePendingRecords().find((record) =>
      !this.safeCreatePendingStore.wasRecoveryAttemptedInSession(
        record.scope,
        record.request.clientRequestId ?? ''
      )
    );

    if (pending) {
      this.checkSafeCreatePending(pending, true);
    }
  }

  protected abstract fetchRows(zamanlama: string, warehouseNo?: number): Observable<Row[]>;

  protected getInitialStartDate(): string {
    return this.formatAsInputDate(new Date());
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

  protected getStartDateLabel(): string {
    return 'Baslangic Tarihi';
  }

  protected getEndDateLabel(): string {
    return 'Bitis Tarihi';
  }

  protected getDateRangeHelpText(): string {
    return '';
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

  protected getCreateButtonTitle(): string {
    if (this.canOpenCreate()) {
      return this.getCreateButtonLabel();
    }

    const permissionCode = this.createPermissionCode();
    return permissionCode
      ? `Bu islem icin ${permissionCode} yetkisi gerekiyor.`
      : 'Bu islemi yapmak icin yetki gerekiyor.';
  }

  protected getAdditionalQueryActions(): readonly ApiListQueryAction[] {
    return [];
  }

  protected isAdditionalQueryActionDisabled(_key: string): boolean {
    return false;
  }

  protected handleAdditionalQueryAction(_key: string): void {}

  protected getAdditionalRowActions(): readonly ApiListTableRowAction<Row>[] {
    return [];
  }

  protected shouldShowTableSelection(): boolean {
    return false;
  }

  protected getTableSelectedRowKeys(): ReadonlySet<string> {
    return new Set();
  }

  protected getTableSelectionKey(_row: Row): string | null {
    return null;
  }

  protected getTableSelectionActionLabel(): string {
    return 'Secilenleri Yazdir';
  }

  protected isTableSelectionActionDisabled(): boolean {
    return true;
  }

  protected shouldShowTableSelectAllAction(): boolean {
    return false;
  }

  protected getTableSelectAllActionLabel(): string {
    return 'Tumunu Yazdir';
  }

  protected isTableSelectAllActionDisabled(): boolean {
    return true;
  }

  protected isTableSelectionActionLoading(): boolean {
    return false;
  }

  protected handleTableSelectionChanged(_keys: ReadonlySet<string>): void {}

  protected handleTableSelectionAction(): void {}

  protected handleTableSelectAllAction(): void {}

  protected getPdfLoadingRowActions<TRow extends object>(
    actions: readonly ApiListTableRowAction<TRow>[]
  ): readonly ApiListTableRowAction<TRow>[] {
    const activityMessage = this.activityMessage();

    return actions.map((action) => {
      if (action.key !== 'show-pdf' && action.key !== 'print-pdf') {
        return action;
      }

      return {
        ...action,
        label: activityMessage
          ? action.key === 'print-pdf'
            ? 'Yazdirma Hazirlaniyor...'
            : 'PDF Yukleniyor...'
          : action.label,
        isDisabled: (row: TRow) => !!activityMessage || (action.isDisabled?.(row) ?? false)
      };
    });
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
      width: 'min(1120px, 96vw)',
      maxWidth: '96vw',
      data: this.buildDetailData(row)
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (result) {
          this.loadRows();
        }
      });
  }

  protected openCreate(): void {
    if (!this.canOpenCreate()) {
      this.errorMessage.set(this.getCreateButtonTitle());
      return;
    }

    openDocsTaskDialog(this.dialog, this.createComponent)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (!result) {
          return;
        }

        this.loadRows();
      });
  }

  protected handleSafeCreatePendingBeforeOpen(): boolean {
    return false;
  }

  protected isSafeCreatePendingBusy(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): boolean {
    return this.safeCreateRecoveryInProgressId() === pending.request.clientRequestId;
  }

  protected getSafeCreatePendingLabel(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): string {
    const requestId = pending.request.clientRequestId ?? '';
    return requestId ? requestId.slice(0, 8).toUpperCase() : 'Bilinmeyen istek';
  }

  protected getSafeCreatePendingMessage(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): string {
    return pending.failure?.message
      || (pending.state === 'needsReview'
        ? 'Kayit yetkili incelemesi bekliyor.'
        : 'Kaydin backend sonucu kontrol edilmeyi bekliyor.');
  }

  protected checkSafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>,
    automatic: boolean
  ): void {
    const clientRequestId = pending.request.clientRequestId?.trim();
    if (!clientRequestId || this.safeCreateRecoveryInProgressId()) {
      return;
    }

    const request = this.safeCreateRecoveryService.getStatus(this.page.id, clientRequestId);
    if (!request) {
      return;
    }

    this.safeCreateRecoveryInProgressId.set(clientRequestId);
    this.errorMessage.set(null);
    this.activityMessage.set(
      automatic ? 'Yarim kalan kaydin durumu kontrol ediliyor.' : 'Bekleyen kayit kontrol ediliyor.'
    );
    this.safeCreatePendingStore.markRecoveryAttemptedInSession(pending.scope, clientRequestId);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.safeCreateRecoveryInProgressId.set(null);
          this.activityMessage.set(null);
        })
      )
      .subscribe({
        next: (status: IOfflineOperationResponseApiDto<unknown>) => {
          this.applySafeCreateStatus(pending, status);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            const failure = {
              message:
                'Backend takip kaydi bulunamadi. Saklanan ayni istek kimligiyle bir kez yeniden gonderiliyor.',
              errorCode: null,
              retryable: true,
              recoveryState: 'NotStarted',
              recommendedAction: 'RetrySameRequest',
              blocksSubmit: false,
              allowsNewAttempt: false
            };
            this.safeCreatePendingStore.markFailure(pending.scope, clientRequestId, failure);
            timer(0)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(() => {
                const current = this.safeCreatePendingStore.read<ClientRequestPayload>(
                  pending.scope,
                  clientRequestId,
                );
                if (current?.failure?.recommendedAction === 'RetrySameRequest') {
                  this.recoverSafeCreatePending(current);
                }
              });
            return;
          }

          const failure = classifySafeCreateFailure(
            error,
            'Bekleyen kaydin sonucu kontrol edilemedi.'
          );
          this.safeCreatePendingStore.markFailure(pending.scope, clientRequestId, failure);
          this.errorMessage.set(failure.message);
        }
      });
  }

  protected retrySafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): void {
    const action = pending.failure?.recommendedAction;

    if (action === 'RetrySameRequest') {
      this.recoverSafeCreatePending(pending);
      return;
    }

    if (action === 'RecheckExisting') {
      this.recheckSafeCreatePending(pending);
      return;
    }

    this.checkSafeCreatePending(pending, false);
  }

  protected canRetrySafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): boolean {
    return pending.failure?.recommendedAction === 'RetrySameRequest';
  }

  protected canRecheckSafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): boolean {
    return pending.failure?.recommendedAction === 'RecheckExisting';
  }

  private applySafeCreateStatus(
    pending: SafeCreatePendingRecord<ClientRequestPayload>,
    response: IOfflineOperationResponseApiDto<unknown>
  ): void {
    const clientRequestId = pending.request.clientRequestId ?? '';
    const status = response.status.trim().toLocaleLowerCase('tr-TR');
    const recommendedAction = response.recommendedAction?.trim() || null;

    if (status === 'completed' || recommendedAction === 'Completed') {
      this.scheduledSafeCreateChecks.delete(clientRequestId);
      this.safeCreatePendingStore.remove(pending.scope, clientRequestId);
      this.loadRows();
      return;
    }

    if (status === 'cancelled' || recommendedAction === 'ClearCancelled') {
      this.scheduledSafeCreateChecks.delete(clientRequestId);
      this.safeCreatePendingStore.remove(pending.scope, clientRequestId);
      this.errorMessage.set('Yetkili tarafindan iptal edilen bekleyen kayit temizlendi.');
      return;
    }

    const retryDelay = response.retryAfterSeconds
      ? ` ${response.retryAfterSeconds} saniye sonra tekrar kontrol edin.`
      : '';
    const failure = {
      message: response.errorMessage
        || (status === 'processing'
          ? `Kayit backend tarafinda isleniyor.${retryDelay}`
          : `Kayit tamamlanamadi.${retryDelay}`),
      errorCode: response.errorCode,
      retryable: status === 'processing' ? true : response.retryable,
      recoveryState: response.recoveryState,
      recommendedAction: recommendedAction || (status === 'processing' ? 'WaitAndCheck' : 'NeedsReview'),
      blocksSubmit: recommendedAction !== 'RetrySameRequest',
      allowsNewAttempt: false
    };

    this.safeCreatePendingStore.markFailure(pending.scope, clientRequestId, failure);
    this.errorMessage.set(failure.message);

    if (failure.recommendedAction === 'WaitAndCheck') {
      this.scheduleSafeCreateStatusCheck(
        pending,
        Math.max(1, response.retryAfterSeconds ?? 5),
      );
    }
  }

  private scheduleSafeCreateStatusCheck(
    pending: SafeCreatePendingRecord<ClientRequestPayload>,
    delaySeconds: number,
  ): void {
    const clientRequestId = pending.request.clientRequestId?.trim();
    if (!clientRequestId || this.scheduledSafeCreateChecks.has(clientRequestId)) {
      return;
    }

    this.scheduledSafeCreateChecks.add(clientRequestId);
    timer(delaySeconds * 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.scheduledSafeCreateChecks.delete(clientRequestId);
        const current = this.safeCreatePendingStore.read<ClientRequestPayload>(
          pending.scope,
          clientRequestId,
        );
        if (current?.failure?.recommendedAction === 'WaitAndCheck') {
          this.checkSafeCreatePending(current, true);
        }
      });
  }

  private recheckSafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): void {
    const clientRequestId = pending.request.clientRequestId?.trim();
    if (!clientRequestId || this.safeCreateRecoveryInProgressId()) {
      return;
    }

    const request = this.safeCreateRecoveryService.recheck(this.page.id, clientRequestId);
    if (!request) {
      return;
    }

    this.safeCreateRecoveryInProgressId.set(clientRequestId);
    this.activityMessage.set('Mikro kaydi yeniden dogrulaniyor. Yeni evrak yazilmayacak.');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.safeCreateRecoveryInProgressId.set(null);
          this.activityMessage.set(null);
        })
      )
      .subscribe({
        next: (result: SafeWriteReviewResultDto) => {
          this.applySafeCreateStatus(pending, {
            clientRequestId,
            operationCode: pending.scope.operationCode,
            status: result.safeWrite.status || 'Failed',
            createdAtUtc: result.safeWrite.createdAtUtc,
            completedAtUtc: result.safeWrite.completedAtUtc,
            errorMessage: result.message || result.safeWrite.errorMessage,
            errorCode: result.safeWrite.errorCode,
            retryable: result.safeWrite.retryable,
            retryAfterSeconds: null,
            result: result.result,
            recoveryState: result.recoveryState,
            recommendedAction: result.recommendedAction
          });
        },
        error: (error: HttpErrorResponse) => {
          const failure = classifySafeCreateFailure(
            error,
            'Mikro kaydi yeniden dogrulanamadi.'
          );
          this.safeCreatePendingStore.markFailure(pending.scope, clientRequestId, failure);
          this.errorMessage.set(failure.message);
        }
      });
  }

  private recoverSafeCreatePending(
    pending: SafeCreatePendingRecord<ClientRequestPayload>
  ): void {
    const clientRequestId = pending.request.clientRequestId?.trim();
    if (!clientRequestId || this.safeCreateRecoveryInProgressId()) {
      return;
    }

    if (pending.failure?.recommendedAction !== 'RetrySameRequest') {
      this.errorMessage.set(
        'Backend yeniden gonderim izni vermedi. Once mevcut kaydin durumunu kontrol edin.'
      );
      return;
    }

    const request = this.safeCreateRecoveryService.recover(this.page.id, pending.request);
    if (!request) {
      return;
    }

    this.safeCreateRecoveryInProgressId.set(clientRequestId);
    this.activityMessage.set('Ayni istek kimligiyle guvenli tekrar deneniyor.');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.safeCreateRecoveryInProgressId.set(null);
          this.activityMessage.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.safeCreatePendingStore.remove(pending.scope, clientRequestId);
          this.loadRows();
        },
        error: (error: HttpErrorResponse) => {
          const failure = classifySafeCreateFailure(error, 'Bekleyen kayit tamamlanamadi.');
          this.safeCreatePendingStore.markFailure(pending.scope, clientRequestId, failure);
          this.errorMessage.set(failure.message);
        }
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

    return undefined;
  }

  protected hasTaskActionPermission(action: string): boolean {
    const permissionCode = this.buildActionPermissionCode(action);

    if (!permissionCode) {
      return true;
    }

    return currentUserHasPermission(this.listAuthService.currentUser(), permissionCode);
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

  protected printPdfBlob(blob: Blob, title = 'PDF'): void {
    void this.pdfPrintService.print({ blob, title }).catch((error: unknown) => {
      this.errorMessage.set(
        this.resolveHttpErrorMessage(
          error,
          'PDF yazdirma ekrani acilamadi. Tarayicinin yazdirma iznini kontrol edin.'
        )
      );
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

  private buildActionPermissionCode(action: string): string | null {
    const normalizedAction = action.trim().toLocaleLowerCase('tr-TR');

    if (!normalizedAction) {
      return null;
    }

    const normalizedRoute = this.page.baseRouteOrFile?.split('|')[0]?.trim();

    if (!normalizedRoute?.startsWith('/api/')) {
      return null;
    }

    const segments = normalizedRoute.split('/').filter(Boolean);
    const apiIndex = segments.findIndex(
      (segment) => segment.toLocaleLowerCase('tr-TR') === 'api'
    );
    const moduleCode = segments[apiIndex + 1];
    const menuCode = segments[apiIndex + 2];

    if (!moduleCode || !menuCode) {
      return null;
    }

    const routeDirection = segments.at(-1)?.toLocaleLowerCase('tr-TR');
    const taskId = this.page.id?.trim();

    if ((routeDirection === 'giden' || routeDirection === 'gelen') && taskId) {
      return `${moduleCode}.${taskId}.${normalizedAction}`;
    }

    return `${moduleCode}.${menuCode}.${normalizedAction}`;
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
