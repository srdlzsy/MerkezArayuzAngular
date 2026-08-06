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
});

