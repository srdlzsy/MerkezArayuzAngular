/**
 * Kasa İşlemleri DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Kasa Sayımı Liste ve Rapor Modelleri
// ============================================================================

export interface CashSummaryListItemDto {
  warehouseNo: number;
  warehouseName: string;
  documentSerie: string;
  documentOrderNo: number;
  cashNo: number;
  zReportNo: number;
  cashierNo: number;
  managerNo: number;
  summaryDate: string;
  total: number;
}

export interface CashSummaryReportItemDto {
  warehouseNo: number;
  warehouseName: string;
  cashAmount: number;
  cashAmountQuantity: number;
  akbank: number;
  akbankQuantity: number;
  halkbank: number;
  halkbankQuantity: number;
  isBankasi: number;
  isBankasiQuantity: number;
  teb: number;
  tebQuantity: number;
  yapiKredi: number;
  yapiKrediQuantity: number;
  ziraatBankasi: number;
  ziraatBankasiQuantity: number;
  metropol: number;
  metropolQuantity: number;
  multinet: number;
  multinetQuantity: number;
  setcard: number;
  setcardQuantity: number;
  sodexoKupon: number;
  sodexoKuponQuantity: number;
  sodexoPos: number;
  sodexoPosQuantity: number;
  ticketKupon: number;
  ticketKuponQuantity: number;
  ticketPos: number;
  ticketPosQuantity: number;
  expenseCompass: number;
  expenseCompassQuantity: number;
  storeExpense: number;
  storeExpenseQuantity: number;
}

export interface CashSummaryDetailItemDto {
  typeName: string;
  paymentTypeId: number;
  accountCode: string;
  slipNumber: number;
  amount: number;
  terminalId: string;
  description: string;
}

// ============================================================================
// Kasa Ciro Modelleri
// ============================================================================

export type CashTurnoverSource = 'new' | 'old';

export type CashTurnoverRouteSource = CashTurnoverSource | 'total';

export interface CashTurnoverListItemDto {
  businessDate: string;
  warehouseNo: number;
  warehouseName: string;
  shiftNo: number;
  cashierCode: string;
  cashierName: string;
  productLineCount: number;
  totalSalesQuantity: number;
  totalSalesAmount: number;
  paymentLineCount: number;
  totalCollectionAmount: number;
  totalCustomerCommission: number;
  netCollectionAmount: number;
  source: CashTurnoverSource;
}

export interface CashTurnoverPaymentItemDto {
  paymentTypeNo: number;
  paymentTypeName: string;
  cashBankCode: string;
  cashBankName: string;
  paymentLineCount: number;
  amount: number;
  customerCommission: number;
  netAmount: number;
  source: CashTurnoverSource;
}

export interface CashTurnoverDetailDto {
  header: CashTurnoverListItemDto;
  payments: CashTurnoverPaymentItemDto[];
}

export interface CashTurnoverOverviewBranchDto {
  region: string;
  branchNo: number;
  branchName: string;
  customerCount: number;
  discountCardCustomerCount: number;
  furparaCardCustomerCount: number;
  lastBillTime: string;
  cashTotal: number;
  creditTotal: number;
  giftCardTotal: number;
  expenseNoteTotal: number;
  expenseNoteCount: number;
  overallTotal: number;
  futuresSalesTotal: number;
  futuresSalesCount: number;
  averageBasketAmount: number;
}

export interface CashTurnoverOverviewDto {
  dailyTotal: number;
  dailyCashPayment: number;
  dailyCreditCardPayment: number;
  dailyGiftCardPayment: number;
  dailyExpenseNoteTotal: number;
  dailyCustomerCount: number;
  dailyFurparaCardCustomerCount: number;
  dailyDiscountCardCustomerCount: number;
  dailyExpenseNoteCount: number;
  averageBasketAmount: number;
  dailyFuturesSalesCount: number;
  dailyFuturesSalesTotal: number;
  subeCirolari: CashTurnoverOverviewBranchDto[];
}

// ============================================================================
// Yeni Kasa Analizleri Modelleri
// ============================================================================

export interface YeniKasaAnalizHttpRequest {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  cashRegisterNo?: string | null;
  cashierCode?: string | null;
  take?: number | null;
  onlyProblematic?: boolean | null;
}

export interface YeniKasaCiroOzetItemDto {
  businessDate: string;
  warehouseNo: number;
  warehouseName: string;
  cashRegisterNo: string;
  cashierCode: string;
  cashierName: string;
  saleRowCount: number;
  receiptCount: number;
  productLineCount: number;
  productQuantity: number;
  saleTotal: number;
  paymentLineCount: number;
  paymentTotal: number;
  difference: number;
  firstSaleAt: string | null;
  lastSaleAt: string | null;
}

export interface YeniKasaKasaOzetItemDto {
  businessDate: string;
  warehouseNo: number;
  warehouseName: string;
  cashRegisterNo: string;
  saleRowCount: number;
  receiptCount: number;
  saleTotal: number;
  paymentTotal: number;
  cashTotal: number;
  creditCardTotal: number;
  giftCardTotal: number;
  otherPaymentTotal: number;
  unknownPaymentTotal: number;
  difference: number;
  cashierCount: number;
  lastSaleAt: string | null;
}

export interface YeniKasaFisMutabakatItemDto {
  businessDate: string;
  warehouseNo: number;
  warehouseName: string;
  cashRegisterNo: string;
  cashierCode: string;
  cashierName: string;
  uuid: string;
  receiptNumber: string;
  saleRowCount: number;
  productLineCount: number;
  paymentLineCount: number;
  saleTotal: number;
  productLineTotal: number;
  paymentTotal: number;
  salePaymentDifference: number;
  saleLineDifference: number;
  status: string;
  issues: string[];
  receivedAt: string | null;
}

export interface YeniKasaAnomalyItemDto {
  type: string;
  severity: string;
  businessDate: string | null;
  warehouseNo: number;
  warehouseName: string;
  cashRegisterNo: string;
  cashierCode: string;
  uuid: string;
  receiptNumber: string;
  saleTotal: number;
  paymentTotal: number;
  difference: number;
  description: string;
}

export interface YeniKasaPaymentMethodItemDto {
  paymentMethodCode: string;
  paymentMethodName: string;
  category: string;
  paymentMethodId: number | null;
  pavoMediator: number | null;
  pavoType: number | null;
  paymentLineCount: number;
  amount: number;
  isKnown: boolean;
}

// ============================================================================
// Kasa Ciro Aktarimi Modelleri
// ============================================================================

export interface KasaCiroBranchDto {
  branchNo: number;
  branchName: string;
  region: string;
}

export interface KasaCiroImportHttpRequest {
  startDate: string;
  endDate: string;
  branches: number[];
  movementRootPath?: string | null;
  dryRun: boolean;
}

export interface KasaCiroImportIssueDto {
  date: string | null;
  branchNo: number | null;
  cashRegisterNo: number | null;
  file: string | null;
  lineNo: number | null;
  message: string;
}

export interface KasaCiroImportResultDto {
  runId: string;
  status: string;
  startDate: string;
  endDate: string;
  processedDays: number;
  processedBranches: number;
  processedFiles: number;
  skippedEmptyBranches: number;
  insertedTotals: number;
  updatedTotals: number;
  insertedDetails: number;
  updatedDetails: number;
  insertedDiscountCards: number;
  updatedDiscountCards: number;
  warnings: KasaCiroImportIssueDto[];
  errors: KasaCiroImportIssueDto[];
}

// ============================================================================
// Kasa Hareket Aktarimi Modelleri
// ============================================================================

export interface KasaHareketBranchDto {
  branchNo: number;
  branchName: string;
  region: string;
}

export interface KasaHareketCashRegisterDto {
  branchNo: number;
  cashRegisterNo: number;
  cashRegisterType: number;
}

export interface KasaHareketImportHttpRequest {
  startDate: string;
  endDate: string;
  branches: number[];
  cashRegisters: number[];
  fileRootPath?: string | null;
  skipExisting: boolean;
  dryRun: boolean;
}

export interface KasaHareketScheduledImportHttpRequest {
  date?: string | null;
  addDay?: number | null;
  fileRootPath?: string | null;
  skipExisting: boolean;
  dryRun: boolean;
}

export interface KasaHareketDeleteStagingHttpRequest {
  date: string;
  branchNo?: number | null;
  cashRegisterNo?: number | null;
}

export interface KasaHareketMikroTransferHttpRequest {
  date: string;
  branchNo?: number | null;
}

export interface KasaHareketMikroTransferRangeHttpRequest {
  startDate: string;
  endDate: string;
}

export interface KasaHareketReportHttpRequest {
  date: string;
  branchNo?: number | null;
  cashRegisterNo?: number | null;
}

export interface KasaHareketImportIssueDto {
  branchNo: number | null;
  cashRegisterNo: number | null;
  file: string | null;
  receiptNo: string | null;
  lineNo: number | null;
  message: string;
}

export interface KasaHareketImportResultDto {
  runId: string;
  importType: string;
  status: string;
  processedFiles: number;
  processedInvoices: number;
  skippedExistingInvoices: number;
  insertedLines: number;
  insertedPayments: number;
  insertedPromotions: number;
  warnings: KasaHareketImportIssueDto[];
  errors: KasaHareketImportIssueDto[];
}

export interface KasaHareketProcedureResultDto {
  procedure: string;
  message: string;
  date: string;
  branchNo: number | null;
  cashRegisterNo: number | null;
}

export interface KasaHareketReportRowDto {
  date: string;
  branchNo: number;
  branchName: string;
  cashRegisterNo: number;
  netAmount: number;
  expense: number;
  checkAmount: number;
  difference: number;
}

// ============================================================================
// Banknot Hareketi Modelleri
// ============================================================================

export interface BanknoteMovementItemDto {
  value: number;
  banknoteType: number;
  quantity: number;
  total: number;
}

export interface BanknoteTypeItemDto {
  value: number;
  quantity: number;
  total: number;
  banknoteType: number;
}

export interface BanknoteTrackDto {
  banknoteTrackId: number;
  warehouseNo: number;
  warehouseName: string;
  banknoteTrackDate: string;
  totalAmount: number;
  deliveryTotalAmount: number;
  differenceAmount: number;
  deliverer: string;
  receiver: string;
  createDate: string;
}

export type BanknoteTrackItemDto = BanknoteTrackDto;

// ============================================================================
// Hediye Çeki Modelleri
// ============================================================================

export interface GiftCheckMovementItemDto {
  value: number;
  giftCheckType: number;
  quantity: number;
  total: number;
}

export interface GiftCheckTypeItemDto {
  value: number;
  quantity: number;
  total: number;
  giftCheckType: number;
}

// ============================================================================
// Ödeme Tipi Modelleri
// ============================================================================

export interface PaymentTypeItemDto {
  paymentName: string;
  paymentTypeNo: number;
  terminalId: string;
  accountCode: string;
  slipNumber: number;
  amountValue: number;
}

// ============================================================================
// Kasiyer Modelleri
// ============================================================================

export interface CashierItemDto {
  cashierId: number;
  createUser: number;
  createDate: string;
  updateUser: number;
  updateDate: string;
  cashierCode: number;
  cashierName: string;
  cashierPassword: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

export interface CashierSearchItemDto {
  cashierCode: number;
  cashierName: string;
  cashierPassword: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

// ============================================================================
// Kasa Kaydı Modelleri
// ============================================================================

export interface CashRegistryItemDto {
  detailId: number;
  branchNo: number;
  cashRegisterNo: number;
  cashRegisterType: number;
}

export interface CashRegisterDetailDto {
  id: number;
  cashRegisterNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
  cashNo: number | null;
}

// ============================================================================
// Kasa Sayımı Oluşturma Modelleri
// ============================================================================

export interface CreateCashSummaryHttpRequest {
  warehouseNo?: number;
  cashNo: number;
  zReportNo: number;
  cashierNo: number;
  managerNo: number;
  zTotalValue: number;
  total: number;
  summaryDate: string;
  giftCheckMovements: CreateGiftCheckMovementHttpRequest[];
  banknoteMovements: CreateBanknoteMovementHttpRequest[];
  paymentTypes: CreatePaymentTypeHttpRequest[];
  storeExpenses: CreateStoreExpenseHttpRequest[];
}

export interface CreateBanknoteMovementHttpRequest {
  banknoteType: number;
  quantity: number;
  total: number;
  value: number;
}

export interface CreateGiftCheckMovementHttpRequest {
  giftCheckType: number;
  quantity: number;
  total: number;
  value: number;
}

export interface CreatePaymentTypeHttpRequest {
  paymentName: string;
  paymentTypeNo: number;
  accountCode: string;
  terminalId: string;
  slipNumber: number;
  amountValue: number;
}

export interface CreateStoreExpenseHttpRequest {
  storeExpensesType: number;
  description: string;
  amountValue: number;
}

export interface CreateCashSummaryResponse {
  documentSerie: string;
  documentOrderNo: number;
  summaryDate: string;
  warehouseNo: number;
  lineCount: number;
  total: number;
  writeConnectionName: string;
}

// ============================================================================
// Kasa Sayımı Güncelleme Modelleri
// ============================================================================

export interface UpdateCashSummaryDetailsHttpRequest {
  warehouseNo?: number;
  details: UpdateCashSummaryDetailLineHttpRequest[];
}

export interface UpdateCashSummaryDetailLineHttpRequest {
  typeName: string;
  paymentTypeId: number;
  accountCode: string;
  slipNumber: number;
  amount: number;
  terminalId: string;
  description: string;
}

export interface UpdateCashSummaryDetailsResponse {
  documentSerie: string;
  documentOrderNo: number;
  updatedLineCount: number;
  totalAmount: number;
}

export interface UpdateCashSummaryBanknotesHttpRequest {
  warehouseNo?: number;
  banknoteMovements: UpdateCashSummaryBanknoteLineHttpRequest[];
}

export interface UpdateCashSummaryBanknoteLineHttpRequest {
  value: number;
  banknoteType: number;
  quantity: number;
  total: number;
}

export interface UpdateCashSummaryBanknotesResponse {
  documentSerie: string;
  documentOrderNo: number;
  updatedLineCount: number;
  totalAmount: number;
}

// ============================================================================
// Kasa Sayımı Silme Modelleri
// ============================================================================

export interface DeleteCashSummaryResponse {
  documentSerie: string;
  documentOrderNo: number;
  deletedSummaryLineCount: number;
  deletedBanknoteLineCount: number;
  deletedGiftCheckLineCount: number;
  deletedCustomerMovementCount: number;
}

// ============================================================================
// Banknot Takip Modelleri
// ============================================================================

export interface CreateBanknoteTrackHttpRequest {
  warehouseNo?: number;
  banknoteTrackDate: string;
  totalAmount: number;
  deliveryTotalAmount: number;
  deliverer: string;
  receiver: string;
}

export interface CreateBanknoteTrackResponse {
  banknoteTrackId: number;
  banknoteTrackDate: string;
  warehouseNo: number;
  created: boolean;
}

// ============================================================================
// Query İstek Modelleri
// ============================================================================

export interface CashSummaryDateHttpRequest {
  dateToGet: string;
  warehouseNo?: number;
}

export interface CashTurnoverDetailHttpRequest {
  businessDate: string;
  shiftNo: number;
  cashierCode: string;
  warehouseNo?: number;
}

export interface CashierPairHttpRequest {
  cashierCode: number;
  managerCode: number;
}

export interface CashRegistryHttpRequest {
  branchNo: number;
}

export interface CashRegisterLookupHttpRequest {
  cashNo?: number;
  cashRegisterNo?: string;
}

export interface CashierSearchHttpRequest {
  filterString: string;
}

export interface BankPaymentTypeHttpRequest {
  cashRegisterNo: string;
}

export interface ZReportValueHttpRequest {
  warehouseNo: number;
  documentSerie: string;
  zReportNo: number;
  cashNo: number;
}


export interface IFurpaCashSummaryListItemApiDto {
  warehouseNo: number;
  warehouseName: string;
  documentSerie: string;
  documentOrderNo: number;
  cashNo: number;
  zReportNo: number;
  cashierNo: number;
  managerNo: number;
  summaryDate: string;
  total: number;
  paymentTypeId: number;
  amount: number;
}

export interface IFurpaCashSummaryReportItemApiDto {
  warehouseNo: number;
  warehouseName: string;
  cashAmount: number;
  cashAmountQuantity: number;
  akbank: number;
  akbankQuantity: number;
  halkbank: number;
  halkbankQuantity: number;
  isBankasi: number;
  isBankasiQuantity: number;
  teb: number;
  tebQuantity: number;
  yapiKredi: number;
  yapiKrediQuantity: number;
  ziraatBankasi: number;
  ziraatBankasiQuantity: number;
  metropol: number;
  metropolQuantity: number;
  multinet: number;
  multinetQuantity: number;
  setcard: number;
  setcardQuantity: number;
  sodexoKupon: number;
  sodexoKuponQuantity: number;
  sodexoPos: number;
  sodexoPosQuantity: number;
  ticketKupon: number;
  ticketKuponQuantity: number;
  ticketPos: number;
  ticketPosQuantity: number;
  expenseCompass: number;
  expenseCompassQuantity: number;
  storeExpense: number;
  storeExpenseQuantity: number;
}

export interface IFurpaCashSummaryDetailItemApiDto {
  typeName: string;
  paymentTypeId: number;
  accountCode: string;
  slipNumber: number;
  amount: number;
  terminalId: string;
  description: string;
}

export type IFurpaCashTurnoverListItemApiDto = CashTurnoverListItemDto;

export type IFurpaCashTurnoverPaymentItemApiDto = CashTurnoverPaymentItemDto;

export type IFurpaCashTurnoverDetailApiDto = CashTurnoverDetailDto;

export type IFurpaCashTurnoverOverviewBranchApiDto = CashTurnoverOverviewBranchDto;

export type IFurpaCashTurnoverOverviewApiDto = CashTurnoverOverviewDto;

export interface IFurpaBanknoteMovementItemApiDto {
  value: number;
  banknoteType: number;
  quantity: number;
  total: number;
}

export interface IFurpaGiftCheckMovementItemApiDto {
  value: number;
  giftCheckType: number;
  quantity: number;
  total: number;
}

export type IFurpaBanknoteTypeItemApiDto = IFurpaBanknoteMovementItemApiDto;
export type IFurpaGiftCheckTypeItemApiDto = IFurpaGiftCheckMovementItemApiDto;

export interface IFurpaBanknoteTrackApiDto {
  banknoteTrackId: number;
  warehouseNo: number;
  warehouseName: string;
  banknoteTrackDate: string;
  totalAmount: number;
  deliveryTotalAmount: number;
  differenceAmount: number;
  deliverer: string;
  receiver: string;
  createDate: string;
}

export type IFurpaBanknoteTrackItemApiDto = IFurpaBanknoteTrackApiDto;

export interface IFurpaCashierLookupItemApiDto {
  cashierCode: number;
  cashierName: string;
  cashierPassword: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

export type IFurpaCashierSearchItemApiDto = IFurpaCashierLookupItemApiDto;

export interface IFurpaCashRegistryItemApiDto {
  detailId: number;
  branchNo: number;
  cashRegisterNo: number;
  cashRegisterType: number;
}

export interface IFurpaCashRegisterLookupItemApiDto {
  id: number;
  cashRegisterNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
  cashNo: number;
}

export type IFurpaOnlineCashRegisterDetailApiDto = IFurpaCashRegisterLookupItemApiDto;

export interface IFurpaPaymentTypeLookupItemApiDto {
  paymentName: string;
  paymentTypeNo: number;
  terminalId: string;
  accountCode: string;
  slipNumber: number;
  amountValue: number;
}

export interface IFurpaCreateBanknoteTrackRequestApiDto {
  banknoteTrackDate: string;
  totalAmount: number;
  deliveryTotalAmount: number;
  deliverer: string;
  receiver: string;
  warehouseNo?: number;
}

export interface IFurpaCreateBanknoteTrackResponseApiDto {
  banknoteTrackId: number;
  banknoteTrackDate: string;
  warehouseNo: number;
  created: boolean;
}

export interface IFurpaCreateCashSummaryBanknoteLineRequestApiDto {
  banknoteType: number;
  quantity: number;
  total: number;
  value: number;
}

export interface IFurpaCreateCashSummaryGiftCheckLineRequestApiDto {
  value: number;
  giftCheckType: number;
  quantity: number;
  total: number;
}

export interface IFurpaCreateCashSummaryPaymentTypeLineRequestApiDto {
  paymentName: string;
  paymentTypeNo: number;
  accountCode: string;
  terminalId: string;
  slipNumber: number;
  amountValue: number;
}

export interface IFurpaCreateStoreExpenseRequestApiDto {
  storeExpensesType: string;
  description: string;
  amountValue: number;
}

export interface IFurpaCreateCashSummaryRequestApiDto {
  cashNo: number;
  zReportNo: number;
  cashierNo: number;
  managerNo: number;
  zTotalValue: number;
  total: number;
  summaryDate: string;
  warehouseNo?: number;
  giftCheckMovements: IFurpaCreateCashSummaryGiftCheckLineRequestApiDto[];
  banknoteMovements: IFurpaCreateCashSummaryBanknoteLineRequestApiDto[];
  paymentTypes: IFurpaCreateCashSummaryPaymentTypeLineRequestApiDto[];
  storeExpenses: IFurpaCreateStoreExpenseRequestApiDto[];
}

export interface IFurpaCreateCashSummaryResponseApiDto {
  documentSerie: string;
  documentOrderNo: number;
  summaryDate: string;
  warehouseNo: number;
  lineCount: number;
  total: number;
  writeConnectionName: string;
}

export interface IFurpaUpdateCashSummaryDetailsRequestApiDto {
  details: IFurpaCashSummaryDetailItemApiDto[];
}

export interface IFurpaUpdateCashSummaryDetailsResponseApiDto {
  documentSerie: string;
  documentOrderNo: number;
  updatedLineCount: number;
  totalAmount: number;
}

export interface IFurpaUpdateCashSummaryBanknotesRequestApiDto {
  banknoteMovements: IFurpaBanknoteMovementItemApiDto[];
}

export type IFurpaUpdateCashSummaryBanknotesResponseApiDto =
  IFurpaUpdateCashSummaryDetailsResponseApiDto;

export interface IFurpaDeleteCashSummaryResponseApiDto {
  documentSerie: string;
  documentOrderNo: number;
  deletedSummaryLineCount: number;
  deletedBanknoteLineCount: number;
  deletedGiftCheckLineCount: number;
  deletedCustomerMovementCount: number;
}
