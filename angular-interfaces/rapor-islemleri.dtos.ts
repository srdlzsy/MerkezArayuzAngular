import type { WarehouseOrderDateRangeHttpRequest } from './arama-islemleri.dtos';

export type SalesAnalysisDateRangeHttpRequest = WarehouseOrderDateRangeHttpRequest;

export interface SalesAnalysisAmountDto {
  code: string;
  name: string;
  amount: number;
}

export interface BankMovementAnalysisItemDto {
  branchNo: number;
  branchName: string;
  zNo: number;
  date: string;
  cashRegisterNo: string;
  bank: string;
  bankAmount: number;
  bankingNumber: number;
  terminalId: string;
}

export interface BranchBankMovementSummaryItemDto {
  branchNo: number;
  branchName: string;
  bank: string;
  bankAmount: number;
  bankingNumber: number;
}

export interface BankPaymentSummaryItemDto {
  bank: string;
  amount: number;
  slipNumber: number;
}

export interface BankPaymentSummaryReportDto {
  items: BankPaymentSummaryItemDto[];
  totalAmount: number;
  totalSlipNumber: number;
}

export interface MerchantPaymentSummaryItemDto {
  bank: string;
  merchantNo: string;
  amount: number;
  slipNumber: number;
}

export interface MerchantPaymentSummaryReportDto {
  items: MerchantPaymentSummaryItemDto[];
  totalAmount: number;
  totalSlipNumber: number;
}

export interface ValorPaymentSummaryItemDto {
  bank: string;
  valorDay: number;
  amount: number;
  slipNumber: number;
}

export interface ValorPaymentSummaryReportDto {
  items: ValorPaymentSummaryItemDto[];
  totalAmount: number;
  totalSlipNumber: number;
}

export interface FoodCheckReportItemDto {
  branchNo: number;
  branchName: string;
  metropol: number;
  multinet: number;
  setcard: number;
  sodexoKupon: number;
  sodexoPos: number;
  ticketKupon: number;
  ticketPos: number;
  total: number;
}

export interface FoodCheckTotalsDto {
  metropol: number;
  multinet: number;
  setcard: number;
  sodexoKupon: number;
  sodexoPos: number;
  ticketKupon: number;
  ticketPos: number;
  total: number;
}

export interface FoodCheckReportDto {
  items: FoodCheckReportItemDto[];
  totals: FoodCheckTotalsDto;
}

export interface MyoSalesReportItemDto {
  documentDate: string;
  branchNo: number;
  branchName: string;
  documentSerie: string;
  documentOrderNo: number;
  invoiceGuid: string | null;
  customerCode: string;
  documentNo: string;
  description1: string;
  description2: string;
  paymentDescription: string;
  subTotal: number;
  discountTotal: number;
  netAmount: number;
  totalTax: number;
  amount: number;
}

export interface MyoSalesReportDto {
  items: MyoSalesReportItemDto[];
  netAmountTotal: number;
  totalTaxTotal: number;
  amountTotal: number;
  doorCashTotal: number;
  doorCreditCardTotal: number;
}

export interface MyoSalesByBranchItemDto {
  documentDate: string;
  branchNo: number;
  branchName: string;
  amount: number;
}

export interface ZReportBankAnalysisItemDto {
  branchName: string;
  branchNo: number;
  date: string;
  zNo: number;
  cashRegisterNo: string;
  bank: string;
  bankAmount: number;
  bankingNumber: number;
  terminalId: string;
  merchantNo: string;
}

export interface DiscountCardDetailItemDto {
  cardNumber: string;
  branchNo: number;
  branchName: string;
  usageCount: number;
  usageTotal: number;
}

export interface MissingTurnoverBranchItemDto {
  branchNo: number;
  branchName: string;
  region: string;
}

