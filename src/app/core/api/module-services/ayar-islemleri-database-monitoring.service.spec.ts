import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  DatabaseMonitoringSnapshotDto,
  DatabaseSessionTerminationDto,
  MonitoringOverviewDto,
  SafeWriteReviewHttpRequest,
  TerminateDatabaseSessionHttpRequest,
  WorkerMonitoringSnapshotDto
} from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { AyarIslemleriService } from './ayar-islemleri.service';

describe('AyarIslemleriService database monitoring', () => {
  let httpTesting: HttpTestingController;
  let service: AyarIslemleriService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AyarIslemleriService);
  });

  afterEach(() => httpTesting.verify());

  it('gets the live database snapshot', () => {
    let result!: DatabaseMonitoringSnapshotDto;

    service
      .getDatabaseMonitoringSnapshot()
      .subscribe((value: DatabaseMonitoringSnapshotDto) => (result = value));

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/veritabani-izleme/anlik'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      generatedAtUtc: '2026-10-08T09:00:00Z',
      serverName: 'SQL01',
      databaseName: 'Mikro',
      overallStatus: 'healthy',
      activeRequestCount: 0,
      blockedRequestCount: 0,
      rootBlockerCount: 0,
      longRunningRequestCount: 0,
      openTransactionCount: 0,
      thresholds: {
        refreshSeconds: 10,
        longRunningSeconds: 60,
        blockingSeconds: 15,
        openTransactionSeconds: 120,
        retentionHours: 24,
        maxIncidentCount: 100
      },
      requests: [],
      blocking: [],
      openTransactions: [],
      recommendations: []
    });

    expect(result.serverName).toBe('SQL01');
  });

  it('gets the background worker heartbeat and backlog snapshot', () => {
    let result!: WorkerMonitoringSnapshotDto;

    service
      .getWorkerMonitoringSnapshot()
      .subscribe((value: WorkerMonitoringSnapshotDto) => (result = value));

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/veritabani-izleme/workerlar'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      generatedAtUtc: '2026-10-14T09:00:00Z',
      overallStatus: 'Degraded',
      workers: [{
        code: 'axata-synchronization-worker',
        name: 'AXATA Synchronization Worker',
        isCritical: true,
        isEnabled: true,
        status: 'Degraded',
        statusName: 'Dikkat Gerekiyor',
        activity: 'Kuyruk bekleniyor',
        registeredAtUtc: '2026-10-14T08:00:00Z',
        lastHeartbeatAtUtc: '2026-10-14T08:59:55Z',
        heartbeatAgeSeconds: 5,
        lastSuccessAtUtc: '2026-10-14T08:58:00Z',
        lastFailureAtUtc: null,
        lastError: null,
        hasUnresolvedFailure: false,
        requiresAttention: true,
        recommendation: 'Kuyruk yasini kontrol edin.',
        queuedCount: 4,
        runningCount: 1,
        oldestQueuedAtUtc: '2026-10-14T08:52:00Z',
        oldestQueuedAgeSeconds: 480,
        staleAfterSeconds: 60
      }]
    });

    expect(result.overallStatus).toBe('Degraded');
    expect(result.workers?.[0].queuedCount).toBe(4);
  });

  it('gets the consolidated operational monitoring overview', () => {
    let result!: MonitoringOverviewDto;

    service
      .getDatabaseMonitoringOverview()
      .subscribe((value: MonitoringOverviewDto) => (result = value));

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/veritabani-izleme/genel-bakis'
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      generatedAtUtc: '2026-10-15T09:00:00Z',
      overallStatus: 'warning',
      overallStatusName: 'Dikkat Gerekiyor',
      headline: 'Bir worker ve iki guvenli yazma kaydi incelenmeli.',
      database: {
        status: 'healthy',
        activeRequestCount: 2,
        blockedRequestCount: 0,
        longRunningRequestCount: 0,
        openTransactionCount: 1
      },
      workers: {
        generatedAtUtc: '2026-10-15T09:00:00Z',
        overallStatus: 'Degraded',
        workers: []
      },
      incidents: {
        openCount: 1,
        criticalCount: 0,
        warningCount: 1,
        lastSeenAtUtc: '2026-10-15T08:58:00Z'
      },
      safeWrites: {
        windowHours: 24,
        processingCount: 1,
        staleProcessingCount: 0,
        retryableFailureCount: 1,
        manualReviewCount: 0,
        unclassifiedFailureCount: 0,
        completedCount: 14
      }
    });

    expect(result.overallStatusName).toBe('Dikkat Gerekiyor');
    expect(result.safeWrites.retryableFailureCount).toBe(1);
  });

  it('sends take for incident and termination histories', () => {
    service.getDatabaseMonitoringIncidents(40).subscribe();
    service.getDatabaseSessionTerminationAudits(25).subscribe();

    const incidentRequest = httpTesting.expectOne((call) =>
      call.url.endsWith('/ayar-islemleri/veritabani-izleme/olaylar')
    );
    expect(incidentRequest.request.method).toBe('GET');
    expect(incidentRequest.request.params.get('take')).toBe('40');
    incidentRequest.flush([]);

    const auditRequest = httpTesting.expectOne((call) =>
      call.url.endsWith(
        '/ayar-islemleri/veritabani-izleme/oturum-sonlandirma-gecmisi'
      )
    );
    expect(auditRequest.request.method).toBe('GET');
    expect(auditRequest.request.params.get('take')).toBe('25');
    auditRequest.flush([]);
  });

  it('gets incomplete safe writes with normalized monitoring filters', () => {
    service.getSafeWriteMonitoringItems({
      status: 'Failed',
      operationCode: ' inventory-count.create ',
      warehouseNo: 120,
      retryable: true,
      includeCompleted: false,
      take: 50
    }).subscribe();

    const request = httpTesting.expectOne((call) =>
      call.url.endsWith('/ayar-islemleri/veritabani-izleme/guvenli-yazmalar')
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('Failed');
    expect(request.request.params.get('operationCode')).toBe('inventory-count.create');
    expect(request.request.params.get('warehouseNo')).toBe('120');
    expect(request.request.params.get('retryable')).toBe('true');
    expect(request.request.params.get('includeCompleted')).toBe('false');
    expect(request.request.params.get('take')).toBe('50');
    request.flush([]);
  });

  it('uses the safe-write review and audit endpoints', () => {
    const id = '8be01068-f54a-4298-8d9b-58a7a39b40b8';
    const payload: SafeWriteReviewHttpRequest = {
      reason: 'Mikro kaydi operasyon tarafinda kontrol edildi.'
    };

    service.getSafeWriteReviewHistory(id).subscribe();
    service.recheckSafeWrite(id, payload).subscribe();
    service.reopenSafeWrite(id, payload).subscribe();
    service.cancelSafeWrite(id, payload).subscribe();

    const history = httpTesting.expectOne(
      `https://api.test/api/ayar-islemleri/veritabani-izleme/guvenli-yazmalar/${id}/inceleme-gecmisi`
    );
    expect(history.request.method).toBe('GET');
    history.flush([]);

    for (const action of ['yeniden-dogrula', 'tekrar-ac', 'iptal']) {
      const request = httpTesting.expectOne(
        `https://api.test/api/ayar-islemleri/veritabani-izleme/guvenli-yazmalar/${id}/${action}`
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(payload);
      request.flush({});
    }
  });

  it('posts the verified session identity and termination reason', () => {
    const payload: TerminateDatabaseSessionHttpRequest = {
      expectedLoginTime: '2026-10-08T09:15:00Z',
      expectedHostProcessId: 4520,
      expectedProgramName: 'Mikro API',
      reason: 'Root blocker operasyon tarafinda kontrol edildi.'
    };
    let result!: DatabaseSessionTerminationDto;

    service
      .terminateDatabaseSession(67, payload)
      .subscribe((value: DatabaseSessionTerminationDto) => (result = value));

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/veritabani-izleme/oturumlar/67/sonlandir'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush({
      id: '1ec46760-1276-4673-91c7-99aad21d703d',
      sessionId: 67,
      loginTime: payload.expectedLoginTime,
      hostProcessId: payload.expectedHostProcessId,
      programName: payload.expectedProgramName,
      hostName: 'APP01',
      databaseName: 'Mikro',
      loginName: 'mikro_api',
      sqlText: 'UPDATE ...',
      reason: payload.reason,
      requestedByUserId: '64004534-a82e-4bcb-8188-f067879c247e',
      requestedAtUtc: '2026-10-08T09:16:00Z',
      completedAtUtc: '2026-10-08T09:16:01Z',
      isSucceeded: true,
      error: null
    });

    expect(result.sessionId).toBe(67);
    expect(result.isSucceeded).toBeTrue();
  });

  it('gets rollback status for the selected session', () => {
    service.getDatabaseSessionRollbackStatus(67).subscribe();

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/veritabani-izleme/oturumlar/67/rollback-durumu'
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      sessionId: 67,
      isRollingBack: false,
      message: null,
      checkedAtUtc: '2026-10-08T09:17:00Z'
    });
  });
});
