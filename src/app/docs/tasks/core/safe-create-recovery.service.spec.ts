import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { IadeIslemleriService } from '../../../core/api/module-services/iade-islemleri.service';
import { MalKabulIslemleriService } from '../../../core/api/module-services/mal-kabul-islemleri.service';
import { MobileSyncService } from '../../../core/api/module-services/mobile-sync.service';
import { SevkIslemleriService } from '../../../core/api/module-services/sevk-islemleri.service';
import { SiparisIslemleriService } from '../../../core/api/module-services/siparis-islemleri.service';
import { StokIslemleriService } from '../../../core/api/module-services/stok-islemleri.service';
import { SafeCreateRecoveryService } from './safe-create-recovery.service';

describe('SafeCreateRecoveryService', () => {
  let service: SafeCreateRecoveryService;
  let sevk: jasmine.SpyObj<SevkIslemleriService>;
  let iade: jasmine.SpyObj<IadeIslemleriService>;
  let malKabul: jasmine.SpyObj<MalKabulIslemleriService>;
  let mobileSync: jasmine.SpyObj<MobileSyncService>;
  let stok: jasmine.SpyObj<StokIslemleriService>;
  let siparis: jasmine.SpyObj<SiparisIslemleriService>;

  beforeEach(() => {
    sevk = jasmine.createSpyObj('SevkIslemleriService', [
      'createToptanCikisIrsaliyesi',
      'createDepolarArasiNakliyeSevkFisi',
      'createDepoDagitimSevkFisi',
      'getGidenFirmaSevkOfflineStatus',
      'getDepolarArasiSevkOfflineStatus',
    ]);
    iade = jasmine.createSpyObj('IadeIslemleriService', [
      'createFirmaIade',
      'createDepoIade',
      'getFirmaIadeOfflineStatus',
      'getDepoIadeOfflineStatus',
    ]);
    malKabul = jasmine.createSpyObj('MalKabulIslemleriService', [
      'createToptanGirisIrsaliyesi',
      'getCompanyReceiptOfflineStatus',
    ]);
    mobileSync = jasmine.createSpyObj('MobileSyncService', ['recheckSafeWrite']);
    mobileSync.recheckSafeWrite.and.returnValue(of({} as never));
    stok = jasmine.createSpyObj('StokIslemleriService', [
      'createSayimSonucu',
      'createVirman',
      'createSubeIci',
      'getSayimSonucuOfflineStatus',
      'getVirmanOfflineStatus',
      'getMasrafFisiOfflineStatus',
      'getZayiatFisiOfflineStatus',
    ]);
    siparis = jasmine.createSpyObj('SiparisIslemleriService', [
      'createIssuedWarehouseOrder',
      'convertSuggestedWarehouseOrder',
      'createIssuedCompanyOrder',
      'convertSuggestedCompanyOrder',
      'getIssuedWarehouseOrderOfflineStatus',
      'getSuggestedWarehouseOrderOfflineStatus',
      'getIssuedCompanyOrderOfflineStatus',
      'getSuggestedCompanyOrderOfflineStatus',
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
      stok.createSubeIci,
      siparis.createIssuedWarehouseOrder,
      siparis.convertSuggestedWarehouseOrder,
      siparis.createIssuedCompanyOrder,
      siparis.convertSuggestedCompanyOrder,
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
      stok.getZayiatFisiOfflineStatus,
      siparis.getIssuedWarehouseOrderOfflineStatus,
      siparis.getSuggestedWarehouseOrderOfflineStatus,
      siparis.getIssuedCompanyOrderOfflineStatus,
      siparis.getSuggestedCompanyOrderOfflineStatus,
    ]) {
      spy.and.returnValue(of({ status: 'Processing' } as never));
    }

    TestBed.configureTestingModule({
      providers: [
        SafeCreateRecoveryService,
        { provide: SevkIslemleriService, useValue: sevk },
        { provide: IadeIslemleriService, useValue: iade },
        { provide: MalKabulIslemleriService, useValue: malKabul },
        { provide: MobileSyncService, useValue: mobileSync },
        { provide: StokIslemleriService, useValue: stok },
        { provide: SiparisIslemleriService, useValue: siparis },
      ],
    });
    service = TestBed.inject(SafeCreateRecoveryService);
  });

  it('maps every supported create page to its persistent operation scope', () => {
    expect(service.getOperationCode('giden-firma-sevkleri')).toBe('company-shipment.create');
    expect(service.getOperationCode('giden-depolar-arasi-sevkler')).toBe(
      'inter-warehouse-shipment.create',
    );
    expect(service.getOperationCode('gelen-depolar-arasi-sevkler')).toBe(
      'inter-warehouse-shipment.create',
    );
    expect(service.getOperationCode('firma-mal-kabulleri')).toBe('company-receiving.create');
    expect(service.getOperationCode('firma-iadeleri')).toBe('company-return.create');
    expect(service.getOperationCode('giden-depo-iadeleri')).toBe('warehouse-return.create');
    expect(service.getOperationCode('sayim-sonuclari')).toBe('inventory-count.create');
    expect(service.getOperationCode('virmanlar')).toBe('stock-transfer.create');
    expect(service.getOperationCode('masraf-fisleri')).toBe('expense-receipt.create');
    expect(service.getOperationCode('zayiat-fisleri')).toBe('wastage-receipt.create');
    expect(service.getOperationCode('verilen-depo-siparisleri')).toBe(
      'siparis-islemleri.verilen-depo-siparisleri.create',
    );
    expect(service.getOperationCode('onerilen-depo-siparisleri')).toBe(
      'siparis-islemleri.onerilen-depo-siparisleri.create',
    );
    expect(service.getOperationCode('verilen-firma-siparisleri')).toBe(
      'siparis-islemleri.verilen-firma-siparisleri.create',
    );
    expect(service.getOperationCode('onerilen-firma-siparisleri')).toBe(
      'siparis-islemleri.onerilen-firma-siparisleri.create',
    );
    expect(service.getOperationCode('desteklenmeyen-sayfa')).toBeNull();
  });

  it('uses the common read-only recheck endpoint with the mapped operation code', () => {
    service.recheck('firma-mal-kabulleri', 'request-1');

    expect(mobileSync.recheckSafeWrite).toHaveBeenCalledWith(
      'request-1',
      'mal-kabul-islemleri.firma-mal-kabulleri.create',
    );
    expect(service.recheck('desteklenmeyen-sayfa', 'request-2')).toBeNull();
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
    service.recover('verilen-depo-siparisleri', request);
    service.recover('onerilen-depo-siparisleri', request);
    service.recover('verilen-firma-siparisleri', request);
    service.recover('onerilen-firma-siparisleri', request);

    expect(sevk.createToptanCikisIrsaliyesi.calls.mostRecent().args[0]).toBe(request as never);
    expect(sevk.createDepolarArasiNakliyeSevkFisi.calls.mostRecent().args[0]).toBe(
      request as never,
    );
    expect(sevk.createDepoDagitimSevkFisi.calls.mostRecent().args[0]).toBe(request as never);
    expect(malKabul.createToptanGirisIrsaliyesi.calls.mostRecent().args[0]).toBe(request as never);
    expect(iade.createFirmaIade.calls.mostRecent().args[0]).toBe(request as never);
    expect(iade.createDepoIade.calls.mostRecent().args[0]).toBe(request as never);
    expect(stok.createSayimSonucu.calls.mostRecent().args[0]).toBe(request as never);
    expect(stok.createVirman.calls.mostRecent().args).toEqual([
      'StokVirmanCikisFisleri',
      request as never,
    ]);
    expect(stok.createSubeIci.calls.allArgs()).toEqual([
      ['SarfDepoCikisFisleri', request as never],
      ['FireDepoCikisFisleri', request as never],
    ]);
    expect(siparis.createIssuedWarehouseOrder).toHaveBeenCalledWith(request as never);
    expect(siparis.convertSuggestedWarehouseOrder).toHaveBeenCalledWith(request as never);
    expect(siparis.createIssuedCompanyOrder).toHaveBeenCalledWith(request as never);
    expect(siparis.convertSuggestedCompanyOrder).toHaveBeenCalledWith(request as never);
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
    service.getStatus('verilen-depo-siparisleri', requestId);
    service.getStatus('onerilen-depo-siparisleri', requestId);
    service.getStatus('verilen-firma-siparisleri', requestId);
    service.getStatus('onerilen-firma-siparisleri', requestId);

    expect(sevk.getGidenFirmaSevkOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(sevk.getDepolarArasiSevkOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(malKabul.getCompanyReceiptOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(iade.getFirmaIadeOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(iade.getDepoIadeOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getSayimSonucuOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getVirmanOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getMasrafFisiOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(stok.getZayiatFisiOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(siparis.getIssuedWarehouseOrderOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(siparis.getSuggestedWarehouseOrderOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(siparis.getIssuedCompanyOrderOfflineStatus).toHaveBeenCalledWith(requestId);
    expect(siparis.getSuggestedCompanyOrderOfflineStatus).toHaveBeenCalledWith(requestId);
  });
});
