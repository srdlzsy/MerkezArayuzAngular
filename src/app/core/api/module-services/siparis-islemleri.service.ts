import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  CompanyOrderDetailDto,
  CompanyOrderListItemDto,
  ConvertSuggestedCompanyOrderHttpRequest,
  ConvertSuggestedWarehouseOrderHttpRequest,
  CreateIssuedCompanyOrderHttpRequest,
  CreateIssuedCompanyOrderLineHttpRequest,
  CreateIssuedCompanyOrderResponse,
  CreateIssuedWarehouseOrderHttpRequest,
  CreateIssuedWarehouseOrderLineHttpRequest,
  CreateIssuedWarehouseOrderResponse,
  IssuedCompanyOrderListHttpRequest,
  SuggestedCompanyOrderListHttpRequest,
  SuggestedCompanyOrderListItemDto,
  SuggestedWarehouseOrderListHttpRequest,
  SuggestedWarehouseOrderListItemDto,
  WarehouseOrderDetailDto,
  WarehouseOrderListItemDto,
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

  listSuggestedWarehouseOrders(
    request: SuggestedWarehouseOrderListHttpRequest
  ): Observable<SuggestedWarehouseOrderListItemDto[]> {
    return this.getWithQuery<SuggestedWarehouseOrderListItemDto[]>(
      'siparis-islemleri/onerilen-depo-siparisleri',
      {
        SourceWarehouseNo: request.sourceWarehouseNo,
        TargetWarehouseNo: request.targetWarehouseNo,
        LookbackDays: request.lookbackDays,
        FallbackRecommendedDay: request.fallbackRecommendedDay
      }
    );
  }

  convertSuggestedWarehouseOrder(
    request: ConvertSuggestedWarehouseOrderHttpRequest
  ): Observable<CreateIssuedWarehouseOrderResponse> {
    return this.post<CreateIssuedWarehouseOrderResponse, ConvertSuggestedWarehouseOrderHttpRequest>(
      'siparis-islemleri/onerilen-depo-siparisleri/convert-to-order',
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

  listSuggestedCompanyOrders(
    request: SuggestedCompanyOrderListHttpRequest
  ): Observable<SuggestedCompanyOrderListItemDto[]> {
    const supplierCode = request.supplierCode.trim();

    return this.getWithQuery<SuggestedCompanyOrderListItemDto[]>(
      'siparis-islemleri/onerilen-firma-siparisleri',
      {
        WarehouseNo: request.warehouseNo,
        SupplierCode: supplierCode,
        LookbackDays: request.lookbackDays,
        FallbackRecommendedDay: request.fallbackRecommendedDay
      }
    );
  }

  convertSuggestedCompanyOrder(
    request: ConvertSuggestedCompanyOrderHttpRequest
  ): Observable<CreateIssuedCompanyOrderResponse> {
    return this.post<CreateIssuedCompanyOrderResponse, ConvertSuggestedCompanyOrderHttpRequest>(
      'siparis-islemleri/onerilen-firma-siparisleri/convert-to-order',
      request
    );
  }

  getVerilenDepoSiparisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<WarehouseOrderListItemDto[]>;
  getVerilenDepoSiparisleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<WarehouseOrderListItemDto[]>;
  getVerilenDepoSiparisleri(
    arg1: number | string,
    arg2?: string | number,
    arg3?: string
  ): Observable<WarehouseOrderListItemDto[]> {
    const request = this.resolveRangeRequest(arg1, arg2, arg3);
    return this.listIssuedWarehouseOrders(request);
  }

  getAlinanDepoSiparisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<WarehouseOrderListItemDto[]>;
  getAlinanDepoSiparisleri(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<WarehouseOrderListItemDto[]>;
  getAlinanDepoSiparisleri(
    arg1: number | string,
    arg2?: string | number,
    arg3?: string
  ): Observable<WarehouseOrderListItemDto[]> {
    const request = this.resolveRangeRequest(arg1, arg2, arg3);
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

  getVerilenSiparisler(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<CompanyOrderListItemDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listIssuedCompanyOrders({
      warehouseNo,
      startDate: range.startDate,
      endDate: range.endDate
    });
  }

  getAlinanSiparisler(
    zamanlama: string,
    warehouseNo?: number
  ): Observable<CompanyOrderListItemDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();
    return this.listReceivedCompanyOrders({
      warehouseNo,
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
    customerCode: string,
    warehouseNo?: number
  ): Observable<CreateIssuedCompanyOrderLineHttpRequest[]> {
    return this.listSuggestedCompanyOrders({ supplierCode: customerCode, warehouseNo }).pipe(
      map((items: SuggestedCompanyOrderListItemDto[]) =>
        (items ?? []).map((item: SuggestedCompanyOrderListItemDto) => ({
          stockCode: item.stockCode,
          quantity: item.suggestedOrderQuantity,
          recommendedQuantity: item.suggestedOrderQuantity,
          unitPrice: item.purchasePrice,
          unitPointer: 1,
          description1: '',
          description2: '',
          packageCode: '',
          projectCode: '',
          customerResponsibilityCenter: '',
          productResponsibilityCenter: ''
        }))
      )
    );
  }

  getDepoIcinOnerilenSiparisKalemleri(
    warehouseNo: number,
    targetWarehouseNo?: number
  ): Observable<CreateIssuedWarehouseOrderLineHttpRequest[]> {
    return this.listSuggestedWarehouseOrders({ sourceWarehouseNo: warehouseNo, targetWarehouseNo }).pipe(
      map((items: SuggestedWarehouseOrderListItemDto[]) =>
        (items ?? []).map((item: SuggestedWarehouseOrderListItemDto) => ({
          stockCode: item.stockCode,
          quantity: item.suggestedOrderQuantity,
          recommendedQuantity: item.suggestedOrderQuantity,
          unitPrice: 0,
          unitPointer: 1,
          description: '',
          packageCode: '',
          projectCode: '',
          responsibilityCenter: ''
        }))
      )
    );
  }

  private resolveRangeRequest(
    arg1: number | string,
    arg2?: string | number,
    arg3?: string
  ): WarehouseOrderDateRangeHttpRequest {
    if (typeof arg1 === 'string') {
      const range = parseDateRangeToken(arg1) ?? getDefaultDateRange();
      return {
        warehouseNo: typeof arg2 === 'number' ? arg2 : undefined,
        startDate: range.startDate,
        endDate: range.endDate
      };
    }

    return {
      warehouseNo: arg1,
      startDate: String(arg2 ?? ''),
      endDate: String(arg3 ?? '')
    };
  }
}
