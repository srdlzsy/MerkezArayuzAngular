import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { OperasyonIslemleriService } from '../../../../../core/api/module-services/operasyon-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DocumentPrintService } from '../../../core/document-print/document-print.service';

import { FirmaEvrakTakibiListComponent } from './firma-evrak-takibi-list.component';

describe('FirmaEvrakTakibiListComponent', () => {
  const response = {
    date: '2026-10-06',
    generatedAtUtc: '2026-10-06T10:00:00Z',
    warehouseNo: 120,
    documentCount: 0,
    companyReceivingCount: 0,
    companyReturnCount: 0,
    items: []
  };

  function createComponent(permissions: string[] = []): {
    component: any;
    getCompanyDocumentTracking: jasmine.Spy;
  } {
    const getCompanyDocumentTracking = jasmine
      .createSpy('getCompanyDocumentTracking')
      .and.returnValue(of(response));
    const currentUser = signal({
      depoNo: 120,
      depoIsmi: 'YUNUSELI',
      permissions,
      sorumluluklar: []
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser,
            hasTaskAccess: () => true,
            getTaskPermissionCodes: () => [],
            getTaskPermissionKeys: () => []
          }
        },
        {
          provide: OperasyonIslemleriService,
          useValue: { getCompanyDocumentTracking }
        },
        {
          provide: DocumentPrintService,
          useValue: { print: jasmine.createSpy('print').and.returnValue(true) }
        }
      ]
    });

    return {
      component: TestBed.runInInjectionContext(
        () => new FirmaEvrakTakibiListComponent()
      ) as any,
      getCompanyDocumentTracking
    };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('uses the JWT warehouse scope for a regular warehouse user', () => {
    const { component, getCompanyDocumentTracking } = createComponent();
    component.selectedDate.set('2026-10-06');

    component.ngOnInit();

    expect(getCompanyDocumentTracking).toHaveBeenCalledOnceWith({
      date: '2026-10-06',
      warehouseNo: undefined
    });
  });

  it('sends the selected warehouse only with all-warehouses permission', () => {
    const { component, getCompanyDocumentTracking } = createComponent([
      'operasyon-islemleri.firma-evrak-takibi.all-warehouses'
    ]);
    component.selectedDate.set('2026-10-06');
    component.setSelectedWarehouseNo(149);

    component.loadDocuments();

    expect(getCompanyDocumentTracking).toHaveBeenCalledOnceWith({
      date: '2026-10-06',
      warehouseNo: 149
    });
  });

  it('builds the compact print summary from the rows being printed', () => {
    const { component } = createComponent();
    const items = [
      {
        documentKind: 'CompanyReceiving',
        lineCount: 3,
        totalQuantity: 12.5
      },
      {
        documentKind: 'CompanyReturn',
        lineCount: 2,
        totalQuantity: 4
      }
    ];

    expect(component.resolvePrintSummary(items)).toEqual([
      '2 evrak',
      '1 mal kabul',
      '1 firma iade',
      '5 kalem',
      '16,5 miktar'
    ]);
  });
});
