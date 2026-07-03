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
  totalInvoiceDifferenceAmount: number;
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
  invoiceDifferenceAmount: number;
  invoiceDifferenceRate: number;
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
