import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import type {
  CompanyOrderDetailDto,
  CompanyOrderListItemDto,
  CreateIssuedCompanyOrderHttpRequest,
  CreateIssuedCompanyOrderLineHttpRequest,
  CreateIssuedCompanyOrderResponse,
  CreateIssuedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderLineHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  IssuedCompanyOrderListHttpRequest,
  WarehouseOrderDetailDto,
  WarehouseOrderListItemDto,
  WarehouseOrderDateRangeHttpRequest
} from '@interfaces';

import {
  buildProblemError,
  getDefaultDateRange,
  parseDateRangeToken
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class SiparisIslemleriService extends BaseApiService {
  listIssuedWarehouseOrders(
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<WarehouseOrderListItemDto[]> {
    return this.getWithQuery<WarehouseOrderListItemDto[]>(
      'siparis-islemleri/verilen-depo-siparisleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  listReceivedWarehouseOrders(
    request: WarehouseOrderDateRangeHttpRequest
  ): Observable<WarehouseOrderListItemDto[]> {
    return this.getWithQuery<WarehouseOrderListItemDto[]>(
      'siparis-islemleri/alinan-depo-siparisleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate
      }
    );
  }

  getIssuedWarehouseOrderDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<WarehouseOrderDetailDto> {
    return this.getWithQuery<WarehouseOrderDetailDto>(
      `siparis-islemleri/verilen-depo-siparisleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  getReceivedWarehouseOrderDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<WarehouseOrderDetailDto> {
    return this.getWithQuery<WarehouseOrderDetailDto>(
      `siparis-islemleri/alinan-depo-siparisleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  getReceivedWarehouseOrderDetailByKey(
    documentKey: string
  ): Observable<WarehouseOrderDetailDto> {
    return this.get<WarehouseOrderDetailDto>(
      `siparis-islemleri/alinan-depo-siparisleri/key/${encodeURIComponent(documentKey)}`
    );
  }

  getIssuedWarehouseOrderDetailByKey(
    documentKey: string
  ): Observable<WarehouseOrderDetailDto> {
    return this.get<WarehouseOrderDetailDto>(
      `siparis-islemleri/verilen-depo-siparisleri/key/${encodeURIComponent(documentKey)}`
    );
  }

  createIssuedWarehouseOrder(
    request: CreateIssuedWarehouseOrderHttpRequest
  ): Observable<CreateIssuedWarehouseOrderResponse> {
    return this.post<CreateIssuedWarehouseOrderResponse, CreateIssuedWarehouseOrderHttpRequest>(
      'siparis-islemleri/verilen-depo-siparisleri',
      request
    );
  }

  createReceivedWarehouseOrder(
    request: CreateIssuedWarehouseOrderHttpRequest
  ): Observable<CreateIssuedWarehouseOrderResponse> {
    return this.post<CreateIssuedWarehouseOrderResponse, CreateIssuedWarehouseOrderHttpRequest>(
      'siparis-islemleri/alinan-depo-siparisleri',
      request
    );
  }

  listIssuedCompanyOrders(
    request: IssuedCompanyOrderListHttpRequest
  ): Observable<CompanyOrderListItemDto[]> {
    return this.getWithQuery<CompanyOrderListItemDto[]>(
      'siparis-islemleri/verilen-firma-siparisleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate,
        CustomerCode: request.customerCode,
        OnlyOpen: request.onlyOpen
      }
    );
  }

  listReceivedCompanyOrders(
    request: IssuedCompanyOrderListHttpRequest
  ): Observable<CompanyOrderListItemDto[]> {
    return this.getWithQuery<CompanyOrderListItemDto[]>(
      'siparis-islemleri/alinan-firma-siparisleri',
      {
        WarehouseNo: request.warehouseNo,
        StartDate: request.startDate,
        EndDate: request.endDate,
        CustomerCode: request.customerCode,
        OnlyOpen: request.onlyOpen
      }
    );
  }

  getIssuedCompanyOrderDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getWithQuery<CompanyOrderDetailDto>(
      `siparis-islemleri/verilen-firma-siparisleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  getReceivedCompanyOrderDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getWithQuery<CompanyOrderDetailDto>(
      `siparis-islemleri/alinan-firma-siparisleri/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      { warehouseNo }
    );
  }

  getReceivedCompanyOrderDetailByKey(documentKey: string): Observable<CompanyOrderDetailDto> {
    return this.get<CompanyOrderDetailDto>(
      `siparis-islemleri/alinan-firma-siparisleri/key/${encodeURIComponent(documentKey)}`
    );
  }

  getIssuedCompanyOrderDetailByKey(documentKey: string): Observable<CompanyOrderDetailDto> {
    return this.get<CompanyOrderDetailDto>(
      `siparis-islemleri/verilen-firma-siparisleri/key/${encodeURIComponent(documentKey)}`
    );
  }

  createIssuedCompanyOrder(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.post<CreateIssuedCompanyOrderResponse, CreateIssuedCompanyOrderHttpRequest>(
      'siparis-islemleri/verilen-firma-siparisleri',
      request
    );
  }

  createReceivedCompanyOrder(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.post<CreateIssuedCompanyOrderResponse, CreateIssuedCompanyOrderHttpRequest>(
      'siparis-islemleri/alinan-firma-siparisleri',
      request
    );
  }

  getVerilenDepoSiparisleri(
    ...args: [number, string, string] | [string]
  ): Observable<WarehouseOrderListItemDto[]> {
    const request = this.resolveRangeRequest(args);
    return this.listIssuedWarehouseOrders(request);
  }

  getAlinanDepoSiparisleri(
    ...args: [number, string, string] | [string]
  ): Observable<WarehouseOrderListItemDto[]> {
    const request = this.resolveRangeRequest(args);
    return this.listReceivedWarehouseOrders(request);
  }

  getVerilenDepoSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<WarehouseOrderDetailDto> {
    return this.getIssuedWarehouseOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getAlinanDepoSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<WarehouseOrderDetailDto> {
    return this.getReceivedWarehouseOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getAlinanDepoSiparisDetayByKey(documentKey: string): Observable<WarehouseOrderDetailDto> {
    return this.getReceivedWarehouseOrderDetailByKey(documentKey);
  }

  getVerilenDepoSiparisDetayByKey(documentKey: string): Observable<WarehouseOrderDetailDto> {
    return this.getIssuedWarehouseOrderDetailByKey(documentKey);
  }

  createVerilenDepoSiparis(
    request: CreateIssuedWarehouseOrderHttpRequest
  ): Observable<CreateIssuedWarehouseOrderResponse> {
    return this.createIssuedWarehouseOrder(request);
  }

  createAlinanDepoSiparis(
    request: CreateIssuedWarehouseOrderHttpRequest
  ): Observable<CreateIssuedWarehouseOrderResponse> {
    return this.createReceivedWarehouseOrder(request);
  }

  getVerilenSiparisler(zamanlama: string): Observable<CompanyOrderListItemDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listIssuedCompanyOrders({
      startDate: range.startDate,
      endDate: range.endDate
    });
  }

  getAlinanSiparisler(zamanlama: string): Observable<CompanyOrderListItemDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listReceivedCompanyOrders({
      startDate: range.startDate,
      endDate: range.endDate
    });
  }

  getVerilenSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getIssuedCompanyOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getAlinanSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getReceivedCompanyOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getVerilenFirmaSiparisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string,
    onlyOpen?: boolean,
    customerCode?: string
  ): Observable<CompanyOrderListItemDto[]> {
    return this.listIssuedCompanyOrders({
      warehouseNo,
      startDate,
      endDate,
      onlyOpen,
      customerCode
    });
  }

  getAlinanFirmaSiparisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string,
    onlyOpen?: boolean,
    customerCode?: string
  ): Observable<CompanyOrderListItemDto[]> {
    return this.listReceivedCompanyOrders({
      warehouseNo,
      startDate,
      endDate,
      onlyOpen,
      customerCode
    });
  }

  getVerilenFirmaSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getIssuedCompanyOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getAlinanFirmaSiparisDetay(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<CompanyOrderDetailDto> {
    return this.getReceivedCompanyOrderDetail(documentSerie, documentOrderNo, warehouseNo);
  }

  getAlinanFirmaSiparisDetayByKey(documentKey: string): Observable<CompanyOrderDetailDto> {
    return this.getReceivedCompanyOrderDetailByKey(documentKey);
  }

  getVerilenFirmaSiparisDetayByKey(documentKey: string): Observable<CompanyOrderDetailDto> {
    return this.getIssuedCompanyOrderDetailByKey(documentKey);
  }

  createVerilenFirmaSiparis(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.createIssuedCompanyOrder(request);
  }

  createAlinanFirmaSiparis(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.createReceivedCompanyOrder(request);
  }

  createVerilenSiparis(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.createIssuedCompanyOrder(request);
  }

  createAlinanSiparis(
    request: CreateIssuedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.createReceivedCompanyOrder(request);
  }

  getFirmaIcinOnerilenSiparisKalemleri(
    _customerCode: string
  ): Observable<CreateIssuedCompanyOrderLineHttpRequest[]> {
    return throwError(() =>
      buildProblemError(
        'Dokumanda verilen firma siparisi olusturma icin onerilen kalem endpointi tanimli degil.'
      )
    );
  }

  getDepoIcinOnerilenSiparisKalemleri(
    _warehouseNo: number
  ): Observable<CreateIssuedWarehouseOrderLineHttpRequest[]> {
    return throwError(() =>
      buildProblemError(
        'Dokumanda verilen depo siparisi olusturma icin onerilen kalem endpointi tanimli degil.'
      )
    );
  }

  private resolveRangeRequest(
    args: [number, string, string] | [string]
  ): WarehouseOrderDateRangeHttpRequest {
    if (args.length === 1) {
      const range = parseDateRangeToken(args[0]) ?? getDefaultDateRange();
      return {
        startDate: range.startDate,
        endDate: range.endDate
      };
    }

    return {
      warehouseNo: args[0],
      startDate: args[1],
      endDate: args[2]
    };
  }
}
