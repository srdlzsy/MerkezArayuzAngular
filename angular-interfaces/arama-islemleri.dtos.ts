/**
 * Arama ve Lookup DTO'ları
 * FurpaMerkezApi v1.0
 */

// ============================================================================
// Ürün Arama
// ============================================================================

export interface ProductSearchHttpRequest {
  warehouseNo?: number;
  barcode?: string;
  stockCode?: string;
  stockName?: string;
  supplierCode?: string;
  companyCode?: string;
  take?: number;
}

export interface ProductLookupItemDto {
  warehouseNo: number;
  barcode: string;
  stockCode: string;
  stockName: string;
  price: number;
  priceTypeCode: number;
  unitName: string;
  unitMultiplier: number;
  secondaryUnitName: string;
  secondaryUnitMultiplier: number;
  salesBlockCode: number | null;
  orderBlockCode: number | null;
  goodsAcceptanceBlockCode: number | null;
  isSalesBlocked: boolean;
  isOrderBlocked: boolean;
  isGoodsAcceptanceBlocked: boolean;
  productManagerCode: string;
}

export interface BarcodeResolutionDto {
  isFound: boolean;
  barcode: string;
  warehouseNo: number;
  screenCode: string | null;
  resolutionSource: string;
  stockCode: string | null;
  stockName: string | null;
  matchedBarcode: string | null;
  primaryBarcode: string | null;
  caseBarcode: string | null;
  unitsPerCase: number | null;
  matchedUnitPointer: number | null;
  matchedUnitName: string | null;
  matchedUnitMultiplier: number | null;
  isBlocked: boolean;
  isSalesBlocked: boolean;
  isOrderBlocked: boolean;
  isGoodsAcceptanceBlocked: boolean;
  isUsableInScreen: boolean;
  usabilityReason: string | null;
  defaultSupplierCode: string | null;
  defaultSupplierName: string | null;
}

export interface ProductCustomerSuggestionItemDto {
  customerCode: string;
  customerName: string;
  taxNoOrTckn: string | null;
  isDefaultSupplier: boolean;
  movementCount: number;
  lastMovementDate: string | null;
  lastDocumentNo: string | null;
  sources: string[];
}

export interface ProductCustomerSuggestionsDto {
  isProductFound: boolean;
  stockCode: string;
  stockName: string;
  defaultSupplierCode: string | null;
  defaultSupplierName: string | null;
  suggestions: ProductCustomerSuggestionItemDto[];
}

// ============================================================================
// Cari/Müşteri Arama
// ============================================================================

export interface CustomerSearchHttpRequest {
  searchText: string;
  take?: number;
}

export interface CustomerLookupItemDto {
  customerCode: string;
  customerName: string;
  customerTitle: string;
  customerDisplayName: string;
  taxNumber: string;
  representativeCode: string;
  representativeName: string;
  invoiceAddressNo: number | null;
  shippingAddressNo: number | null;
  isLocked: boolean;
  isClosed: boolean;
}

// ============================================================================
// Depo Arama
// ============================================================================

export interface WarehouseSearchHttpRequest {
  searchText?: string;
  warehouseNo?: number;
  take?: number;
}

export interface WarehouseLookupItemDto {
  warehouseNo: number;
  warehouseName: string;
  companyNo: number | null;
  branchNo: number | null;
  groupCode: string;
  warehouseType: number | null;
  responsibilityCenterCode: string;
  projectCode: string;
  address: string;
  district: string;
  province: string;
  isInventoryExcluded: boolean;
}

// ============================================================================
// Genel Arama Parametreleri
// ============================================================================

export interface WarehouseOrderDateRangeHttpRequest {
  warehouseNo?: number;
  startDate: string;
  endDate: string;
}
