import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../api-base-url.token';
import { AramaService } from './arama.service';

describe('AramaService product search context', () => {
  let httpTesting: HttpTestingController;
  let service: AramaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AramaService);
  });

  afterEach(() => httpTesting.verify());

  it('sends warehouse order context only for order searches', () => {
    service.searchStock('sut', 20, false, 50, 110, 'order').subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === 'https://api.test/api/arama-islemleri/urunler' &&
        candidate.params.get('operationType') === 'order' &&
        candidate.params.get('warehouseNo') === '110' &&
        candidate.params.get('sourceWarehouseNo') === '50',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('does not narrow general product searches with an operation context', () => {
    service.searchStock('sut', 20, true, undefined, 110).subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === 'https://api.test/api/arama-islemleri/urunler' &&
        !candidate.params.has('operationType'),
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
