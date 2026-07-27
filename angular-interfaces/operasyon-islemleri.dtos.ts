/**
 * Operasyon Islemleri DTOs - Furpa Merkez API contract models
 */

// ============================================================================
// Legacy Modelleri (uyumluluk için)
// ============================================================================

export interface IOperationJobDto {
  jobId: string;
  operation: string;
  status: string;
  warehouseNo: number | null;
  createdAtUtc: string | null;
}

export interface IOperationJobFileDto {
  fileName?: string | null;
  localPath?: string | null;
  networkPath?: string | null;
}

export interface IOperationJobDetailDto extends IOperationJobDto {
  requestedByUserId: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  message: string | null;
  errorMessage: string | null;
  files: IOperationJobFileDto[];
}

export interface IAuthorizationFileItemDto {
  id: number;
  name: string;
  r: boolean;
  x: boolean;
  z: boolean;
  updateDate: string | null;
}

export interface ISaveAuthorizationFileRequestApiDto {
  id: number;
  name: string;
  r: boolean;
  x: boolean;
  z: boolean;
  updateDate?: string | null;
}

// ============================================================================
// Güncellenmiş Operation Job Modelleri
// ============================================================================

export interface OperationJobDto {
  jobId: string;
  operation: string;
  status: string;
  warehouseNo: number;
  createdAtUtc: string;
}

export interface OperationJobDetailDto {
  jobId: string;
  operation: string;
  status: string;
  warehouseNo: number;
  requestedByUserId: string;
  createdAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  message: string | null;
  errorMessage: string | null;
  files: GeneratedOperationFileDto[];
}

export interface GeneratedOperationFileDto {
  fileName: string;
  localPath: string;
  networkPath: string | null;
}

// ============================================================================
// Güncellenmiş Authorization File Modelleri
// ============================================================================

export interface AuthorizationFileDto {
  id: number;
  updateDate: string;
  name: string;
  z: boolean;
  r: boolean;
  x: boolean;
}

export interface SaveAuthorizationFileHttpRequest {
  id: number;
  updateDate?: string;
  name: string;
  z: boolean;
  r: boolean;
  x: boolean;
}

// ============================================================================
// Belge Akis Takibi Modelleri
// ============================================================================

export type DocumentFlowType =
  | 'CompanyShipment'
  | 'InterWarehouseShipment'
  | 'CompanyReturn'
  | 'WarehouseReturn'
  | 'CompanyReceiving'
  | 'IssuedCompanyOrder'
  | 'IssuedWarehouseOrder'
  | 'StockCard'
  | 'WarehouseCard'
  | 'CustomerCard'
  | 'StockSalesPrice'
  | 'StockMovementDocument'
  | 'CustomerMovementDocument';

export type DocumentFlowStatus = 'Succeeded' | 'Failed';

export type DocumentFlowStep =
  | 'DocumentCreated'
  | 'OrderCreated'
  | 'EDespatchSubmission'
  | 'WarehouseReceivingAccepted'
  | 'DocumentUpdated'
  | 'DocumentDeleted';

export interface DocumentFlowListHttpRequest {
  warehouseNo?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  documentType?: DocumentFlowType | string | null;
  status?: DocumentFlowStatus | string | null;
  search?: string | null;
  take?: number | null;
}

export interface DocumentFlowListResponse {
  trackingEnabled: boolean;
  totalCount: number;
  items: DocumentFlowListItemDto[];
}

