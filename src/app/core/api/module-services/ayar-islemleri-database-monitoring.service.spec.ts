import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  DatabaseMonitoringSnapshotDto,
  DatabaseSessionTerminationDto,
  TerminateDatabaseSessionHttpRequest
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
