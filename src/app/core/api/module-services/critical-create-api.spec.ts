import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  CreateIssuedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaCreateWarehouseReturnRequestApiDto,
  IFurpaCreateWarehouseShippingRequestApiDto
} from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { GreenGrocerService } from './green-grocer.service';
import { IadeIslemleriService } from './iade-islemleri.service';
import { MalKabulIslemleriService } from './mal-kabul-islemleri.service';
import { SevkIslemleriService } from './sevk-islemleri.service';
import { SiparisIslemleriService } from './siparis-islemleri.service';
import { StokIslemleriService } from './stok-islemleri.service';

describe('critical create API contracts', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts a warehouse order without changing its line payload', () => {
    const service = TestBed.inject(SiparisIslemleriService);
    const request: CreateIssuedWarehouseOrderHttpRequest = {
      inWarehouseNo: 120,
      outWarehouseNo: 50,
      orderDate: '2026-10-06',
      deliveryDate: '2026-10-07',
      description: 'Test siparisi',
      lines: [
        {
          stockCode: '016445',
          quantity: 12,
          recommendedQuantity: 10,
          unitPrice: 0,
          unitPointer: 1,
          description: '',
          packageCode: '',
          projectCode: '',
          responsibilityCenter: ''
        }
      ]
    };
    let documentOrderNo = 0;

    service.createIssuedWarehouseOrder(request).subscribe((response: CreateIssuedWarehouseOrderResponse) => {
      documentOrderNo = response.documentOrderNo;
    });

    const httpRequest = httpTesting.expectOne(
      'https://api.test/api/siparis-islemleri/verilen-depo-siparisleri'
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({ documentOrderNo: 101 });
    expect(documentOrderNo).toBe(101);
  });

  it('posts an inter-warehouse shipment with its idempotency key', () => {
    const service = TestBed.inject(SevkIslemleriService);
    const request: IFurpaCreateWarehouseShippingRequestApiDto = {
      clientRequestId: 'shipping-1',
      sourceWarehouseNo: 120,
      targetWarehouseNo: 50,
      transitWarehouseNo: 60,
      movementDate: '2026-10-06',
      documentDate: '2026-10-06',
      documentNo: 'TEST-1',
      description: '',
      lines: [
        {
          stockCode: '016445',
          quantity: 2,
          unitPrice: 0,
          unitPointer: 1,
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: ''
        }
      ]
    };

    service.createGidenDepolarArasiSevk(request).subscribe();

    const httpRequest = httpTesting.expectOne(
      'https://api.test/api/sevk-islemleri/depolar-arasi-sevkler/giden'
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    expect(httpRequest.request.body.clientRequestId).toBe('shipping-1');
    httpRequest.flush({ documentSerie: 'F120', documentOrderNo: 201 });
  });

  it('posts a warehouse return to the outgoing return endpoint', () => {
    const service = TestBed.inject(IadeIslemleriService);
    const request: IFurpaCreateWarehouseReturnRequestApiDto = {
      clientRequestId: 'return-1',
      sourceWarehouseNo: 120,
      targetWarehouseNo: 50,
      transitWarehouseNo: 60,
      movementDate: '2026-10-06',
      documentDate: '2026-10-06',
      documentNo: 'IADE-1',
      description: '',
      lines: [
        {
          stockCode: '016445',
          quantity: 1,
          unitPrice: 0,
          unitPointer: 1,
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: ''
        }
      ]
    };

    service.createWarehouseReturn(request).subscribe();

    const httpRequest = httpTesting.expectOne(
      'https://api.test/api/iade-islemleri/depo-iadeleri/giden'
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({ documentSerie: 'I120', documentOrderNo: 301 });
  });

  it('posts company receiving quantities without losing dispatch and acceptance values', () => {
    const service = TestBed.inject(MalKabulIslemleriService);
    const request: IFurpaCreateCompanyReceiptRequestApiDto = {
      warehouseNo: 120,
      clientRequestId: 'receipt-1',
      customerCode: '120.01.001',
      movementDate: '2026-10-06',
      documentDate: '2026-10-06',
      documentSerie: 'FMK',
      documentOrderNo: 1,
      deliverer: 'Tedarikci',
      receiver: 'Magaza',
      description: '',
      allowOrderOverReceiving: false,
      autoCreateReturnForPartialAcceptance: true,
      lines: [
        {
          stockCode: '016445',
          dispatchQuantity: 10,
          acceptedQuantity: 8,
          unitPrice: 2,
          unitPointer: 1,
          orderGuid: null,
          description: '',
          partyCode: '',
          lotNo: 0,
          projectCode: '',
          customerResponsibilityCenter: '',
          productResponsibilityCenter: ''
        }
      ]
    };

    service.createCompanyReceipt(request).subscribe();

    const httpRequest = httpTesting.expectOne(
      'https://api.test/api/mal-kabul-islemleri/firma-mal-kabulleri'
    );
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    expect(httpRequest.request.body.lines[0]).toEqual(
      jasmine.objectContaining({ dispatchQuantity: 10, acceptedQuantity: 8 })
    );
    httpRequest.flush({ documentSerie: 'FMK', documentOrderNo: 401, lines: [] });
  });

  it('uses the documented offline status routes for every critical create family', () => {
    const requestId = '11111111-1111-4111-8111-111111111111';
    const sevk = TestBed.inject(SevkIslemleriService);
    const iade = TestBed.inject(IadeIslemleriService);
    const malKabul = TestBed.inject(MalKabulIslemleriService);
    const stok = TestBed.inject(StokIslemleriService);
    const greenGrocer = TestBed.inject(GreenGrocerService);
    const siparis = TestBed.inject(SiparisIslemleriService);

    sevk.getGidenFirmaSevkOfflineStatus(requestId).subscribe();
    sevk.getDepolarArasiSevkOfflineStatus(requestId).subscribe();
    iade.getFirmaIadeOfflineStatus(requestId).subscribe();
    iade.getDepoIadeOfflineStatus(requestId).subscribe();
    malKabul.getCompanyReceiptOfflineStatus(requestId).subscribe();
    stok.getSayimSonucuOfflineStatus(requestId).subscribe();
    stok.getVirmanOfflineStatus(requestId).subscribe();
    stok.getMasrafFisiOfflineStatus(requestId).subscribe();
    stok.getZayiatFisiOfflineStatus(requestId).subscribe();
    greenGrocer.getOperationsAdjustmentOfflineStatus(requestId).subscribe();
    siparis.getIssuedWarehouseOrderOfflineStatus(requestId).subscribe();
    siparis.getSuggestedWarehouseOrderOfflineStatus(requestId).subscribe();
    siparis.getIssuedCompanyOrderOfflineStatus(requestId).subscribe();
    siparis.getSuggestedCompanyOrderOfflineStatus(requestId).subscribe();

    const paths = [
      'sevk-islemleri/firma-sevkleri/giden',
      'sevk-islemleri/depolar-arasi-sevkler/giden',
      'iade-islemleri/firma-iadeleri',
      'iade-islemleri/depo-iadeleri/giden',
      'mal-kabul-islemleri/firma-mal-kabulleri',
      'stok-islemleri/sayim-sonuclari',
      'stok-islemleri/virmanlar',
      'stok-islemleri/masraf-fisleri',
      'stok-islemleri/zayiat-fisleri',
      'green-grocer/operations/adjustments',
      'siparis-islemleri/verilen-depo-siparisleri',
      'siparis-islemleri/onerilen-depo-siparisleri',
      'siparis-islemleri/verilen-firma-siparisleri',
      'siparis-islemleri/onerilen-firma-siparisleri'
    ];

    for (const path of paths) {
      const request = httpTesting.expectOne(
        `https://api.test/api/${path}/offline-sync/${requestId}`
      );
      expect(request.request.method).toBe('GET');
      request.flush({
        clientRequestId: requestId,
        operationCode: 'test',
        status: 'Processing',
        createdAtUtc: '2026-10-13T00:00:00Z',
        completedAtUtc: null,
        errorMessage: null,
        errorCode: null,
        retryable: true,
        retryAfterSeconds: 5,
        result: null
      });
    }
  });
});
