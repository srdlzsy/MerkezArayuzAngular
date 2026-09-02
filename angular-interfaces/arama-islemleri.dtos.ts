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
  purchasePrice: number | null;
  purchaseGrossPrice: number | null;
  purchasePriceSource: string | null;
  purchaseSupplierCode: string | null;
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
  requestedBarcode: string | null;
  lookupBarcode: string | null;
  isVariableWeightBarcode: boolean;
  embeddedQuantity: number | null;
  embeddedQuantityUnit: string | null;
  isBarcodeCheckDigitValid: boolean | null;
}

export interface VarYokSearchHttpRequest {
  warehouseNo?: number;
  barcode?: string;
  stockCode?: string;
  stockName?: string;
  take?: number;
}

export interface VarYokLookupItemDto extends ProductLookupItemDto {
  warehouseName: string | null;
  currentStockQuantity: number;
  hasStock: boolean;
}

export interface BarcodeResolutionHttpRequest {
  warehouseNo?: number | null;
  operationType?: string | null;
  targetWarehouseNo?: number | null;
  supplierCode?: string | null;
  companyCode?: string | null;
  isRefund?: boolean | null;
  screenCode?: string | null;
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
  unitMultiplier: number | null;
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
  lookupBarcode: string | null;
  isVariableWeightBarcode: boolean;
  embeddedQuantity: number | null;
  embeddedQuantityUnit: string | null;
  isBarcodeCheckDigitValid: boolean | null;
  barcodeKind: string | null;
  isPrimaryBarcode: boolean;
  isCaseBarcode: boolean;
  isAlternativeBarcode: boolean;
  matchedUnitsPerCase: number | null;
  operationType: string | null;
  targetWarehouseNo: number | null;
  isAllowedForTargetWarehouse: boolean | null;
  targetWarehouseReason: string | null;
  productModelCode: string | null;
  targetWarehouseModelCodes: string[];
  supplierCode: string | null;
  hasPurchaseRequirement: boolean | null;
  purchaseRequirementReason: string | null;
  salesPrice: number | null;
  priceTypeCode: number | null;
  purchasePrice: number | null;
  purchaseGrossPrice: number | null;
  purchasePriceSource: string | null;
  purchaseSupplierCode: string | null;
  isPassive: boolean;
  isUsableInOperation: boolean;
  operationDecision: string | null;
  warnings: string[];
  errors: string[];
}

export interface ProductCustomerSuggestionItemDto {
  customerCode: string;
  customerName: string;
  customerTitle?: string | null;
  customerDisplayName?: string | null;
  selectionLabel?: string | null;
  groupCode?: string | null;
  representativeName?: string | null;
  sameTaxCustomerCount?: number | null;
  taxNoOrTckn: string | null;
  isDefaultSupplier: boolean;
  movementCount: number;
  lastMovementDate: string | null;
  lastDocumentNo: string | null;
  sources: string[];
}

export interface ProductCustomerSuggestionHttpRequest {
  warehouseNo?: number | null;
  take?: number;
}

export interface ProductCustomerSuggestionsDto {
  isProductFound: boolean;
  stockCode: string;
  stockName: string;
  defaultSupplierCode: string | null;
  defaultSupplierName: string | null;
  suggestions: ProductCustomerSuggestionItemDto[];
}

export interface ProductLastTagDto {
  branchNo: number;
  branchName: string | null;
  productionCity: string | null;
  stockCode: string;
  stockName: string | null;
  salesPrice: number;
  productionDistrict: string | null;
  productName: string | null;
  goodsType: string | null;
  goodsGenus: string | null;
  quantity: number;
  takenTag: string | null;
  buyer: string | null;
  productionDate: string | null;
  buyingPrice: number;
  shippingDate: string | null;
  manufacturer: string | null;
  productUnit: string | null;
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
  taxIdentityNo?: string | null;
  taxOfficeNo?: string | null;
  taxOfficeName?: string | null;
  mainCustomerCode?: string | null;
  regionCode?: string | null;
  groupCode?: string | null;
  sectorCode?: string | null;
  representativeCode: string;
  representativeName: string;
  mobilePhone?: string | null;
  email?: string | null;
  invoiceAddressNo: number | null;
  shippingAddressNo: number | null;
  isLocked: boolean;
  isClosed: boolean;
  isEInvoiceCustomer?: boolean | null;
  isEDespatchCustomer?: boolean | null;
  sameTaxCustomerCount?: number | null;
  selectionLabel?: string | null;
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

export interface SourceWarehouseLookupItemDto {
  sourceWarehouseNo: number;
  sourceWarehouseName: string;
  modelCodes: string[];
  modelNames: string[];
  displayName: string;
}

// ============================================================================
// Genel Arama Parametreleri
// ============================================================================

export interface WarehouseOrderDateRangeHttpRequest {
  warehouseNo?: number;
  startDate: string;
  endDate: string;
}
