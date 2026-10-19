import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize, timer } from 'rxjs';
import type {
  DatabaseActiveRequestDto,
  DatabaseBlockingEdgeDto,
  DatabaseMonitoringIncidentDto,
  DatabaseMonitoringSnapshotDto,
  DatabaseOpenTransactionDto,
  DatabaseRecommendationDto,
  DatabaseRollbackStatusDto,
  DatabaseSessionTerminationDto,
  MonitoringOverviewDto,
  SafeWriteMonitoringItemDto,
  SafeWriteMonitoringListHttpRequest,
  SafeWriteReviewAuditDto,
  SafeWriteReviewHttpRequest,
  SafeWriteReviewResultDto,
  WorkerMonitoringItemDto,
  WorkerMonitoringSnapshotDto,
} from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  ActionFeedback,
  getErrorMessage,
  getOptionalText,
  hasSettingsPermission,
} from '../../settings-task.helpers';
import {
  buildSafeWriteMonitoringRequest,
  getSafeWriteStatusPresentation,
  type SafeWriteRetryableFilter,
  type SafeWriteStatusFilter,
  type SafeWriteStatusTone,
} from './safe-write-monitoring.helpers';

type MonitorTab = 'live' | 'workers' | 'safeWrites' | 'incidents' | 'audits';
type SafeWriteReviewAction = 'recheck' | 'reopen' | 'cancel';

interface DatabaseSessionCandidate {
  sessionId: number;
  loginTime: string;
  hostProcessId: number | null;
  loginName: string | null;
  hostName: string | null;
  programName: string | null;
  databaseName: string | null;
  sqlText: string | null;
  severity: string | null;
  recommendation: string | null;
  canTerminate: boolean;
  source: 'request' | 'transaction';
}

const TASK_ID = 'veritabani-izleme';
const PERMISSION_PREFIX = 'ayar-islemleri.veritabani-izleme';

@Component({
  selector: 'app-veritabani-izleme-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './veritabani-izleme-list.component.html',
  styleUrl: './veritabani-izleme-list.component.scss',
})
export class VeritabaniIzlemeListComponent implements OnInit {
  protected readonly page: DocsContentPage = DOCS_PAGES[TASK_ID];
  protected readonly tab = signal<MonitorTab>('live');
  protected readonly monitoringOverview = signal<MonitoringOverviewDto | null>(null);
  protected readonly snapshot = signal<DatabaseMonitoringSnapshotDto | null>(null);
  protected readonly workerSnapshot = signal<WorkerMonitoringSnapshotDto | null>(null);
  protected readonly incidents = signal<DatabaseMonitoringIncidentDto[]>([]);
  protected readonly terminations = signal<DatabaseSessionTerminationDto[]>([]);
  protected readonly safeWrites = signal<SafeWriteMonitoringItemDto[]>([]);
  protected readonly selectedSafeWrite = signal<SafeWriteMonitoringItemDto | null>(null);
  protected readonly safeWriteReviewHistory = signal<SafeWriteReviewAuditDto[]>([]);
  protected readonly selectedSession = signal<DatabaseSessionCandidate | null>(null);
  protected readonly rollback = signal<DatabaseRollbackStatusDto | null>(null);
  protected readonly rollbackSessionId = signal<number | null>(null);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isOverviewLoading = signal(false);
  protected readonly isWorkerLoading = signal(false);
  protected readonly isHistoryLoading = signal(false);
  protected readonly isSafeWriteLoading = signal(false);
  protected readonly isSafeWriteReviewLoading = signal(false);
  protected readonly isSafeWriteActionRunning = signal(false);
  protected readonly isTerminating = signal(false);
  protected readonly isRollbackLoading = signal(false);

