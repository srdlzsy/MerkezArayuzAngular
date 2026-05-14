/**
 * Sevk, İade ve Mal Kabul İşlemleri DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Depolar Arası Sevk / Depo İadesi Ortak Modelleri
// ============================================================================

export interface WarehouseShippingListItemDto {
  documentDate: string | null;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  sourceWarehouseNo: number;
  sourceWarehouse: string;
  targetWarehouseNo: number;
  targetWarehouse: string;
  shippingWarehouseNo: number;
  shippingState: number;
  plaque: string;
  driverNameSurname: string;
  driverTckn: string;
  descriptionEttn: string;
  warehouseOrderNo: string;
  lineCount: number;
  totalQuantity: number;
}

export interface WarehouseShippingHeaderDto {
  documentDate: string | null;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  sourceWarehouseNo: number;
  sourceWarehouse: string;
  targetWarehouseNo: number;
  targetWarehouse: string;
  shippingWarehouseNo: number;
  shippingState: number;
  plaque: string;
  driverNameSurname: string;
  driverTckn: string;
  descriptionEttn: string;
  warehouseOrderNo: string;
  warehouseOrderNos: string[];
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface WarehouseShippingLineItemDto {
  movementGuid: string;
  lineNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  warehouseOrderNo: string;
}

export interface WarehouseShippingDetailDto {
  header: WarehouseShippingHeaderDto;
  items: WarehouseShippingLineItemDto[];
}

export interface CreateInterWarehouseShipmentHttpRequest {
  targetWarehouseNo: number;
  transitWarehouseNo?: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  description: string;
  lines: CreateInterWarehouseShipmentLineHttpRequest[];
}

export interface CreateInterWarehouseShipmentLineHttpRequest {
  stockCode: string;
  quantity: number;
  warehouseOrderLineGuid?: string;
  unitPrice: number;
  unitPointer: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  customerResponsibilityCenter?: string;
  productResponsibilityCenter?: string;
}

export interface CreateInterWarehouseShipmentResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  transitWarehouseNo: number;
  lineCount: number;
  linkedWarehouseOrderLineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

// ============================================================================
// Firma Sevk / Firma İadesi Ortak Modelleri
// ============================================================================

export interface CompanyMovementListItemDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  customerCode: string;
  customerName: string;
  customerTitle: string;
  customerDisplayName: string;
  warehouseNo: number;
  warehouseName: string;
  inputWarehouseNo: number;
  inputWarehouseName: string;
  outputWarehouseNo: number;
  outputWarehouseName: string;
  documentType: number;
  movementType: number;
  returnType: number;
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface CompanyMovementHeaderDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  customerCode: string;
  customerName: string;
  customerTitle: string;
  customerDisplayName: string;
  customerAddress: string;
  warehouseNo: number;
  warehouseName: string;
  inputWarehouseNo: number;
  inputWarehouseName: string;
  outputWarehouseNo: number;
  outputWarehouseName: string;
  documentType: number;
  movementType: number;
  returnType: number;
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface CompanyMovementLineItemDto {
  lineNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  quantity: number;
  secondaryQuantity: number;
  unitPrice: number;
  lineAmount: number;
  discountAmount: number;
  expenseAmount: number;
  taxAmount: number;
  netWeight: number;
  grossWeight: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  orderGuid: string | null;
}

export interface CompanyMovementDetailDto {
  header: CompanyMovementHeaderDto;
  items: CompanyMovementLineItemDto[];
}

export interface CreateCompanyMovementHttpRequest {
  customerCode: string;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  description: string;
  lines: CreateCompanyMovementLineHttpRequest[];
}

export interface CreateCompanyMovementLineHttpRequest {
  stockCode: string;
  quantity: number;
  unitPrice: number;
  unitPointer: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  customerResponsibilityCenter: string;
  productResponsibilityCenter: string;
}

export interface CreateCompanyMovementResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  warehouseNo: number;
  customerCode: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

// ============================================================================
// Depo İadesi Spesifik
// ============================================================================

export interface CreateWarehouseReturnHttpRequest {
  targetWarehouseNo: number;
  transitWarehouseNo?: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  description: string;
  lines: CreateWarehouseReturnLineHttpRequest[];
}

export interface CreateWarehouseReturnLineHttpRequest {
  stockCode: string;
  quantity: number;
  unitPrice: number;
  unitPointer: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  customerResponsibilityCenter?: string;
  productResponsibilityCenter?: string;
}

export interface CreateWarehouseReturnResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  transitWarehouseNo: number;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

// ============================================================================
// Mal Kabul Modelleri
// ============================================================================

export interface AcceptWarehouseReceivingHttpRequest {
  allowDiscrepancy: boolean;
  lines: AcceptWarehouseReceivingLineHttpRequest[];
}

export interface AcceptWarehouseReceivingLineHttpRequest {
  movementGuid: string;
  receivedQuantity: number;
}

export interface AcceptWarehouseReceivingResponse {
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  sourceWarehouseNo: number;
  transitWarehouseNo: number;
  shippingState: number;
  lineCount: number;
  totalShippedQuantity: number;
  totalReceivedQuantity: number;
  totalMissingQuantity: number;
  totalExcessQuantity: number;
  hasDiscrepancy: boolean;
  differenceResolutionStatus: string;
  writeConnectionName: string;
  lines: AcceptWarehouseReceivingLineResultDto[];
}

export interface AcceptWarehouseReceivingLineResultDto {
  movementGuid: string;
  lineNo: number;
  stockCode: string;
  shippedQuantity: number;
  receivedQuantity: number;
  differenceQuantity: number;
  differenceType: string;
}

// ============================================================================
// Firma Mal Kabul Modelleri
// ============================================================================

export interface CreateCompanyReceivingHttpRequest {
  clientRequestId?: string;
  customerCode: string;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  deliverer: string;
  receiver: string;
  description: string;
  allowOrderOverReceiving: boolean;
  lines: CreateCompanyReceivingLineHttpRequest[];
}

export interface CreateCompanyReceivingLineHttpRequest {
  stockCode: string;
  quantity: number;
  unitPrice: number;
  unitPointer: number;
  lastConsumingDate?: string;
  orderGuid: string | null;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  customerResponsibilityCenter: string;
  productResponsibilityCenter: string;
}

export interface CreateCompanyReceivingResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  warehouseNo: number;
  customerCode: string;
  lineCount: number;
  totalReceivedQuantity: number;
  totalOrderLinkedQuantity: number;
  totalOrderlessQuantity: number;
  totalOrderOverReceivedQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
  lines: CreateCompanyReceivingLineResultDto[];
}

export interface CreateCompanyReceivingLineResultDto {
  movementGuid: string;
  sourceLineNo: number;
  movementLineNo: number;
  stockCode: string;
  orderGuid: string | null;
  isOrderLinked: boolean;
  receivingMode: string;
  requestedQuantity: number;
  acceptedQuantity: number;
  orderLinkedQuantity: number;
  orderlessQuantity: number;
  orderRemainingBefore: number;
  orderRemainingAfter: number;
}

export interface EDespatchCustomerSuggestionDto {
  customerCode: string;
  customerName: string;
  taxNoOrTckn: string | null;
  matchReason: string | null;
  isPrimarySuggestion: boolean;
}

export interface EDespatchPartyDto {
  title: string;
  taxNoOrTckn: string;
  alias: string | null;
  city: string | null;
}

export interface EDespatchPreviewLineDto {
  lineNo: number;
  productName: string;
  description: string | null;
  quantity: number;
  unitCode: string | null;
  buyerItemCode: string | null;
  sellerItemCode: string | null;
  manufacturerItemCode: string | null;
  barcode: string | null;
  internalStockCode: string | null;
  internalStockName: string | null;
  matchReason: string | null;
  isMatched: boolean;
  isGoodsAcceptanceBlocked: boolean;
  canUseForGoodsAcceptance: boolean;
}

export interface WarehouseReceivingEDespatchPreviewDto {
  isFound: boolean;
  warehouseNo: number;
  receivingContext: string;
  ettn: string;
  despatchNumber: string | null;
  issueDate: string | null;
  actualDespatchDate: string | null;
  profileId: string | null;
  despatchAdviceTypeCode: string | null;
  notes: string[];
  sender: EDespatchPartyDto | null;
  receiver: EDespatchPartyDto | null;
  primaryCustomerSuggestion: null;
  totalLineCount: number;
  matchedLineCount: number;
  unmatchedLineCount: number;
  suggestedCustomers: [];
  lines: EDespatchPreviewLineDto[];
}

export interface CompanyReceivingEDespatchPreviewDto {
  isFound: boolean;
  warehouseNo: number;
  receivingContext: string;
  ettn: string;
  despatchNumber: string | null;
  issueDate: string | null;
  actualDespatchDate: string | null;
  profileId: string | null;
  despatchAdviceTypeCode: string | null;
  notes: string[];
  sender: EDespatchPartyDto | null;
  receiver: EDespatchPartyDto | null;
  primaryCustomerSuggestion: EDespatchCustomerSuggestionDto | null;
  totalLineCount: number;
  matchedLineCount: number;
  unmatchedLineCount: number;
  suggestedCustomers: EDespatchCustomerSuggestionDto[];
  lines: EDespatchPreviewLineDto[];
}

// ============================================================================
// E-İrsaliye Ortak Modelleri
// ============================================================================

export interface SendEDespatchHttpRequest {
  plaque: string;
  driverNameSurname: string;
  driverTckn: string;
}

export enum EDespatchDocumentType {
  OutgoingCompanyShipment = 1,
  CompanyReturn = 2,
  InterWarehouseShipment = 3,
  WarehouseReturn = 4
}

export interface SendEDespatchResponse {
  documentType: EDespatchDocumentType;
  documentSerie: string;
  documentOrderNo: number;
  eDespatchDocumentNo: string;
  eDespatchUuid: string;
  serviceDocumentId: string;
  serviceDocumentNumber: string;
  sentAt: string;
  endpointUrl: string;
}
