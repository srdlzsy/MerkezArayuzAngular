import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BankMovementAnalysisItemDto,
  BankPaymentSummaryReportDto,
  BranchBankMovementSummaryItemDto,
  DiscountCardDetailItemDto,
  FoodCheckReportDto,
  FoodCheckTotalsDto,
  MerchantPaymentSummaryReportDto,
  MissingTurnoverBranchItemDto,
  MyoSalesByBranchItemDto,
  MyoSalesReportDto,
  SalesAnalysisAmountDto,
  SalesAnalysisDateRangeHttpRequest,
  SalesAnalysisFoodCheckTotalKind,
  ValorPaymentSummaryReportDto,
  ZReportBankAnalysisItemDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class RaporIslemleriService extends BaseApiService {
  private readonly salesAnalysisBasePath = 'rapor-islemleri/satis-analizleri';
  private readonly foodCheckTotalPaths: Record<SalesAnalysisFoodCheckTotalKind, string> = {
    metropol: 'metropol-toplam',
    multinet: 'multinet-toplam',
    setcard: 'setcard-toplam',
    'sodexo-kupon': 'sodexo-kupon-toplam',
    'sodexo-pos': 'sodexo-pos-toplam',
    'ticket-kupon': 'ticket-kupon-toplam',
    'ticket-pos': 'ticket-pos-toplam',
    genel: 'genel-toplam'
  };

  getBankaHareketleri(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<BankMovementAnalysisItemDto[]> {
    return this.getSalesAnalysis<BankMovementAnalysisItemDto[]>(
      'banka-hareketleri',
      request
    );
  }

  getBankaHareketleriSubeOzeti(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<BranchBankMovementSummaryItemDto[]> {
    return this.getSalesAnalysis<BranchBankMovementSummaryItemDto[]>(
      'banka-hareketleri/sube',
      request
    );
  }

  getBankaOdemeOzeti(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<BankPaymentSummaryReportDto> {
    return this.getSalesAnalysis<BankPaymentSummaryReportDto>(
      'banka-odeme-ozetleri/banka',
      request
    );
  }

  getMerchantOdemeOzeti(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<MerchantPaymentSummaryReportDto> {
    return this.getSalesAnalysis<MerchantPaymentSummaryReportDto>(
      'banka-odeme-ozetleri/merchant',
      request
    );
  }

  getValorOdemeOzeti(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<ValorPaymentSummaryReportDto> {
    return this.getSalesAnalysis<ValorPaymentSummaryReportDto>(
      'banka-odeme-ozetleri/valor',
      request
    );
  }

  getYemekCekleri(request: SalesAnalysisDateRangeHttpRequest): Observable<FoodCheckReportDto> {
    return this.getSalesAnalysis<FoodCheckReportDto>('yemek-cekleri', request);
  }

  getYemekCekiToplamlari(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<FoodCheckTotalsDto> {
    return this.getSalesAnalysis<FoodCheckTotalsDto>('yemek-cekleri/toplamlar', request);
  }

  getYemekCekiTekilToplam(
    kind: SalesAnalysisFoodCheckTotalKind,
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<SalesAnalysisAmountDto> {
    return this.getSalesAnalysis<SalesAnalysisAmountDto>(
      `yemek-cekleri/${this.foodCheckTotalPaths[kind]}`,
      request
    );
  }

  getMarketYoSatislari(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<MyoSalesReportDto> {
    return this.getSalesAnalysis<MyoSalesReportDto>('marketyo-satislari', request);
  }

  getMarketYoSatislariSubeOzeti(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<MyoSalesByBranchItemDto[]> {
    return this.getSalesAnalysis<MyoSalesByBranchItemDto[]>(
      'marketyo-satislari/sube',
      request
    );
  }

  getZRaporBankaAnalizi(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<ZReportBankAnalysisItemDto[]> {
    return this.getSalesAnalysis<ZReportBankAnalysisItemDto[]>(
      'z-rapor-banka-analizi',
      request
    );
  }

  getIndirimKartlari(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<DiscountCardDetailItemDto[]> {
    return this.getSalesAnalysis<DiscountCardDetailItemDto[]>('indirim-kartlari', request);
  }

  getEksikCirolar(
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<MissingTurnoverBranchItemDto[]> {
    return this.getSalesAnalysis<MissingTurnoverBranchItemDto[]>('eksik-cirolar', request);
  }

  private getSalesAnalysis<T>(
    path: string,
    request: SalesAnalysisDateRangeHttpRequest
  ): Observable<T> {
    return this.getWithQuery<T, SalesAnalysisDateRangeHttpRequest>(
      `${this.salesAnalysisBasePath}/${path}`,
      {
        startDate: request.startDate,
        endDate: request.endDate,
        warehouseNo: request.warehouseNo
      }
    );
  }
}
