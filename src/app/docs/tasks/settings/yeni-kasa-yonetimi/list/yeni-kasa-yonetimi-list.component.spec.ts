import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type {
  YeniKasaAppSettingsDto,
  YeniKasaPaymentMethodDto,
  YeniKasaRolePermissionMatrixDto,
  YeniKasaDisplaySettingsDto,
  YeniKasaDisplayContentDto,
  YeniKasaFastAccessCategoryDto,
  YeniKasaFastAccessItemDto
} from '@interfaces';

import { AyarIslemleriService } from '../../../../../core/api/module-services/ayar-islemleri.service';
import type { CurrentUser } from '../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';

import { YeniKasaYonetimiListComponent } from './yeni-kasa-yonetimi-list.component';

function createUserWithPermissions(permissions: string[]): CurrentUser {
  return {
    userId: 'user-1',
    username: 'test.admin',
    ad: 'Admin',
    soyad: 'User',
    depoNo: 110,
    depoIsmi: 'Merkez',
    roller: [],
    sorumluluklar: [],
    permissions,
    displayName: 'Admin User'
  };
}

describe('YeniKasaYonetimiListComponent', () => {
  const sampleAppSettings: YeniKasaAppSettingsDto = {
    id: 1,
    pavoFis: 1,
    fisGenislik: '80mm',
    printerDotsPerLine: 576,
    fisFaturaLimit: 9900.0,
    nakitLimit: 0.0,
    ftpHost: '10.0.0.55',
    ftpPort: 21,
    ftpUsername: 'pos',
    ftpPassword: null,
    ftpFolderPath: '/kasa/',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const samplePaymentMethods: YeniKasaPaymentMethodDto[] = [
    {
      id: 1,
      name: 'Nakit',
      description: 'Nakit Ödeme',
      status: 1,
      sirano: 1,
      pavoIsActive: 1,
      pavoType: 'NAKIT',
      pavoMediator: 'CASH',
      brand: 'Nakit',
      group: 'Nakit'
    }
  ];

  const sampleMatrix: YeniKasaRolePermissionMatrixDto = {
    roles: [{ id: 1, name: 'Personel', description: null }],
    permissions: [{ id: 1, name: 'Satır İptal', code: 'line_cancel', description: null }],
    rolePermissions: [{ roleId: 1, permissionId: 1 }]
  };

  const sampleDisplaySettings: YeniKasaDisplaySettingsDto[] = [
    { id: 1, pageType: 'sale_page', isTwoSlider: 1, createdAt: null, updatedAt: null }
  ];

  const sampleDisplayContents: YeniKasaDisplayContentDto[] = [
    {
      id: 1,
      type: 'image',
      name: 'kampanya.jpg',
      sirano: 1,
      startDate: null,
      endDate: null,
      pageType: 'sale_page',
      createdAt: null,
      updatedAt: null,
      imageUrl: '/api/ayar-islemleri/yeni-kasa-yonetimi/musteri-gorsel/kampanya.jpg'
    }
  ];

  const sampleCategories: YeniKasaFastAccessCategoryDto[] = [
    {
      id: 1,
      name: 'Ekmek & Fırın',
      description: 'Unlu mamuller',
      categoryKey: 'abc123def456ghi78901',
      itemCount: 1,
      createdAt: null,
      updatedAt: null
    }
  ];

  const sampleItems: YeniKasaFastAccessItemDto[] = [
    {
      id: 1,
      inventoryCode: '016125',
      productName: 'Ekmek 200 Gr',
      barcode: '869000000001',
      imagePath: null,
      categoryKey: 'abc123def456ghi78901',
      imageUrl: '/api/ayar-islemleri/yeni-kasa-yonetimi/urun-gorsel/016125',
      createdAt: null,
      updatedAt: null
    }
  ];

  function setup(initialUser: CurrentUser | null) {
    const currentUser = signal<CurrentUser | null>(initialUser);
    const getAppSettingsSpy = jasmine.createSpy('getYeniKasaAppSettings').and.returnValue(of(sampleAppSettings));
    const getPaymentMethodsSpy = jasmine.createSpy('getYeniKasaPaymentMethods').and.returnValue(of(samplePaymentMethods));
    const getPaymentLookupsSpy = jasmine.createSpy('getYeniKasaPaymentMethodLookups').and.returnValue(of({
      groups: ['ana', 'banka', 'yemek', 'online', 'diger'],
      brands: [{ code: '0', label: 'Standart' }]
    }));
    const getRolePermissionMatrixSpy = jasmine.createSpy('getYeniKasaRolePermissionMatrix').and.returnValue(of(sampleMatrix));
    const getDisplaySettingsSpy = jasmine.createSpy('getYeniKasaDisplaySettings').and.returnValue(of(sampleDisplaySettings));
    const getDisplayContentsSpy = jasmine.createSpy('getYeniKasaDisplayContents').and.returnValue(of(sampleDisplayContents));
    const getFastAccessCategoriesSpy = jasmine.createSpy('getYeniKasaFastAccessCategories').and.returnValue(of(sampleCategories));
    const getFastAccessItemsSpy = jasmine.createSpy('getYeniKasaFastAccessItems').and.returnValue(of(sampleItems));

    TestBed.configureTestingModule({
      imports: [YeniKasaYonetimiListComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser,
            getTaskPermissionCodes: jasmine.createSpy('getTaskPermissionCodes').and.returnValue([])
          }
        },
        {
          provide: AyarIslemleriService,
          useValue: {
            getYeniKasaAppSettings: getAppSettingsSpy,
            getYeniKasaPaymentMethods: getPaymentMethodsSpy,
            getYeniKasaPaymentMethodLookups: getPaymentLookupsSpy,
            getYeniKasaRolePermissionMatrix: getRolePermissionMatrixSpy,
            getYeniKasaDisplaySettings: getDisplaySettingsSpy,
            getYeniKasaDisplayContents: getDisplayContentsSpy,
            getYeniKasaFastAccessCategories: getFastAccessCategoriesSpy,
            getYeniKasaFastAccessItems: getFastAccessItemsSpy,
            updateYeniKasaAppSettings: jasmine.createSpy('updateYeniKasaAppSettings').and.returnValue(of(void 0)),
            updateYeniKasaPaymentMethodsOrder: jasmine.createSpy('updateYeniKasaPaymentMethodsOrder').and.returnValue(of(void 0)),
            updateYeniKasaPaymentMethod: jasmine.createSpy('updateYeniKasaPaymentMethod').and.returnValue(of(void 0)),
            updateYeniKasaRolePermissions: jasmine.createSpy('updateYeniKasaRolePermissions').and.returnValue(of(void 0)),
            bulkUpdateYeniKasaRolePermissions: jasmine.createSpy('bulkUpdateYeniKasaRolePermissions').and.returnValue(of(void 0)),
            updateYeniKasaDisplaySettings: jasmine.createSpy('updateYeniKasaDisplaySettings').and.returnValue(of(void 0)),
            createYeniKasaDisplayContent: jasmine.createSpy('createYeniKasaDisplayContent').and.returnValue(of(sampleDisplayContents[0])),
            deleteYeniKasaDisplayContent: jasmine.createSpy('deleteYeniKasaDisplayContent').and.returnValue(of(void 0)),
            createYeniKasaFastAccessCategory: jasmine.createSpy('createYeniKasaFastAccessCategory').and.returnValue(of(sampleCategories[0])),
            deleteYeniKasaFastAccessCategory: jasmine.createSpy('deleteYeniKasaFastAccessCategory').and.returnValue(of(void 0)),
            createYeniKasaFastAccessItem: jasmine.createSpy('createYeniKasaFastAccessItem').and.returnValue(of(sampleItems[0])),
            deleteYeniKasaFastAccessItem: jasmine.createSpy('deleteYeniKasaFastAccessItem').and.returnValue(of(void 0))
          }
        },
        {
          provide: AppConfirmDialogService,
          useValue: {
            confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true))
          }
        }
      ]
    });

    const fixture: ComponentFixture<YeniKasaYonetimiListComponent> = TestBed.createComponent(YeniKasaYonetimiListComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    return { fixture, component };
  }

  it('bilesen basariyla olusturulmali ve varsayilan sekme genel ayarlar olmali', () => {
    const { component } = setup(
      createUserWithPermissions([
        'ayar-islemleri.yeni-kasa-yonetimi.page',
        'ayar-islemleri.yeni-kasa-yonetimi.list'
      ])
    );

    expect(component).toBeTruthy();
  });
});
