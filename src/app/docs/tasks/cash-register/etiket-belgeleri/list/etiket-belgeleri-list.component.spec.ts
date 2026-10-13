import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { InPlacePrintService } from '../../../core/document-print/in-place-print.service';
import { ETIKET_TIPLERI } from '../etiket-belgeleri.config';

import { EtiketBelgeleriListComponent } from './etiket-belgeleri-list.component';

describe('EtiketBelgeleriListComponent manual product rows', () => {
  it('isolates the label root from the application layout while printing', async () => {
    const print = jasmine.createSpy('print').and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: {} },
        { provide: InPlacePrintService, useValue: { print } },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    const printRoot = document.createElement('section');
    printRoot.className = 'etiket-print-root';
    document.body.appendChild(printRoot);
    spyOn(component, 'waitForNextPaint').and.resolveTo();

    try {
      await component.printWithStylesheet('/assets/rack-label-a5-landscape-print.css');

      expect(print).toHaveBeenCalled();
      const request = print.calls.mostRecent().args[0];
      expect(request.mount).toEqual({
        element: printRoot,
        documentClassName: 'etiket-belgeleri-printing'
      });
      expect(request.styles).toContain('body.etiket-belgeleri-printing > app-root');
    } finally {
      printRoot.remove();
    }
  });

  it('applies and restores the warehouse 165 legacy rack-label calibration', async () => {
    const print = jasmine.createSpy('print').and.callFake(async (request: any) => {
      const printRoot = request.mount.element as HTMLElement;

      expect(printRoot.classList).toContain('has-rack-label-page-calibration');
      expect(printRoot.style.getPropertyValue('--rack-label-page-offset-x')).toBe('0mm');
      expect(printRoot.style.getPropertyValue('--rack-label-page-offset-y')).toBe('3mm');
      request.afterPrint();
      return true;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal({ depoNo: 165 }) } },
        { provide: KasaIslemleriService, useValue: {} },
        { provide: InPlacePrintService, useValue: { print } },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    const printRoot = document.createElement('section');
    printRoot.className = 'etiket-print-root';
    document.body.appendChild(printRoot);
    component.printPreviewLabelConfig.set(
      ETIKET_TIPLERI.find((label) => label.etiketTipi === 'rack_label_a4') ?? null
    );
    spyOn(component, 'waitForNextPaint').and.resolveTo();

    try {
      await component.printWithStylesheet('/assets/rack-label-a4-print.css');

      expect(printRoot.classList).not.toContain('has-rack-label-page-calibration');
      expect(printRoot.style.getPropertyValue('--rack-label-page-offset-x')).toBe('');
      expect(printRoot.style.getPropertyValue('--rack-label-page-offset-y')).toBe('');
    } finally {
      printRoot.remove();
    }
  });

  it('assigns a distinct row key when the same product is added repeatedly', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    component.productRowSequence = 0;
    const product = {
      productCode: '001234',
      productName: 'Test Urunu',
      barcode: '8690000000001'
    };

    const firstRow = component.withProductRowKey(product);
    const secondRow = component.withProductRowKey(product);

    expect(firstRow.productCode).toBe(secondRow.productCode);
    expect(firstRow.__etiketRowKey).not.toBe(secondRow.__etiketRowKey);
  });

  it('maps the active promotion returned with the product without another request', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    const product = {
      productCode: '001234',
      productName: 'Promosyonlu Urun',
      barcode: '8690000000001',
      price: 100,
      promotion: {
        isActive: true,
        promotionCode: 'PROMO-1',
        promotionType: 'Discount',
        promotionName: 'Haftanin Urunu',
        description: '',
        normalPrice: 100,
        promotionPrice: 79.9,
        discountRate: 20.1,
        discountAmount: 20.1,
        startDate: '2026-10-01T00:00:00',
        expirationDate: '2026-10-15T23:59:59'
      }
    };

    const mapped = component.withApiPromotion(product);

    expect(mapped.promotionPrice).toBe(79.9);
    expect(mapped.expirationDate).toBe('15.10.2026');
    expect(mapped.promotion.promotionName).toBe('Haftanin Urunu');
  });

  it('keeps a cross-product gift active and shows its campaign text without a false discount', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    const product = {
      productCode: '016222',
      productName: 'Kampanyali Urun',
      barcode: '4023103246638',
      price: 299.5,
      promotion: {
        isActive: true,
        campaignText: 'Bu urunu alana farkli urun hediye',
        promotionName: 'Hediye Kampanyasi',
        promotionPrice: 299.5,
        effectiveUnitPrice: null,
        expirationDate: '2026-10-08T00:00:00'
      }
    };

    const mapped = component.withApiPromotion(product);

    expect(component.hasActivePromotion(mapped)).toBeTrue();
    expect(component.getCampaignText(mapped)).toBe('Bu urunu alana farkli urun hediye');
    expect(mapped.promotionPrice).toBe(299.5);
    expect(mapped.expirationDate).toBe('08.10.2026');
  });

  it('uses the calculated unit price for a same-product campaign', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    const mapped = component.withApiPromotion({
      price: 299.5,
      promotion: {
        isActive: true,
        promotionPrice: 149.75,
        effectiveUnitPrice: 149.75
      }
    });

    expect(mapped.promotionPrice).toBe(149.75);
  });
});

