import { Injectable } from '@angular/core';
import { Observable, map, of, throwError } from 'rxjs';

import {
  IBanknoteMovementsCT,
  ICashRegisterDetails,
  ICashier,
  IEtiketBasimProduct,
  IFurpaLabelDocumentListItemApiDto,
  IFurpaLabelDocumentProductApiDto,
  IFurpaLabelTagApiDto,
  IFurpaBanknoteMovementItemApiDto,
  IFurpaBanknoteTrackApiDto,
  IFurpaBanknoteTypeItemApiDto,
  IFurpaCashierLookupItemApiDto,
  IFurpaCashierSearchItemApiDto,
  IFurpaCashRegistryItemApiDto,
  IFurpaCashRegisterLookupItemApiDto,
  IFurpaCashSummaryDetailItemApiDto,
  IFurpaCashSummaryListItemApiDto,
  IFurpaCashSummaryReportItemApiDto,
  IFurpaCashTurnoverDetailApiDto,
  IFurpaCashTurnoverListItemApiDto,
  IFurpaCashTurnoverOverviewApiDto,
  IFurpaCreateBanknoteTrackRequestApiDto,
  IFurpaCreateBanknoteTrackResponseApiDto,
  IFurpaCreateCashSummaryRequestApiDto,
  IFurpaCreateCashSummaryResponseApiDto,
  IFurpaDeleteCashSummaryResponseApiDto,
  IFurpaGiftCheckMovementItemApiDto,
  IFurpaGiftCheckTypeItemApiDto,
  IFurpaOnlineCashRegisterDetailApiDto,
  IFurpaPaymentTypeLookupItemApiDto,
  IManavKunyeTag,
  IFurpaUpdateCashSummaryBanknotesRequestApiDto,
  IFurpaUpdateCashSummaryBanknotesResponseApiDto,
  IFurpaUpdateCashSummaryDetailsRequestApiDto,
  IFurpaUpdateCashSummaryDetailsResponseApiDto,
  IGiftCheckMovementsCT,
  ILabelDocument,
  IProductPromotion,
  ISummariesCT,
  ISummariesDetailsCT,
  IKunyeTag,
  KasaHareketBranchDto,
  KasaHareketCashRegisterDto,
  KasaHareketDeleteStagingHttpRequest,
  KasaHareketImportHttpRequest,
  KasaHareketImportResultDto,
  KasaHareketMikroTransferHttpRequest,
  KasaHareketMikroTransferRangeHttpRequest,
  KasaHareketProcedureResultDto,
  KasaHareketReportHttpRequest,
  KasaHareketReportRowDto,
  KasaHareketScheduledImportHttpRequest,
  KasaCiroBranchDto,
  KasaCiroImportHttpRequest,
  KasaCiroImportResultDto,
  // Yeni DTOs
  CashTurnoverDetailDto,
  CashTurnoverDetailHttpRequest,
  CashTurnoverListItemDto,
  CashTurnoverOverviewDto,
  CashTurnoverRouteSource,
  CashSummaryListItemDto,
  CashSummaryReportItemDto,
  CreateCashSummaryHttpRequest,
  CreateCashSummaryResponse,
  UpdateCashSummaryDetailsHttpRequest,
  UpdateCashSummaryDetailsResponse,
  UpdateCashSummaryBanknotesHttpRequest,
  UpdateCashSummaryBanknotesResponse,
  DeleteCashSummaryResponse,
  CashSummaryDateHttpRequest,
  WarehouseOrderDateRangeHttpRequest,
  YeniKasaAnalizHttpRequest,
  YeniKasaAnomalyItemDto,
  YeniKasaCiroOzetItemDto,
  YeniKasaFisMutabakatItemDto,
  YeniKasaKasaOzetItemDto,
  YeniKasaPaymentMethodItemDto
} from '@interfaces';

