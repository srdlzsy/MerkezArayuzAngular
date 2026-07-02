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
  | 'IssuedWarehouseOrder';

export type DocumentFlowStatus = 'Succeeded' | 'Failed';

export type DocumentFlowStep =
  | 'DocumentCreated'
  | 'OrderCreated'
  | 'EDespatchSubmission'
  | 'WarehouseReceivingAccepted';

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
