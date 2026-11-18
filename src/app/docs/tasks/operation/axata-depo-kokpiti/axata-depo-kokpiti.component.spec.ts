import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AxataWarehouseOperationsApiService } from '../../../../core/api/module-services/axata-depo-operasyonlari.service';
import { EntegrasyonIslemleriService } from '../../../../core/api/module-services/entegrasyon-islemleri.service';
import { AxataDepoKokpitiComponent } from './axata-depo-kokpiti.component';

describe('AxataDepoKokpitiComponent', () => {
  function createComponent(options?: { deliveryError?: boolean; deliveries?: unknown[] }): {
    component: AxataDepoKokpitiComponent;
    integrationApi: jasmine.SpyObj<EntegrasyonIslemleriService>;
    warehouseApi: jasmine.SpyObj<AxataWarehouseOperationsApiService>;
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
        : of({
          totalFetchedDocumentCount: options?.deliveries?.length ?? 0,
          returnedDocumentCount: options?.deliveries?.length ?? 0,
          documents: options?.deliveries ?? []
        } as never)
    );
    integrationApi.dispatchAxataManualDocumentBatch.and.returnValue(of({
      succeededDocumentCount: 1,
      failedDocumentCount: 0,
      failures: []
    } as never));
    integrationApi.executeAxataC01OutboundDeliveryDocumentImport.and.returnValue(of({} as never));

    const warehouseApi = jasmine.createSpyObj<AxataWarehouseOperationsApiService>(
      'AxataWarehouseOperationsApiService',
      ['getOverview', 'getDocuments', 'getTrace', 'getPickingPerformance', 'getFillRate', 'getCapacity']
    );
    warehouseApi.getOverview.and.returnValue(of({} as never));
    warehouseApi.getDocuments.and.returnValue(of({ totalCount: 0, items: [] } as never));

    TestBed.configureTestingModule({
      providers: [
        { provide: EntegrasyonIslemleriService, useValue: integrationApi },
        { provide: AxataWarehouseOperationsApiService, useValue: warehouseApi }
      ]
    });

    return {
      component: TestBed.runInInjectionContext(() => new AxataDepoKokpitiComponent()),
      integrationApi,
      warehouseApi
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

  it('keeps blocked C01 documents visible as intervention items', () => {
    const blocked = {
      ...createDelivery(265236),
      canImport: false,
      mikroCheckState: 'OrderNotFound',
      allowedAction: 'InspectOnly',
      warning: 'Mikro siparisi bulunamadi.'
    };
    const { component } = createComponent({ deliveries: [blocked] });

    component.loadActionDesk();

    expect(component.deliveryCandidates()).toEqual([]);
    expect(component.interventionDeliveries()).toEqual([blocked as never]);
    expect(component.canReconcileDelivery(blocked as never)).toBeFalse();
  });

  it('offers reconcile only when API explicitly allows it', () => {
    const reconcilable = {
      ...createDelivery(265237),
      canImport: false,
      mikroCheckState: 'MikroShipmentExistsPendingAck',
      allowedAction: 'ReconcileAndAcknowledge'
    };
    const { component } = createComponent({ deliveries: [reconcilable] });

    component.loadActionDesk();

    expect(component.canReconcileDelivery(reconcilable as never)).toBeTrue();
  });

  it('loads date filtered AXATA documents from the read-only endpoint', () => {
    const { component, warehouseApi } = createComponent();
    component.documentStartDate = '2026-11-13';
    component.documentEndDate = '2026-11-13';
    component.documentType = 'Shipment';
    component.documentStatus = 'in-transit';

    component.loadDocuments();

    expect(warehouseApi.getDocuments).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      startDate: '2026-11-13',
      endDate: '2026-11-13',
      documentType: 'Shipment',
      status: 'in-transit',
      take: 500
    }));
  });

  it('keeps the yesterday preset on a single calendar day', () => {
    const { component, warehouseApi } = createComponent();

    component.setDocumentDay(1);

    const query = warehouseApi.getDocuments.calls.mostRecent().args[0];
    expect(query.startDate).toBe(query.endDate);
  });

  it('builds the last seven days preset as an inclusive range', () => {
    const { component, warehouseApi } = createComponent();

    component.setDocumentRange(6);

    const query = warehouseApi.getDocuments.calls.mostRecent().args[0];
    const dayDifference =
      (Date.parse(query.endDate!) - Date.parse(query.startDate!)) / 86_400_000;
    expect(dayDifference).toBe(6);
  });

  it('bounds visual percentages without changing the reported value', () => {
    const { component } = createComponent();

    expect(component.boundedPercentage(-5)).toBe(0);
    expect(component.boundedPercentage(82.5)).toBe(82.5);
    expect(component.boundedPercentage(120)).toBe(100);
    expect(component.boundedPercentage(Number.NaN)).toBe(0);
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

  it('stores Mikro cross-check summary returned by trace endpoint', () => {
    const { component, warehouseApi } = createComponent();
    warehouseApi.getTrace.and.returnValue(of({
      searchTerm: 'F50-17511',
      documentType: 'OutboundOrder',
      orderNo: 'F50.17511',
      shipments: [],
      pickingLogs: [],
      inbounds: [],
      integrationQueues: [],
      mikroCrossCheck: {
        orderSerie: 'F50',
        orderNo: 17511,
        orderFound: true,
        lineCount: 1,
        openLineCount: 1,
        closedLineCount: 0,
        orderedQuantity: 2,
        deliveredQuantity: 0,
        shipments: [
          {
            documentSerie: 'F131',
            documentOrderNo: 2631,
            officialDocumentNo: 'FRM2026600149141',
            sourceWarehouseNo: 131,
            targetWarehouseNo: 51,
            lineCount: 1,
            quantity: 2
          }
        ],
        decisionCode: 'ShipmentExistsOrderOpen',
        decision: 'Mikro sevk fişi oluşmuş; ancak bazı sipariş satırları hâlâ açık.'
      }
    } as never));

    component.traceOrder('F50-17511');

    expect(component.activeTab).toBe('trace');
    expect(component.traceResult()?.mikroCrossCheck?.decisionCode).toBe('ShipmentExistsOrderOpen');
    expect(component.traceResult()?.mikroCrossCheck?.shipments.length).toBe(1);
  });

  function createDelivery(axataSequenceNo: number) {
    return {
      axataSequenceNo,
      axataDeliveryNo: 'A.1979',
      documentSerie: 'A',
      documentOrderNo: 1979,
      status: '0',
      axataDate: '2026-11-13T00:00:00',
      canImport: true,
      mikroCheckState: 'ReadyForImport',
      allowedAction: 'ImportToMikro',
      warning: null
    };
  }
});
