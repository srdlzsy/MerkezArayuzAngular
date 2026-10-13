import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { IadeIslemleriService } from '../../../core/api/module-services/iade-islemleri.service';
import { MalKabulIslemleriService } from '../../../core/api/module-services/mal-kabul-islemleri.service';
import { SevkIslemleriService } from '../../../core/api/module-services/sevk-islemleri.service';
import { StokIslemleriService } from '../../../core/api/module-services/stok-islemleri.service';
import { SafeCreateRecoveryService } from './safe-create-recovery.service';

describe('SafeCreateRecoveryService', () => {
  let service: SafeCreateRecoveryService;
  let sevk: jasmine.SpyObj<SevkIslemleriService>;
  let iade: jasmine.SpyObj<IadeIslemleriService>;
  let malKabul: jasmine.SpyObj<MalKabulIslemleriService>;
  let stok: jasmine.SpyObj<StokIslemleriService>;

  beforeEach(() => {
    sevk = jasmine.createSpyObj('SevkIslemleriService', [
      'createToptanCikisIrsaliyesi',
      'createDepolarArasiNakliyeSevkFisi',
      'createDepoDagitimSevkFisi',
      'getGidenFirmaSevkOfflineStatus',
      'getDepolarArasiSevkOfflineStatus'
    ]);
    iade = jasmine.createSpyObj('IadeIslemleriService', [
      'createFirmaIade',
      'createDepoIade',
      'getFirmaIadeOfflineStatus',
      'getDepoIadeOfflineStatus'
    ]);
    malKabul = jasmine.createSpyObj('MalKabulIslemleriService', [
      'createToptanGirisIrsaliyesi',
      'getCompanyReceiptOfflineStatus'
    ]);
    stok = jasmine.createSpyObj('StokIslemleriService', [
      'createSayimSonucu',
      'createVirman',
      'createSubeIci',
      'getSayimSonucuOfflineStatus',
      'getVirmanOfflineStatus',
      'getMasrafFisiOfflineStatus',
      'getZayiatFisiOfflineStatus'
    ]);

    for (const spy of [
      sevk.createToptanCikisIrsaliyesi,
      sevk.createDepolarArasiNakliyeSevkFisi,
      sevk.createDepoDagitimSevkFisi,
      iade.createFirmaIade,
      iade.createDepoIade,
      malKabul.createToptanGirisIrsaliyesi,
      stok.createSayimSonucu,
      stok.createVirman,
      stok.createSubeIci
    ]) {
      spy.and.returnValue(of({}));
    }

    for (const spy of [
      sevk.getGidenFirmaSevkOfflineStatus,
      sevk.getDepolarArasiSevkOfflineStatus,
      iade.getFirmaIadeOfflineStatus,
      iade.getDepoIadeOfflineStatus,
      malKabul.getCompanyReceiptOfflineStatus,
      stok.getSayimSonucuOfflineStatus,
      stok.getVirmanOfflineStatus,
      stok.getMasrafFisiOfflineStatus,
      stok.getZayiatFisiOfflineStatus
    ]) {
      spy.and.returnValue(of({ status: 'Processing' } as never));
    }

    TestBed.configureTestingModule({
      providers: [
        SafeCreateRecoveryService,
        { provide: SevkIslemleriService, useValue: sevk },
        { provide: IadeIslemleriService, useValue: iade },
        { provide: MalKabulIslemleriService, useValue: malKabul },
        { provide: StokIslemleriService, useValue: stok }
      ]
    });
    service = TestBed.inject(SafeCreateRecoveryService);
  });

  it('maps every supported create page to its persistent operation scope', () => {
    expect(service.getOperationCode('giden-firma-sevkleri')).toBe('company-shipment.create');
    expect(service.getOperationCode('giden-depolar-arasi-sevkler')).toBe(
      'inter-warehouse-shipment.create'
    );
    expect(service.getOperationCode('gelen-depolar-arasi-sevkler')).toBe(
      'inter-warehouse-shipment.create'
    );
    expect(service.getOperationCode('firma-mal-kabulleri')).toBe('company-receiving.create');
    expect(service.getOperationCode('firma-iadeleri')).toBe('company-return.create');
    expect(service.getOperationCode('giden-depo-iadeleri')).toBe('warehouse-return.create');
    expect(service.getOperationCode('sayim-sonuclari')).toBe('inventory-count.create');
    expect(service.getOperationCode('virmanlar')).toBe('stock-transfer.create');
    expect(service.getOperationCode('masraf-fisleri')).toBe('expense-receipt.create');
    expect(service.getOperationCode('zayiat-fisleri')).toBe('wastage-receipt.create');
    expect(service.getOperationCode('desteklenmeyen-sayfa')).toBeNull();
  });

  it('replays the exact stored request through the matching create endpoints', () => {
    const request = { clientRequestId: 'request-1' };

    service.recover('giden-firma-sevkleri', request);
    service.recover('giden-depolar-arasi-sevkler', request);
    service.recover('gelen-depolar-arasi-sevkler', request);
    service.recover('firma-mal-kabulleri', request);
    service.recover('firma-iadeleri', request);
    service.recover('giden-depo-iadeleri', request);
    service.recover('sayim-sonuclari', request);
    service.recover('virmanlar', request);
    service.recover('masraf-fisleri', request);
    service.recover('zayiat-fisleri', request);

    expect(sevk.createToptanCikisIrsaliyesi.calls.mostRecent().args[0]).toBe(request as never);
    expect(sevk.createDepolarArasiNakliyeSevkFisi.calls.mostRecent().args[0]).toBe(request as never);
    expect(sevk.createDepoDagitimSevkFisi.calls.mostRecent().args[0]).toBe(request as never);
    expect(malKabul.createToptanGirisIrsaliyesi.calls.mostRecent().args[0]).toBe(request as never);
    expect(iade.createFirmaIade.calls.mostRecent().args[0]).toBe(request as never);
    expect(iade.createDepoIade.calls.mostRecent().args[0]).toBe(request as never);
    expect(stok.createSayimSonucu.calls.mostRecent().args[0]).toBe(request as never);
    expect(stok.createVirman.calls.mostRecent().args).toEqual([
      'StokVirmanCikisFisleri',
      request as never
    ]);
    expect(stok.createSubeIci.calls.allArgs()).toEqual([
      ['SarfDepoCikisFisleri', request as never],
      ['FireDepoCikisFisleri', request as never]
    ]);
  });

  it('checks each stored request through the matching offline status endpoint', () => {
    const requestId = 'request-1';

    service.getStatus('giden-firma-sevkleri', requestId);
    service.getStatus('giden-depolar-arasi-sevkler', requestId);
    service.getStatus('firma-mal-kabulleri', requestId);
    service.getStatus('firma-iadeleri', requestId);
    service.getStatus('giden-depo-iadeleri', requestId);
    service.getStatus('sayim-sonuclari', requestId);
    service.getStatus('virmanlar', requestId);
    service.getStatus('masraf-fisleri', requestId);
    service.getStatus('zayiat-fisleri', requestId);

    expect(sevk.getGidenFirmaSevkOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(sevk.getDepolarArasiSevkOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(malKabul.getCompanyReceiptOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(iade.getFirmaIadeOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(iade.getDepoIadeOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getSayimSonucuOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getVirmanOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getMasrafFisiOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getZayiatFisiOfflineStatus).toHaveBeenCalledWith(requestId);
  });
});