export interface StockOnHandReportHttpRequest {
  warehouseNo?: number | null;
  reportDate?: string | null;
  search?: string | null;
  supplierCode?: string | null;
  categoryCode?: string | null;
  producerCode?: string | null;
  productManagerCode?: string | null;
  modelCode?: string | null;
  onlyWithStock?: boolean | null;
  take?: number | null;
}

export interface SupplierStockOnHandHttpRequest
  extends Omit<StockOnHandReportHttpRequest, 'supplierCode'> {
  supplierCode: string;
}

export interface CategoryStockOnHandHttpRequest
  extends Omit<StockOnHandReportHttpRequest, 'categoryCode'> {
  categoryCode: string;
}

export interface StockCategoryOptionHttpRequest {
  search?: string | null;
  onlyActive?: boolean | null;
  take?: number | null;
}

export interface ProducerStockOnHandHttpRequest
  extends Omit<StockOnHandReportHttpRequest, 'producerCode'> {
  producerCode: string;
}

export interface ProductWarehouseStockHttpRequest {
  warehouseNo?: number | null;
  reportDate?: string | null;
  stockCodeOrBarcode: string;
  onlyWithStock?: boolean | null;
  take?: number | null;
}

export interface ProductWarehouseStockByPathHttpRequest
  extends Omit<ProductWarehouseStockHttpRequest, 'stockCodeOrBarcode'> {}

export interface ProductShipmentDistributionHttpRequest {
  warehouseNo?: number | null;
  shipmentDate: string;
  stockCodeOrBarcode?: string | null;
  take?: number | null;
}

export interface ReportStockCardDetailHttpRequest {
  warehouseNo?: number | null;
  barcode?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  supplierCode?: string | null;
  productManagerCode?: string | null;
  take?: number | null;
}

export interface WarehouseMissingStockHttpRequest {
  sourceWarehouseNo: number;
  targetWarehouseNo?: number | null;
  reportDate?: string | null;
  search?: string | null;
  modelCode?: string | null;
  take?: number | null;
}

export interface WarehouseZeroStockHttpRequest {
  warehouseNo?: number | null;
  reportDate?: string | null;
  modelCode?: string | null;
  take?: number | null;
}

export interface StockMovementReportHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  stockCode?: string | null;
  take?: number | null;
}

export interface FilteredDateRangeReportHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  filterType?: string | null;
  filterValue?: string | null;
  take?: number | null;
}

export interface ReturnBranchReportHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  stockCode: string;
  take?: number | null;
}

export interface NotSoldProductReportHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  productManagerCode?: string | null;
  includeDls?: boolean | null;
  take?: number | null;
}

export interface ProfitabilityReportHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  scope?: string | null;
  filterValue?: string | null;
  take?: number | null;
}

export interface CategorySalesAnalysisHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  categoryCode?: string | null;
  take?: number | null;
}

export interface BranchPriceDifferenceHttpRequest {
  warehouseNo?: number | null;
  search?: string | null;
  take?: number | null;
}

export interface ManufacturerSeasonalSalesHttpRequest {
  warehouseNo?: number | null;
  pastYear: number;
  presentYear: number;
  manufacturerCode?: string | null;
  take?: number | null;
}

export interface CountingComparisonReportHttpRequest {
  warehouseNo?: number | null;
  countDate: string;
  documentNo?: string | null;
  packageCode?: string | null;
  take?: number | null;
}

export interface StockOnHandReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  unitName?: string | null;
  quantity?: number | null;
  salesPrice?: number | null;
  salesValue?: number | null;
  totalSalesValue?: number | null;
  returnedQuantity?: number | null;
  returnedCount?: number | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  producerCode?: string | null;
  producerName?: string | null;
  productManagerCode?: string | null;
  productManagerName?: string | null;
  modelCode?: string | null;
  modelName?: string | null;
}

export interface StockOnHandReportDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  reportDate?: string | null;
  generatedAtUtc?: string | null;
  totalQuantity?: number | null;
  totalSalesValue?: number | null;
  returnedCount?: number | null;
  items: StockOnHandReportItemDto[];
}

