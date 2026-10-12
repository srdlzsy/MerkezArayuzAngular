import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CashSummaryZReportTotalDto } from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { KasaIslemleriService } from './kasa-islemleri.service';

describe('KasaIslemleriService saved cash summary Z total', () => {
  let httpTesting: HttpTestingController;
  let service: KasaIslemleriService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(KasaIslemleriService);
  });

  afterEach(() => httpTesting.verify());

  it('gets the saved Z total by document identity', () => {
    let response: CashSummaryZReportTotalDto | undefined;
    service.getKayitliIcmalZReportToplami('F116.238', 256, 116).subscribe((value: CashSummaryZReportTotalDto) => {
      response = value;
    });

    const request = httpTesting.expectOne((call) =>
      call.url === 'https://api.test/api/kasa-islemleri/kasa-sayimlari/F116.238/256/z-rapor-toplam'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('warehouseNo')).toBe('116');
    request.flush({ zTotalValue: 10000 });

    expect(response?.zTotalValue).toBe(10000);
  });

  it('preserves a missing saved Z movement as null', () => {
    let response: CashSummaryZReportTotalDto | undefined;
    service.getKayitliIcmalZReportToplami('F120', 42).subscribe((value: CashSummaryZReportTotalDto) => {
      response = value;
    });

    const request = httpTesting.expectOne(
      'https://api.test/api/kasa-islemleri/kasa-sayimlari/F120/42/z-rapor-toplam'
    );
    expect(request.request.params.has('warehouseNo')).toBeFalse();
    request.flush({ zTotalValue: null });

    expect(response?.zTotalValue).toBeNull();
  });
});
