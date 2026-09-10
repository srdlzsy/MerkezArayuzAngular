import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { IEtiketBasimProduct } from '@interfaces';

import { A5DortluFiyatEtiketiComponent } from './a5-dortlu-fiyat-etiketi.component';

describe('A5DortluFiyatEtiketiComponent', () => {
  let fixture: ComponentFixture<A5DortluFiyatEtiketiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [A5DortluFiyatEtiketiComponent]
    });
    fixture = TestBed.createComponent(A5DortluFiyatEtiketiComponent);
  });

  it('places four labels on each A5 page and preserves empty slots', () => {
    fixture.componentRef.setInput(
      'productsToPrint',
      Array.from({ length: 5 }, (_, index) => createProduct(index + 1))
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.a5-quad-page').length).toBe(2);
    expect(element.querySelectorAll('.quad-label-card').length).toBe(8);
    expect(element.querySelectorAll('.quad-label-content').length).toBe(5);
    expect(element.querySelectorAll('svg.a5-quad-barcode').length).toBe(5);
    expect(element.querySelector('.a5-quad-page:last-child')?.classList).toContain('is-last');
  });
});

function createProduct(index: number): IEtiketBasimProduct {
  return {
    productCode: `00000${index}`,
    productName: `Test Urun ${index}`,
    barcode: `869000000000${index}`,
    price: 10 + index,
    oldPrice: 9 + index,
    priceChangeDate: '2026-09-10',
    origin: 'TURKIYE',
    unitPriceFactor: 1,
    alternativeUnitName: 'ADET'
  } as IEtiketBasimProduct;
}