export interface ProductWarehouseStockDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  unitName?: string | null;
  quantity?: number | null;
  salesPrice?: number | null;
  salesValue?: number | null;
  lastMovementDate?: string | null;
}

export interface ProductShipmentDistributionDto {
  sourceWarehouseNo?: number | null;
  sourceWarehouseName?: string | null;
  targetWarehouseNo?: number | null;
  targetWarehouseName?: string | null;
  warehouseNo?: number | null;
  warehouseName?: string | null;
  branchNo?: number | null;
  branchName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  unitName?: string | null;
  shipmentDate?: string | null;
  shipmentQuantity?: number | null;
  shippedQuantity?: number | null;
  totalQuantity?: number | null;
  quantity?: number | null;
  lineCount?: number | null;
  documentCount?: number | null;
  salesPrice?: number | null;
  salesValue?: number | null;
}

export interface StockCategoryOptionDto {
  categoryCode?: string | null;
  categoryName?: string | null;
  productCount?: number | null;
  isActive?: boolean | null;
}

export interface WarehouseMissingStockDto {
  sourceWarehouseNo?: number | null;
  sourceWarehouseName?: string | null;
  targetWarehouseNo?: number | null;
  targetWarehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  unitName?: string | null;
  sourceQuantity?: number | null;
  targetQuantity?: number | null;
  salesPrice?: number | null;
  salesValue?: number | null;
  modelCode?: string | null;
  modelName?: string | null;
}

export interface WarehouseZeroStockDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  unitName?: string | null;
  salesPrice?: number | null;
  modelCode?: string | null;
  modelName?: string | null;
  lastMovementDate?: string | null;
}

export interface StockMovementReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  movementDate?: string | null;
  documentDate?: string | null;
  documentSerie?: string | null;
  documentOrderNo?: number | null;
  documentNo?: string | null;
  movementType?: string | number | null;
  movementName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  inputWarehouseNo?: number | null;
  outputWarehouseNo?: number | null;
  quantity?: number | null;
  amount?: number | null;
  unitName?: string | null;
}

export interface MovementInOutComparisonDto {
  stockCode?: string | null;
  stockName?: string | null;
  warehouseNo?: number | null;
  warehouseName?: string | null;
  inputQuantity?: number | null;
  outputQuantity?: number | null;
  netQuantity?: number | null;
  inputAmount?: number | null;
  outputAmount?: number | null;
  netAmount?: number | null;
}

export interface BranchSalesReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  netSalesAmount?: number | null;
  grossSalesAmount?: number | null;
  receiptCount?: number | null;
}

export interface YearSalesComparisonItemDto {
  groupCode?: string | null;
  groupName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  currentYearQuantity?: number | null;
  previousYearQuantity?: number | null;
  quantityDifference?: number | null;
  currentYearAmount?: number | null;
  previousYearAmount?: number | null;
  amountDifference?: number | null;
  changePercent?: number | null;
}

export interface ReturnBranchReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  quantity?: number | null;
  amount?: number | null;
  documentCount?: number | null;
}

export interface NotSoldProductReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  productManagerCode?: string | null;
  productManagerName?: string | null;
  quantity?: number | null;
  currentStock?: number | null;
  salesPrice?: number | null;
  salesValue?: number | null;
  lastSaleDate?: string | null;
}

export interface ProfitabilityReportItemDto {
  groupCode?: string | null;
  groupName?: string | null;
  salesQuantity?: number | null;
  salesAmount?: number | null;
  costAmount?: number | null;
  profitAmount?: number | null;
  profitPercent?: number | null;
}

export interface CategorySalesAnalysisItemDto {
  stockCode?: string | null;
  stockName?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  supplierCode?: string | null;
  manufacturerCode?: string | null;
  manufacturerName?: string | null;
  quantity?: number | null;
  totalAmount?: number | null;
}