describe('EtiketBelgeleriListComponent promotion source', () => {
  it('loads active promotions only when selected and replaces the price-change rows', () => {
    const priceProducts = [{ productCode: 'A', productName: 'Fiyati Degisen', barcode: '111', price: 10 }];
    const promotionProducts = [{
      productCode: 'B', productName: 'Kampanyali', barcode: '222', price: 20,
      promotion: { isActive: true, campaignText: '2 al 1 ode', effectiveUnitPrice: 10 }
    }];
    const getUrunEtiketleri = jasmine.createSpy('getUrunEtiketleri').and.returnValue(of(priceProducts));
    const getAktifPromosyonluUrunler = jasmine.createSpy('getAktifPromosyonluUrunler')
      .and.returnValue(of(promotionProducts));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: { getUrunEtiketleri, getAktifPromosyonluUrunler } },
        { provide: InPlacePrintService, useValue: {} },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(() => new EtiketBelgeleriListComponent()) as any;
    component.loadByDate();
    expect(component.products().map((product: any) => product.productCode)).toEqual(['A']);
    expect(getAktifPromosyonluUrunler).not.toHaveBeenCalled();

    component.loadActivePromotions();
    expect(getAktifPromosyonluUrunler).toHaveBeenCalledOnceWith(null);
    expect(component.products().map((product: any) => product.productCode)).toEqual(['B']);
    expect(component.promotionProducts().length).toBe(1);
    expect(component.lastLoadedSource()).toBe('Aktif promosyonlar');
  });
});

describe('EtiketBelgeleriListComponent product sorting', () => {
  function createSortComponent(): any {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    component.productSortKey = signal(null);
    component.productSortDirection = signal('asc');
    component.productSortOptions = [
      { value: 'productName:asc', label: 'Urun adi: A-Z' },
      { value: 'productName:desc', label: 'Urun adi: Z-A' }
    ];
    component.currentPage = signal(3);
    return component;
  }

  it('cycles a column through ascending, descending and unsorted states', () => {
    const component = createSortComponent();

    component.setProductSort('price');
    expect(component.getProductSortIcon('price')).toBe('↑');
    expect(component.getProductSortStateLabel('price')).toBe('Düşük-Yüksek');
    expect(component.getProductSortAriaState('price')).toBe('ascending');

    component.setProductSort('price');
    expect(component.getProductSortIcon('price')).toBe('↓');
    expect(component.getProductSortStateLabel('price')).toBe('Yüksek-Düşük');
    expect(component.getProductSortAriaState('price')).toBe('descending');

    component.setProductSort('price');
    expect(component.getProductSortIcon('price')).toBe('↕');
    expect(component.getProductSortStateLabel('price')).toBe('Sırala');
    expect(component.getProductSortAriaState('price')).toBe('none');
    expect(component.currentPage()).toBe(1);
  });

  it('uses understandable labels for text and date sorting', () => {
    const component = createSortComponent();

    component.setProductSort('productName');
    expect(component.getProductSortStateLabel('productName')).toBe('A-Z');

    component.setProductSort('priceChangeDate');
    component.setProductSort('priceChangeDate');
    expect(component.getProductSortStateLabel('priceChangeDate')).toBe('Yeni-Eski');
  });

  it('applies an explicit sort menu selection', () => {
    const component = createSortComponent();

    component.setProductSortSelection('productName:desc');

    expect(component.productSortKey()).toBe('productName');
    expect(component.productSortDirection()).toBe('desc');
    expect(component.currentPage()).toBe(1);
  });
});

describe('EtiketBelgeleriListComponent price filters', () => {
  it('lists only products whose comparable old and new prices are equal', () => {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    component.productTableFilter = signal('price-unchanged');
    component.productSearchTerm = signal('');

    const products = component.applyProductFilters([
      { productCode: 'SAME', oldPrice: 50, price: 50, barcode: '1' },
      { productCode: 'UP', oldPrice: 50, price: 60, barcode: '2' },
      { productCode: 'NO-OLD', oldPrice: 0, price: 50, barcode: '3' }
    ]);

    expect(products.map((product: any) => product.productCode)).toEqual(['SAME']);
  });

  it('prints every row in the active filter without silently removing unchanged prices', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: {} },
        { provide: InPlacePrintService, useValue: {} },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    component.products.set([
      {
        productCode: 'CHANGED',
        productName: 'Fiyati Degisen Promosyonlu Urun',
        barcode: '1',
        oldPrice: 50,
        price: 60,
        promotion: { isActive: true }
      },
      {
        productCode: 'UNCHANGED',
        productName: 'Fiyati Ayni Promosyonlu Urun',
        barcode: '2',
        oldPrice: 40,
        price: 40,
        promotion: { isActive: true }
      }
    ]);
    component.setProductTableFilter('promotions');

    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual([
      'CHANGED',
      'UNCHANGED'
    ]);
    expect(component.priceChangePrintProducts().map((product: any) => product.productCode)).toEqual([
      'CHANGED',
      'UNCHANGED'
    ]);
  });
});

