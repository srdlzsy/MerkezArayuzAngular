import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  TerminalInstallationDto,
  TerminalInstallationSummaryDto
} from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { AyarIslemleriService } from './ayar-islemleri.service';

describe('AyarIslemleriService terminal installations', () => {
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

  it('gets terminal summary for the selected warehouse', () => {
    let result!: TerminalInstallationSummaryDto;

    service
      .getTerminalInstallationSummary(110)
      .subscribe((value: TerminalInstallationSummaryDto) => (result = value));

    const request = httpTesting.expectOne((call) =>
      call.url.endsWith('/ayar-islemleri/terminal-cihazlari/ozet')
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('warehouseNo')).toBe('110');
    request.flush({
      generatedAtUtc: '2026-10-08T08:30:00Z',
      currentAppVersion: '1.1.90',
      currentBuildNumber: 91,
      versionManifestCheckedAtUtc: '2026-10-08T08:29:58Z',
      isVersionManifestAvailable: true,
      registeredInstallationCount: 150,
      activeLast24HoursCount: 123,
      activeLast7DaysCount: 141,
      activeLast30DaysCount: 147,
      outdatedInstallationCount: 27,
      warehouseChangedInstallationCount: 2,
      versions: [],
      warehouses: []
    });

    expect(result.currentBuildNumber).toBe(91);
    expect(result.registeredInstallationCount).toBe(150);
  });

  it('sends all supported terminal list filters', () => {
    service
      .getTerminalInstallations({
        warehouseNo: 110,
        search: ' TC21 ',
        appVersion: ' 1.1.89 ',
        isCurrentVersion: false,
        activeWithinDays: 7,
        take: 200
      })
      .subscribe();

    const request = httpTesting.expectOne((call) =>
      call.url.endsWith('/ayar-islemleri/terminal-cihazlari')
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('warehouseNo')).toBe('110');
    expect(request.request.params.get('search')).toBe('TC21');
    expect(request.request.params.get('appVersion')).toBe('1.1.89');
    expect(request.request.params.get('isCurrentVersion')).toBe('false');
    expect(request.request.params.get('activeWithinDays')).toBe('7');
    expect(request.request.params.get('take')).toBe('200');
    request.flush([]);
  });

  it('gets terminal installation detail by encoded id', () => {
    let result!: TerminalInstallationDto;

    service
      .getTerminalInstallation('device/id')
      .subscribe((value: TerminalInstallationDto) => (result = value));

    const request = httpTesting.expectOne(
      'https://api.test/api/ayar-islemleri/terminal-cihazlari/device%2Fid'
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'device/id',
      deviceId: 'terminal-01',
      appVersion: '1.1.90',
      buildNumber: 91,
      warehouseNo: 110,
      previousWarehouseNo: null,
      warehouseChangeCount: 0,
      warehouseChangedAtUtc: null,
      userId: '4c31dc62-8930-49a4-bf4c-01b86aa27ef2',
      username: '110.terminal',
      userFullName: 'Terminal 110',
      manufacturer: 'Zebra',
      deviceModel: 'TC21',
      androidVersion: '13',
      androidSdk: 33,
      supportedAbis: ['arm64-v8a'],
      firstSeenAtUtc: '2026-10-01T08:00:00Z',
      lastSeenAtUtc: '2026-10-08T08:00:00Z',
      lastIpAddress: '10.0.0.15',
      versionChangedAtUtc: null,
      isActiveLast24Hours: true,
      isActiveLast7Days: true,
      isCurrentVersion: true
    });

    expect(result.deviceModel).toBe('TC21');
  });
});
