import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../../../core/api/api-base-url.token';
import { EntegrasyonIslemleriService } from '../../../../../core/api/module-services/entegrasyon-islemleri.service';

describe('Trendyol Go price/stock API', () => {
  let service: EntegrasyonIslemleriService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost/api' }
      ]
    });
    service = TestBed.inject(EntegrasyonIslemleriService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('previews the full actionable catalog for the selected store by default', () => {
    service.getTrendyolGoPriceStockPreview(402535).subscribe();
    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/entegrasyon-islemleri/trendyol-go/price-stock/preview')
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('storeId')).toBe('402535');
    expect(request.request.params.has('page')).toBeFalse();
    expect(request.request.params.has('size')).toBeFalse();
    expect(request.request.params.has('view')).toBeFalse();
    request.flush({ items: [], storeId: 402535, page: -1, size: 100 });
  });

  it('requests an explicit diagnostic preview view when selected', () => {
    service.getTrendyolGoPriceStockPreview(402535, 'issues').subscribe();
    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/entegrasyon-islemleri/trendyol-go/price-stock/preview')
    );
    expect(request.request.params.get('view')).toBe('issues');
    request.flush({ items: [], storeId: 402535, page: -1, size: 100 });
  });

  it('dispatches selected barcodes with the preview hash', () => {
    const body = {
      storeId: 402535,
      page: 1,
      size: 100,
      previewHash: 'A1B2',
      barcodes: ['8690000000000']
    };
    service.dispatchTrendyolGoPriceStock(body).subscribe();
    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/entegrasyon-islemleri/trendyol-go/price-stock/dispatch')
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ upstreamResponse: { batchRequestId: 'batch-1' } });
  });
});
