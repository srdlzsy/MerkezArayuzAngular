import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { InPlacePrintService } from '../../../core/document-print/in-place-print.service';

import { EtiketBelgeleriListComponent } from './etiket-belgeleri-list.component';

describe('EtiketBelgeleriListComponent manual product rows', () => {
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
});

describe('EtiketBelgeleriListComponent product sorting', () => {
  function createSortComponent(): any {
    const component = Object.create(EtiketBelgeleriListComponent.prototype) as any;
    component.productSortKey = signal(null);
    component.productSortDirection = signal('asc');
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
    expect(component.getProductSortStateLabel('price')).toBe('');
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
});

describe('EtiketBelgeleriListComponent document print order', () => {
  it('prints A, B, A in API order after sorting the table and skips only the hidden row', () => {
    const documentProducts = [
      { productCode: 'A', productName: 'Urun A', barcode: '111', price: 30, oldPrice: 25, pluNo: 0 },
      { productCode: 'B', productName: 'Urun B', barcode: '222', price: 10, oldPrice: 8, pluNo: 0 },
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

    component.setProductSort('price');
    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual(['B', 'A', 'A']);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['A', 'B', 'A']);

    component.removeProduct(component.products()[0]);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['B', 'A']);
  });
});
