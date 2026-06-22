import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CustomerMovementDocumentDto,
  CustomerMovementDocumentLookupHttpRequest,
  CustomerMovementDocumentUpdateResponse,
  StockCardDetailDto,
  StockCardListItemDto,
  StockCardPatchHttpRequest,
  StockCardSearchHttpRequest,
  StockCardUpdateResponse,
  StockCardWarehousePatchHttpRequest,
  StockCardWarehouseSettingsDto,
  StockCardWarehouseUpdateResponse,
  StockMovementDocumentDto,
  StockMovementDocumentLookupHttpRequest,
  StockMovementDocumentUpdateResponse,
  UpdateCustomerMovementDocumentHttpRequest,
  UpdateStockMovementDocumentHttpRequest
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
}
