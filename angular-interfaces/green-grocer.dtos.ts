export interface GreenGrocerReportDateHttpRequest {
  date: string;
  dateToGet?: string;
}

export interface GreenGrocerProductCaseInfoDto {
  inputQuantity: number | null;
  inputMode: GreenGrocerProductCaseInputMode | string | null;
  estimatedQuantity: number | null;
  microUnit: string | null;
  averageKgPerCase: number | null;
  unitsPerCase: number | null;
  averageSource: string | null;
  confidence: GreenGrocerProductCaseConfidence | string | null;
  averageRecordCount: number | null;
  averageCaseCount: number | null;
  coefficientOfVariation: number | null;
}

export interface IFurpaGreenGrocerSummaryReportItemApiDto {
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  caseInfo?: GreenGrocerProductCaseInfoDto | null;
}

export interface IFurpaGreenGrocerBranchReportItemApiDto {
  orderDate: string;
  branchNo: number;
  branchName: string;
  documentSerie: string;
  documentOrderNo: number;
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  caseInfo?: GreenGrocerProductCaseInfoDto | null;
}

export interface IFurpaGreenGrocerLazyBranchApiDto {
  branchNo: number;
  branchName: string;
  regionCode: string;
}

export interface IFurpaGreenGrocerBranchReportResponseApiDto {
  items: IFurpaGreenGrocerBranchReportItemApiDto[];
  lazyBranches: IFurpaGreenGrocerLazyBranchApiDto[];
}

export interface IFurpaGreenGrocerProductReportItemApiDto {
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalQuantity?: number | null;
  caseInfo?: GreenGrocerProductCaseInfoDto | null;
  items?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branchItems?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branches?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branchBreakdowns?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  documents?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  details?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  lines?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
}

export interface IFurpaGreenGrocerProductReportResponseApiDto {
  items: IFurpaGreenGrocerProductReportItemApiDto[];
}

export type IFurpaGreenGrocerProductReportApiResponse =
  | IFurpaGreenGrocerProductReportItemApiDto[]
  | IFurpaGreenGrocerProductReportResponseApiDto;

export interface IFurpaGreenGrocerDeleteOrderResponseApiDto {
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  deletedLineCount: number;
  latestCreateDate: string;
  deletedAt: string;
}

export type GreenGrocerProductCaseInputMode =
  | 'Case'
  | 'Pack'
  | 'Piece'
  | 'KgDirect'
  | 'Sarf'
  | string;

export type GreenGrocerProductCaseConversionMode =
  | 'LabelAverageKgPerCase'
  | 'ManualKgPerCase'
  | 'FixedUnitsPerCase'
  | 'DirectQuantity'
  | 'ManualOnly'
  | 'Blocked'
  | string;

export type GreenGrocerProductCaseConfidence = 'High' | 'Medium' | 'Low' | 'Blocked' | string;

export interface GreenGrocerProductCaseProfileListHttpRequest {
  search?: string | null;
  includeInactive?: boolean | null;
  take?: number | null;
}

export interface SaveGreenGrocerProductCaseProfileHttpRequest {
  isActive?: boolean | null;
  inputMode?: GreenGrocerProductCaseInputMode | null;
  conversionMode?: GreenGrocerProductCaseConversionMode | null;
  manualKgPerCase?: number | null;
  manualUnitsPerCase?: number | null;
  minExpectedKgPerCase?: number | null;
  maxExpectedKgPerCase?: number | null;
  averageWindowDays?: number | null;
  minAverageRecordCount?: number | null;
  minAverageCaseCount?: number | null;
  maxCoefficientOfVariation?: number | null;
  requiresManualApproval?: boolean | null;
  allowOrderLinking?: boolean | null;
  overDeliveryTolerancePercent?: number | null;
  notes?: string | null;
}

