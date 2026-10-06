import { signal } from '@angular/core';
import type {
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaCreateCompanyShipmentRequestApiDto,
  IFurpaCreateVirmanRequestApiDto,
  IFurpaCreateWarehouseOrderRequestApiDto,
  IFurpaCreateWarehouseReturnRequestApiDto
} from '@interfaces';

import { StokVirmanCikisFisleriCreateComponent } from '../inventory/stok-virman-cikis-fisleri/create/stok-virman-cikis-fisleri-create.component';
import { VerilenDepoSiparisleriCreateComponent } from '../orders/verilen-depo-siparisleri/create/verilen-depo-siparisleri-create.component';
import { FirmaMalKabulleriCreateComponent } from '../receiving/firma-mal-kabulleri/create/firma-mal-kabulleri-create.component';
import { DepoIadeleriCreateComponent } from '../returns/depo-iadeleri/create/depo-iadeleri-create.component';
import { GidenFirmaSevkleriCreateComponent } from '../shipment/giden-firma-sevkleri/create/giden-firma-sevkleri-create.component';

interface RequestBuilder<TRequest> {
  buildRequest(): TRequest;
}

interface SubmitHarness {
  submit(): void;
}

const safeCreateRetry = {
  withClientRequestId<TRequest extends object>(request: TRequest): TRequest & { clientRequestId: string } {
    return { ...request, clientRequestId: 'test-request-id' };
  }
};

function createSubject<TComponent extends object>(
  component: { prototype: TComponent },
  state: Record<string, unknown>
): TComponent {
  return Object.assign(Object.create(component.prototype), state) as TComponent;
}

function buildRequest<TRequest>(component: object): TRequest {
  return (component as RequestBuilder<TRequest>).buildRequest();
}