export interface BranchPriceDifferenceItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  branchPrice?: number | null;
  mainWarehousePrice?: number | null;
  differenceAmount?: number | null;
  differencePercent?: number | null;
}

export interface ManufacturerSeasonalSalesItemDto {
  stockCode?: string | null;
  stockName?: string | null;
  manufacturerCode?: string | null;
  manufacturerName?: string | null;
  month?: number | null;
  monthName?: string | null;
  pastAmount?: number | null;
  presentAmount?: number | null;
  differenceAmount?: number | null;
  changePercent?: number | null;
}

export interface CountingComparisonReportItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  barcode?: string | null;
  packageCode?: string | null;
  systemQuantity?: number | null;
  countedQuantity?: number | null;
  differenceQuantity?: number | null;
  salesPrice?: number | null;
  differenceValue?: number | null;
}

export interface PromotionBulletinListHttpRequest {
  warehouseNo?: number | null;
  activeOn?: string | null;
  onlyActive?: boolean | null;
  search?: string | null;
  take?: number | null;
}

export interface PromotionBulletinOptionHttpRequest extends PromotionBulletinListHttpRequest {}

export interface PromotionPerformanceHttpRequest {
  warehouseNo?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  promotionCode?: string | null;
  search?: string | null;
  take?: number | null;
}

export interface PromotionBulletinListItemDto {
  promotionCode?: string | null;
  promotionName?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  branchCount?: number | null;
  warehouseNo?: number | null;
  warehouseName?: string | null;
}

export interface PromotionBulletinOptionDto {
  promotionCode?: string | null;
  promotionName?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  branchCount?: number | null;
  warehouseNo?: number | null;
  warehouseName?: string | null;
}

export interface PromotionPerformanceSummaryDto {
  promotionCount?: number | null;
  branchCount?: number | null;
  receiptCount?: number | null;
  usageCount?: number | null;
  quantity?: number | null;
  netSalesAmount?: number | null;
  grossSalesAmount?: number | null;
  discountAmount?: number | null;
  estimatedCostAmount?: number | null;
  marginAmount?: number | null;
  marginPercent?: number | null;
}

export interface PromotionPerformanceItemDto extends PromotionPerformanceSummaryDto {
  promotionCode?: string | null;
  promotionName?: string | null;
  description?: string | null;
}

export interface PromotionPerformanceReportDto {
  startDate?: string | null;
  endDate?: string | null;
  warehouseNo?: number | null;
  generatedAtUtc?: string | null;
  summary?: PromotionPerformanceSummaryDto | null;
  items: PromotionPerformanceItemDto[];
}

export interface PromotionBranchPerformanceItemDto extends PromotionPerformanceItemDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  branchNo?: number | null;
  branchName?: string | null;
}

export type SalesAnalysisFoodCheckTotalKind =
  | 'metropol'
  | 'multinet'
  | 'setcard'
  | 'sodexo-kupon'
  | 'sodexo-pos'
  | 'ticket-kupon'
  | 'ticket-pos'
  | 'genel';

export type SupplierPerformanceRiskLevel = 'NoData' | 'Healthy' | 'Warning' | 'Critical';
export type SupplierPerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type SupplierPerformanceInvoiceMetricsState = 'summary-only' | string;
export type SupplierPerformanceSignalSeverity = 'Info' | 'Healthy' | 'Warning' | 'Critical';
export type SupplierPerformanceEventType =
  | 'Order'
  | 'OpenLateOrder'
  | 'ReceivingDifference'
  | 'CompanyReturn'
  | 'OutageImpact'
  | 'ExpenseImpact'
  | 'IssuedInvoice'
  | 'IncomingInvoice'
  | string;

export interface SupplierPerformanceHttpRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  customerCode?: string | null;
  take?: number | null;
}

export interface SupplierPerformanceDetailHttpRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  eventTake?: number | null;
}

