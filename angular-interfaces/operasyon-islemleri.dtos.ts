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
