import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import {
  IFurpaCreateStockReceiptRequestApiDto,
  IFurpaCreateStockReceiptResponseApiDto,
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaCreateInventoryCountResponseApiDto,
  IFurpaCreateVirmanRequestApiDto,
  IFurpaCreateVirmanResponseApiDto,
  IFurpaInventoryCountDetailApiDto,
  IFurpaInventoryCountListItemApiDto,
  IOfflineOperationResponseApiDto,
  IFurpaStockReceiptDetailApiDto,
  IFurpaStockReceiptListItemApiDto,
  IFurpaVirmanDetailApiDto,
  IFurpaVirmanListItemApiDto,
  // Detail/line aliases
  IFurpaStockReceiptItemApiDto,
  IFurpaVirmanItemApiDto,
  // Yeni DTOs
  StockReceiptListItemDto,
  InventoryCountListItemDto,
  LabelDocumentListItemDto,
  VirmanListItemDto,
  CreateInventoryCountHttpRequest,
  CreateVirmanHttpRequest,
  StockAnomalyDetailDto,
  StockAnomalyListHttpRequest,
  StockAnomalyListResponse,
  StockAnomalyProductManagerLookupDto,
  StockAnomalyProductManagerLookupHttpRequest,
  StockAnomalyScanHttpRequest,
  StockAnomalyScanResponse,
  StockAnomalyStatusUpdateHttpRequest
} from '@interfaces';