export interface SupplierPerformanceSummaryDto {
  supplierCount: number;
  returnedSupplierCount?: number | null;
  averageScore: number;
  criticalSupplierCount: number;
  warningSupplierCount: number;
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalReturnedQuantity: number;
  totalMissingQuantity: number;
  totalExcessQuantity: number;
  totalOutageImpactQuantity: number;
  totalIssuedInvoiceAmount: number;
  totalIncomingInvoiceAmount: number;
  invoiceMetricsState: SupplierPerformanceInvoiceMetricsState;
  overallStatus?: SupplierPerformanceRiskLevel | string | null;
  headline?: string | null;
}

export interface SupplierPerformanceSignalDto {
  code: string;
  severity: SupplierPerformanceSignalSeverity | string;
  title: string;
  description: string;
}

export interface SupplierPerformanceInsightDto extends SupplierPerformanceSignalDto {
  customerCode?: string | null;
}

export interface SupplierPerformanceOrderMetricsDto {
  documentCount: number;
  lineCount: number;
  orderedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  deliveryRate: number;
  lateDeliveredLineCount: number;
  openLateLineCount: number;
  averageLateDays: number;
}

export interface SupplierPerformanceReceivingMetricsDto {
  documentCount: number;
  lineCount: number;
  receivedQuantity: number;
  receivedAmount: number;
  differenceLineCount: number;
  missingQuantity: number;
  excessQuantity: number;
  differenceRate: number;
}

export interface SupplierPerformanceReturnMetricsDto {
  documentCount: number;
  lineCount: number;
  returnedQuantity: number;
  returnedAmount: number;
  returnRate: number;
}

export interface SupplierPerformanceOutageImpactMetricsDto {
  documentCount: number;
  lineCount: number;
  quantity: number;
  amount: number;
  quantityRate: number;
  attribution: string;
}

export interface SupplierPerformanceInvoiceMetricsDto {
  issuedInvoiceCount: number;
  issuedInvoiceAmount: number;
  incomingInvoiceCount: number;
  incomingInvoiceAmount: number;
  state: SupplierPerformanceInvoiceMetricsState;
  note: string | null;
}

export interface SupplierPerformanceScoreBreakdownDto {
  deliveryPenalty: number;
  differencePenalty: number;
  returnPenalty: number;
  outagePenalty: number;
  invoicePenalty: number;
  totalPenalty: number;
}

export interface SupplierPerformanceCardDto {
  customerCode: string;
  customerTitle: string;
  taxNoOrTckn: string | null;
  score: number;
  grade: SupplierPerformanceGrade | string;
  riskLevel: SupplierPerformanceRiskLevel | string;
  orders: SupplierPerformanceOrderMetricsDto;
  receiving: SupplierPerformanceReceivingMetricsDto;
  returns: SupplierPerformanceReturnMetricsDto;
  outageImpact: SupplierPerformanceOutageImpactMetricsDto;
  invoices: SupplierPerformanceInvoiceMetricsDto;
  scoreBreakdown: SupplierPerformanceScoreBreakdownDto;
  signals?: SupplierPerformanceSignalDto[];
}

export interface SupplierPerformanceReportDto {
  warehouseNo: number | null;
  startDate: string;
  endDate: string;
  generatedAtUtc: string;
  summary: SupplierPerformanceSummaryDto;
  insights?: SupplierPerformanceInsightDto[];
  items: SupplierPerformanceCardDto[];
}

export interface SupplierPerformanceEventDto {
  type: SupplierPerformanceEventType;
  occurredAtUtc?: string | null;
  documentDate?: string | null;
  documentSerie?: string | null;
  documentOrderNo?: number | null;
  documentNo?: string | null;
  warehouseNo?: number | null;
  warehouseName?: string | null;
  stockCode?: string | null;
  stockName?: string | null;
  quantity?: number | null;
  amount?: number | null;
  message?: string | null;
  source?: string | null;
  [key: string]: unknown;
}