describe('critical create component behavior', () => {
  it('builds a warehouse order payload and removes zero-quantity lines', () => {
    const baseLine = {
      stokIsmi: 'Urun',
      barkodu: '8690000000001',
      birim: 'ADET',
      birimKatsayisi: null,
      ikinciBirim: 'KOLI',
      koliKatsayisi: 6,
      koliBarkodu: '',
      koliMiktari: null,
      cozumMiktari: null,
      cozumBirim: '',
      cozumMesaj: '',
      cozumDurum: '',
      cozumHata: '',
      greenGrocerCase: null,
      skt: ''
    };
    const subject = createSubject(VerilenDepoSiparisleriCreateComponent, {
      form: {
        getRawValue: () => ({
          muhatapDepoNo: 50,
          orderDate: '2026-10-06',
          deliveryDate: '2026-10-07',
          description: '  Merkez siparisi  ',
          kalemler: [
            {
              ...baseLine,
              stokKodu: ' 016445 ',
              siparisMiktari: 12,
              aciklama: ' Soda ',
              modelKodu: '03'
            },
            {
              ...baseLine,
              stokKodu: '000000',
              siparisMiktari: 0,
              aciklama: '',
              modelKodu: ''
            }
          ]
        })
      },
      resolveCreateInWarehouseNo: () => 120,
      isGreenGrocerOrder: () => false
    });

    const request = buildRequest<IFurpaCreateWarehouseOrderRequestApiDto>(subject);

    expect(request.inWarehouseNo).toBe(120);
    expect(request.outWarehouseNo).toBe(50);
    expect(request.lines.length).toBe(1);
    expect(request.lines[0]).toEqual(
      jasmine.objectContaining({ stockCode: '016445', quantity: 12, unitPointer: 1 })
    );
  });

  it('builds an idempotent company shipment payload from the entered form values', () => {
    const subject = createSubject(GidenFirmaSevkleriCreateComponent, {
      form: {
        getRawValue: () => ({
          muhatapFirmaCariKod: ' C001 ',
          movementDate: '2026-10-06',
          documentDate: '2026-10-06',
          documentNo: '123456789012345678901234567890',
          description: 'Sevk',
          deliverer: ' Teslim Eden ',
          muhatapAdSoyad: ' Teslim Alan ',
          kalemler: [
            {
              stokKodu: ' 016445 ',
              siparisMiktari: 3,
              birimKatsayisi: null,
              aciklama: ' Sade soda '
            }
          ]
        })
      },
      safeCreateRetry,
      resolveRequestWarehouseNo: () => 120
    });

    const request = buildRequest<IFurpaCreateCompanyShipmentRequestApiDto>(subject);

    expect(request.clientRequestId).toBe('test-request-id');
    expect(request.customerCode).toBe('C001');
    expect(request.documentNo?.length).toBe(25);
    expect(request.lines[0]).toEqual(
      jasmine.objectContaining({ stockCode: '016445', quantity: 3, unitPointer: 1 })
    );
  });

  it('blocks company shipment submission while customer and lines are missing', () => {
    const createShipment = jasmine.createSpy('createToptanCikisIrsaliyesi');
    const markAllAsTouched = jasmine.createSpy('markAllAsTouched');
    const subject = createSubject(GidenFirmaSevkleriCreateComponent, {
      submitting: signal(false),
      safeCreateFailure: signal(null),
      submitError: signal(''),
      customerError: signal(''),
      stockError: signal(''),
      selectedCustomer: signal(null),
      form: { invalid: true, markAllAsTouched },
      controls: { kalemler: { length: 0 } },
      sevkIslemleriService: { createToptanCikisIrsaliyesi: createShipment }
    });

    (subject as unknown as SubmitHarness).submit();

    expect(markAllAsTouched).toHaveBeenCalled();
    expect(createShipment).not.toHaveBeenCalled();
  });

  it('builds a warehouse return payload with transit and quantity data', () => {
    const subject = createSubject(DepoIadeleriCreateComponent, {
      form: {
        getRawValue: () => ({
          muhatapDepoNo: 50,
          transitWarehouseNo: 60,
          movementDate: '2026-10-06',
          documentDate: '2026-10-06',
          documentNo: 'IADE-1',
          description: 'Depo iadesi',
          kalemler: [
            {
              stokKodu: ' 016445 ',
              miktar: 2,
              birimKatsayisi: 6,
              aciklama: ' Koli iadesi '
            }
          ]
        })
      },
      safeCreateRetry,
      resolveRequestWarehouseNo: () => 120
    });

    const request = buildRequest<IFurpaCreateWarehouseReturnRequestApiDto>(subject);

    expect(request.sourceWarehouseNo).toBe(120);
    expect(request.targetWarehouseNo).toBe(50);
    expect(request.transitWarehouseNo).toBe(60);
    expect(request.lines[0]).toEqual(
      jasmine.objectContaining({ stockCode: '016445', quantity: 2, unitPointer: 6 })
    );
  });

  it('keeps dispatch and accepted quantities in company receiving payloads', () => {
    const subject = createSubject(FirmaMalKabulleriCreateComponent, {
      form: {
        getRawValue: () => ({
          muhatapFirmaCariKod: ' C001 ',
          movementDate: '2026-10-06',
          documentDate: '2026-10-06',
          documentSerie: ' fmk ',
          documentOrderNo: 15,
          deliverer: 'Tedarikci',
          receiver: 'Magaza',
          description: 'Mal kabul',
          allowOrderOverReceiving: false,
          autoCreateReturnForPartialAcceptance: true,
          kalemler: [
            {
              stokKodu: ' 016445 ',
              irsaliyeMiktari: 10,
              fiiliKabulMiktari: 8,
              birimFiyati: 2.5,
              birimKatsayisi: null,
              skt: ' 2027-01-01 ',
              siparisGuid: '',
              aciklama: ' Kabul '
            }
          ]
        })
      },
      safeCreateRetry,
      resolveRequestWarehouseNo: () => 120,
      buildOfficialDocumentTrace: () => ({ officialDocumentKind: 'e-despatch' })
    });

    const request = buildRequest<IFurpaCreateCompanyReceiptRequestApiDto>(subject);

    expect(request.documentSerie).toBe('FMK');
    expect(request.lines[0]).toEqual(
      jasmine.objectContaining({
        stockCode: '016445',
        dispatchQuantity: 10,
        acceptedQuantity: 8,
        unitPrice: 2.5,
        unitPointer: 1,
        lastConsumingDate: '2027-01-01'
      })
    );
  });

  it('normalizes stock transfer movement fields before posting', () => {
    const subject = createSubject(StokVirmanCikisFisleriCreateComponent, {
      form: {
        getRawValue: () => ({
          movementDate: '2026-10-06',
          documentDate: '2026-10-06',
          documentNo: 'V-1',
          description: 'Reyon duzenleme',
          lines: [
            {
              stockCode: ' 016445 ',
              movementType: 1,
              quantity: 4,
              unitPointer: 1,
              description: ' Cikis ',
              partyCode: '',
              lotNo: null,
              projectCode: ''
            }
          ]
        })
      },
      safeCreateRetry,
      resolveRequestWarehouseNo: () => 120
    });

    const request = buildRequest<IFurpaCreateVirmanRequestApiDto>(subject);

    expect(request.warehouseNo).toBe(120);
    expect(request.lines[0]).toEqual(
      jasmine.objectContaining({
        stockCode: '016445',
        movementType: 1,
        quantity: 4,
        unitPointer: 1,
        lotNo: 0
      })
    );
  });
});