import {
  buildProblemError,
  getDefaultDateRange,
  parseDateRangeToken,
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class StokIslemleriService extends BaseApiService {
  getSubeIciListe(
    controllerName: string,
    zamanlama: string
  ): Observable<IFurpaStockReceiptListItemApiDto[]> {
    const endpoint = this.resolveSubeIciEndpoint(controllerName);

    if (!endpoint) {
      return throwError(() =>
        buildProblemError(`${controllerName} icin dokumanda desteklenen stok endpointi bulunamadi.`)
      );
    }

    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();

    return this.getWithQuery<IFurpaStockReceiptListItemApiDto[]>(endpoint, {
      StartDate: range.startDate,
      EndDate: range.endDate
    });
  }

  getSubeIciDetay(
    controllerName: string,
    seri: string,
    sira: number
  ): Observable<IFurpaStockReceiptDetailApiDto> {
    const endpoint = this.resolveSubeIciEndpoint(controllerName);

    if (!endpoint) {
      return throwError(() =>
        buildProblemError(`${controllerName} icin dokumanda desteklenen stok detay endpointi bulunamadi.`)
      );
    }

    return this.get<IFurpaStockReceiptDetailApiDto>(`${endpoint}/${encodeURIComponent(seri)}/${sira}`);
  }

  createSubeIci(
    controllerName: string,
    request: IFurpaCreateStockReceiptRequestApiDto
  ): Observable<IFurpaCreateStockReceiptResponseApiDto> {
    const endpoint = this.resolveSubeIciEndpoint(controllerName);

    if (!endpoint) {
      return throwError(() =>
        buildProblemError(`${controllerName} icin create endpointi dokumanda desteklenmiyor.`)
      );
    }

    return this.post<IFurpaCreateStockReceiptResponseApiDto, IFurpaCreateStockReceiptRequestApiDto>(
      endpoint,
      request
    );
  }

  getVirmanListe(_controllerName: string, zamanlama: string): Observable<IFurpaVirmanListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();

    return this.getWithQuery<IFurpaVirmanListItemApiDto[]>('stok-islemleri/virmanlar', {
      StartDate: range.startDate,
      EndDate: range.endDate
    });
  }

  getVirmanDetay(
    _controllerName: string,
    seri: string,
    sira: number
  ): Observable<IFurpaVirmanDetailApiDto> {
    return this.get<IFurpaVirmanDetailApiDto>(`stok-islemleri/virmanlar/${encodeURIComponent(seri)}/${sira}`);
  }

  createVirman(
    _controllerName: string,
    request: IFurpaCreateVirmanRequestApiDto
  ): Observable<IFurpaCreateVirmanResponseApiDto> {
    return this.post<IFurpaCreateVirmanResponseApiDto, IFurpaCreateVirmanRequestApiDto>(
      'stok-islemleri/virmanlar',
      request
    );
  }

  getSayimSonuclari(zamanlama: string): Observable<IFurpaInventoryCountListItemApiDto[]> {
    const range = parseDateRangeToken(zamanlama) ?? getDefaultDateRange();

    return this.getWithQuery<IFurpaInventoryCountListItemApiDto[]>('stok-islemleri/sayim-sonuclari', {
      StartDate: range.startDate,
      EndDate: range.endDate
    });
  }

  getSayimSonucuDetay(evrakNo: number, tarih: string): Observable<IFurpaInventoryCountDetailApiDto> {
    return this.getWithQuery<IFurpaInventoryCountDetailApiDto>('stok-islemleri/sayim-sonuclari/' + evrakNo, {
      documentDate: tarih
    });
  }

  createSayimSonucu(
    request: IFurpaCreateInventoryCountRequestApiDto
  ): Observable<IFurpaCreateInventoryCountResponseApiDto> {
    return this.post<
      IFurpaCreateInventoryCountResponseApiDto,
      IFurpaCreateInventoryCountRequestApiDto
    >('stok-islemleri/sayim-sonuclari', request);
  }

  getSayimSonucuOfflineStatus(
    clientRequestId: string
  ): Observable<IOfflineOperationResponseApiDto<IFurpaCreateInventoryCountResponseApiDto>> {
    return this.get<
      IOfflineOperationResponseApiDto<IFurpaCreateInventoryCountResponseApiDto>
    >(`stok-islemleri/sayim-sonuclari/offline-sync/${encodeURIComponent(clientRequestId)}`);
  }

  getStokRaporlari<TResponse = unknown>(_queryPath = ''): Observable<TResponse> {
    return throwError(() => buildProblemError('Stok raporlari endpointi bu dokumanda tanimli degil.'));
  }

  private resolveSubeIciEndpoint(controllerName: string): string | null {
    switch (controllerName) {
      case 'FireDepoCikisFisleri':
        return 'stok-islemleri/zayiat-fisleri';
      case 'SarfDepoCikisFisleri':
        return 'stok-islemleri/masraf-fisleri';
      default:
        return null;
    }
  }

  // ========================================
  // Yeni API v1.0 metodları (FurpaMerkezApi)
  // ========================================

  /**
   * Zayiat Fişleri Listele
   * @param warehouseNo Depo numarası
   * @param startDate Başlangıç tarihi (ISO 8601)
   * @param endDate Bitiş tarihi (ISO 8601)
   */
  getZayiatFisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<StockReceiptListItemDto[]> {
    return this.getWithQuery<StockReceiptListItemDto[]>(
      'stok-islemleri/zayiat-fisleri',
      { WarehouseNo: warehouseNo, StartDate: startDate, EndDate: endDate }
    );
  }

  /**
   * Yeni Zayiat Fişi Oluştur
   * @param request Zayiat fişi oluşturma isteği
   */
  createZayiatFisi(
    request: any
  ): Observable<any> {
    return this.post('stok-islemleri/zayiat-fisleri', request);
  }

  /**
   * Sayım Sonuçları Listele
   * @param warehouseNo Depo numarası
   * @param startDate Başlangıç tarihi (ISO 8601)
   * @param endDate Bitiş tarihi (ISO 8601)
   */
  getSayimSonucları(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<InventoryCountListItemDto[]> {
    return this.getWithQuery<InventoryCountListItemDto[]>(
      'stok-islemleri/sayim-sonuclari',
      { WarehouseNo: warehouseNo, StartDate: startDate, EndDate: endDate }
    );
  }

  /**
   * Yeni Sayım Sonucu Oluştur
   * @param request Sayım sonucu oluşturma isteği
   */
  createSayimSonucuV2(
    request: CreateInventoryCountHttpRequest
  ): Observable<any> {
    return this.post('stok-islemleri/sayim-sonuclari', request);
  }

  /**
   * Etiket Belgeleri Listele
   * @param warehouseNo Depo numarası
   * @param take Gösterilecek sayı
   */
  getEtiketBelgeleri(
    warehouseNo: number,
    take: number = 10
  ): Observable<LabelDocumentListItemDto[]> {
    return this.getWithQuery<LabelDocumentListItemDto[]>(
      'kasa-islemleri/etiket-belgeleri',
      { warehouseNo, take: Math.min(take, 100) }
    );
  }

  /**
   * Virman Fişleri Listele
   * @param warehouseNo Depo numarası
   * @param startDate Başlangıç tarihi (ISO 8601)
   * @param endDate Bitiş tarihi (ISO 8601)
   */
  getVirmanFisleri(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ): Observable<VirmanListItemDto[]> {
    return this.getWithQuery<VirmanListItemDto[]>(
      'stok-islemleri/virmanlar',
      { WarehouseNo: warehouseNo, StartDate: startDate, EndDate: endDate }
    );
  }

  /**
   * Yeni Virman Fişi Oluştur
   * @param request Virman fişi oluşturma isteği
   */
  createVirmanFisi(
    request: CreateVirmanHttpRequest
  ): Observable<any> {
    return this.post('stok-islemleri/virmanlar', request);
  }

  getStockAnomalies(
    request: StockAnomalyListHttpRequest
  ): Observable<StockAnomalyListResponse> {
    return this.getWithQuery<StockAnomalyListResponse, StockAnomalyListHttpRequest>(
      'stok-islemleri/stok-anomali-merkezi',
      request
    );
  }

  getStockAnomalyProductManagers(
    request: StockAnomalyProductManagerLookupHttpRequest
  ): Observable<StockAnomalyProductManagerLookupDto[]> {
    return this.getWithQuery<
      StockAnomalyProductManagerLookupDto[],
      StockAnomalyProductManagerLookupHttpRequest
    >('stok-islemleri/stok-anomali-merkezi/satin-almacilar', request);
  }

  getStockAnomalyDetail(id: string): Observable<StockAnomalyDetailDto> {
    return this.get<StockAnomalyDetailDto>(
      `stok-islemleri/stok-anomali-merkezi/${encodeURIComponent(id)}`
    );
  }

  scanStockAnomalies(
    request: StockAnomalyScanHttpRequest
  ): Observable<StockAnomalyScanResponse> {
    return this.post<StockAnomalyScanResponse, StockAnomalyScanHttpRequest>(
      'stok-islemleri/stok-anomali-merkezi/tara',
      request
    );
  }

  updateStockAnomalyStatus(
    id: string,
    request: StockAnomalyStatusUpdateHttpRequest
  ): Observable<StockAnomalyDetailDto> {
    return this.post<StockAnomalyDetailDto, StockAnomalyStatusUpdateHttpRequest>(
      `stok-islemleri/stok-anomali-merkezi/${encodeURIComponent(id)}/durum`,
      request
    );
  }

}
