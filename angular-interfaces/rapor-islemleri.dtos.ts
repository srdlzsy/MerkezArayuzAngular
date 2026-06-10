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
