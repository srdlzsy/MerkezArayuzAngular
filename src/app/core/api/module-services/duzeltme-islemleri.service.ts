import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CustomerCardDetailDto,
  CustomerCardListItemDto,
  CustomerCardPatchHttpRequest,
  CustomerCardSearchHttpRequest,
  CustomerCardUpdateResponse,
  CustomerMovementDocumentDto,
  CustomerMovementDocumentLookupHttpRequest,
  CustomerMovementDocumentUpdateResponse,
  MikroDocumentDeleteResponse,
  StockCardDetailDto,
  StockCardListItemDto,
  StockCardPatchHttpRequest,
  StockCardSearchHttpRequest,
  StockCardUpdateResponse,
  StockCardWarehousePatchHttpRequest,
  StockCardWarehouseSettingsDto,
  StockCardWarehouseUpdateResponse,
  StockSalesPriceDto,
  StockSalesPriceDeleteHttpRequest,
  StockSalesPriceUpsertHttpRequest,
  StockSalesPriceUpsertResponse,
  StockMovementDocumentDto,
  StockMovementDocumentLookupHttpRequest,
  StockMovementDocumentUpdateResponse,
  UpdateCustomerMovementDocumentHttpRequest,
  UpdateStockMovementDocumentHttpRequest,
  WarehouseCardDetailDto,
  WarehouseCardListItemDto,
  WarehouseCardPatchHttpRequest,
  WarehouseCardSearchHttpRequest,
  WarehouseCardUpdateResponse
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

const ROOT = 'duzeltme-islemleri/mikro-evrak-duzenleme';

@Injectable({
  providedIn: 'root'
})
export class DuzeltmeIslemleriService extends BaseApiService {
  searchStockCards(query: StockCardSearchHttpRequest): Observable<StockCardListItemDto[]> {
    return this.getWithQuery<StockCardListItemDto[]>(`${ROOT}/stok-kartlari`, query);
  }

