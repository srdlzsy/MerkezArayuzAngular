import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { VirmanConversionSuggestionDto } from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { StokIslemleriService } from './stok-islemleri.service';

describe('StokIslemleriService virman conversion suggestion', () => {
  let httpTesting: HttpTestingController;
  let service: StokIslemleriService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(StokIslemleriService);
  });

  afterEach(() => httpTesting.verify());

  it('requests a conversion suggestion with the selected source and quantity', () => {
    let response: VirmanConversionSuggestionDto | null = null;
    service.getVirmanConversionSuggestion('015550', 6).subscribe((result: VirmanConversionSuggestionDto) => {
      response = result;
    });

    const request = httpTesting.expectOne((call) =>
      call.url === 'https://api.test/api/stok-islemleri/virmanlar/donusum-onerisi'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('SourceStockCode')).toBe('015550');
    expect(request.request.params.get('SourceQuantity')).toBe('6');

    request.flush({
      confidencePercent: 98.4,
      isReliable: true,
      lookbackEndDate: '2026-10-09T00:00:00',
      lookbackStartDate: '2025-10-09T00:00:00',
      maximumSampleCount: 500,
      minimumConfidencePercent: 95,
      minimumSampleCount: 10,
      multiplier: 6,
      multiplierConfidencePercent: 98.4,
      multiplierMatchCount: 492,
      sampleCount: 500,
      sourceQuantity: 6,
      sourceStockCode: '015550',
      sourceStockName: "SODA SADE 6'LI",
      sourceUnitName: 'ADET',
      suggestionSource: 'VirmanHistory',
      targetConfidencePercent: 100,
      targetMatchCount: 500,
      targetQuantity: 36,
      targetStockCode: '015733',
      targetStockName: 'SODA SADE TEKLI',
      targetUnitName: 'ADET',
      warning: null
    });

    expect(response).toEqual(
      jasmine.objectContaining({ targetStockCode: '015733', targetQuantity: 36 })
    );
  });
});
