import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintChangePrice } from './print-change-price';

describe('PrintChangePrice', () => {
  let component: PrintChangePrice;
  let fixture: ComponentFixture<PrintChangePrice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintChangePrice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintChangePrice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('summarizes increased, decreased and unchanged prices for the A4 report', () => {
    component.productsToPrint = [
      { productCode: 'UP', barcode: '1', oldPrice: 50, price: 60 },
      { productCode: 'DOWN', barcode: '2', oldPrice: 40, price: 35 },
      { productCode: 'SAME', barcode: '', oldPrice: 20, price: 20 }
    ] as any;

    expect((component as any).increasedCount()).toBe(1);
    expect((component as any).decreasedCount()).toBe(1);
    expect((component as any).unchangedCount()).toBe(1);
    expect((component as any).missingBarcodeCount()).toBe(1);
    expect((component as any).totalPriceDifference()).toBe(5);
  });

  it('formats the report date and calculates a readable percentage difference', () => {
    const product = { oldPrice: 50, price: 75 } as any;

    expect((component as any).priceDifferencePercent(product)).toBe(50);
    expect((component as any).formatChangeDate('2026-09-01T16:11:20')).toBe('01.09.2026 16:11');
  });
});