  getStockCard(stockCode: string): Observable<StockCardDetailDto> {
    return this.get<StockCardDetailDto>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}`
    );
  }

  updateStockCard(
    stockCode: string,
    request: StockCardPatchHttpRequest
  ): Observable<StockCardUpdateResponse> {
    return this.put<StockCardUpdateResponse, StockCardPatchHttpRequest>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}`,
      request
    );
  }

  searchWarehouseCards(
    query: WarehouseCardSearchHttpRequest
  ): Observable<WarehouseCardListItemDto[]> {
    return this.getWithQuery<WarehouseCardListItemDto[]>(`${ROOT}/depolar`, query);
  }

  getWarehouseCard(warehouseNo: number): Observable<WarehouseCardDetailDto> {
    return this.get<WarehouseCardDetailDto>(`${ROOT}/depolar/${warehouseNo}`);
  }

  updateWarehouseCard(
    warehouseNo: number,
    request: WarehouseCardPatchHttpRequest
  ): Observable<WarehouseCardUpdateResponse> {
    return this.put<WarehouseCardUpdateResponse, WarehouseCardPatchHttpRequest>(
      `${ROOT}/depolar/${warehouseNo}`,
      request
    );
  }

  searchCustomerCards(
    query: CustomerCardSearchHttpRequest
  ): Observable<CustomerCardListItemDto[]> {
    return this.getWithQuery<CustomerCardListItemDto[]>(`${ROOT}/cariler`, query);
  }

  getCustomerCard(customerCode: string): Observable<CustomerCardDetailDto> {
    return this.get<CustomerCardDetailDto>(
      `${ROOT}/cariler/${encodeURIComponent(customerCode)}`
    );
  }

  updateCustomerCard(
    customerCode: string,
    request: CustomerCardPatchHttpRequest
  ): Observable<CustomerCardUpdateResponse> {
    return this.put<CustomerCardUpdateResponse, CustomerCardPatchHttpRequest>(
      `${ROOT}/cariler/${encodeURIComponent(customerCode)}`,
      request
    );
  }

  getStockCardWarehouseSettings(
    stockCode: string,
    warehouseNo?: number | null
  ): Observable<StockCardWarehouseSettingsDto[]> {
    return this.getWithQuery<StockCardWarehouseSettingsDto[]>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/depolar`,
      { warehouseNo: warehouseNo ?? undefined }
    );
  }

  updateStockCardWarehouseSettings(
    stockCode: string,
    warehouseNo: number,
    request: StockCardWarehousePatchHttpRequest
  ): Observable<StockCardWarehouseUpdateResponse> {
    return this.put<StockCardWarehouseUpdateResponse, StockCardWarehousePatchHttpRequest>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/depolar/${warehouseNo}`,
      request
    );
  }

  deleteStockCardWarehouseSettings(
    stockCode: string,
    warehouseNo: number
  ): Observable<MikroDocumentDeleteResponse> {
    return this.delete<MikroDocumentDeleteResponse>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/depolar/${warehouseNo}`
    );
  }

  getStockSalesPrices(
    stockCode: string,
    warehouseNo?: number | null
  ): Observable<StockSalesPriceDto[]> {
    return this.getWithQuery<StockSalesPriceDto[]>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/satis-fiyatlari`,
      { warehouseNo: warehouseNo ?? undefined }
    );
  }

  upsertStockSalesPrice(
    stockCode: string,
    warehouseNo: number,
    request: StockSalesPriceUpsertHttpRequest
  ): Observable<StockSalesPriceUpsertResponse> {
    return this.put<StockSalesPriceUpsertResponse, StockSalesPriceUpsertHttpRequest>(
      `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/satis-fiyatlari/${warehouseNo}`,
      request
    );
  }

  deleteStockSalesPrice(
    stockCode: string,
    warehouseNo: number,
    request: StockSalesPriceDeleteHttpRequest
  ): Observable<MikroDocumentDeleteResponse> {
    return this.http.delete<MikroDocumentDeleteResponse>(
      this.buildUrl(
        `${ROOT}/stok-kartlari/${encodeURIComponent(stockCode)}/satis-fiyatlari/${warehouseNo}`
      ),
      {
        params: this.buildParams(request)
      }
    );
  }

  getStockMovementDocument(
    query: StockMovementDocumentLookupHttpRequest
  ): Observable<StockMovementDocumentDto> {
    return this.getWithQuery<StockMovementDocumentDto>(`${ROOT}/stok-hareketleri`, query);
  }

  updateStockMovementDocument(
    request: UpdateStockMovementDocumentHttpRequest
  ): Observable<StockMovementDocumentUpdateResponse> {
    return this.put<
      StockMovementDocumentUpdateResponse,
      UpdateStockMovementDocumentHttpRequest
    >(`${ROOT}/stok-hareketleri`, request);
  }

  deleteStockMovementDocument(
    query: StockMovementDocumentLookupHttpRequest
  ): Observable<MikroDocumentDeleteResponse> {
    return this.http.delete<MikroDocumentDeleteResponse>(
      this.buildUrl(`${ROOT}/stok-hareketleri`),
      {
        params: this.buildParams(query)
      }
    );
  }

  getCustomerMovementDocument(
    query: CustomerMovementDocumentLookupHttpRequest
  ): Observable<CustomerMovementDocumentDto> {
    return this.getWithQuery<CustomerMovementDocumentDto>(`${ROOT}/cari-hareketleri`, query);
  }

  updateCustomerMovementDocument(
    request: UpdateCustomerMovementDocumentHttpRequest
  ): Observable<CustomerMovementDocumentUpdateResponse> {
    return this.put<
      CustomerMovementDocumentUpdateResponse,
      UpdateCustomerMovementDocumentHttpRequest
    >(`${ROOT}/cari-hareketleri`, request);
  }

  deleteCustomerMovementDocument(
    query: CustomerMovementDocumentLookupHttpRequest
  ): Observable<MikroDocumentDeleteResponse> {
    return this.http.delete<MikroDocumentDeleteResponse>(
      this.buildUrl(`${ROOT}/cari-hareketleri`),
      {
        params: this.buildParams(query)
      }
    );
  }
}
