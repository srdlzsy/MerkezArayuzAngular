import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { AddLabel } from './add-label';
import { AramaService } from '../../../../../core/api/module-services/arama.service';
import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

describe('AddLabel', () => {
  let component: AddLabel;
  let fixture: ComponentFixture<AddLabel>;
  let dialogRef: jasmine.SpyObj<DialogRef>;
  let kasaIslemleriService: jasmine.SpyObj<KasaIslemleriService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<DialogRef>('DialogRef', ['close']);
    kasaIslemleriService = jasmine.createSpyObj<KasaIslemleriService>(
      'KasaIslemleriService',
      ['getEtiketUrunDetayi']
    );

    await TestBed.configureTestingModule({
      imports: [AddLabel],
      providers: [
        {
          provide: DialogRef,
          useValue: dialogRef
        },
        {
          provide: AramaService,
          useValue: {
            searchPrices: jasmine.createSpy('searchPrices').and.returnValue(of([]))
          }
        },
        { provide: KasaIslemleriService, useValue: kasaIslemleriService },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              depoNo: 110,
              depoIsmi: 'Test Depo',
              permissions: [],
              sorumluluklar: []
            })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLabel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resolves manual product through the label endpoint before closing', () => {
    const resolvedProduct = {
      productCode: '016222',
      productName: 'Kampanyali Urun',
      oldPrice: 120,
      price: 100,
      promotion: {
        isActive: true,
        promotionCode: 'PROMO-1',
        promotionType: 'Discount',
        promotionName: 'Haftanin Urunu',
        description: '',
        normalPrice: 100,
        promotionPrice: 80,
        discountRate: 20,
        discountAmount: 20,
        startDate: null,
        expirationDate: null
      }
    } as any;
    kasaIslemleriService.getEtiketUrunDetayi.and.returnValue(of(resolvedProduct));

    (component as any).selectProduct({ stockCode: '016222' });

    expect(kasaIslemleriService.getEtiketUrunDetayi).toHaveBeenCalledWith('016222', 110);
    expect(dialogRef.close).toHaveBeenCalledWith(resolvedProduct);
  });
});

