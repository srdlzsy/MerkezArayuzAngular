import { Injectable, inject } from '@angular/core';
import type {
  ConvertSuggestedCompanyOrderHttpRequest,
  ConvertSuggestedWarehouseOrderHttpRequest,
  CreateIssuedCompanyOrderHttpRequest,
  CreateIssuedWarehouseOrderHttpRequest,
  IOfflineOperationResponseApiDto,
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaCreateCompanyShipmentRequestApiDto,
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaCreateStockReceiptRequestApiDto,
  IFurpaCreateVirmanRequestApiDto,
  IFurpaCreateWarehouseReturnRequestApiDto,
  IFurpaCreateWarehouseShippingRequestApiDto,
} from '@interfaces';
import type { Observable } from 'rxjs';

import { IadeIslemleriService } from '../../../core/api/module-services/iade-islemleri.service';
import { MalKabulIslemleriService } from '../../../core/api/module-services/mal-kabul-islemleri.service';
import { SevkIslemleriService } from '../../../core/api/module-services/sevk-islemleri.service';
import { SiparisIslemleriService } from '../../../core/api/module-services/siparis-islemleri.service';
import { StokIslemleriService } from '../../../core/api/module-services/stok-islemleri.service';
import type { ClientRequestPayload } from './safe-create-retry.helpers';

const OPERATION_BY_PAGE_ID: Readonly<Record<string, string>> = {
  'giden-firma-sevkleri': 'company-shipment.create',
  'giden-depolar-arasi-sevkler': 'inter-warehouse-shipment.create',
  'gelen-depolar-arasi-sevkler': 'inter-warehouse-shipment.create',
  'firma-mal-kabulleri': 'company-receiving.create',
  'firma-iadeleri': 'company-return.create',
  'giden-depo-iadeleri': 'warehouse-return.create',
  'sayim-sonuclari': 'inventory-count.create',
  virmanlar: 'stock-transfer.create',
  'masraf-fisleri': 'expense-receipt.create',
  'zayiat-fisleri': 'wastage-receipt.create',
  'verilen-depo-siparisleri': 'siparis-islemleri.verilen-depo-siparisleri.create',
  'onerilen-depo-siparisleri': 'siparis-islemleri.onerilen-depo-siparisleri.create',
  'verilen-firma-siparisleri': 'siparis-islemleri.verilen-firma-siparisleri.create',
  'onerilen-firma-siparisleri': 'siparis-islemleri.onerilen-firma-siparisleri.create',
};

