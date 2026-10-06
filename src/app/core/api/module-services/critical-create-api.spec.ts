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
import { IadeIslemleriService } from './iade-islemleri.service';
import { MalKabulIslemleriService } from './mal-kabul-islemleri.service';
import { SevkIslemleriService } from './sevk-islemleri.service';
import { SiparisIslemleriService } from './siparis-islemleri.service';

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
});