export interface GreenGrocerProductCaseProfileDto
  extends SaveGreenGrocerProductCaseProfileHttpRequest {
  id: string;
  stockCode: string;
  stockName: string;
  modelCode: string | null;
  modelName: string | null;
  unit1: string | null;
  unit2: string | null;
  unit2Factor: number | null;
  isActive: boolean;
  inputMode: GreenGrocerProductCaseInputMode;
  conversionMode: GreenGrocerProductCaseConversionMode;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface GreenGrocerProductCaseResolutionHttpRequest {
  stockCode: string;
  inputQuantity: number;
  sourceWarehouseNo?: number | null;
  targetWarehouseNo?: number | null;
  orderDate?: string | null;
}

export interface GreenGrocerProductCaseResolutionDto {
  stockCode: string;
  stockName: string | null;
  modelCode: string | null;
  modelName: string | null;
  unit1: string | null;
  unit2: string | null;
  unit2Factor: number | null;
  inputQuantity: number;
  inputMode: GreenGrocerProductCaseInputMode;
  conversionMode: GreenGrocerProductCaseConversionMode;
  microUnit: string | null;
  estimatedQuantity: number | null;
  averageKgPerCase: number | null;
  unitsPerCase: number | null;
  averageSource: string | null;
  averageRecordCount: number | null;
  averageCaseCount: number | null;
  coefficientOfVariation: number | null;
  latestLabelDate: string | null;
  confidence: GreenGrocerProductCaseConfidence;
  requiresManualApproval: boolean;
  isOrderLinkable: boolean;
  isUsable: boolean;
  warnings: string[];
  errors: string[];
}

export type GreenGrocerOperationsTypeCode = '10' | '11' | '12' | '23' | 'all' | 'tum' | string;
export type GreenGrocerOperationsAdjustmentDirection = 'increase' | 'decrease' | string;

export interface GreenGrocerOperationsOverviewHttpRequest {
  startDate?: string | null;
  endDate?: string | null;
  warehouseNo?: number | null;
  typeCode?: GreenGrocerOperationsTypeCode | null;
  search?: string | null;
  onlyWithActivity?: boolean | null;
  take?: number | null;
}

export interface GreenGrocerOperationsStatusSummaryDto {
  statusCode: string;
  statusName: string;
  productCount: number;
  currentStockQuantity: number;
  purchaseQuantity: number;
  adjustmentNetQuantity: number;
  orderEstimatedQuantity: number;
  shipmentQuantity: number;
}

export interface GreenGrocerOperationsOverviewItemDto {
  stockCode: string;
  stockName: string;
  modelCode: string | null;
  unitName: string | null;
  currentStockQuantity: number;
  purchaseQuantity: number;
  purchaseAmount: number;
  purchaseUnitPrice: number;
  purchaseDocumentCount: number;
  lastPurchaseDate: string | null;
  lastPurchaseDocument: string | null;
  lastSupplierCode: string | null;
  lastSupplierName: string | null;
  adjustmentInQuantity: number;
  adjustmentOutQuantity: number;
  adjustmentNetQuantity: number;
  adjustmentDocumentCount: number;
  lastAdjustmentDate: string | null;
  lastAdjustmentDocument: string | null;
  lastAdjustmentSeries: string | null;
  lastAdjustmentReason: string | null;
  orderInputQuantity: number;
  orderEstimatedQuantity: number;
  orderMicroQuantity: number;
  orderLineCount: number;
  orderBranchCount: number;
  shipmentQuantity: number;
  shipmentDocumentCount: number;
  shipmentBranchCount: number;
  lastShipmentDate: string | null;
  lastShipmentDocument: string | null;
  lastCountDate: string | null;
  lastCountDocumentNo: number | null;
  lastCountQuantity: number | null;
  systemQuantityAtCountDate: number | null;
  countDifferenceAtCountDate: number | null;
  primaryStatusCode: string;
  primaryStatusName: string;
  flags: string[];
}

export interface GreenGrocerOperationsOverviewDto {
  warehouseNo: number | null;
  warehouseName: string | null;
  startDate: string;
  endDate: string;
  productCount: number;
  totalCurrentStockQuantity: number;
  totalPurchaseQuantity: number;
  totalPurchaseAmount: number;
  totalAdjustmentInQuantity: number;
  totalAdjustmentOutQuantity: number;
  totalAdjustmentNetQuantity: number;
  totalOrderInputQuantity: number;
  totalOrderEstimatedQuantity: number;
  totalShipmentQuantity: number;
  totalLatestCountQuantity: number;
  statusSummaries: GreenGrocerOperationsStatusSummaryDto[];
  items: GreenGrocerOperationsOverviewItemDto[];
}

export interface GreenGrocerOperationsAdjustmentLineHttpRequest {
  stockCode: string;
  quantity: number;
  unitPointer?: number | null;
  unitPrice?: number | null;
  description?: string | null;
  partyCode?: string | null;
  lotNo?: string | null;
  projectCode?: string | null;
}

export interface GreenGrocerOperationsAdjustmentPreviewHttpRequest {
  warehouseNo?: number | null;
  direction: GreenGrocerOperationsAdjustmentDirection;
  movementDate?: string | null;
  documentSerie?: string | null;
  reasonCode?: string | null;
  lines: GreenGrocerOperationsAdjustmentLineHttpRequest[];
}

export interface GreenGrocerOperationsAdjustmentPreviewDto {
  warehouseNo: number | null;
  counterWarehouseNo: number | null;
  direction: GreenGrocerOperationsAdjustmentDirection;
  directionName: string;
  documentSerie: string;
  movementType: number;
  movementGenre: number;
  documentType: number;
  reasonCode: string;
  reasonName: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface GreenGrocerOperationsAdjustmentApplyHttpRequest
  extends GreenGrocerOperationsAdjustmentPreviewHttpRequest {
  clientRequestId: string;
  documentDate?: string | null;
  documentNo?: string | null;
  counterWarehouseNo?: number | null;
  description?: string | null;
  creator?: string | null;
  acceptor?: string | null;
}

export interface GreenGrocerOperationsAdjustmentApplyDto
  extends GreenGrocerOperationsAdjustmentPreviewDto {
  clientRequestId: string;
  status: string;
  documentOrderNo: number;
  movementDate: string;
  documentDate: string;
  documentNo: string | null;
  connectionStringName: string;
  movementGuids: string[];
}
