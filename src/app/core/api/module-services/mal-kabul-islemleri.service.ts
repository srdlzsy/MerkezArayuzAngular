import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CompanyReceivingEDespatchPreviewDto,
  IFurpaAcceptWarehouseReceivingRequestApiDto,
  IFurpaAcceptWarehouseReceivingResponseApiDto,
  IFurpaCompanyMovementDetailApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaCreateCompanyReceiptResponseApiDto,
  IFurpaGoodsAcceptanceDifferenceApiDto,
  IFurpaGoodsAcceptanceDifferenceListQueryApiDto,
  IFurpaGoodsAcceptanceDifferenceScopeApiDto,
  IOfflineOperationResponseApiDto,
  IFurpaWarehouseReceiptListItemApiDto,
  IFurpaWarehouseReceiptDetailApiDto,
  WarehouseReceivingEDespatchPreviewDto,
  WarehouseOrderDateRangeHttpRequest
} from '@interfaces';

import {
  getDefaultDateRange,
  parseDateRangeToken
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class MalKabulIslemleriService extends BaseApiService {
  listCompanyReceipts(
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getWithQuery<IFurpaCompanyMovementListItemApiDto[]>(
      'mal-kabul-islemleri/firma-mal-kabulleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  getCompanyReceiptDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getWithQuery<IFurpaCompanyMovementDetailApiDto>(
      `mal-kabul-islemleri/firma-mal-kabulleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  createCompanyReceipt(
    request: IFurpaCreateCompanyReceiptRequestApiDto
  ): Observable<IFurpaCreateCompanyReceiptResponseApiDto> {
    return this.post<IFurpaCreateCompanyReceiptResponseApiDto, IFurpaCreateCompanyReceiptRequestApiDto>(
      'mal-kabul-islemleri/firma-mal-kabulleri',
      request
    );
  }

  getCompanyReceiptByEttn(
    ettn: string,
    warehouseNo?: number
  ): Observable<CompanyReceivingEDespatchPreviewDto> {
    return this.getWithQuery<CompanyReceivingEDespatchPreviewDto>(
      `mal-kabul-islemleri/firma-mal-kabulleri/e-irsaliye/ettn/${encodeURIComponent(ettn)}`,
      {
        warehouseNo
      }
    );
  }

  getCompanyReceiptOfflineStatus(
    clientRequestId: string
  ): Observable<IOfflineOperationResponseApiDto<IFurpaCreateCompanyReceiptResponseApiDto>> {
    return this.get<
      IOfflineOperationResponseApiDto<IFurpaCreateCompanyReceiptResponseApiDto>
    >(
      `mal-kabul-islemleri/firma-mal-kabulleri/offline-sync/${encodeURIComponent(clientRequestId)}`
    );
  }

  listWarehouseReceipts(
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaWarehouseReceiptListItemApiDto[]> {
    return this.getWithQuery<IFurpaWarehouseReceiptListItemApiDto[]>(
      'mal-kabul-islemleri/depo-mal-kabulleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  getWarehouseReceiptDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto> {
    return this.getWithQuery<IFurpaWarehouseReceiptDetailApiDto>(
      `mal-kabul-islemleri/depo-mal-kabulleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  getWarehouseReceiptByEttn(
    ettn: string,
    warehouseNo?: number
  ): Observable<WarehouseReceivingEDespatchPreviewDto> {
    return this.getWithQuery<WarehouseReceivingEDespatchPreviewDto>(
      `mal-kabul-islemleri/depo-mal-kabulleri/e-irsaliye/ettn/${encodeURIComponent(ettn)}`,
      {
        warehouseNo
      }
    );
  }

  acceptWarehouseReceipt(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaAcceptWarehouseReceivingRequestApiDto
  ): Observable<IFurpaAcceptWarehouseReceivingResponseApiDto> {
    return this.post<IFurpaAcceptWarehouseReceivingResponseApiDto, IFurpaAcceptWarehouseReceivingRequestApiDto>(
      `mal-kabul-islemleri/depo-mal-kabulleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/kabul`,
      request
    );
  }

  listGoodsAcceptanceDifferences(
    request: IFurpaGoodsAcceptanceDifferenceListQueryApiDto
  ): Observable<IFurpaGoodsAcceptanceDifferenceApiDto[]> {
    return this.getWithQuery<IFurpaGoodsAcceptanceDifferenceApiDto[]>(
      'mal-kabul-islemleri/mal-kabul-farklari',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate,
        scope: request.scope
      }
    );
  }

  getToptanGirisIrsaliyeleri(zamanlama: string): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listCompanyReceipts({ startDate: range.startDate, endDate: range.endDate })
  }

  getToptanGirisFaturalari(zamanlama: string): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanGirisIrsaliyeleri(zamanlama);
  }

  getPerakendeGirisFaturalari(zamanlama: string): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanGirisIrsaliyeleri(zamanlama);
  }

  getDepoDagitimMalKabulFisleri(
    zamanlama: string
  ): Observable<IFurpaWarehouseReceiptListItemApiDto[]> {
    return this.getDepolarArasiNakliyeMalKabulFisleri(zamanlama);
  }

  getDepolarArasiNakliyeMalKabulFisleri(
    zamanlama: string
  ): Observable<IFurpaWarehouseReceiptListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listWarehouseReceipts({ startDate: range.startDate, endDate: range.endDate });
  }

  getMalKabulFarklari(
    zamanlama: string,
    scope: IFurpaGoodsAcceptanceDifferenceScopeApiDto = 'accepted'
  ): Observable<IFurpaGoodsAcceptanceDifferenceApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();

    return this.listGoodsAcceptanceDifferences({
      startDate: range.startDate,
      endDate: range.endDate,
      scope
    });
  }

  getDepoDagitimMalKabulFisDetay(
    seri: string,
    sira: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto> {
    return this.getDepolarArasiNakliyeMalKabulFisDetay(seri, sira);
  }

  getDepolarArasiNakliyeMalKabulFisDetay(
    seri: string,
    sira: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto> {
    return this.getWarehouseReceiptDetail(seri, sira);
  }

  getDepolarArasiNakliyeMalKabulFisDetayApi(
    seri: string,
    sira: number
  ): Observable<IFurpaWarehouseReceiptDetailApiDto> {
    return this.getDepolarArasiNakliyeMalKabulFisDetay(seri, sira);
  }

  kabulEtDepoDagitimMalKabulFisi(
    seri: string,
    sira: number,
    request: IFurpaAcceptWarehouseReceivingRequestApiDto
  ): Observable<IFurpaAcceptWarehouseReceivingResponseApiDto> {
    return this.acceptWarehouseReceipt(seri, sira, request);
  }

  kabulEtDepolarArasiNakliyeMalKabulFisi(
    seri: string,
    sira: number,
    request: IFurpaAcceptWarehouseReceivingRequestApiDto
  ): Observable<IFurpaAcceptWarehouseReceivingResponseApiDto> {
    return this.acceptWarehouseReceipt(seri, sira, request);
  }

  getGiderPusulasiGirisFisleri(zamanlama: string): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanGirisIrsaliyeleri(zamanlama)
  }

  getGiderPusulasiGirisFisDetay(
    seri: string,
    sira: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getCompanyReceiptDetail(seri, sira);
  }

  getHaldenAlisGirisFaturalari(zamanlama: string): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanGirisIrsaliyeleri(zamanlama);
  }

  createToptanGirisIrsaliyesi(
    request: IFurpaCreateCompanyReceiptRequestApiDto
  ): Observable<IFurpaCreateCompanyReceiptResponseApiDto> {
    return this.createCompanyReceipt(request);
  }
}
