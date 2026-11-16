import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AxataWarehouseOperationsApiService } from '../../../../core/api/module-services/axata-depo-operasyonlari.service';
import { EntegrasyonIslemleriService } from '../../../../core/api/module-services/entegrasyon-islemleri.service';
import { AxataDepoKokpitiComponent } from './axata-depo-kokpiti.component';

describe('AxataDepoKokpitiComponent', () => {
  function createComponent(options?: { deliveryError?: boolean }): {
    component: AxataDepoKokpitiComponent;
    integrationApi: jasmine.SpyObj<EntegrasyonIslemleriService>;
  } {
    const orderResponse = {
      totalRecordCount: 1,
      returnedRecordCount: 1,
      items: [
        {
          documentReference: 'F120/42',
          documentSerie: 'F120',
          documentOrderNo: 42,
          documentNo: 42,
          documentDate: '2026-11-13T00:00:00',
          summary: 'Test siparisi'
        }
      ]
    };
    const integrationApi = jasmine.createSpyObj<EntegrasyonIslemleriService>(
      'EntegrasyonIslemleriService',
      [
        'getAxataManualDocumentCandidates',
        'previewAxataC01OutboundDeliveryImport',
        'dispatchAxataManualDocumentBatch',
        'executeAxataC01OutboundDeliveryDocumentImport'
      ]
    );
    integrationApi.getAxataManualDocumentCandidates.and.callFake((taskCode: string) =>
      of(taskCode === 'issued-warehouse-order-sync'
        ? orderResponse as never
        : { totalRecordCount: 0, returnedRecordCount: 0, items: [] } as never)
    );
    integrationApi.previewAxataC01OutboundDeliveryImport.and.returnValue(
      options?.deliveryError
        ? throwError(() => ({ error: { detail: 'AXATA baglantisi yok' } }))
        : of({ totalFetchedDocumentCount: 0, returnedDocumentCount: 0, documents: [] } as never)
    );
    integrationApi.dispatchAxataManualDocumentBatch.and.returnValue(of({
      succeededDocumentCount: 1,
      failedDocumentCount: 0,
      failures: []
    } as never));
    integrationApi.executeAxataC01OutboundDeliveryDocumentImport.and.returnValue(of({} as never));

    const warehouseApi = jasmine.createSpyObj<AxataWarehouseOperationsApiService>(
      'AxataWarehouseOperationsApiService',
      ['getOverview', 'getTrace', 'getPickingPerformance', 'getFillRate', 'getCapacity']
    );
    warehouseApi.getOverview.and.returnValue(of({} as never));

    TestBed.configureTestingModule({
      providers: [
        { provide: EntegrasyonIslemleriService, useValue: integrationApi },
        { provide: AxataWarehouseOperationsApiService, useValue: warehouseApi }
      ]
    });

    return {
      component: TestBed.runInInjectionContext(() => new AxataDepoKokpitiComponent()),
      integrationApi
    };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('requests at most 200 C01 rows and applies the selected date on the server', () => {
    const { component, integrationApi } = createComponent();
    component.actionDate = '2026-11-13';

    component.loadActionDesk();

    expect(integrationApi.previewAxataC01OutboundDeliveryImport).toHaveBeenCalledOnceWith(
      200,
      '2026-11-13'
    );
  });

  it('keeps available order lists visible when the C01 source fails', () => {
    const { component } = createComponent({ deliveryError: true });

    component.loadActionDesk();

    expect(component.orderCandidates().length).toBe(1);
    expect(component.deliveryCandidates()).toEqual([]);
    expect(component.actionListWarning()).toContain('AXATA sevkleri okunamadı');
  });

  it('selects repeated document numbers independently by AXATA sequence', () => {
    const { component } = createComponent();
    const first = createDelivery(265016);
    const second = createDelivery(265235);

    component.toggleDelivery(first as never);
    component.toggleDelivery(second as never);

    expect(component.selectedDeliveryReferences().size).toBe(2);
    expect(component.isDeliverySelected(first as never)).toBeTrue();
    expect(component.isDeliverySelected(second as never)).toBeTrue();
  });

  it('sends AXATA sequence when importing repeated C01 documents', () => {
    const { component, integrationApi } = createComponent();
    const delivery = createDelivery(265235);
    component.deliveryCandidates.set([delivery as never]);
    component.toggleDelivery(delivery as never);

    component.importSelectedDeliveries();

    expect(integrationApi.executeAxataC01OutboundDeliveryDocumentImport).toHaveBeenCalledWith(
      'A',
      1979,
      jasmine.objectContaining({ axataSequenceNo: 265235 })
    );
  });

  it('imports repeated document numbers sequentially instead of starting concurrent writes', () => {
    const { component, integrationApi } = createComponent();
    const observerHolder: { current?: { next: (value: unknown) => void } } = {};
    const firstResponse = {
      subscribe: (observer: { next: (value: unknown) => void }) => {
        observerHolder.current = observer;
        return { unsubscribe: () => undefined };
      }
    };
    integrationApi.executeAxataC01OutboundDeliveryDocumentImport.and.returnValues(
      firstResponse as never,
      of({} as never)
    );
    const first = createDelivery(265016);
    const second = createDelivery(265235);
    component.deliveryCandidates.set([first, second] as never);
    component.toggleDelivery(first as never);
    component.toggleDelivery(second as never);

    component.importSelectedDeliveries();

    expect(integrationApi.executeAxataC01OutboundDeliveryDocumentImport).toHaveBeenCalledTimes(1);
    expect(observerHolder.current).toBeDefined();
    observerHolder.current?.next({});
    expect(integrationApi.executeAxataC01OutboundDeliveryDocumentImport).toHaveBeenCalledTimes(2);
    expect(integrationApi.executeAxataC01OutboundDeliveryDocumentImport.calls.argsFor(1)[2])
      .toEqual(jasmine.objectContaining({ axataSequenceNo: 265235 }));
  });

  function createDelivery(axataSequenceNo: number) {
    return {
      axataSequenceNo,
      axataDeliveryNo: 'A.1979',
      documentSerie: 'A',
      documentOrderNo: 1979,
      status: '0',
      axataDate: '2026-11-13T00:00:00',
      canImport: true
    };
  }
});