export interface SupplierPerformanceDetailDto {
  card: SupplierPerformanceCardDto;
  events: SupplierPerformanceEventDto[];
}


// --- Ciro & Hedef Karsilastirma DTOs ---
export interface CiroHedefKarsilastirmaHttpRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  region?: string | null;
}

export interface HedefTanimDto {
  id: number;
  year: number;
  month: number;
  monthName: string;
  ciroGoalPercent: number;
  customerGoalPercent: number;
  expenseGoalPercent: number;
  warehouseNo?: number | null;
}

export interface CiroHedefSubeKarsilastirmaDto {
  branchNo: number;
  branchName: string;
  region: string;
  currentCashTotal: number;
  currentCreditTotal: number;
  currentGiftTotal: number;
  currentFuturesTotal: number;
  currentExpenseTotal: number;
  currentOverallTotal: number;
  currentCustomerCount: number;
  currentAverageBasketAmount: number;
  previousCashTotal: number;
  previousCreditTotal: number;
  previousGiftTotal: number;
  previousFuturesTotal: number;
  previousExpenseTotal: number;
  previousOverallTotal: number;
  previousCustomerCount: number;
  previousAverageBasketAmount: number;
  targetTurnover: number;
  turnoverAchievementRate: number;
  targetCustomerCount: number;
  customerAchievementRate: number;
}

export interface CiroHedefKarsilastirmaRaporDto {
  startDate: string;
  endDate: string;
  ciroGoalPercent: number;
  customerGoalPercent: number;
  totalCurrentTurnover: number;
  totalPreviousTurnover: number;
  totalTargetTurnover: number;
  overallTurnoverAchievementRate: number;
  totalCurrentCustomers: number;
  totalPreviousCustomers: number;
  totalTargetCustomers: number;
  overallCustomerAchievementRate: number;
  currentOverallAverageBasket: number;
  previousOverallAverageBasket: number;
  branches: CiroHedefSubeKarsilastirmaDto[];
}

// --- Mal Kabul Raporlari DTOs ---
export interface LazyBranchesWarehouseReceivingHttpRequest {
  startDate?: string | null;
  endDate?: string | null;
  region?: string | null;
  warehouseNo?: number | null;
}

export interface LazyBranchReceivingItemDto {
  region: string;
  warehouseNo: number;
  warehouseName: string;
  notAcceptedCount: number;
  oldestShipmentDate?: string | null;
  latestShipmentDate?: string | null;
  totalQuantity: number;
}

export interface LazyBranchDocumentDetailDto {
  region: string;
  warehouseNo: number;
  warehouseName: string;
  documentSerie: string;
  documentOrderNo: number;
  documentNo: string;
  documentDate: string;
  lineCount: number;
  totalQuantity: number;
}

export interface CompanyDocumentByCustomerHttpRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  take?: number;
}

export interface CompanyDocumentByCustomerItemDto {
  customerCode: string;
  customerName: string;
  customerTitle: string;
  documentCount: number;
  totalAmount: number;
  totalTaxAmount: number;
  totalDiscountAmount: number;
  netAmount: number;
}

// --- Kasa Raporlari DTOs ---
export interface ExpenseSlipReportHttpRequest {
  startDate: string;
  endDate: string;
  warehouseNo?: number | null;
  cashRegisterNo?: number | null;
  cashierCode?: string | null;
}

export interface ExpenseSlipCashierSummaryDto {
  cashierCode: string;
  cashierName: string;
  totalExpenseAmount: number;
  slipCount: number;
}

export interface ExpenseSlipCashRegisterSummaryDto {
  cashRegisterNo: number;
  totalExpenseAmount: number;
  slipCount: number;
  cashiers: ExpenseSlipCashierSummaryDto[];
}