  protected readonly lastUpdated = computed(
    () => this.monitoringOverview()?.generatedAtUtc ?? this.snapshot()?.generatedAtUtc ?? null,
  );
  protected readonly activeRequests = computed(() => this.snapshot()?.requests ?? []);
  protected readonly blockingEdges = computed(() => this.snapshot()?.blocking ?? []);
  protected readonly openTransactions = computed(() => this.snapshot()?.openTransactions ?? []);
  protected readonly recommendations = computed(() => this.snapshot()?.recommendations ?? []);
  protected readonly workers = computed(() => this.workerSnapshot()?.workers ?? []);
  protected readonly queuedWorkerJobCount = computed(() =>
    this.workers().reduce((total, worker) => total + worker.queuedCount, 0),
  );
  protected readonly unhealthyWorkerCount = computed(
    () =>
      this.workers().filter(
        (worker) =>
          worker.requiresAttention || worker.status?.toLocaleLowerCase('tr-TR') === 'unhealthy',
      ).length,
  );
  protected readonly unresolvedWorkerFailureCount = computed(() =>
    this.workers().reduce(
      (total, worker) => total + Math.max(0, worker.unresolvedFailureCount ?? 0),
      0,
    ),
  );
  protected readonly safeWriteAttentionCount = computed(() => {
    const safeWrites = this.monitoringOverview()?.safeWrites;
    return safeWrites
      ? safeWrites.staleProcessingCount +
          safeWrites.retryableFailureCount +
          safeWrites.manualReviewCount +
          safeWrites.unclassifiedFailureCount
      : 0;
  });
  protected readonly refreshSeconds = computed(
    () => this.snapshot()?.thresholds.refreshSeconds ?? 10,
  );
  protected readonly isCurrentHistoryLoading = computed(() =>
    this.tab() === 'workers'
      ? this.isWorkerLoading()
      : this.tab() === 'safeWrites'
        ? this.isSafeWriteLoading()
        : this.isHistoryLoading(),
  );