@Injectable({ providedIn: 'root' })
export class SafeCreateRecoveryService {
  private readonly sevkIslemleriService = inject(SevkIslemleriService);
  private readonly iadeIslemleriService = inject(IadeIslemleriService);
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);
  private readonly stokIslemleriService = inject(StokIslemleriService);
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  getOperationCode(pageId: string): string | null {
    return OPERATION_BY_PAGE_ID[pageId] ?? null;
  }

  getStatus(
    pageId: string,
    clientRequestId: string,
  ): Observable<IOfflineOperationResponseApiDto<unknown>> | null {
    switch (pageId) {
      case 'giden-firma-sevkleri':
        return this.sevkIslemleriService.getGidenFirmaSevkOfflineStatus(clientRequestId);
      case 'giden-depolar-arasi-sevkler':
      case 'gelen-depolar-arasi-sevkler':
        return this.sevkIslemleriService.getDepolarArasiSevkOfflineStatus(clientRequestId);
      case 'firma-mal-kabulleri':
        return this.malKabulIslemleriService.getCompanyReceiptOfflineStatus(clientRequestId);
      case 'firma-iadeleri':
        return this.iadeIslemleriService.getFirmaIadeOfflineStatus(clientRequestId);
      case 'giden-depo-iadeleri':
        return this.iadeIslemleriService.getDepoIadeOfflineStatus(clientRequestId);
      case 'sayim-sonuclari':
        return this.stokIslemleriService.getSayimSonucuOfflineStatus(clientRequestId);
      case 'virmanlar':
        return this.stokIslemleriService.getVirmanOfflineStatus(clientRequestId);
      case 'masraf-fisleri':
        return this.stokIslemleriService.getMasrafFisiOfflineStatus(clientRequestId);
      case 'zayiat-fisleri':
        return this.stokIslemleriService.getZayiatFisiOfflineStatus(clientRequestId);
      case 'verilen-depo-siparisleri':
        return this.siparisIslemleriService.getIssuedWarehouseOrderOfflineStatus(clientRequestId);
      case 'onerilen-depo-siparisleri':
        return this.siparisIslemleriService.getSuggestedWarehouseOrderOfflineStatus(
          clientRequestId,
        );
      case 'verilen-firma-siparisleri':
        return this.siparisIslemleriService.getIssuedCompanyOrderOfflineStatus(clientRequestId);
      case 'onerilen-firma-siparisleri':
        return this.siparisIslemleriService.getSuggestedCompanyOrderOfflineStatus(clientRequestId);
      default:
        return null;
    }
  }

  recover(pageId: string, request: ClientRequestPayload): Observable<unknown> | null {
    switch (pageId) {
      case 'giden-firma-sevkleri':
        return this.sevkIslemleriService.createToptanCikisIrsaliyesi(
          request as IFurpaCreateCompanyShipmentRequestApiDto,
        );
      case 'giden-depolar-arasi-sevkler':
        return this.sevkIslemleriService.createDepolarArasiNakliyeSevkFisi(
          request as IFurpaCreateWarehouseShippingRequestApiDto,
        );
      case 'gelen-depolar-arasi-sevkler':
        return this.sevkIslemleriService.createDepoDagitimSevkFisi(
          request as IFurpaCreateWarehouseShippingRequestApiDto,
        );
      case 'firma-mal-kabulleri':
        return this.malKabulIslemleriService.createToptanGirisIrsaliyesi(
          request as IFurpaCreateCompanyReceiptRequestApiDto,
        );
      case 'firma-iadeleri':
        return this.iadeIslemleriService.createFirmaIade(
          request as IFurpaCreateCompanyShipmentRequestApiDto,
        );
      case 'giden-depo-iadeleri':
        return this.iadeIslemleriService.createDepoIade(
          request as IFurpaCreateWarehouseReturnRequestApiDto,
        );
      case 'sayim-sonuclari':
        return this.stokIslemleriService.createSayimSonucu(
          request as IFurpaCreateInventoryCountRequestApiDto,
        );
      case 'virmanlar':
        return this.stokIslemleriService.createVirman(
          'StokVirmanCikisFisleri',
          request as IFurpaCreateVirmanRequestApiDto,
        );
      case 'masraf-fisleri':
        return this.stokIslemleriService.createSubeIci(
          'SarfDepoCikisFisleri',
          request as IFurpaCreateStockReceiptRequestApiDto,
        );
      case 'zayiat-fisleri':
        return this.stokIslemleriService.createSubeIci(
          'FireDepoCikisFisleri',
          request as IFurpaCreateStockReceiptRequestApiDto,
        );
      case 'verilen-depo-siparisleri':
        return this.siparisIslemleriService.createIssuedWarehouseOrder(
          request as CreateIssuedWarehouseOrderHttpRequest,
        );
      case 'onerilen-depo-siparisleri':
        return this.siparisIslemleriService.convertSuggestedWarehouseOrder(
          request as ConvertSuggestedWarehouseOrderHttpRequest,
        );
      case 'verilen-firma-siparisleri':
        return this.siparisIslemleriService.createIssuedCompanyOrder(
          request as CreateIssuedCompanyOrderHttpRequest,
        );
      case 'onerilen-firma-siparisleri':
        return this.siparisIslemleriService.convertSuggestedCompanyOrder(
          request as ConvertSuggestedCompanyOrderHttpRequest,
        );
      default:
        return null;
    }
  }
}