export interface ExpenseSlipBranchSummaryDto {
  branchNo: number;
  branchName: string;
  zoneCode: string;
  totalExpenseAmount: number;
  slipCount: number;
  cashRegisters: ExpenseSlipCashRegisterSummaryDto[];
}

export interface ExpenseSlipZoneSummaryDto {
  zoneCode: string;
  zoneName: string;
  totalExpenseAmount: number;
  slipCount: number;
  branches: ExpenseSlipBranchSummaryDto[];
}

export interface ExpenseSlipDetailItemDto {
  branchNo: number;
  branchName: string;
  cashRegisterNo: number;
  cashierCode: string;
  cashierName: string;
  date: string;
  time: string;
  slipNo: number;
  documentGuid: string;
  amount: number;
  description: string;
}

// --- Satis Analizleri Genisletme DTOs ---
export interface CategoryYearlyGrowthHttpRequest {
  startDate?: string | null;
  endDate?: string | null;
}

export interface CategoryYearlyGrowthItemDto {
  segmentName: string;
  categoryName: string;
  subCategoryName: string;
  subSegmentName: string;
  currentQuantity: number;
  currentAmount: number;
  previousQuantity: number;
  previousAmount: number;
  targetQuantity: number;
  targetAmount: number;
  quantityGrowthPercent: number;
  amountGrowthPercent: number;
}

export interface CategorySalesDetailedHttpRequest {
  startDate?: string | null;
  endDate?: string | null;
  branchNo?: number | null;
  sectorCode?: string | null;
  rayonCode?: string | null;
  categoryCode?: string | null;
  productCode?: string | null;
  region?: string | null;
  take?: number;
}

export interface CategorySalesDetailedItemDto {
  branchNo: number;
  branchName: string;
  region: string;
  sectorCode: string;
  sectorName: string;
  rayonCode: string;
  rayonName: string;
  categoryCode: string;
  categoryName: string;
  productCode: string;
  productName: string;
  barcode: string;
  quantity: number;
  unit: string;
  salesTotal: number;
  costTotal: number;
  profitTotal: number;
  profitPercent: number;
}

// --- Stok Raporlari Genisletme DTOs ---
export interface SupplierBranchStockMatrixHttpRequest {
  customerCode: string;
  warehouseNo?: number | null;
}

export interface SupplierStockMatrixBranchColumnDto {
  warehouseNo: number;
  warehouseName: string;
  region: string;
}

export interface SupplierStockMatrixProductItemDto {
  stockCode: string;
  stockName: string;
  barcode: string;
  unit: string;
  branchQuantities: Record<number, number>;
  totalQuantity: number;
}

export interface SupplierBranchStockMatrixDto {
  customerCode: string;
  customerName: string;
  customerTitle: string;
  branches: SupplierStockMatrixBranchColumnDto[];
  products: SupplierStockMatrixProductItemDto[];
  totalProductCount: number;
  grandTotalQuantity: number;
}

export interface BranchOutageAnalysisHttpRequest {
  startDate: string;
  endDate: string;
}

export interface BranchOutageAnalysisItemDto {
  region: string;
  warehouseNo: number;
  warehouseName: string;
  outageAmount: number;
  expenseAmount: number;
  totalLossAmount: number;
  turnoverAmount: number;
  lossToTurnoverPercent: number;
}

export interface LiveStockAndPriceHttpRequest {
  barcode?: string | null;
  stockCode?: string | null;
  warehouseNo?: number | null;
}

export interface LiveStockAndPriceBranchItemDto {
  warehouseNo: number;
  warehouseName: string;
  region: string;
  stockQuantity: number;
  salesPrice: number;
  purchasePrice: number;
  vatRate: number;
  currency: string;
  lastMovementDate?: string | null;
}

export interface LiveStockAndPriceDto {
  stockCode: string;
  stockName: string;
  barcode: string;
  unit: string;
  totalStockQuantity: number;
  branches: LiveStockAndPriceBranchItemDto[];
}
