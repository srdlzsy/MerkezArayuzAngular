/**
 * Sipariş İşlemleri DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Depo Siparişi Modelleri
// ============================================================================

export interface WarehouseOrderListItemDto {
  documentKey: string | null;
  documentDate: string;
  documentSerie: string;
  documentOrderNo: number;
  documentNumber: string;
  warehouseNo: number;
  warehouseName: string;
  relatedWarehouseNo: number;
  relatedWarehouseName: string;
  inWarehouseNo: number;
  inWarehouseName: string;
  outWarehouseNo: number;
  outWarehouseName: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  deliveryDate: string | null;
}

export interface WarehouseOrderHeaderDto {
  documentKey: string | null;
  documentDate: string;
  deliveryDate: string | null;
  documentSerie: string;
  documentOrderNo: number;
  documentNumber: string;
  warehouseNo: number;
  warehouseName: string;
  relatedWarehouseNo: number;
  relatedWarehouseName: string;
  inWarehouseNo: number;
  inWarehouseName: string;
  outWarehouseNo: number;
  outWarehouseName: string;
  lineCount: number;
  totalQuantity: number;
  totalDeliveredQuantity: number;
  totalRemainingQuantity: number;
  totalAmount: number;
  isClosed: boolean;
}

export interface WarehouseOrderLineItemDto {
  lineGuid: string | null;
  lineNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  quantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  lineAmount: number;
  isClosed: boolean;
  description: string;
  packageCode: string;
  projectCode: string;
}

export interface WarehouseOrderDetailDto {
  header: WarehouseOrderHeaderDto;
  items: WarehouseOrderLineItemDto[];
}

export interface CreateIssuedWarehouseOrderHttpRequest {
  inWarehouseNo?: number;
  outWarehouseNo: number;
  orderDate: string;
  deliveryDate: string;
  description: string;
  lines: CreateIssuedWarehouseOrderLineHttpRequest[];
}

export interface CreateIssuedWarehouseOrderLineHttpRequest {
  stockCode: string;
  quantity: number;
  recommendedQuantity: number;
  unitPrice: number;
  unitPointer: number;
  description: string;
  packageCode: string;
  projectCode: string;
  responsibilityCenter: string;
}

export interface CreateIssuedWarehouseOrderResponse {
  documentSerie: string;
  documentOrderNo: number;
  orderDate: string;
  deliveryDate: string;
  inWarehouseNo: number;
  outWarehouseNo: number;
  lineCount: number;
  totalQuantity: number;
  writeConnectionName: string;
}

export interface SuggestedWarehouseOrderListItemDto {
  stockCode: string;
  stockName: string;
  modelCode: string;
  barcode: string;
  targetOnHand: number;
  sourceOnHand: number;
  salesQuantity: number;
  openIncomingOrderQuantity: number;
  packageFactor: number;
  minDay: number;
  recommendedDay: number;
  maxDay: number;
  recommendedStockQuantity: number;
  needQuantity: number;
  suggestedOrderQuantity: number;
}

export interface SuggestedWarehouseOrderListHttpRequest {
  targetWarehouseNo?: number;
  sourceWarehouseNo: number;
  lookbackDays?: number;
  fallbackRecommendedDay?: number;
}

export interface ConvertSuggestedWarehouseOrderHttpRequest {
  targetWarehouseNo?: number;
  sourceWarehouseNo: number;
  orderDate: string;
  deliveryDate: string;
  description: string;
  lines: ConvertSuggestedWarehouseOrderLineHttpRequest[];
}

export interface ConvertSuggestedWarehouseOrderLineHttpRequest {
  stockCode: string;
  quantity: number;
  recommendedQuantity: number;
  unitPrice: number;
  unitPointer: number;
  description: string;
  packageCode: string;
  projectCode: string;
  responsibilityCenter: string;
}

// ============================================================================
// Firma Siparişi Modelleri
// ============================================================================

export interface CompanyOrderListItemDto {
  documentKey: string | null;
  documentDate: string;
  deliveryDate: string | null;
  documentSerie: string;
  documentOrderNo: number;
  documentNumber: string;
  warehouseNo: number;
  customerCode: string;
  customerName: string;
  customerTitle: string;
  customerDisplayName: string;
  customerAddress: string;
  description1: string;
  description2: string;
  deliverer: string;
  receiver: string;
  canBeCalled: boolean;
  customerRepresentativeCode: string;
  lineCount: number;
  totalQuantity: number;
  totalDeliveredQuantity: number;
  totalRemainingQuantity: number;
  isClosed: boolean;
  totalAmount: number;
}

export interface CompanyOrderHeaderDto {
  documentKey: string | null;
  documentDate: string;
  deliveryDate: string | null;
  documentSerie: string;
  documentOrderNo: number;
  documentNumber: string;
  warehouseNo: number;
  warehouseName: string;
  customerCode: string;
  customerName: string;
  customerTitle: string;
  customerDisplayName: string;
  customerAddress: string;
  customerRepresentativeCode: string;
  description1: string;
  description2: string;
  deliverer: string;
  receiver: string;
  canBeCalled: boolean;
  lineCount: number;
  totalQuantity: number;
  totalDeliveredQuantity: number;
  totalRemainingQuantity: number;
  totalAmount: number;
  isClosed: boolean;
}

export interface CompanyOrderLineItemDto {
  lineNo: number;
  stockCode: string;
  stockName: string;
  unitName: string;
  unitPointer: number;
  quantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  lineAmount: number;
  isClosed: boolean;
  description: string;
  packageCode: string;
  projectCode: string;
  orderGuid: string;
}

export interface CompanyOrderDetailDto {
  header: CompanyOrderHeaderDto;
  items: CompanyOrderLineItemDto[];
}

export interface IssuedCompanyOrderListHttpRequest {
  warehouseNo?: number;
  startDate: string;
  endDate: string;
  customerCode?: string;
  onlyOpen?: boolean;
}

export interface CreateIssuedCompanyOrderHttpRequest {
  warehouseNo?: number;
  customerCode: string;
  orderDate: string;
  deliveryDate: string;
  description1: string;
  description2: string;
  deliverer: string;
  receiver: string;
  lines: CreateIssuedCompanyOrderLineHttpRequest[];
}

export interface CreateIssuedCompanyOrderLineHttpRequest {
  stockCode: string;
  quantity: number;
  recommendedQuantity: number;
  unitPrice: number;
  unitPointer: number;
  description1: string;
  description2: string;
  packageCode: string;
  projectCode: string;
  customerResponsibilityCenter: string;
  productResponsibilityCenter: string;
}

export interface CreateIssuedCompanyOrderResponse {
  documentSerie: string;
  documentOrderNo: number;
  orderDate: string;
  deliveryDate: string;
  warehouseNo: number;
  customerCode: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  writeConnectionName: string;
}

export interface SuggestedCompanyOrderListItemDto {
  supplierCode: string;
  supplierName: string;
  stockCode: string;
  stockName: string;
  modelCode: string;
  barcode: string;
  targetOnHand: number;
  salesQuantity: number;
  openCompanyOrderQuantity: number;
  packageFactor: number;
  minDay: number;
  recommendedDay: number;
  maxDay: number;
  recommendedStockQuantity: number;
  needQuantity: number;
  suggestedOrderQuantity: number;
  purchasePrice: number;
  minimumPurchaseQuantity: number;
  deliveryDay: number | null;
}

export interface SuggestedCompanyOrderListHttpRequest {
  warehouseNo?: number;
  supplierCode: string;
  lookbackDays?: number;
  fallbackRecommendedDay?: number;
}

export interface ConvertSuggestedCompanyOrderHttpRequest {
  warehouseNo?: number;
  supplierCode: string;
  orderDate: string;
  deliveryDate: string;
  description1: string;
  description2: string;
  deliverer: string;
  receiver: string;
  lines: ConvertSuggestedCompanyOrderLineHttpRequest[];
}

export interface ConvertSuggestedCompanyOrderLineHttpRequest {
  stockCode: string;
  quantity: number;
  recommendedQuantity: number;
  unitPrice: number;
  unitPointer: number;
  description1: string;
  description2: string;
  packageCode: string;
  projectCode: string;
  customerResponsibilityCenter: string;
  productResponsibilityCenter: string;
}