describe('EtiketBelgeleriListComponent document print order', () => {
  it('loads a recent document immediately when it is selected', () => {
    const documentProducts = [
      { productCode: 'A', productName: 'Urun A', barcode: '111', price: 30, oldPrice: 25, pluNo: 0 }
    ];
    const getEtiketBelgesi = jasmine
      .createSpy('getEtiketBelgesi')
      .and.returnValue(of(documentProducts));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: { getEtiketBelgesi } },
        { provide: InPlacePrintService, useValue: {} },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    component.filtersForm.controls.documentId.enable({ emitEvent: false });

    component.filtersForm.controls.documentId.setValue(123);

    expect(getEtiketBelgesi).toHaveBeenCalledOnceWith(123);
    expect(component.products().map((product: any) => product.productCode)).toEqual(['A']);
  });

  it('prints products in the active table sort and skips only the hidden row', () => {
    const documentProducts = [
      { productCode: 'A', productName: 'Urun A', barcode: '111', price: 30, oldPrice: 25, pluNo: 0 },
      { productCode: 'B', productName: 'Urun B', barcode: '222', price: 10, oldPrice: 12, pluNo: 0 },
      { productCode: 'A', productName: 'Urun A', barcode: '111', price: 30, oldPrice: 25, pluNo: 0 }
    ];
    const getEtiketBelgesi = jasmine.createSpy('getEtiketBelgesi').and.returnValue(of(documentProducts));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: { getEtiketBelgesi } },
        { provide: InPlacePrintService, useValue: {} },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    spyOn(component, 'printWithStylesheet').and.returnValue(Promise.resolve());
    component.filtersForm.controls.documentSearch.setValue('123');
    component.searchDocument();

    expect(getEtiketBelgesi).toHaveBeenCalledWith(123);
    expect(component.products().map((product: any) => product.productCode)).toEqual(['A', 'B', 'A']);
    expect(component.products()[0].__etiketRowKey).not.toBe(component.products()[2].__etiketRowKey);
    expect(component.printPageCount()).toBe(3);

    component.filtersForm.controls.labelType.setValue('a5_quad_pricelabel');
    expect(component.printPageCount()).toBe(1);

    component.setProductSort('price');
    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual(['B', 'A', 'A']);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['B', 'A', 'A']);

    component.setProductSort('productName');
    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual(['A', 'A', 'B']);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['A', 'A', 'B']);

    component.setProductTableFilter('price-decreased');
    component.printLabels();
    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual(['B']);
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['B']);

    component.setProductTableFilter('all');

    component.removeProduct(component.products()[0]);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['A', 'B']);
  });

  it('replaces manual list changes immediately without confirmation', () => {
    const getEtiketBelgesi = jasmine.createSpy('getEtiketBelgesi').and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: { getEtiketBelgesi } },
        { provide: InPlacePrintService, useValue: {} },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    component.products.set([{ productCode: 'A', productName: 'Manuel Urun', barcode: '111' }]);
    component.filtersForm.controls.documentSearch.setValue('456');

    component.searchDocument();

    expect(getEtiketBelgesi).toHaveBeenCalledOnceWith(456);
    expect(component.products()).toEqual([]);
  });
});

describe('Etiket Belgeleri label registry', () => {
  it('keeps every ready label component and physical page capacity in the config', () => {
    const readyLabels = ETIKET_TIPLERI.filter((label) => label.kullanimaHazir);

    expect(readyLabels.length).toBeGreaterThan(0);
    expect(readyLabels.every((label) => !!label.component)).toBeTrue();
    expect(readyLabels.every((label) => label.sayfaKapasitesi > 0)).toBeTrue();
  });

  it('keeps legacy and physical A5 rack labels as separate options', () => {
    const legacyLabel = ETIKET_TIPLERI.find((label) => label.etiketTipi === 'rack_label_a4');
    const physicalA5Label = ETIKET_TIPLERI.find(
      (label) => label.etiketTipi === 'rack_label_a5_landscape'
    );

    expect(legacyLabel?.ozelCss).toBe('/assets/rack-label-a4-print.css');
    expect(physicalA5Label?.ozelCss).toBe('/assets/rack-label-a5-landscape-print.css');
    expect(physicalA5Label?.component).toBe(legacyLabel?.component);
    expect(physicalA5Label?.sayfaKapasitesi).toBe(12);
    expect(physicalA5Label?.kullanimaHazir).toBeFalse();
  });
});
