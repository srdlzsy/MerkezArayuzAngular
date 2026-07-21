import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BankMovementAnalysisItemDto,
  BankPaymentSummaryReportDto,
  BranchBankMovementSummaryItemDto,
  BranchSalesReportItemDto,
  CategoryStockOnHandHttpRequest,
  CountingComparisonReportHttpRequest,
  CountingComparisonReportItemDto,
  DiscountCardDetailItemDto,
  FilteredDateRangeReportHttpRequest,
  FoodCheckReportDto,
  FoodCheckTotalsDto,
  MerchantPaymentSummaryReportDto,
  MovementInOutComparisonDto,
  MissingTurnoverBranchItemDto,
  MyoSalesByBranchItemDto,
  MyoSalesReportDto,
  NotSoldProductReportHttpRequest,
  NotSoldProductReportItemDto,
  ProducerStockOnHandHttpRequest,
  ProductWarehouseStockDto,
  ProductWarehouseStockByPathHttpRequest,
  ProductWarehouseStockHttpRequest,
  ProfitabilityReportHttpRequest,
  ProfitabilityReportItemDto,
  PromotionBranchPerformanceItemDto,
  PromotionBulletinOptionDto,
  PromotionBulletinOptionHttpRequest,
  PromotionBulletinListHttpRequest,
  PromotionBulletinListItemDto,
  PromotionPerformanceHttpRequest,
  PromotionPerformanceReportDto,
  ReportStockCardDetailHttpRequest,
  ReturnBranchReportHttpRequest,
  ReturnBranchReportItemDto,
  SalesAnalysisAmountDto,
  SalesAnalysisDateRangeHttpRequest,
  SalesAnalysisFoodCheckTotalKind,
  StockCardDetailDto,
  StockCategoryOptionDto,
  StockCategoryOptionHttpRequest,
  StockMovementReportHttpRequest,
  StockMovementReportItemDto,
  StockOnHandReportDto,
  StockOnHandReportHttpRequest,
  SupplierStockOnHandHttpRequest,
  SupplierPerformanceDetailDto,
  SupplierPerformanceDetailHttpRequest,
  SupplierPerformanceHttpRequest,
  SupplierPerformanceReportDto,
  WarehouseMissingStockDto,
  WarehouseMissingStockHttpRequest,
  WarehouseZeroStockDto,
  WarehouseZeroStockHttpRequest,
  YearSalesComparisonItemDto,
  ValorPaymentSummaryReportDto,
  ZReportBankAnalysisItemDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class RaporIslemleriService extends BaseApiService {
  private readonly salesAnalysisBasePath = 'rapor-islemleri/satis-analizleri';
  private readonly supplierPerformancePath = 'rapor-islemleri/tedarikci-performans-karnesi';
  private readonly stockReportsBasePath = 'rapor-islemleri/stok-raporlari';
  private readonly promotionReportsBasePath = 'rapor-islemleri/promosyon-raporlari';
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

  getSupplierPerformanceReport(
    request: SupplierPerformanceHttpRequest
  ): Observable<SupplierPerformanceReportDto> {
    return this.getWithQuery<SupplierPerformanceReportDto, SupplierPerformanceHttpRequest>(
      this.supplierPerformancePath,
      request
    );
  }

  getSupplierPerformanceDetail(
    customerCode: string,
    request: SupplierPerformanceDetailHttpRequest
  ): Observable<SupplierPerformanceDetailDto> {
    return this.getWithQuery<SupplierPerformanceDetailDto, SupplierPerformanceDetailHttpRequest>(
      `${this.supplierPerformancePath}/${encodeURIComponent(customerCode)}`,
      request
    );
  }

  getStockOnHandReport(request: StockOnHandReportHttpRequest): Observable<StockOnHandReportDto> {
    return this.getStockReport<StockOnHandReportDto, StockOnHandReportHttpRequest>(
      'son-stok',
      request
    );
  }

  getSupplierStockOnHandReport(
    request: SupplierStockOnHandHttpRequest
  ): Observable<StockOnHandReportDto> {
    return this.getStockReport<StockOnHandReportDto, SupplierStockOnHandHttpRequest>(
      'tedarikci-son-stok',
      request
    );
  }

  getCategoryStockOnHandReport(
    request: CategoryStockOnHandHttpRequest
  ): Observable<StockOnHandReportDto> {
    return this.getStockReport<StockOnHandReportDto, CategoryStockOnHandHttpRequest>(
      'kategori-son-stok',
      request
    );
  }

  getStockCategoryOptions(
    request: StockCategoryOptionHttpRequest
  ): Observable<StockCategoryOptionDto[]> {
    return this.getStockReport<StockCategoryOptionDto[], StockCategoryOptionHttpRequest>(
      'kategori-secenekleri',
      request
    );
  }

  getProducerStockOnHandReport(
    request: ProducerStockOnHandHttpRequest
  ): Observable<StockOnHandReportDto> {
    return this.getStockReport<StockOnHandReportDto, ProducerStockOnHandHttpRequest>(
      'uretici-son-stok',
      request
    );
  }

  getInventoryValueReport(
    request: StockOnHandReportHttpRequest
  ): Observable<StockOnHandReportDto> {
    return this.getStockReport<StockOnHandReportDto, StockOnHandReportHttpRequest>(
      'envanter-degeri',
      request
    );
  }

  getProductWarehouseStockReport(
    request: ProductWarehouseStockHttpRequest
  ): Observable<ProductWarehouseStockDto[]> {
    return this.getStockReport<ProductWarehouseStockDto[], ProductWarehouseStockHttpRequest>(
      'urun-depo-durum',
      request
    );
  }

  getProductWarehouseStockByPath(
    stockCodeOrBarcode: string,
    request: ProductWarehouseStockByPathHttpRequest
  ): Observable<ProductWarehouseStockDto[]> {
    return this.getStockReport<ProductWarehouseStockDto[], ProductWarehouseStockByPathHttpRequest>(
      `urun/${encodeURIComponent(stockCodeOrBarcode)}/depo-durum`,
      request
    );
  }

  getReportStockCards(
    request: ReportStockCardDetailHttpRequest
  ): Observable<StockCardDetailDto[]> {
    return this.getStockReport<StockCardDetailDto[], ReportStockCardDetailHttpRequest>(
      'stok-kartlari',
      request
    );
  }

  searchReportStockCards(
    request: ReportStockCardDetailHttpRequest
  ): Observable<StockCardDetailDto[]> {
    return this.getStockReport<StockCardDetailDto[], ReportStockCardDetailHttpRequest>(
      'urun-ara',
      request
    );
  }

  getWarehouseMissingStockReport(
    request: WarehouseMissingStockHttpRequest
  ): Observable<WarehouseMissingStockDto[]> {
    return this.getStockReport<WarehouseMissingStockDto[], WarehouseMissingStockHttpRequest>(
      'depoda-var-subede-yok',
      request
    );
  }

  getWarehouseZeroStockReport(
    request: WarehouseZeroStockHttpRequest
  ): Observable<WarehouseZeroStockDto[]> {
    return this.getStockReport<WarehouseZeroStockDto[], WarehouseZeroStockHttpRequest>(
      'depo-sifir-stok',
      request
    );
  }

  getStockMovementReport(
    request: StockMovementReportHttpRequest
  ): Observable<StockMovementReportItemDto[]> {
    return this.getStockReport<StockMovementReportItemDto[], StockMovementReportHttpRequest>(
      'hareketler',
      request
    );
  }

  getMovementInOutComparisonReport(
    request: FilteredDateRangeReportHttpRequest
  ): Observable<MovementInOutComparisonDto[]> {
    return this.getStockReport<MovementInOutComparisonDto[], FilteredDateRangeReportHttpRequest>(
      'giris-cikis-karsilastirma',
      request
    );
  }

  getBranchSalesReport(
    request: FilteredDateRangeReportHttpRequest
  ): Observable<BranchSalesReportItemDto[]> {
    return this.getStockReport<BranchSalesReportItemDto[], FilteredDateRangeReportHttpRequest>(
      'satislar/sube-detay',
      request
    );
  }

  getYearSalesComparisonReport(
    request: FilteredDateRangeReportHttpRequest
  ): Observable<YearSalesComparisonItemDto[]> {
    return this.getStockReport<YearSalesComparisonItemDto[], FilteredDateRangeReportHttpRequest>(
      'satislar/yil-karsilastirma',
      request
    );
  }

  getReturnBranchReport(
    request: ReturnBranchReportHttpRequest
  ): Observable<ReturnBranchReportItemDto[]> {
    return this.getStockReport<ReturnBranchReportItemDto[], ReturnBranchReportHttpRequest>(
      'iadeler/subeler',
      request
    );
  }

  getNotSoldProductReport(
    request: NotSoldProductReportHttpRequest
  ): Observable<NotSoldProductReportItemDto[]> {
    return this.getStockReport<NotSoldProductReportItemDto[], NotSoldProductReportHttpRequest>(
      'satislar/satmayan-urunler',
      request
    );
  }

  getProfitabilityReport(
    request: ProfitabilityReportHttpRequest
  ): Observable<ProfitabilityReportItemDto[]> {
    return this.getStockReport<ProfitabilityReportItemDto[], ProfitabilityReportHttpRequest>(
      'karlilik',
      request
    );
  }

  getCountingComparisonReport(
    request: CountingComparisonReportHttpRequest
  ): Observable<CountingComparisonReportItemDto[]> {
    return this.getStockReport<CountingComparisonReportItemDto[], CountingComparisonReportHttpRequest>(
      'sayim-karsilastirma',
      request
    );
  }

  getPromotionBulletins(
    request: PromotionBulletinListHttpRequest
  ): Observable<PromotionBulletinListItemDto[]> {
    return this.getPromotionReport<PromotionBulletinListItemDto[], PromotionBulletinListHttpRequest>(
      'bultenler',
      request
    );
  }

  getPromotionBulletinOptions(
    request: PromotionBulletinOptionHttpRequest
  ): Observable<PromotionBulletinOptionDto[]> {
    return this.getPromotionReport<PromotionBulletinOptionDto[], PromotionBulletinOptionHttpRequest>(
      'bulten-secenekleri',
      request
    );
  }

  getPromotionPerformance(
    request: PromotionPerformanceHttpRequest
  ): Observable<PromotionPerformanceReportDto> {
    return this.getPromotionReport<PromotionPerformanceReportDto, PromotionPerformanceHttpRequest>(
      'performans',
      request
    );
  }

  getPromotionSalesMarginImpact(
    request: PromotionPerformanceHttpRequest
  ): Observable<PromotionPerformanceReportDto> {
    return this.getPromotionReport<PromotionPerformanceReportDto, PromotionPerformanceHttpRequest>(
      'satis-marj-etkisi',
      request
    );
  }

  getPromotionBranchPerformance(
    request: PromotionPerformanceHttpRequest
  ): Observable<PromotionBranchPerformanceItemDto[]> {
    return this.getPromotionReport<
      PromotionBranchPerformanceItemDto[],
      PromotionPerformanceHttpRequest
    >('performans/sube', request);
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

  private getStockReport<TResponse, TRequest extends object>(
    path: string,
    request: TRequest
  ): Observable<TResponse> {
    return this.getWithQuery<TResponse, TRequest>(
      `${this.stockReportsBasePath}/${path}`,
      request
    );
  }

  private getPromotionReport<TResponse, TRequest extends object>(
    path: string,
    request: TRequest
  ): Observable<TResponse> {
    return this.getWithQuery<TResponse, TRequest>(
      `${this.promotionReportsBasePath}/${path}`,
      request
    );
  }
}
