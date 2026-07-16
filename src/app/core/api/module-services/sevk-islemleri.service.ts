import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  IFurpaCompanyMovementDetailApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaCreateCompanyMovementRequestApiDto,
  IFurpaCreateCompanyMovementResponseApiDto,
  IFurpaCreateWarehouseShippingRequestApiDto,
  IFurpaCreateWarehouseShippingResponseApiDto,
  IFurpaSendEDespatchRequestApiDto,
  IFurpaSendEDespatchResponseApiDto,
  IFurpaWarehouseShippingDetailApiDto,
  IFurpaWarehouseShippingListItemApiDto,
  WarehouseOrderDateRangeHttpRequest,
  WarehouseShippingDetailDto,
  WarehouseShippingListItemDto
} from '@interfaces';

import {
  getDefaultDateRange,
  parseDateRangeToken,
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

type CompanyShippingDirection = 'giden' | 'gelen';
type WarehouseShippingDirection = 'giden' | 'gelen';

@Injectable({
  providedIn: 'root'
})
export class SevkIslemleriService extends BaseApiService {
  getGidenFirmaSevkleri(
    warehouseNo: number | undefined,
    startDate: string,
    endDate: string
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.listCompanyShipments('giden', { warehouseNo, startDate, endDate });
  }

  getGelenFirmaSevkleri(
    warehouseNo: number | undefined,
    startDate: string,
    endDate: string
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.listCompanyShipments('gelen', { warehouseNo, startDate, endDate });
  }

  getGidenFirmaSevkDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getCompanyShipmentDetail('giden', documentSerie, documentOrderNo, warehouseNo);
  }

  getGelenFirmaSevkDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getCompanyShipmentDetail('gelen', documentSerie, documentOrderNo, warehouseNo);
  }

  createGidenFirmaSevki(
    request: IFurpaCreateCompanyMovementRequestApiDto
  ): Observable<IFurpaCreateCompanyMovementResponseApiDto> {
    return this.post<IFurpaCreateCompanyMovementResponseApiDto, IFurpaCreateCompanyMovementRequestApiDto>(
      'sevk-islemleri/firma-sevkleri/giden',
      request
    );
  }

  getGidenDepolarArasiSevkler(
    warehouseNo: number | undefined,
    startDate: string,
    endDate: string
  ): Observable<IFurpaWarehouseShippingListItemApiDto[]> {
    return this.listWarehouseShipments('giden', { warehouseNo, startDate, endDate });
  }

  getGelenDepolarArasiSevkler(
    warehouseNo: number | undefined,
    startDate: string,
    endDate: string
  ): Observable<IFurpaWarehouseShippingListItemApiDto[]> {
    return this.listWarehouseShipments('gelen', { warehouseNo, startDate, endDate });
  }

  getGidenDepolarArasiSevkDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto> {
    return this.getWarehouseShipmentDetail('giden', documentSerie, documentOrderNo, warehouseNo);
  }

  getGelenDepolarArasiSevkDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto> {
    return this.getWarehouseShipmentDetail('gelen', documentSerie, documentOrderNo, warehouseNo);
  }

  createGidenDepolarArasiSevk(
    request: IFurpaCreateWarehouseShippingRequestApiDto
  ): Observable<IFurpaCreateWarehouseShippingResponseApiDto> {
    return this.post<
      IFurpaCreateWarehouseShippingResponseApiDto,
      IFurpaCreateWarehouseShippingRequestApiDto
    >(
      'sevk-islemleri/depolar-arasi-sevkler/giden',
      request
    );
  }

  sendGidenFirmaSevkEirsaliye(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaSendEDespatchRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    return this.post<IFurpaSendEDespatchResponseApiDto, IFurpaSendEDespatchRequestApiDto>(
      this.withWarehouseQuery(
        `sevk-islemleri/firma-sevkleri/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye`,
        warehouseNo
      ),
      request
    );
  }

  getGidenFirmaSevkEirsaliyePdf(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<Blob> {
    return warehouseNo === undefined
      ? this.getBlob(
          `sevk-islemleri/firma-sevkleri/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`
        )
      : this.getBlobWithQuery(
          `sevk-islemleri/firma-sevkleri/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`,
          { warehouseNo }
        );
  }

  sendGidenDepolarArasiSevkEirsaliye(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaSendEDespatchRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    return this.post<IFurpaSendEDespatchResponseApiDto, IFurpaSendEDespatchRequestApiDto>(
      this.withWarehouseQuery(
        `sevk-islemleri/depolar-arasi-sevkler/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye`,
        warehouseNo
      ),
      request
    );
  }

  getGidenDepolarArasiSevkEirsaliyePdf(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<Blob> {
    return warehouseNo === undefined
      ? this.getBlob(
          `sevk-islemleri/depolar-arasi-sevkler/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`
        )
      : this.getBlobWithQuery(
          `sevk-islemleri/depolar-arasi-sevkler/giden/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`,
          { warehouseNo }
        );
  }

  getToptanCikisIrsaliyeleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.getGidenFirmaSevkleri(warehouseNo, range.startDate, range.endDate);
  }

  getToptanCikisFaturalari(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.getGelenFirmaSevkleri(warehouseNo, range.startDate, range.endDate);
  }

  getPerakendeCikisIrsaliyeleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanCikisIrsaliyeleri(zamanlama, warehouseNo);
  }

  getPerakendeCikisFaturalari(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getToptanCikisFaturalari(zamanlama, warehouseNo);
  }

  getDepolarArasiNakliyeSevkFisleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.getGidenDepolarArasiSevkler(warehouseNo, range.startDate, range.endDate);
  }

  getDepoDagitimSevkFisleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.getGelenDepolarArasiSevkler(warehouseNo, range.startDate, range.endDate);
  }

  getDepolarArasiNakliyeSevkFisDetay(
    seri: string,
    sira: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto> {
    return this.getGidenDepolarArasiSevkDetay(seri, sira, warehouseNo);
  }

  getDepoDagitimSevkFisDetay(
    seri: string,
    sira: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto> {
    return this.getGelenDepolarArasiSevkDetay(seri, sira, warehouseNo);
  }

  getSevkDetay(
    controllerName: string,
    seri: string,
    sira: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    const direction = this.resolveCompanyDirection(controllerName);
    const request =
      direction === 'giden'
        ? this.getGidenFirmaSevkDetay(seri, sira, warehouseNo)
        : this.getGelenFirmaSevkDetay(seri, sira, warehouseNo);

    return request;
  }

  createToptanCikisIrsaliyesi(
    request: IFurpaCreateCompanyMovementRequestApiDto
  ): Observable<IFurpaCreateCompanyMovementResponseApiDto> {
    return this.createGidenFirmaSevki(request);
  }

  createDepolarArasiNakliyeSevkFisi(
    request: IFurpaCreateWarehouseShippingRequestApiDto
  ): Observable<IFurpaCreateWarehouseShippingResponseApiDto> {
    return this.createGidenDepolarArasiSevk(request);
  }

  createDepoDagitimSevkFisi(
    request: IFurpaCreateWarehouseShippingRequestApiDto
  ): Observable<IFurpaCreateWarehouseShippingResponseApiDto> {
    return this.createGidenDepolarArasiSevk(request);
  }

  private listCompanyShipments(
    direction: CompanyShippingDirection,
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    const query = {
      StartDate: request.startDate,
      EndDate: request.endDate,
      ...(this.hasValidWarehouseNo(request.warehouseNo)
        ? { WarehouseNo: request.warehouseNo }
        : {})
    };

    return this.getWithQuery<IFurpaCompanyMovementListItemApiDto[]>(
      `sevk-islemleri/firma-sevkleri/${direction}`,
      query
    );
  }

  private listWarehouseShipments(
    direction: WarehouseShippingDirection,
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaWarehouseShippingListItemApiDto[]> {
    const query = {
      StartDate: request.startDate,
      EndDate: request.endDate,
      ...(this.hasValidWarehouseNo(request.warehouseNo)
        ? { WarehouseNo: request.warehouseNo }
        : {})
    };

    return this.getWithQuery<IFurpaWarehouseShippingListItemApiDto[]>(
      `sevk-islemleri/depolar-arasi-sevkler/${direction}`,
      query
    );
  }

  private getCompanyShipmentDetail(
    direction: CompanyShippingDirection,
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getWithQuery<IFurpaCompanyMovementDetailApiDto>(
      `sevk-islemleri/firma-sevkleri/${direction}/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  private getWarehouseShipmentDetail(
    direction: WarehouseShippingDirection,
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseShippingDetailApiDto> {
    return this.getWithQuery<IFurpaWarehouseShippingDetailApiDto>(
      `sevk-islemleri/depolar-arasi-sevkler/${direction}/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  private resolveCompanyDirection(controllerName: string): CompanyShippingDirection {
    switch (controllerName) {
      case 'ToptanCikisFaturalari':
      case 'PerakendeCikisFaturalari':
        return 'gelen';
      default:
        return 'giden';
    }
  }

  private withWarehouseQuery(path: string, warehouseNo?: number): string {
    return warehouseNo === undefined ? path : `${path}?warehouseNo=${warehouseNo}`;
  }

  private hasValidWarehouseNo(warehouseNo?: number): warehouseNo is number {
    return warehouseNo !== undefined && Number.isFinite(warehouseNo) && warehouseNo > 0;
  }
}
