import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  BarcodeResolutionDto,
  CustomerLookupItemDto,
  IEtiketBasimProduct,
  IFurpaProductSearchItemApiDto,
  ProductCustomerSuggestionsDto,
  ProductLookupItemDto,
  ProductSearchHttpRequest,
  WarehouseLookupItemDto,
  WarehouseSearchHttpRequest
} from '@interfaces';

import {
  toBooleanValue,
  toStringValue
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

export interface CariBulResultDto {
  isFound: boolean;
  barcode: string;
  warehouseNo: number;
  resolutionSource: string;
  stockCode: string | null;
  stockName: string | null;
  matchedBarcode: string | null;
  primaryBarcode: string | null;
  caseBarcode: string | null;
  unitsPerCase: number | null;
  defaultSupplierCode: string | null;
  defaultSupplierName: string | null;
  suggestions: Array<{
    customerCode: string;
    customerName: string;
    taxNoOrTckn: string | null;
    isDefaultSupplier: boolean;
    movementCount: number;
    lastMovementDate: string | null;
    lastDocumentNo: string | null;
    sources: string[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AramaService extends BaseApiService {
  private buildProductSearchQuery(
    query: string
  ): Partial<Pick<ProductSearchHttpRequest, 'barcode' | 'stockCode' | 'stockName'>> {
    const normalizedQuery = query.trim();

    if (/^\d{8,}$/.test(normalizedQuery)) {
      return {
        barcode: normalizedQuery
      };
    }

    if (/^[0-9._-]{2,}$/.test(normalizedQuery)) {
      return {
        stockCode: normalizedQuery
      };
    }

    return {
      stockName: normalizedQuery
    };
  }

  private normalizeOptionalText(value?: string | null): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
  }


  /**
   * Ürün ara
   * @param warehouseNo Depo numarası
   * @param barcode Barkod
   * @param stockCode Ürün kodu
   * @param stockName Ürün adı
   * @param supplierCode Tedarikçi kodu
   * @param companyCode Firma kodu
   * @param take Gösterilecek sayı (varsayılan: 20)
   */
  searchProducts(
    warehouseNo?: number,
    barcode?: string,
    stockCode?: string,
    stockName?: string,
    supplierCode?: string,
    companyCode?: string,
    take: number = 20
  ): Observable<ProductLookupItemDto[]> {
    const normalizedBarcode = this.normalizeOptionalText(barcode);
    const normalizedStockCode = this.normalizeOptionalText(stockCode);
    const normalizedStockName = this.normalizeOptionalText(stockName);
    const normalizedSupplierCode = this.normalizeOptionalText(supplierCode);
    const normalizedCompanyCode = this.normalizeOptionalText(companyCode);

    if (
      !normalizedBarcode &&
      !normalizedStockCode &&
      !normalizedStockName &&
      !normalizedSupplierCode &&
      !normalizedCompanyCode
    ) {
      return of([]);
    }

    if (normalizedStockName && normalizedStockName.length < 2 && !normalizedBarcode && !normalizedStockCode) {
      return of([]);
    }

    const request: ProductSearchHttpRequest = {
      warehouseNo,
      barcode: normalizedBarcode,
      stockCode: normalizedStockCode,
      stockName: normalizedStockName,
      supplierCode: normalizedSupplierCode,
      companyCode: normalizedCompanyCode,
      take
    };

    return this.getWithQuery<ProductLookupItemDto[]>('arama-islemleri/urunler', {
      ...request,
      take: Math.min(take, 100)
    });
  }

  searchStock(query: string, take: number = 20): Observable<ProductLookupItemDto[]> {
    const filters = this.buildProductSearchQuery(query);
    return this.searchProducts(
      undefined,
      filters.barcode,
      filters.stockCode,
      filters.stockName,
      undefined,
      undefined,
      take
    );
  }

  searchPrices(
    query: string,
    warehouseNo?: number,
    take: number = 20
  ): Observable<ProductLookupItemDto[]> {
    const filters = this.buildProductSearchQuery(query);

    if (!filters.barcode && !filters.stockCode && !filters.stockName) {
      return of([]);
    }

    return this.getWithQuery<ProductLookupItemDto[]>('arama-islemleri/fiyat-gor', {
      warehouseNo,
      barcode: filters.barcode,
      stockCode: filters.stockCode,
      stockName: filters.stockName,
      take: Math.min(take, 100)
    });
  }

  getByFilterForLabel(query: string, take: number = 20): Observable<ProductLookupItemDto[]> {
    return this.searchStock(query, take);
  }

  /**
   * Cari/Müşteri ara
   * @param searchText Arama metni
   * @param take Gösterilecek sayı (varsayılan: 20)
   */
  searchCustomers(searchText: string, take: number = 20): Observable<CustomerLookupItemDto[]> {
    const normalizedSearchText = searchText.trim();

    if (normalizedSearchText.length < 2) {
      return of([]);
    }

    return this.getWithQuery<CustomerLookupItemDto[]>('arama-islemleri/cariler', {
      searchText: normalizedSearchText,
      take: Math.min(take, 100)
    });
  }

  searchCustomerAccount(searchText: string, take: number = 20): Observable<CustomerLookupItemDto[]> {
    return this.searchCustomers(searchText, take);
  }

  /**
   * Depo ara
   * @param searchText Arama metni
   * @param take Gösterilecek sayı (varsayılan: 50)
   */
  searchWarehouses(
    searchText?: string,
    take: number = 50,
    warehouseNo?: number
  ): Observable<WarehouseLookupItemDto[]> {
    const normalizedSearchText = this.normalizeOptionalText(searchText);

    if (normalizedSearchText && normalizedSearchText.length < 2 && warehouseNo === undefined) {
      return of([]);
    }

    const request: WarehouseSearchHttpRequest = {
      searchText: normalizedSearchText,
      warehouseNo,
      take: Math.min(take, 100)
    };

    return this.getWithQuery<WarehouseLookupItemDto[]>('arama-islemleri/depolar', request);
  }

  searchWarehouse(
    searchText?: string,
    take: number = 50,
    warehouseNo?: number
  ): Observable<WarehouseLookupItemDto[]> {
    return this.searchWarehouses(searchText, take, warehouseNo);
  }

  /**
   * Tüm depoları listele
   * @param take Gösterilecek sayı
   */
  listAllWarehouses(
    take: number = 100,
    warehouseNo?: number
  ): Observable<WarehouseLookupItemDto[]> {
    return this.searchWarehouses(undefined, take, warehouseNo);
  }

  listWarehouses(
    take: number = 100,
    warehouseNo?: number
  ): Observable<WarehouseLookupItemDto[]> {
    return this.listAllWarehouses(take, warehouseNo);
  }

  /**
   * Belirli müşteri için ürün ara
   * @param customerCode Müşteri kodu
   * @param searchText Arama metni
   * @param take Gösterilecek sayı
   */
  searchProductsByCustomer(
    customerCode: string,
    searchText: string,
    take: number = 20
  ): Observable<ProductLookupItemDto[]> {
    const filters = this.buildProductSearchQuery(searchText);

    return this.searchProducts(
      undefined,
      filters.barcode,
      filters.stockCode,
      filters.stockName,
      undefined,
      this.normalizeOptionalText(customerCode),
      take
    );
  }

  searchStockByCustomerCode(searchText: string, customerCode: string, take: number = 20): Observable<ProductLookupItemDto[]> {
    return this.searchProductsByCustomer(customerCode, searchText, take);
  }

  resolveBarcode(
    barcode: string,
    warehouseNo?: number,
    screenCode?: string
  ): Observable<BarcodeResolutionDto> {
    return this.getWithQuery<BarcodeResolutionDto>(
      `arama-islemleri/barkodlar/${encodeURIComponent(barcode.trim())}/cozumle`,
      {
        warehouseNo,
        screenCode: this.normalizeOptionalText(screenCode)
      }
    );
  }

  getProductCustomerSuggestions(stockCode: string, take: number = 10): Observable<ProductCustomerSuggestionsDto> {
    return this.getWithQuery<ProductCustomerSuggestionsDto>(
      `arama-islemleri/urunler/${encodeURIComponent(stockCode.trim())}/cari-onerileri`,
      {
        take: Math.min(Math.max(take, 1), 25)
      }
    );
  }

  /**
   * Barkoddan cari/firma bul
   * Barkodu stokla eslestirir, varsayilan tedarikciyi ve yakin gecmis stok hareketlerinden
   * cari onerilerini doner.
   * @param barcode Barkod (zorunlu)
   * @param warehouseNo Depo numarasi (opsiyonel)
   * @param take Gosterilecek sayi (varsayilan: 10, max: 25)
   */
  searchCustomerByBarcode(
    barcode: string,
    warehouseNo?: number,
    take: number = 10
  ): Observable<CariBulResultDto> {
    const normalizedBarcode = barcode.trim();

    if (!normalizedBarcode) {
      return of({
        isFound: false,
        barcode: '',
        warehouseNo: warehouseNo || 0,
        resolutionSource: 'not-found',
        stockCode: null,
        stockName: null,
        matchedBarcode: null,
        primaryBarcode: null,
        caseBarcode: null,
        unitsPerCase: null,
        defaultSupplierCode: null,
        defaultSupplierName: null,
        suggestions: []
      });
    }

    return this.getWithQuery<CariBulResultDto>(
      'arama-islemleri/cari-bul',
      {
        barcode: normalizedBarcode,
        warehouseNo,
        take: Math.min(Math.max(take, 1), 25)
      }
    );
  }
}
