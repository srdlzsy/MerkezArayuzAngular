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
  salesPrice?: number | null;
  salesValue?: number | null;
  lastSaleDate?: string | null;
}

export interface ProfitabilityReportItemDto {
  groupCode?: string | null;
  groupName?: string | null;
  quantity?: number | null;
  netSalesAmount?: number | null;
  grossSalesAmount?: number | null;
  estimatedCostAmount?: number | null;
  marginAmount?: number | null;
  marginPercent?: number | null;
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

export interface PromotionPerformanceHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
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

export type SupplierPerformanceRiskLevel = 'Healthy' | 'Warning' | 'Critical';
export type SupplierPerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type SupplierPerformanceInvoiceMetricsState = 'summary-only' | string;
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
}

export interface SupplierPerformanceReportDto {
  warehouseNo: number | null;
  startDate: string;
  endDate: string;
  generatedAtUtc: string;
  summary: SupplierPerformanceSummaryDto;
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
