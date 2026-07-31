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
