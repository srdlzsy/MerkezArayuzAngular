/**
 * Stok İşlemleri DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Zayiat ve Masraf Fişi Modelleri
// ============================================================================

export interface StockReceiptListItemDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  warehouseName: string;
  creator: string;
  acceptor: string;
  workOrderExpenseCode: string;
  documentType: number;
  movementType: number;
  movementGenre: number;
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface StockReceiptHeaderDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  warehouseName: string;
  creator: string;
  acceptor: string;
  workOrderExpenseCode: string;
  documentType: number;
  movementType: number;
  movementGenre: number;
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface StockReceiptLineItemDto {
  rowNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  quantity: number;
  quantity2: number;
  unitPrice: number;
  lineAmount: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
}

export interface StockReceiptDetailDto {
  header: StockReceiptHeaderDto;
  items: StockReceiptLineItemDto[];
}

export interface CreateStockReceiptHttpRequest {
  creator: string;
  acceptor: string;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  description: string;
  lines: CreateStockReceiptLineHttpRequest[];
}

export interface CreateStockReceiptLineHttpRequest {
  stockCode: string;
  quantity: number;
  unitPointer: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
}

export interface CreateStockReceiptResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  warehouseNo: number;
  creator: string;
  acceptor: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

// ============================================================================
// Sayım Sonucu Modelleri
// ============================================================================

export interface InventoryCountListItemDto {
  documentDate: string | null;
  createdAt: string;
  documentNo: number;
  warehouseNo: number;
  warehouseName: string;
  name: string;
  lineCount: number;
  totalQuantity: number;
}

export interface InventoryCountHeaderDto {
  documentDate: string | null;
  createdAt: string;
  documentNo: number;
  warehouseNo: number;
  warehouseName: string;
  name: string;
  lineCount: number;
  totalQuantity: number;
}

export interface InventoryCountLineItemDto {
  rowNo: number;
  stockCode: string;
  stockName: string;
  barcode: string;
  unitName: string;
  unitPointer: number;
  quantity1: number;
  quantity2: number;
  quantity3: number;
  quantity4: number;
  quantity5: number;
}

export interface InventoryCountDetailDto {
  header: InventoryCountHeaderDto;
  items: InventoryCountLineItemDto[];
}

export interface CreateInventoryCountHttpRequest {
  clientRequestId?: string;
  name: string;
  documentDate: string;
  lines: CreateInventoryCountLineHttpRequest[];
}

export interface CreateInventoryCountLineHttpRequest {
  stockCode: string;
  quantity: number;
  barcode?: string;
  unitPointer: number;
}

export interface CreateInventoryCountResponse {
  documentNo: number;
  documentDate: string;
  warehouseNo: number;
  name: string;
  lineCount: number;
  totalQuantity: number;
  writeConnectionName: string;
}

// ============================================================================
// Etiket Belgesi Modelleri
// ============================================================================

export interface LabelDocumentListItemDto {
  documentId: number;
  createDate: string;
  warehouseNo: number;
}

export interface LabelDocumentProductDto {
  package: string;
  packageFactor: string;
  lastUpdateDate: string;
  barcodeContent: string;
  bulkSaleTaxRate: number;
  retailSaleTaxRate: number;
  productCode: string;
  productName: string;
  barcode: string;
  oldPrice: number;
  price: number;
  priceChangeDate: string;
  supplierCode: string;
  isClosedToSale: number;
  isClosedToOrder: number;
  isClosedToReceiving: number;
  isPassive: boolean;
  unitName: string;
  unitName2: string;
  typeCode: string;
  isDomestic: number;
  origin: string;
  unitPriceFactor: number;
  alternativeUnitName: string;
  pluNo: number;
  sectorCode: string;
  shelfLife: number;
  type: string;
  orderGuid: string | null;
  canBeCalled: boolean;
  quantity: number;
  deliveredQuantity: number;
  documentOrderNo: number;
  categoryCode: string;
}

export interface LabelPriceChangedProductDto {
  productCode: string;
  productName: string;
  pluNo: number;
  alternativeUnitName: string;
  barcode: string;
  isDomestic: number;
  oldPrice: number;
  origin: string;
  price: number;
  priceChangeDate: string;
  unitPriceFactor: number;
  unitName: string;
}

export interface LabelTagDto {
  branchNo: number;
  branchName: string;
  productionCity: string;
  productionDistrict: string;
  productName: string;
  goodsType: string;
  goodsGenus: string;
  quantity: number;
  takenTag: string;
  buyer: string;
  productionDate: string;
  buyingPrice: number;
  shippingDate: string;
  manufacturer: string;
}

export interface KunyeLabelTagDto extends LabelTagDto {
  stockCode: string;
  stockName: string;
  salesPrice: number;
  productUnit: string;
}

export interface CreateLabelDocumentHttpRequest {
  lines: CreateLabelDocumentLineHttpRequest[];
}

export interface CreateLabelDocumentLineHttpRequest {
  productCode: string;
}

export interface CreateLabelDocumentResponse {
  documentId: number;
  createDate: string;
  warehouseNo: number;
  lineCount: number;
}

// ============================================================================
// Virman Modelleri
// ============================================================================

export interface VirmanListItemDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  warehouseName: string;
  documentType: number;
  movementGenre: number;
  movementTypes: number[];
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface VirmanHeaderDto {
  documentDate: string | null;
  movementCreateDate: string;
  movementDate: string | null;
  documentNo: string;
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  warehouseName: string;
  documentType: number;
  movementGenre: number;
  movementTypes: number[];
  description: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface VirmanLineItemDto {
  rowNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  movementType: number;
  quantity: number;
  quantity2: number;
  unitPrice: number;
  lineAmount: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
}

export interface VirmanDetailDto {
  header: VirmanHeaderDto;
  items: VirmanLineItemDto[];
}

export interface CreateVirmanHttpRequest {
  movementDate: string;
  documentDate: string;
  documentNo: string;
  description: string;
  lines: CreateVirmanLineHttpRequest[];
}

export interface CreateVirmanLineHttpRequest {
  stockCode: string;
  movementType: number;
  quantity: number;
  unitPointer: number;
  description: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
}

export interface CreateVirmanResponse {
  documentSerie: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  warehouseNo: number;
  movementTypes: number[];
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

// ============================================================================
// Stok Anomali Merkezi Modelleri
// ============================================================================

export type StockAnomalyType =
  | 'NegativeStock'
  | 'DuplicateDocument'
  | 'ReceivingDifference'
  | 'HighQuantity'
  | 'DormantStock'
  | 'PendingInterWarehouseTransfer';

export type StockAnomalyStatus = 'Open' | 'Acknowledged' | 'Resolved' | 'Ignored';
export type StockAnomalySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface StockAnomalyListHttpRequest {
  warehouseNo?: number | null;
  type?: StockAnomalyType | null;
  status?: StockAnomalyStatus | null;
  severity?: StockAnomalySeverity | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  take?: number | null;
}

export interface StockAnomalySummaryDto {
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  ignoredCount: number;
  criticalCount: number;
  highCount: number;
}

export interface StockAnomalyListItemDto {
  id: string;
  type: StockAnomalyType | string;
  severity: StockAnomalySeverity | string;
  status: StockAnomalyStatus | string;
  warehouseNo: number;
  relatedWarehouseNo: number | null;
  warehouseName: string | null;
  relatedWarehouseName: string | null;
  productCode: string | null;
  productName: string | null;
  documentSerie: string | null;
  documentOrderNo: number | null;
  documentNo: string | null;
  quantity: number | null;
  expectedQuantity: number | null;
  actualQuantity: number | null;
  averageQuantity: number | null;
  occurredAtUtc: string | null;
  message: string;
  firstDetectedAtUtc: string;
  lastDetectedAtUtc: string;
}

export interface StockAnomalyListResponse {
  totalCount: number;
  summary: StockAnomalySummaryDto;
  items: StockAnomalyListItemDto[];
}

export interface StockAnomalyEvidenceDto {
  title?: string | null;
  description?: string | null;
  fields?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface StockAnomalyEventDto {
  id?: string | null;
  status?: StockAnomalyStatus | string | null;
  note?: string | null;
  createdAtUtc?: string | null;
  createdBy?: string | null;
  [key: string]: unknown;
}

export interface StockAnomalyDetailDto extends StockAnomalyListItemDto {
  evidence?: StockAnomalyEvidenceDto[] | Record<string, unknown> | null;
  events?: StockAnomalyEventDto[];
}

export interface StockAnomalyScanHttpRequest {
  warehouseNo?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  dormantDays?: number | null;
  pendingTransferHours?: number | null;
  highQuantityLookbackDays?: number | null;
  highQuantityMultiplier?: number | null;
  highQuantityMinimum?: number | null;
  takePerRule?: number | null;
}

export interface StockAnomalyScanRuleResultDto {
  type: StockAnomalyType | string;
  detectedCount: number;
}

export interface StockAnomalyScanResponse {
  startedAtUtc: string;
  finishedAtUtc: string;
  detectedCount: number;
  rules: StockAnomalyScanRuleResultDto[];
}

export interface StockAnomalyStatusUpdateHttpRequest {
  status: Exclude<StockAnomalyStatus, 'Open'>;
  note?: string | null;
}