import {
  buildProblemError,
  formatDateTimeFilter,
  toBooleanValue,
  toNumberValue,
  toStringValue
} from '../furpa-merkez-api.utils';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class KasaIslemleriService extends BaseApiService {
  getUrunEtiketleri(zamanlama: string): Observable<IEtiketBasimProduct[]> {
    const dateTimeFilter = formatDateTimeFilter(zamanlama);

    if (!dateTimeFilter) {
      return of([]);
    }

    return this.getWithQuery<IFurpaLabelDocumentProductApiDto[]>('kasa-islemleri/etiket-belgeleri/fiyati-degisen-urunler', {
      dateTimeFilter
    });
  }

  getEtiketBelgesi(docId: number): Observable<IEtiketBasimProduct[]> {
    return this.get<IFurpaLabelDocumentProductApiDto[]>(`kasa-islemleri/etiket-belgeleri/${docId}`);
  }

  getEklenenSonOnEtiketBelgesi(warehouseNo: number): Observable<ILabelDocument[]> {
    return this.getWithQuery<IFurpaLabelDocumentListItemApiDto[]>('kasa-islemleri/etiket-belgeleri/son', {
      warehouseNo,
      take: 10
    });
  }

  getEtiketPromosyonlari(_pluNo: number): Observable<IProductPromotion[]> {
    return of([]);
  }

  getKunyeler(tarih: string): Observable<IKunyeTag[]> {
    return this.getWithQuery<IFurpaLabelTagApiDto[]>('kasa-islemleri/kunye-etiket-yazdirma', {
      dateToGet: tarih.slice(0, 10)
    });
  }

  getManavKunyeEtiketleri(
    warehouseNo: number,
    dateToGet?: string | null
  ): Observable<IManavKunyeTag[]> {
    return this.getWithQuery<IManavKunyeTag[]>(
      'kasa-islemleri/manav-kunye-etiket-yazdirma/detayli-etiketler',
      {
        warehouseNo,
        dateToGet: dateToGet?.slice(0, 10) || undefined
      }
    );
  }

  getIcmaller(dateToGet: string): Observable<ISummariesCT[]> {
    return this.getWithQuery<IFurpaCashSummaryListItemApiDto[]>('kasa-islemleri/kasa-sayimlari', {
      dateToGet
    }).pipe(
      map((items: IFurpaCashSummaryListItemApiDto[]) =>
        items.map((item: IFurpaCashSummaryListItemApiDto) => this.mapSummary(item))
      )
    );
  }

  getIcmalRaporu(dateToGet: string, warehouseNo?: number | null): Observable<IFurpaCashSummaryReportItemApiDto[]> {
    return this.getWithQuery<IFurpaCashSummaryReportItemApiDto[]>('kasa-islemleri/kasa-sayimlari/rapor', {
      dateToGet,
      warehouseNo: warehouseNo ?? undefined
    });
  }

  getIcmalDetaylari(
    documentSerie: string,
    documentOrderNo: number
  ): Observable<ISummariesDetailsCT[]> {
    return this.get<IFurpaCashSummaryDetailItemApiDto[]>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}/detaylar`
    ).pipe(
      map((items: IFurpaCashSummaryDetailItemApiDto[]) =>
        items.map((item: IFurpaCashSummaryDetailItemApiDto) => this.mapSummaryDetail(item))
      )
    );
  }

  getNakitHareketDetayi(
    documentSerie: string,
    documentOrderNo: number
  ): Observable<IBanknoteMovementsCT[]> {
    return this.get<IFurpaBanknoteMovementItemApiDto[]>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}/banknot-hareketleri`
    ).pipe(
      map((items: IFurpaBanknoteMovementItemApiDto[]) =>
        items.map((item: IFurpaBanknoteMovementItemApiDto) => this.mapBanknote(item))
      )
    );
  }

  getBanknotTakipleri(
    dateToGet: string,
    warehouseNo?: number | null
  ): Observable<IFurpaBanknoteTrackApiDto[]> {
    return this.getWithQuery<IFurpaBanknoteTrackApiDto[]>(
      'kasa-islemleri/banknot-takipleri',
      {
        dateToGet,
        warehouseNo: warehouseNo ?? undefined
      }
    );
  }

  getBanknotTakipDetayi(banknoteTrackId: number): Observable<IFurpaBanknoteTrackApiDto> {
    return this.get<IFurpaBanknoteTrackApiDto>(
      `kasa-islemleri/banknot-takipleri/${banknoteTrackId}`
    );
  }

  getHediyeCekiHareketDetaylari(
    documentSerie: string,
    documentOrderNo: number
  ): Observable<IGiftCheckMovementsCT[]> {
    return this.get<IFurpaGiftCheckMovementItemApiDto[]>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}/hediye-ceki-hareketleri`
    ).pipe(
      map((items: IFurpaGiftCheckMovementItemApiDto[]) =>
        items.map((item: IFurpaGiftCheckMovementItemApiDto) => this.mapGiftCheck(item))
      )
    );
  }

  getKasiyerVeMudur(cashierCode: string, managerCode: string): Observable<ICashier[]> {
    return this.getWithQuery<IFurpaCashierLookupItemApiDto[]>('kasa-islemleri/kasa-sayimlari/kasiyerler/ikili', {
      cashierCode,
      managerCode
    }).pipe(
      map((items: IFurpaCashierLookupItemApiDto[]) =>
        items.map((item: IFurpaCashierLookupItemApiDto) => this.mapCashier(item))
      )
    );
  }

  searchKasiyerler(filterString: string): Observable<IFurpaCashierSearchItemApiDto[]> {
    return this.getWithQuery<IFurpaCashierSearchItemApiDto[]>('kasa-islemleri/kasa-sayimlari/kasiyerler', {
      filterString
    });
  }

  getKasalar(branchNo: number): Observable<IFurpaCashRegistryItemApiDto[]> {
    return this.getWithQuery<IFurpaCashRegistryItemApiDto[]>('kasa-islemleri/kasa-sayimlari/kasalar', {
      branchNo
    });
  }

  getZRaporuToplamDeger(
    documentSerie: string,
    warehouseNo: number,
    zNo: number,
    cashNo: number
  ): Observable<number | null> {
    return this.getWithQuery<unknown>('kasa-islemleri/kasa-sayimlari/z-rapor-toplam', {
      documentSerie,
      warehouseNo,
      zReportNo: zNo,
      cashNo
    }).pipe(map((value: unknown) => this.mapNullableNumber(value)));
  }

  getKasaKayitDetayi(cashNo: number): Observable<ICashRegisterDetails | null> {
    return this.getWithQuery<IFurpaCashRegisterLookupItemApiDto>('kasa-islemleri/kasa-sayimlari/kasa-detayi', {
      cashNo
    }).pipe(map((item: IFurpaCashRegisterLookupItemApiDto) => this.mapCashRegister(item)));
  }

  getKasaKayitDetayiByCashRegisterNo(cashRegisterNo: string): Observable<ICashRegisterDetails | null> {
    return this.getWithQuery<IFurpaCashRegisterLookupItemApiDto>('kasa-islemleri/kasa-sayimlari/kasa-detayi', {
      cashRegisterNo
    }).pipe(map((item: IFurpaCashRegisterLookupItemApiDto) => this.mapCashRegister(item)));
  }

  getBanknotTipleri(): Observable<IFurpaBanknoteTypeItemApiDto[]> {
    return this.get<IFurpaBanknoteTypeItemApiDto[]>('kasa-islemleri/kasa-sayimlari/banknot-tipleri');
  }

  getHediyeCekiTipleri(): Observable<IFurpaGiftCheckTypeItemApiDto[]> {
    return this.get<IFurpaGiftCheckTypeItemApiDto[]>('kasa-islemleri/kasa-sayimlari/hediye-ceki-tipleri');
  }

  getBankaOdemeTipleri(cashRegisterNo: string): Observable<IFurpaPaymentTypeLookupItemApiDto[]> {
    return this.getWithQuery<IFurpaPaymentTypeLookupItemApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/odeme-tipleri/banka',
      {
        cashRegisterNo
      }
    );
  }

  getYemekCekiOdemeTipleri(): Observable<IFurpaPaymentTypeLookupItemApiDto[]> {
    return this.get<IFurpaPaymentTypeLookupItemApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/odeme-tipleri/yemek-ceki'
    );
  }

  getOnlineOdemeTipleri(): Observable<IFurpaPaymentTypeLookupItemApiDto[]> {
    return this.get<IFurpaPaymentTypeLookupItemApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/odeme-tipleri/online'
    );
  }

  getMasrafPusulasiOdemeTipleri(): Observable<IFurpaPaymentTypeLookupItemApiDto[]> {
    return this.get<IFurpaPaymentTypeLookupItemApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/odeme-tipleri/masraf-pusulasi'
    );
  }

  getMagazaMasrafiOdemeTipleri(): Observable<IFurpaPaymentTypeLookupItemApiDto[]> {
    return this.get<IFurpaPaymentTypeLookupItemApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/odeme-tipleri/magaza-masrafi'
    );
  }

  getOnlineKasaDetaylari(): Observable<IFurpaOnlineCashRegisterDetailApiDto[]> {
    return this.get<IFurpaOnlineCashRegisterDetailApiDto[]>(
      'kasa-islemleri/kasa-sayimlari/online-kasa-detaylari'
    );
  }

  createBanknoteTrack(
    request: IFurpaCreateBanknoteTrackRequestApiDto
  ): Observable<IFurpaCreateBanknoteTrackResponseApiDto> {
    return this.post<
      IFurpaCreateBanknoteTrackResponseApiDto,
      IFurpaCreateBanknoteTrackRequestApiDto
    >('kasa-islemleri/banknot-takipleri', request);
  }

  getKasaCiroAktarimiSubeleri(): Observable<KasaCiroBranchDto[]> {
    return this.get<KasaCiroBranchDto[]>(
      'kasa-islemleri/kasa-ciro-aktarimi/subeler'
    );
  }

  importKasaCiroMetin(
    request: KasaCiroImportHttpRequest
  ): Observable<KasaCiroImportResultDto> {
    return this.post<KasaCiroImportResultDto, KasaCiroImportHttpRequest>(
      'kasa-islemleri/kasa-ciro-aktarimi/metin/aktar',
      request
    );
  }

  getKasaHareketSubeleri(): Observable<KasaHareketBranchDto[]> {
    return this.get<KasaHareketBranchDto[]>(
      'kasa-islemleri/kasa-hareket-aktarimi/subeler'
    );
  }

  getKasaHareketKasalar(branchNo: number): Observable<KasaHareketCashRegisterDto[]> {
    return this.get<KasaHareketCashRegisterDto[]>(
      `kasa-islemleri/kasa-hareket-aktarimi/subeler/${branchNo}/kasalar`
    );
  }

  importKasaHareketleri(
    request: KasaHareketImportHttpRequest
  ): Observable<KasaHareketImportResultDto> {
    return this.post<KasaHareketImportResultDto, KasaHareketImportHttpRequest>(
      'kasa-islemleri/kasa-hareket-aktarimi/hareketler/aktar',
      request
    );
  }

  importKasaHareketIptalBelgeleri(
    request: KasaHareketImportHttpRequest
  ): Observable<KasaHareketImportResultDto> {
    return this.post<KasaHareketImportResultDto, KasaHareketImportHttpRequest>(
      'kasa-islemleri/kasa-hareket-aktarimi/iptal-belgeleri/aktar',
      request
    );
  }

  runKasaHareketZamanliAktarim(
    request: KasaHareketScheduledImportHttpRequest
  ): Observable<KasaHareketImportResultDto> {
    return this.post<
      KasaHareketImportResultDto,
      KasaHareketScheduledImportHttpRequest
    >('kasa-islemleri/kasa-hareket-aktarimi/zamanli-aktarim/calistir', request);
  }

  deleteKasaHareketStaging(
    request: KasaHareketDeleteStagingHttpRequest
  ): Observable<KasaHareketProcedureResultDto> {
    return this.deleteWithBody<
      KasaHareketProcedureResultDto,
      KasaHareketDeleteStagingHttpRequest
    >('kasa-islemleri/kasa-hareket-aktarimi/staging', request);
  }

  transferKasaHareketToMikro(
    request: KasaHareketMikroTransferHttpRequest
  ): Observable<KasaHareketProcedureResultDto> {
    return this.post<KasaHareketProcedureResultDto, KasaHareketMikroTransferHttpRequest>(
      'kasa-islemleri/kasa-hareket-aktarimi/mikro/aktar',
      request
    );
  }

  deleteKasaHareketFromMikro(
    request: KasaHareketMikroTransferHttpRequest
  ): Observable<KasaHareketProcedureResultDto> {
    return this.deleteWithBody<
      KasaHareketProcedureResultDto,
      KasaHareketMikroTransferHttpRequest
    >('kasa-islemleri/kasa-hareket-aktarimi/mikro', request);
  }

  transferKasaHareketRangeToMikro(
    request: KasaHareketMikroTransferRangeHttpRequest
  ): Observable<KasaHareketProcedureResultDto> {
    return this.post<
      KasaHareketProcedureResultDto,
      KasaHareketMikroTransferRangeHttpRequest
    >('kasa-islemleri/kasa-hareket-aktarimi/mikro/aralik-aktar', request);
  }

  getKasaHareketRaporu(
    request: KasaHareketReportHttpRequest
  ): Observable<KasaHareketReportRowDto[]> {
    return this.getWithQuery<KasaHareketReportRowDto[], KasaHareketReportHttpRequest>(
      'kasa-islemleri/kasa-hareket-aktarimi/rapor',
      request
    );
  }


  getTeraziDosyasi(): Observable<null> {
    return this.tetikle('operations/scalesfile');
  }

  getUrunDosyasi(): Observable<null> {
    return this.tetikle('operations/productbarcodeplunofile');
  }

  getKasiyerDosyasi(): Observable<null> {
    return this.tetikle('operations/cashierfile');
  }

  getPromosyonDosyasi(): Observable<null> {
    return this.tetikle('operations/promofile');
  }

  getMusteriDosyasi(): Observable<null> {
    return throwError(() => buildProblemError('Musteri dosyasi endpointi paylasilan dokumanda tanimli degil.'));
  }

  private tetikle(path: string): Observable<null> {
    return this.http
      .get(this.buildUrl(path), {
        responseType: 'text'
      })
      .pipe(map(() => null));
  }

 
  private mapSummary(item: IFurpaCashSummaryListItemApiDto): ISummariesCT {
    return {
      warehouse:
        `${toStringValue(item.warehouseName)} ${toNumberValue(item.warehouseNo)}`.trim(),
      documentSerie: toStringValue(item.documentSerie),
      documentOrderNo: toNumberValue(item.documentOrderNo),
      cashNo: toNumberValue(item.cashNo),
      zReportNo: toNumberValue(item.zReportNo),
      cashierNo: toNumberValue(item.cashierNo),
      managerNo: toNumberValue(item.managerNo),
      summaryDate: new Date(toStringValue(item.summaryDate)),
      total: toNumberValue(item.total)
    };
  }

  private mapSummaryDetail(item: IFurpaCashSummaryDetailItemApiDto): ISummariesDetailsCT {
    return {
      typeName: toStringValue(item.typeName),
      paymentTypeID: toNumberValue(item.paymentTypeId),
      accountCode: toStringValue(item.accountCode),
      slipNumber: toNumberValue(item.slipNumber),
      amount: toNumberValue(item.amount),
      terminalId: toStringValue(item.terminalId),
      description: toStringValue(item.description)
    };
  }

  private mapBanknote(item: IFurpaBanknoteMovementItemApiDto): IBanknoteMovementsCT {
    return {
      value: toNumberValue(item.value),
      banknoteTypeID: toNumberValue(item.banknoteType),
      quantity: toNumberValue(item.quantity),
      total: toNumberValue(item.total)
    };
  }

  private mapGiftCheck(item: IFurpaGiftCheckMovementItemApiDto): IGiftCheckMovementsCT {
    return {
      value: toNumberValue(item.value),
      giftCheckTypeID: toNumberValue(item.giftCheckType),
      quantity: toNumberValue(item.quantity),
      total: toNumberValue(item.total)
    };
  }

  private mapCashier(item: IFurpaCashierLookupItemApiDto): ICashier {
    const cashierName = toStringValue(item.cashierName);
    const nameParts = cashierName.split(' ').filter(Boolean);

    return {
      kasiyerId: 0,
      olusturanKullanici: '',
      olusturmaTarihi: '',
      guncelleyenKullanici: '',
      guncellemeTarihi: '',
      kasiyerKodu: toStringValue(item.cashierCode),
      kasiyerAdi: nameParts.shift() ?? cashierName,
      kasiyerSoyadi: nameParts.join(' '),
      kasiyerSifre: toStringValue(item.cashierPassword),
      kasiyerYetki: toStringValue(item.cashierAuthorization),
      kasiyerDurumu: toBooleanValue(item.cashierState),
      adres: '',
      telefon: ''
    };
  }

  private mapCashRegister(item: IFurpaCashRegisterLookupItemApiDto | null | undefined): ICashRegisterDetails | null {
    if (!item) {
      return null;
    }

    return {
      cashRegisterNo: toStringValue(item.cashRegisterNo),
      bank: toStringValue(item.bank),
      terminalId: toStringValue(item.terminalId),
      merchantNo: toStringValue(item.merchantNo),
      cashNo: toNumberValue(item.cashNo),
      cashType: 0
    };
  }

  private mapNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = toNumberValue(value, Number.NaN);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  // ========================================
  // Yeni API v1.0 metodları (FurpaMerkezApi)
  // ========================================

  /**
   * Kasa Sayımları Listele
   * @param dateToGet Sorgu tarihi (ISO 8601)
   * @param warehouseNo Depo numarası (opsiyonel)
   */
  getCashSummaries(
    dateToGet: string,
    warehouseNo?: number
  ): Observable<CashSummaryListItemDto[]> {
    const request: CashSummaryDateHttpRequest = { dateToGet };
    if (warehouseNo) {
      request.warehouseNo = warehouseNo;
    }
    return this.getWithQuery<CashSummaryListItemDto[]>(
      'kasa-islemleri/kasa-sayimlari',
      request as any
    );
  }

  /**
   * Kasa Sayımları Raporu
   * @param dateToGet Sorgu tarihi (ISO 8601)
   * @param warehouseNo Depo numarası (opsiyonel)
   */
  getCashSummariesReport(
    dateToGet: string,
    warehouseNo?: number
  ): Observable<CashSummaryReportItemDto[]> {
    const params: Record<string, any> = { dateToGet };
    if (warehouseNo) {
      params['warehouseNo'] = warehouseNo;
    }
    return this.getWithQuery<CashSummaryReportItemDto[]>(
      'kasa-islemleri/kasa-sayimlari/rapor',
      params
    );
  }

  /**
   * Yeni Kasa Sayımı Oluştur
   * @param request Kasa sayımı oluşturma isteği
   */
  createCashSummary(
    request: CreateCashSummaryHttpRequest
  ): Observable<CreateCashSummaryResponse> {
    return this.post<CreateCashSummaryResponse, CreateCashSummaryHttpRequest>(
      'kasa-islemleri/kasa-sayimlari',
      request
    );
  }

  /**
   * Kasa Sayımı Detaylarını Güncelle
   * @param documentSerie Belge serisi (örn: "KS110")
   * @param documentOrderNo Sayım numarası
   * @param request Güncelleme isteği
   */
  updateCashSummaryDetails(
    documentSerie: string,
    documentOrderNo: number,
    request: UpdateCashSummaryDetailsHttpRequest
  ): Observable<UpdateCashSummaryDetailsResponse> {
    return this.put<UpdateCashSummaryDetailsResponse, UpdateCashSummaryDetailsHttpRequest>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}/detaylar`,
      request
    );
  }

  /**
   * Kasa Sayımı Banknotlarını Güncelle
   * @param documentSerie Belge serisi
   * @param documentOrderNo Sayım numarası
   * @param request Güncelleme isteği
   */
  updateCashSummaryBanknotes(
    documentSerie: string,
    documentOrderNo: number,
    request: UpdateCashSummaryBanknotesHttpRequest
  ): Observable<UpdateCashSummaryBanknotesResponse> {
    return this.put<UpdateCashSummaryBanknotesResponse, UpdateCashSummaryBanknotesHttpRequest>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}/banknot-hareketleri`,
      request
    );
  }

  /**
   * Kasa Sayımını Sil
   * @param documentSerie Belge serisi
   * @param documentOrderNo Sayım numarası
   * @param warehouseNo Depo numarası (opsiyonel)
   */
  deleteCashSummary(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo?: number
  ): Observable<DeleteCashSummaryResponse> {
    const params = warehouseNo ? `?warehouseNo=${warehouseNo}` : '';
    return this.delete<DeleteCashSummaryResponse>(
      `kasa-islemleri/kasa-sayimlari/${encodeURIComponent(documentSerie)}/${documentOrderNo}${params}`
    );
  }

  /**
   * Kasa cirolarini tarih araliginda vardiya ve kasiyer bazli listeler.
   */
  getCashTurnovers(
    request: WarehouseOrderDateRangeHttpRequest,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverListItemDto[]> {
    return this.getWithQuery<IFurpaCashTurnoverListItemApiDto[]>(
      this.getCashTurnoverListPath(source),
      {
        startDate: request.startDate,
        endDate: request.endDate,
        warehouseNo: request.warehouseNo
      }
    );
  }

  /**
   * Tarih araligindaki kasa cirolarini sube bazli ozetler.
   */
  getCashTurnoverOverview(
    request: WarehouseOrderDateRangeHttpRequest,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverOverviewDto> {
    return this.getWithQuery<IFurpaCashTurnoverOverviewApiDto>(
      this.getCashTurnoverOverviewPath(source),
      {
        startDate: request.startDate,
        endDate: request.endDate,
        warehouseNo: request.warehouseNo
      }
    );
  }

  /**
   * Secili tarih, vardiya ve kasiyer icin ciro detay kirilimini getirir.
   */
  getCashTurnoverDetail(
    request: CashTurnoverDetailHttpRequest,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverDetailDto> {
    return this.getWithQuery<IFurpaCashTurnoverDetailApiDto>(
      this.getCashTurnoverDetailPath(source),
      {
        businessDate: request.businessDate,
        shiftNo: request.shiftNo,
        cashierCode: request.cashierCode,
        warehouseNo: request.warehouseNo
      }
    );
  }

  getKasaCirolari(
    request: WarehouseOrderDateRangeHttpRequest,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverListItemDto[]> {
    return this.getCashTurnovers(request, source);
  }

  getKasaCiroOzeti(
    request: WarehouseOrderDateRangeHttpRequest,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverOverviewDto> {
    return this.getCashTurnoverOverview(request, source);
  }

  getKasaCiroDetay(
    businessDate: string,
    shiftNo: number,
    cashierCode: string,
    warehouseNo?: number,
    source: CashTurnoverRouteSource = 'new'
  ): Observable<CashTurnoverDetailDto> {
    return this.getCashTurnoverDetail({
      businessDate,
      shiftNo,
      cashierCode,
      warehouseNo
    }, source);
  }

  getYeniKasaCiroOzeti(
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaCiroOzetItemDto[]> {
    return this.getWithQuery<YeniKasaCiroOzetItemDto[], YeniKasaAnalizHttpRequest>(
      'kasa-islemleri/yeni-kasa-analizleri/ciro-ozeti',
      request
    );
  }

  getYeniKasaKasaOzeti(
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaKasaOzetItemDto[]> {
    return this.getWithQuery<YeniKasaKasaOzetItemDto[], YeniKasaAnalizHttpRequest>(
      'kasa-islemleri/yeni-kasa-analizleri/kasa-ozeti',
      request
    );
  }

  getYeniKasaFisMutabakat(
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaFisMutabakatItemDto[]> {
    return this.getWithQuery<YeniKasaFisMutabakatItemDto[], YeniKasaAnalizHttpRequest>(
      'kasa-islemleri/yeni-kasa-analizleri/fis-mutabakat',
      request
    );
  }

  getYeniKasaAnomaliler(
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaAnomalyItemDto[]> {
    return this.getWithQuery<YeniKasaAnomalyItemDto[], YeniKasaAnalizHttpRequest>(
      'kasa-islemleri/yeni-kasa-analizleri/anomaliler',
      request
    );
  }

  getYeniKasaOdemeTipleri(
    request: YeniKasaAnalizHttpRequest
  ): Observable<YeniKasaPaymentMethodItemDto[]> {
    return this.getWithQuery<YeniKasaPaymentMethodItemDto[], YeniKasaAnalizHttpRequest>(
      'kasa-islemleri/yeni-kasa-analizleri/odeme-tipleri',
      request
    );
  }

  private getCashTurnoverListPath(source: CashTurnoverRouteSource): string {
    switch (source) {
      case 'old':
        return 'kasa-islemleri/kasa-cirolari/eski';
      case 'total':
        return 'kasa-islemleri/kasa-cirolari/toplam';
      case 'new':
      default:
        return 'kasa-islemleri/kasa-cirolari';
    }
  }

  private getCashTurnoverOverviewPath(source: CashTurnoverRouteSource): string {
    switch (source) {
      case 'old':
        return 'kasa-islemleri/kasa-cirolari/eski/ozet';
      case 'total':
        return 'kasa-islemleri/kasa-cirolari/toplam/ozet';
      case 'new':
      default:
        return 'kasa-islemleri/kasa-cirolari/ozet';
    }
  }

  private getCashTurnoverDetailPath(source: CashTurnoverRouteSource): string {
    switch (source) {
      case 'old':
        return 'kasa-islemleri/kasa-cirolari/eski/detay';
      case 'total':
        return 'kasa-islemleri/kasa-cirolari/toplam/detay';
      case 'new':
      default:
        return 'kasa-islemleri/kasa-cirolari/detay';
    }
  }
}
