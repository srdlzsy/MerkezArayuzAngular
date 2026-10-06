import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { InPlacePrintService } from '../../../core/document-print/in-place-print.service';
import { ETIKET_TIPLERI } from '../etiket-belgeleri.config';

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
        { provide: AppConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
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

  it('prints A, B, A in API order after sorting the table and skips only the hidden row', () => {
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
        { provide: AppConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
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
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['A', 'B', 'A']);

    component.setProductTableFilter('price-decreased');
    component.printLabels();
    expect(component.visibleProducts().map((product: any) => product.productCode)).toEqual(['B']);
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['B']);

    component.setProductTableFilter('all');

    component.removeProduct(component.products()[0]);
    component.printLabels();
    expect(component.printPreviewProducts().map((product: any) => product.productCode)).toEqual(['B', 'A']);
  });

  it('keeps manual list changes when replacement confirmation is cancelled', async () => {
    const getEtiketBelgesi = jasmine.createSpy('getEtiketBelgesi').and.returnValue(of([]));
    const confirm = jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: KasaIslemleriService, useValue: { getEtiketBelgesi } },
        { provide: InPlacePrintService, useValue: {} },
        { provide: AppConfirmDialogService, useValue: { confirm } },
        { provide: Dialog, useValue: {} }
      ]
    });

    const component = TestBed.runInInjectionContext(
      () => new EtiketBelgeleriListComponent()
    ) as any;
    component.products.set([{ productCode: 'A', productName: 'Manuel Urun', barcode: '111' }]);
    component.hasManualListChanges.set(true);
    component.filtersForm.controls.documentSearch.setValue('456');

    component.searchDocument();
    await Promise.resolve();

    expect(confirm).toHaveBeenCalled();
    expect(getEtiketBelgesi).not.toHaveBeenCalled();
    expect(component.products().map((product: any) => product.productCode)).toEqual(['A']);
  });
});

describe('Etiket Belgeleri label registry', () => {
  it('keeps every ready label component and physical page capacity in the config', () => {
    const readyLabels = ETIKET_TIPLERI.filter((label) => label.kullanimaHazir);

    expect(readyLabels.length).toBeGreaterThan(0);
    expect(readyLabels.every((label) => !!label.component)).toBeTrue();
    expect(readyLabels.every((label) => label.sayfaKapasitesi > 0)).toBeTrue();
  });
});
