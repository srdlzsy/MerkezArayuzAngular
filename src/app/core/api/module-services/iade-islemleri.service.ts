import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  IFurpaCompanyMovementDetailApiDto,
  IFurpaCompanyMovementListItemApiDto,
  IFurpaCreateCompanyMovementRequestApiDto,
  IFurpaCreateCompanyMovementResponseApiDto,
  IFurpaCreateWarehouseReturnRequestApiDto,
  IFurpaCreateWarehouseReturnResponseApiDto,
  IFurpaSendEDespatchRequestApiDto,
  IFurpaSendEDespatchResponseApiDto,
  IFurpaWarehouseReturnDetailApiDto,
  IFurpaWarehouseReturnListItemApiDto,
  WarehouseOrderDateRangeHttpRequest
} from '@interfaces';

import {
  getDefaultDateRange,
  parseDateRangeToken
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

export type DepoIadeDirection = 'giden' | 'gelen';

@Injectable({
  providedIn: 'root'
})
export class IadeIslemleriService extends BaseApiService {
  listCompanyReturns(
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    return this.getWithQuery<IFurpaCompanyMovementListItemApiDto[]>(
      'iade-islemleri/firma-iadeleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  getCompanyReturnDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getWithQuery<IFurpaCompanyMovementDetailApiDto>(
      `iade-islemleri/firma-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  createCompanyReturn(
    request: IFurpaCreateCompanyMovementRequestApiDto
  ): Observable<IFurpaCreateCompanyMovementResponseApiDto> {
    return this.post<
      IFurpaCreateCompanyMovementResponseApiDto,
      IFurpaCreateCompanyMovementRequestApiDto
    >(
      'iade-islemleri/firma-iadeleri',
      request
    );
  }

  listWarehouseReturns(
    direction: DepoIadeDirection,
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<IFurpaWarehouseReturnListItemApiDto[]> {
    return this.getWithQuery<IFurpaWarehouseReturnListItemApiDto[]>(
      `iade-islemleri/depo-iadeleri/${direction}`,
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  getWarehouseReturnDetail(
    direction: DepoIadeDirection,
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseReturnDetailApiDto> {
    return this.getWithQuery<IFurpaWarehouseReturnDetailApiDto>(
      `iade-islemleri/depo-iadeleri/${direction}/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  createWarehouseReturn(
    request: IFurpaCreateWarehouseReturnRequestApiDto
  ): Observable<IFurpaCreateWarehouseReturnResponseApiDto> {
    return this.post<IFurpaCreateWarehouseReturnResponseApiDto, IFurpaCreateWarehouseReturnRequestApiDto>(
      'iade-islemleri/depo-iadeleri/giden',
      request
    );
  }

  getFirmaIadeleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<IFurpaCompanyMovementListItemApiDto[]>;
  getFirmaIadeleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementListItemApiDto[]>;
  getFirmaIadeleri(
    arg1: number | string,
    arg2?: string | number,
    arg3?: string
  ): Observable<IFurpaCompanyMovementListItemApiDto[]> {
    if (typeof arg1 === 'string') {
      const range = parseDateRangeToken(arg1) ?? getDefaultDateRange();
      return this.listCompanyReturns({
        warehouseNo: typeof arg2 === 'number' ? arg2 : undefined,
        startDate: range.startDate,
        endDate: range.endDate
      });
    }

    return this.listCompanyReturns({
      warehouseNo: arg1,
      startDate: String(arg2 ?? ''),
      endDate: String(arg3 ?? '')
    });
  }

  getFirmaIadeDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<IFurpaCompanyMovementDetailApiDto> {
    return this.getCompanyReturnDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  createFirmaIade(
    request: IFurpaCreateCompanyMovementRequestApiDto
  ): Observable<IFurpaCreateCompanyMovementResponseApiDto> {
    return this.createCompanyReturn(request);
  }

  getDepoIadeleri(
    zamanlama: string,
    direction?: DepoIadeDirection,
    warehouseNo?: number
  ): Observable<IFurpaWarehouseReturnListItemApiDto[]>;
  getDepoIadeleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<IFurpaWarehouseReturnListItemApiDto[]>;
  getDepoIadeleri(
    arg1: number | string,
    arg2?: string | DepoIadeDirection,
    arg3?: string | number,
    arg4?: number
  ): Observable<IFurpaWarehouseReturnListItemApiDto[]> {
    if (typeof arg1 === 'string') {
      const range = parseDateRangeToken(arg1) ?? getDefaultDateRange();
      const direction: DepoIadeDirection = arg2 === 'gelen' ? 'gelen' : 'giden';
      const warehouseNo = typeof arg3 === 'number' ? arg3 : arg4;

      return this.listWarehouseReturns(direction, {
        warehouseNo,
        startDate: range.startDate,
        endDate: range.endDate
      });
    }

    return this.listWarehouseReturns('giden', {
      warehouseNo: arg1,
      startDate: arg2 as string,
      endDate: arg3 as string
    });
  }

  getDepoIadeDetay(
    documentSerie: string,
    documentOrderNo: number,
    directionOrWarehouseNo?: DepoIadeDirection | number
  ): Observable<IFurpaWarehouseReturnDetailApiDto> {
    if (directionOrWarehouseNo === 'gelen' || directionOrWarehouseNo === 'giden') {
      return this.getWarehouseReturnDetail(directionOrWarehouseNo, documentSerie, documentOrderNo);
    }

    return this.getWarehouseReturnDetail('giden', documentSerie, documentOrderNo, directionOrWarehouseNo);
  }

  createDepoIade(
    request: IFurpaCreateWarehouseReturnRequestApiDto
  ): Observable<IFurpaCreateWarehouseReturnResponseApiDto> {
    return this.createWarehouseReturn(request);
  }

  sendEIade(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaSendEDespatchRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    return this.post<IFurpaSendEDespatchResponseApiDto, IFurpaSendEDespatchRequestApiDto>(
      this.withWarehouseQuery(
        `iade-islemleri/firma-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye`,
        warehouseNo
      ),
      request
    );
  }

  sendFirmaIadeEirsaliye(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaSendEDespatchRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    return this.sendEIade(documentSerie, documentOrderNo, request, warehouseNo);
  }

  sendDepoIadeEirsaliye(
    documentSerie: string,
    documentOrderNo: number,
    request: IFurpaSendEDespatchRequestApiDto,
    warehouseNo?: number
  ): Observable<IFurpaSendEDespatchResponseApiDto> {
    return this.post<IFurpaSendEDespatchResponseApiDto, IFurpaSendEDespatchRequestApiDto>(
      this.withWarehouseQuery(
        `iade-islemleri/depo-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye`,
        warehouseNo
      ),
      request
    );
  }

  getFirmaIadeEirsaliyePdf(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<Blob> {
    return warehouseNo === undefined
      ? this.getBlob(
          `iade-islemleri/firma-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`
        )
      : this.getBlobWithQuery(
          `iade-islemleri/firma-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`,
          { warehouseNo }
        );
  }

  getDepoIadeEirsaliyePdf(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<Blob> {
    return warehouseNo === undefined
      ? this.getBlob(
          `iade-islemleri/depo-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`
        )
      : this.getBlobWithQuery(
          `iade-islemleri/depo-iadeleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}/e-irsaliye/pdf`,
          { warehouseNo }
        );
  }
  private withWarehouseQuery(path: string, warehouseNo?: number): string {
    return warehouseNo === undefined ? path : `${path}?warehouseNo=${warehouseNo}`;
  }
}