  protected readonly terminateForm = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),
  });
  protected readonly safeWriteFilterForm = new FormGroup({
    status: new FormControl<SafeWriteStatusFilter>('', { nonNullable: true }),
    operationCode: new FormControl('', { nonNullable: true }),
    warehouseNo: new FormControl<number | null>(null),
    retryable: new FormControl<SafeWriteRetryableFilter>('all', { nonNullable: true }),
    includeCompleted: new FormControl(false, { nonNullable: true }),
  });
  protected readonly safeWriteReviewForm = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),
  });

  private readonly authService = inject(AuthService);
  private readonly api = inject(AyarIslemleriService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canList = computed(() => this.hasPermission(`${PERMISSION_PREFIX}.list`));
  protected readonly canViewHistory = computed(() =>
    this.hasPermission(`${PERMISSION_PREFIX}.detail`),
  );
  protected readonly canTerminate = computed(() =>
    this.hasPermission(`${PERMISSION_PREFIX}.terminate-session`),
  );
  protected readonly canResolveSafeWrites = computed(() =>
    this.hasPermission(`${PERMISSION_PREFIX}.resolve-safe-write`),
  );
  protected readonly canReviewSelectedSafeWrite = computed(() => {
    const status = this.selectedSafeWrite()?.status;
    return this.canResolveSafeWrites() && status !== 'Completed' && status !== 'Cancelled';
  });
  protected readonly canTerminateSelected = computed(
    () => this.canTerminate() && !!this.selectedSession()?.canTerminate,
  );

  ngOnInit(): void {
    if (!this.canList()) {
      this.showError(
        'Yetki gerekli',
        'Canli veritabani izleme verisini goruntuleme yetkiniz bulunmuyor.',
      );
      return;
    }

    this.startPolling();

    if (this.canViewHistory()) {
      this.loadHistory();
    }
  }

  protected setTab(tab: MonitorTab): void {
    if (tab !== 'live' && tab !== 'workers' && !this.canViewHistory()) {
      return;
    }

    this.tab.set(tab);

    if (tab === 'workers') {
      this.loadWorkerSnapshot(false);
      return;
    }

    if (tab !== 'live' && !this.isHistoryLoading()) {
      this.loadHistory();
    }
  }

  protected refresh(): void {
    if (!this.isLoading()) {
      this.loadMonitoringOverview(false);
      this.loadSnapshot(true);
    }
  }

  protected refreshHistory(): void {
    if (this.tab() === 'workers') {
      this.loadWorkerSnapshot(true);
      return;
    }

    if (!this.canViewHistory()) {
      return;
    }

    if (this.tab() === 'safeWrites') {
      this.loadSafeWrites(true);
    } else if (!this.isHistoryLoading()) {
      this.loadHistory(true);
    }
  }

  protected applySafeWriteFilters(): void {
    this.loadSafeWrites(true);
  }

  protected resetSafeWriteFilters(): void {
    this.safeWriteFilterForm.reset({
      status: '',
      operationCode: '',
      warehouseNo: null,
      retryable: 'all',
      includeCompleted: false,
    });
    this.loadSafeWrites(true);
  }

  protected selectSafeWrite(item: SafeWriteMonitoringItemDto): void {
    this.selectedSafeWrite.set(item);
    this.safeWriteReviewForm.reset({ reason: '' });
    this.loadSafeWriteReviewHistory(item.id);
  }

  protected closeSafeWriteReview(): void {
    this.selectedSafeWrite.set(null);
    this.safeWriteReviewHistory.set([]);
    this.safeWriteReviewForm.reset({ reason: '' });
  }

  protected async runSafeWriteReviewAction(action: SafeWriteReviewAction): Promise<void> {
    const item = this.selectedSafeWrite();
    if (!item || !this.canReviewSelectedSafeWrite() || this.isSafeWriteActionRunning()) {
      return;
    }

    this.safeWriteReviewForm.markAllAsTouched();
    if (this.safeWriteReviewForm.invalid) {
      return;
    }

    const actionLabel = this.safeWriteReviewActionLabel(action);
    const confirmed = await this.confirmDialog.confirm({
      title: `${actionLabel}: ${item.clientRequestId.slice(0, 8).toUpperCase()}`,
      message:
        action === 'cancel'
          ? 'Bu islem Mikro belgesini silmez. Yalniz guvenli yazma takip kaydini iptal eder.'
          : 'Backend mevcut Mikro kaydini salt-okuma ile kontrol edecek. Sonuc kesinlesmeden yeni belge yazilmayacak.',
      confirmText: actionLabel,
      tone: action === 'cancel' ? 'danger' : 'info',
    });
    if (!confirmed) {
      return;
    }

    const requestBody: SafeWriteReviewHttpRequest = {
      reason: this.safeWriteReviewForm.controls.reason.value.trim(),
    };
    let request: Observable<SafeWriteReviewResultDto>;
    if (action === 'recheck') {
      request = this.api.recheckSafeWrite(item.id, requestBody);
    } else if (action === 'reopen') {
      request = this.api.reopenSafeWrite(item.id, requestBody);
    } else {
      request = this.api.cancelSafeWrite(item.id, requestBody);
    }

    this.isSafeWriteActionRunning.set(true);
    this.feedback.set(null);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSafeWriteActionRunning.set(false)),
      )
      .subscribe({
        next: (result: SafeWriteReviewResultDto) => {
          this.selectedSafeWrite.set(result.safeWrite);
          this.safeWrites.update((items) =>
            items.map((current) => current.id === result.safeWrite.id ? result.safeWrite : current),
          );
          this.safeWriteReviewForm.reset({ reason: '' });
          this.loadSafeWriteReviewHistory(result.safeWrite.id);
          this.loadMonitoringOverview(false);
          this.showSuccess(
            `${actionLabel} tamamlandi`,
            result.message || `Sonuc: ${result.outcome || 'Kayit guncellendi'}.`,
          );
        },
        error: (error: unknown) =>
          this.showError(
            `${actionLabel} tamamlanamadi`,
            getErrorMessage(error, 'Guvenli yazma inceleme islemi tamamlanamadi.'),
          ),
      });
  }

  protected safeWriteReviewActionLabel(action: SafeWriteReviewAction): string {
    switch (action) {
      case 'recheck':
        return 'Yeniden Dogrula';
      case 'reopen':
        return 'Tekrar Ac';
      case 'cancel':
        return 'Iptal Et';
    }
  }

  protected selectRequest(request: DatabaseActiveRequestDto): void {
    this.setSelectedSession({
      sessionId: request.sessionId,
      loginTime: request.loginTime,
      hostProcessId: request.hostProcessId,
      loginName: request.loginName,
      hostName: request.hostName,
      programName: request.programName,
      databaseName: request.databaseName,
      sqlText: request.sqlText,
      severity: request.severity,
      recommendation: request.recommendation,
      canTerminate: request.canTerminate,
      source: 'request',
    });
  }

  protected selectOpenTransaction(transaction: DatabaseOpenTransactionDto): void {
    this.setSelectedSession({
      sessionId: transaction.sessionId,
      loginTime: transaction.loginTime,
      hostProcessId: transaction.hostProcessId,
      loginName: transaction.loginName,
      hostName: transaction.hostName,
      programName: transaction.programName,
      databaseName: this.snapshot()?.databaseName ?? null,
      sqlText: transaction.lastSqlText,
      severity: transaction.severity,
      recommendation: transaction.recommendation,
      canTerminate: transaction.canTerminate,
      source: 'transaction',
    });
  }

  protected selectSessionById(sessionId: number): void {
    const request = this.activeRequests().find((item) => item.sessionId === sessionId);

    if (request) {
      this.selectRequest(request);
      return;
    }

    const transaction = this.openTransactions().find((item) => item.sessionId === sessionId);

    if (transaction) {
      this.selectOpenTransaction(transaction);
      return;
    }

    this.showError(
      'Oturum bulunamadi',
      `SPID ${sessionId} canli istek veya acik transaction listesinde yer almiyor.`,
    );
  }

  protected loadRollbackStatus(): void {
    const sessionId = this.rollbackSessionId() ?? this.selectedSession()?.sessionId ?? null;

    if (!sessionId || this.isRollbackLoading()) {
      return;
    }

    this.isRollbackLoading.set(true);
    this.api
      .getDatabaseSessionRollbackStatus(sessionId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isRollbackLoading.set(false)),
      )
      .subscribe({
        next: (status: DatabaseRollbackStatusDto) => this.rollback.set(status),
        error: (error: unknown) =>
          this.showError(
            'Rollback durumu alinamadi',
            getErrorMessage(error, 'Oturum rollback durumu okunamadi.'),
          ),
      });
  }

  protected async terminateSelectedSession(): Promise<void> {
    const session = this.selectedSession();
    const reason = getOptionalText(this.terminateForm.controls.reason.value);

    if (!this.canTerminateSelected() || !session || this.isTerminating()) {
      return;
    }

    if (this.terminateForm.invalid || !reason) {
      this.terminateForm.markAllAsTouched();
      this.showError('Gerekce eksik', 'Oturum sonlandirma gerekcesi en az 10 karakter olmalidir.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: `SPID ${session.sessionId} sonlandirilsin mi?`,
      message:
        'Aktif SQL oturumu sonlandirilacak. Oturum kimligi backend tarafinda tekrar dogrulanir ve her deneme audit kaydina yazilir.',
      confirmText: 'Oturumu Sonlandir',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.isTerminating.set(true);
    this.api
      .terminateDatabaseSession(session.sessionId, {
        expectedLoginTime: session.loginTime,
        expectedHostProcessId: session.hostProcessId,
        expectedProgramName: session.programName,
        reason,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isTerminating.set(false)),
      )
      .subscribe({
        next: (result: DatabaseSessionTerminationDto) => {
          this.rollbackSessionId.set(result.sessionId);
          this.rollback.set(null);
          this.terminateForm.reset();
          this.showSuccess(
            'Oturum sonlandirma tamamlandi',
            `SPID ${result.sessionId} icin audit kaydi olusturuldu.`,
          );
          this.loadSnapshot(false);
          if (this.canViewHistory()) {
            this.loadHistory();
          }
        },
        error: (error: unknown) =>
          this.showError(
            'Oturum sonlandirilamadi',
            getErrorMessage(error, 'Oturum sonlandirma istegi basarisiz oldu.'),
          ),
      });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('tr-TR');
  }

  protected formatDuration(milliseconds: number | null | undefined): string {
    const value = Number(milliseconds ?? 0);

    if (!Number.isFinite(value) || value <= 0) {
      return '0 sn';
    }

    if (value < 1000) {
      return `${Math.round(value)} ms`;
    }

    if (value < 60000) {
      return `${(value / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn`;
    }

    return `${(value / 60000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} dk`;
  }

  protected statusLabel(value: string | null | undefined): string {
    switch (value?.toLocaleLowerCase('tr-TR')) {
      case 'healthy':
        return 'Saglikli';
      case 'warning':
      case 'degraded':
        return 'Uyari';
      case 'critical':
      case 'unhealthy':
        return 'Kritik';
      case 'disabled':
        return 'Kapali';
      default:
        return value?.trim() || 'Bilinmiyor';
    }
  }

  protected overviewStatusClass(value: string | null | undefined): string {
    switch (value?.toLocaleLowerCase('tr-TR')) {
      case 'warning':
      case 'degraded':
        return 'metric-warning';
      case 'critical':
      case 'unhealthy':
        return 'metric-critical';
      default:
        return '';
    }
  }

  protected safeWriteStatusLabel(item: SafeWriteMonitoringItemDto): string {
    return getSafeWriteStatusPresentation(item).label;
  }

  protected safeWriteStatusClass(item: SafeWriteMonitoringItemDto): string {
    const tone: SafeWriteStatusTone = getSafeWriteStatusPresentation(item).tone;
    return tone === 'neutral' ? '' : `status-${tone}`;
  }

  protected safeWriteRetryLabel(item: SafeWriteMonitoringItemDto): string {
    return getSafeWriteStatusPresentation(item).retryLabel;
  }

  protected workerStatusClass(worker: WorkerMonitoringItemDto): string {
    if (worker.requiresAttention && worker.status?.toLocaleLowerCase('tr-TR') === 'healthy') {
      return 'status-warning';
    }

    switch (worker.status?.toLocaleLowerCase('tr-TR')) {
      case 'healthy':
        return 'status-good';
      case 'degraded':
        return 'status-warning';
      case 'unhealthy':
        return 'status-critical';
      case 'disabled':
        return 'status-disabled';
      default:
        return '';
    }
  }

  protected workerStatusLabel(worker: WorkerMonitoringItemDto): string {
    return worker.statusName?.trim() || this.statusLabel(worker.status);
  }

  protected formatSeconds(seconds: number | null | undefined): string {
    return this.formatDuration(Number(seconds ?? 0) * 1000);
  }

  protected trackByRequest(_: number, request: DatabaseActiveRequestDto): string {
    return `${request.sessionId}-${request.requestId}`;
  }

  protected trackByBlockingEdge(_: number, edge: DatabaseBlockingEdgeDto): string {
    return `${edge.rootSessionId}-${edge.blockingSessionId}-${edge.blockedSessionId}-${edge.depth}`;
  }

  protected trackByTransaction(_: number, transaction: DatabaseOpenTransactionDto): number {
    return transaction.sessionId;
  }

  protected trackByRecommendation(
    index: number,
    recommendation: DatabaseRecommendationDto,
  ): string {
    return recommendation.code || `${index}`;
  }

  protected trackByIncident(_: number, incident: DatabaseMonitoringIncidentDto): string {
    return incident.id;
  }

  protected trackByTermination(_: number, termination: DatabaseSessionTerminationDto): string {
    return termination.id;
  }

  protected trackBySafeWrite(_: number, item: SafeWriteMonitoringItemDto): string {
    return item.id || item.clientRequestId;
  }

  protected trackBySafeWriteReview(_: number, item: SafeWriteReviewAuditDto): string {
    return item.id;
  }

  protected trackByWorker(index: number, worker: WorkerMonitoringItemDto): string {
    return worker.code || worker.name || `${index}`;
  }

  private startPolling(): void {
    timer(0, 10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadMonitoringOverview(false);
        if (this.tab() !== 'workers') {
          this.loadSnapshot(false);
        }
      });
  }

  private loadMonitoringOverview(showFeedback: boolean): void {
    if (!this.canList() || this.isOverviewLoading()) {
      return;
    }

    this.isOverviewLoading.set(true);
    this.api
      .getDatabaseMonitoringOverview()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isOverviewLoading.set(false)),
      )
      .subscribe({
        next: (overview: MonitoringOverviewDto) => {
          this.monitoringOverview.set(overview);
          this.workerSnapshot.set(overview.workers);
          if (showFeedback) {
            this.showSuccess(
              'Operasyon ozeti yenilendi',
              overview.headline || 'Izleme ozeti guncellendi.',
            );
          }
        },
        error: (error: unknown) => {
          if (showFeedback) {
            this.showError(
              'Operasyon ozeti alinamadi',
              getErrorMessage(error, 'Birlesik izleme ozeti okunamadi.'),
            );
          }
        },
      });
  }

  private loadSnapshot(showFeedback: boolean): void {
    if (!this.canList() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.api
      .getDatabaseMonitoringSnapshot()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (snapshot: DatabaseMonitoringSnapshotDto) => {
          this.applySnapshot(snapshot);
          if (showFeedback) {
            this.showSuccess(
              'Canli veri yenilendi',
              `${snapshot.activeRequestCount} aktif istek listelendi.`,
            );
          }
        },
        error: (error: unknown) =>
          this.showError(
            'Canli veri alinamadi',
            getErrorMessage(error, 'Veritabani izleme verisi okunamadi.'),
          ),
      });
  }

  private applySnapshot(snapshot: DatabaseMonitoringSnapshotDto): void {
    this.snapshot.set(snapshot);
    const selected = this.selectedSession();

    if (!selected) {
      return;
    }

    const activeRequest = (snapshot.requests ?? []).find(
      (item: DatabaseActiveRequestDto) => item.sessionId === selected.sessionId,
    );
    if (activeRequest) {
      this.selectedSession.update((current) =>
        current
          ? {
              ...current,
              hostProcessId: activeRequest.hostProcessId,
              sqlText: activeRequest.sqlText,
              severity: activeRequest.severity,
              recommendation: activeRequest.recommendation,
              canTerminate: activeRequest.canTerminate,
            }
          : null,
      );
      return;
    }

    const transaction = (snapshot.openTransactions ?? []).find(
      (item: DatabaseOpenTransactionDto) => item.sessionId === selected.sessionId,
    );
    if (transaction) {
      this.selectedSession.update((current) =>
        current
          ? {
              ...current,
              hostProcessId: transaction.hostProcessId,
              sqlText: transaction.lastSqlText,
              severity: transaction.severity,
              recommendation: transaction.recommendation,
              canTerminate: transaction.canTerminate,
            }
          : null,
      );
    }
  }

  private loadWorkerSnapshot(showFeedback: boolean): void {
    if (!this.canList() || this.isWorkerLoading()) {
      return;
    }

    this.isWorkerLoading.set(true);
    this.api
      .getWorkerMonitoringSnapshot()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isWorkerLoading.set(false)),
      )
      .subscribe({
        next: (snapshot: WorkerMonitoringSnapshotDto) => {
          this.workerSnapshot.set(snapshot);
          if (showFeedback) {
            this.showSuccess(
              'Worker durumu yenilendi',
              `${snapshot.workers?.length ?? 0} arka plan sureci kontrol edildi.`,
            );
          }
        },
        error: (error: unknown) =>
          this.showError(
            'Worker durumu alinamadi',
            getErrorMessage(error, 'Arka plan sureclerinin durumu okunamadi.'),
          ),
      });
  }

  private setSelectedSession(session: DatabaseSessionCandidate): void {
    if (this.selectedSession()?.sessionId !== session.sessionId) {
      this.terminateForm.reset();
      this.rollback.set(null);
    }

    this.selectedSession.set(session);
    this.rollbackSessionId.set(session.sessionId);
  }

  private loadHistory(showFeedback = false): void {
    if (!this.canViewHistory() || this.isHistoryLoading()) {
      return;
    }

    this.isHistoryLoading.set(true);
    let pendingRequestCount = 2;
    let hasError = false;
    const finishRequest = (): void => {
      pendingRequestCount -= 1;

      if (pendingRequestCount > 0) {
        return;
      }

      this.isHistoryLoading.set(false);
      if (showFeedback && !hasError) {
        this.showSuccess('Gecmis yenilendi', 'Olay ve sonlandirma gecmisi guncellendi.');
      }
    };
    const handleError = (error: unknown): void => {
      if (hasError) {
        return;
      }

      hasError = true;
      this.showError(
        'Gecmis alinamadi',
        getErrorMessage(error, 'Olay ve audit gecmisi okunamadi.'),
      );
    };

    this.api
      .getDatabaseMonitoringIncidents()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(finishRequest))
      .subscribe({
        next: (incidents: DatabaseMonitoringIncidentDto[]) => this.incidents.set(incidents ?? []),
        error: handleError,
      });

    this.api
      .getDatabaseSessionTerminationAudits()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(finishRequest))
      .subscribe({
        next: (terminations: DatabaseSessionTerminationDto[]) =>
          this.terminations.set(terminations ?? []),
        error: handleError,
      });

    this.loadSafeWrites(false);
  }

  private loadSafeWrites(showFeedback: boolean): void {
    if (!this.canViewHistory() || this.isSafeWriteLoading()) {
      return;
    }

    const request: SafeWriteMonitoringListHttpRequest = buildSafeWriteMonitoringRequest(
      this.safeWriteFilterForm.getRawValue(),
    );
    this.isSafeWriteLoading.set(true);
    this.api
      .getSafeWriteMonitoringItems(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSafeWriteLoading.set(false)),
      )
      .subscribe({
        next: (items: SafeWriteMonitoringItemDto[]) => {
          this.safeWrites.set(items ?? []);
          const selectedId = this.selectedSafeWrite()?.id;
          if (selectedId) {
            this.selectedSafeWrite.set(items?.find((item) => item.id === selectedId) ?? null);
          }
          if (showFeedback) {
            this.showSuccess(
              'Guvenli yazmalar yenilendi',
              `${items?.length ?? 0} kayit listelendi.`,
            );
          }
        },
        error: (error: unknown) =>
          this.showError(
            'Guvenli yazmalar alinamadi',
            getErrorMessage(error, 'Guvenli create kayitlari okunamadi.'),
          ),
      });
  }

  private loadSafeWriteReviewHistory(id: string): void {
    if (!this.canViewHistory() || this.isSafeWriteReviewLoading()) {
      return;
    }

    this.isSafeWriteReviewLoading.set(true);
    this.api
      .getSafeWriteReviewHistory(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSafeWriteReviewLoading.set(false)),
      )
      .subscribe({
        next: (items: SafeWriteReviewAuditDto[]) =>
          this.safeWriteReviewHistory.set(items ?? []),
        error: (error: unknown) =>
          this.showError(
            'Inceleme gecmisi alinamadi',
            getErrorMessage(error, 'Guvenli yazma inceleme gecmisi okunamadi.'),
          ),
      });
  }

  private hasPermission(permissionCode: string): boolean {
    return hasSettingsPermission(this.authService, TASK_ID, permissionCode);
  }

  private showSuccess(title: string, message: string): void {
    this.feedback.set({ tone: 'success', title, message });
  }

  private showError(title: string, message: string): void {
    this.feedback.set({ tone: 'error', title, message });
  }
}