export interface DocumentFlowListItemDto {
  id: string;
  documentType: DocumentFlowType | string;
  sourceWarehouseNo: number;
  targetWarehouseNo: number | null;
  documentSerie: string;
  documentOrderNo: number;
  documentNo: string | null;
  externalDocumentNo: string | null;
  externalUuid: string | null;
  status: DocumentFlowStatus | string;
  currentStep: DocumentFlowStep | string;
  lastError: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface DocumentFlowDetailDto extends DocumentFlowListItemDto {
  flowKey: string;
  lastChangedByUserId: string | null;
  events: DocumentFlowEventDto[];
}

export interface DocumentFlowEventDto {
  id: string;
  step: DocumentFlowStep | string;
  status: DocumentFlowStatus | string;
  message: string;
  error: string | null;
  changedByUserId: string | null;
  occurredAtUtc: string;
}

// ============================================================================
// Depo Operasyon Paneli Modelleri
// ============================================================================

export type WarehouseOperationHealthStatus = 'Critical' | 'Warning' | 'Healthy';

export interface WarehouseOperationPanelHttpRequest {
  date?: string | null;
}

export interface WarehouseOperationPanelSummaryDto {
  warehouseCount: number;
  todayShipmentCount: number;
  todayReceivingCount: number;
  pendingReceivingCount: number;
  incompleteOperationCount: number;
  failedEDespatchCount: number;
}

export interface WarehouseOperationHighlightDto {
  warehouseNo: number;
  warehouseName: string;
  value: number;
}

export interface WarehouseOperationPanelItemDto {
  warehouseNo: number;
  warehouseName: string;
  todayShipmentCount: number;
  todayReceivingCount: number;
  pendingReceivingCount: number;
  incompleteOperationCount: number;
  failedEDespatchCount: number;
  averageReceivingMinutes: number;
  healthStatus: WarehouseOperationHealthStatus | string;
}

export interface WarehouseOperationPanelResponse {
  date: string;
  generatedAtUtc: string;
  trackingEnabled: boolean;
  summary: WarehouseOperationPanelSummaryDto;
  busiestWarehouse: WarehouseOperationHighlightDto | null;
  slowestWarehouse: WarehouseOperationHighlightDto | null;
  warehouses: WarehouseOperationPanelItemDto[];
}

// ============================================================================
// Urun Dagilimlari Modelleri
// ============================================================================

export interface ProductDistributionCenterDto {
  warehouseNo: number;
  warehouseName: string;
  regionCode?: string | null;
  regionName?: string | null;
}

export interface ProductDistributionWarehouseDto extends ProductDistributionCenterDto {}

export interface ProductDistributionStockDto {
  stockCode: string;
  stockName?: string | null;
  packageFactor: number;
  unitName?: string | null;
  barcode?: string | null;
}

export interface ProductDistributionStatusDto {
  code: number;
  name: string;
  description?: string | null;
  severity?: string | null;
}

export interface ProductDistributionSummaryDto {
  totalCaseQuantity: number;
  targetCaseQuantity?: number | null;
  allocatedCaseQuantity: number;
  caseDifference: number;
  totalUnitQuantity?: number | null;
  lineCount?: number | null;
  branchCount?: number | null;
  salesDayCount?: number | null;
  referenceDate?: string | null;
  isBalanced: boolean;
  message?: string | null;
}

export interface ProductDistributionLineDto {
  warehouseNo: number;
  warehouseName?: string | null;
  regionCode?: string | null;
  regionName?: string | null;
  caseQuantity: number;
  unitQuantity: number;
  lastSalesQuantity: number;
  currentStockQuantity?: number | null;
  companyAverageDailySales?: number | null;
  branchAverageDailySales?: number | null;
  quantityUnitName?: string | null;
  caseUnitName?: string | null;
  salesSharePercent?: number | null;
  caseSharePercent?: number | null;
  originalCaseQuantity?: number | null;
  caseDelta?: number | null;
  isLocked?: boolean | null;
  reason?: string | null;
}

export interface ProductDistributionProposalHttpRequest {
  stockCode: string;
  distributionCenterWarehouseNo: number;
  totalCaseQuantity?: number | null;
  targetCaseQuantity?: number | null;
  allocatedCaseQuantity?: number | null;
  salesDayCount?: number | null;
  referenceDate?: string | null;
  includeBranchesWithoutSales?: boolean | null;
}

export interface ProductDistributionBalanceLineHttpRequest {
  warehouseNo: number;
  warehouseName?: string | null;
  regionCode?: string | null;
  lastSalesQuantity: number;
  currentStockQuantity: number;
  companyAverageDailySales: number;
  branchAverageDailySales: number;
  caseQuantity: number;
  isLocked: boolean;
}

export interface ProductDistributionBalanceHttpRequest {
  stockCode: string;
  targetCaseQuantity: number;
  salesDayCount?: number | null;
  referenceDate?: string | null;
  lines: ProductDistributionBalanceLineHttpRequest[];
}

export interface ProductDistributionBalanceLineDto extends ProductDistributionLineDto {
  originalCaseQuantity: number;
  caseDelta: number;
  isLocked: boolean;
}

export interface ProductDistributionBalanceDto {
  stock: ProductDistributionStockDto;
  summary: ProductDistributionSummaryDto;
  lines: ProductDistributionBalanceLineDto[];
  warnings?: string[] | null;
}

export interface ProductDistributionProposalDto {
  stock: ProductDistributionStockDto;
  distributionCenter?: ProductDistributionWarehouseDto | null;
  summary: ProductDistributionSummaryDto;
  lines: ProductDistributionLineDto[];
  generatedAtUtc?: string | null;
  warnings?: string[] | null;
}

export interface ProductDistributionListHttpRequest {
  createdFrom?: string | null;
  createdTo?: string | null;
  documentNo?: string | number | null;
  stockCode?: string | null;
  distributionCenterWarehouseNo?: number | null;
  status?: number | null;
  take?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  statusCode?: number | null;
}

export interface ProductDistributionListItemDto {
  documentNo: string;
  documentDate?: string | null;
  stockCode: string;
  stockName?: string | null;
  distributionCenterWarehouseNo: number;
  distributionCenterWarehouseName?: string | null;
  totalCaseQuantity: number;
  targetCaseQuantity?: number | null;
  allocatedCaseQuantity?: number | null;
  totalUnitQuantity?: number | null;
  lineCount?: number | null;
  status: ProductDistributionStatusDto;
  distributedBy?: string | null;
  stock?: ProductDistributionStockDto | null;
  distributionCenter?: ProductDistributionWarehouseDto | null;
  createdAt?: string | null;
  finalizedAt?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  notifiedAtUtc?: string | null;
  finalizedAtUtc?: string | null;
}

export interface ProductDistributionHeaderDto {
  documentNo: string;
  status: ProductDistributionStatusDto;
  createdAt?: string | null;
  finalizedAt?: string | null;
  stock: ProductDistributionStockDto;
  distributionCenter: ProductDistributionWarehouseDto;
  distributedBy?: string | null;
}

export interface ProductDistributionActionDto {
  code: string;
  label: string;
  enabled: boolean;
  reason?: string | null;
}

export interface ProductDistributionDetailDto extends ProductDistributionListItemDto {
  header?: ProductDistributionHeaderDto | null;
  summary?: ProductDistributionSummaryDto | null;
  lines: ProductDistributionLineDto[];
  availableActions?: ProductDistributionActionDto[] | null;
  notification?: ProductDistributionNotificationDto | null;
  finalizeResult?: ProductDistributionFinalizeDto | null;
}

export interface ProductDistributionSaveLineHttpRequest {
  warehouseNo: number;
  caseQuantity: number;
  unitQuantity?: number | null;
  lastSalesQuantity?: number | null;
  companyAverageDailySales?: number | null;
  branchAverageDailySales?: number | null;
}

export interface ProductDistributionSaveHttpRequest {
  stockCode: string;
  distributionCenterWarehouseNo: number;
  totalCaseQuantity: number;
  targetCaseQuantity?: number | null;
  allocatedCaseQuantity?: number | null;
  distributedBy?: string | null;
  lines: ProductDistributionSaveLineHttpRequest[];
}

export interface ProductDistributionNotifyHttpRequest {
  notifyBy?: string | null;
  markStockOrderingStopped?: boolean | null;
}

export interface ProductDistributionNotificationRecipientDto {
  regionCode?: string | null;
  regionName?: string | null;
  managerName?: string | null;
  email?: string | null;
  recipientEmail?: string | null;
  lineCount: number;
  totalCaseQuantity: number;
  totalUnitQuantity: number;
}

export interface ProductDistributionNotificationMailResultDto {
  regionCode?: string | null;
  managerName?: string | null;
  email?: string | null;
  sent: boolean;
  message?: string | null;
}

export interface ProductDistributionNotificationDto {
  documentNo: string;
  status?: ProductDistributionStatusDto | null;
  statusChanged?: boolean | null;
  stockOrderingStopped?: boolean | null;
  subject?: string | null;
  message?: string | null;
  mailSendingEnabled?: boolean | null;
  sentEmailCount?: number | null;
  failedEmailCount?: number | null;
  mailResults?: ProductDistributionNotificationMailResultDto[] | null;
  recipients: ProductDistributionNotificationRecipientDto[];
}

export interface ProductDistributionFinalizeHttpRequest {
  finalizeBy?: string | null;
  orderDate?: string | null;
  deliveryDate?: string | null;
  allowFinalizeWithoutNotification?: boolean | null;
}

export interface ProductDistributionOrderDto {
  warehouseNo?: number | null;
  warehouseName?: string | null;
  documentSerie: string;
  documentOrderNo: number;
  inWarehouseNo?: number | null;
  inWarehouseName?: string | null;
  outWarehouseNo?: number | null;
  outWarehouseName?: string | null;
  lineCount?: number | null;
  alreadyExisted: boolean;
  totalCaseQuantity?: number | null;
  totalUnitQuantity?: number | null;
}

export type ProductDistributionWarehouseOrderDto = ProductDistributionOrderDto;

export interface ProductDistributionFinalizeDto {
  documentNo: string;
  status?: ProductDistributionStatusDto | null;
  message?: string | null;
  finalizedAt?: string | null;
  createdDocumentCount: number;
  existingDocumentCount: number;
  totalUnitQuantity?: number | null;
  orders: ProductDistributionOrderDto[];
}

export interface ProductDistributionDeleteDto {
  documentNo: string;
  deleted: boolean;
  message?: string | null;
}
