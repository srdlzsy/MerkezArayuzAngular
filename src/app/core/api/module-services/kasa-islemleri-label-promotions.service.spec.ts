import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { IEtiketBasimProduct } from '@interfaces';

import { API_BASE_URL } from '../api-base-url.token';
import { KasaIslemleriService } from './kasa-islemleri.service';

describe('KasaIslemleriService label product sources', () => {
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

  it('gets active promotions for a warehouse and supplies safe label defaults', () => {
    let products: IEtiketBasimProduct[] = [];
    service.getAktifPromosyonluUrunler(120).subscribe((result: IEtiketBasimProduct[]) => {
      products = result;
    });

    const request = httpTesting.expectOne((call) =>
      call.url === 'https://api.test/api/kasa-islemleri/etiket-belgeleri/aktif-promosyonlu-urunler'
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('warehouseNo')).toBe('120');
    request.flush([{
      productCode: '016222', productName: 'Kampanyali Urun', pluNo: 168037,
      barcode: '4023103246638', price: 299.5, unitName: 'ADET',
      promotion: {
        isActive: true, promotionCode: '68', promotionType: 'PUF1',
        campaignText: '2 al 1 ode', normalPrice: 299.5,
        promotionPrice: 149.75, effectiveUnitPrice: 149.75
      }
    }]);

    expect(products.length).toBe(1);
    expect(products[0].productCode).toBe('016222');
    expect(products[0].unitPriceFactor).toBe(0);
    expect(products[0].oldPrice).toBe(0);
    expect(products[0].promotion?.campaignText).toBe('2 al 1 ode');
  });
});
