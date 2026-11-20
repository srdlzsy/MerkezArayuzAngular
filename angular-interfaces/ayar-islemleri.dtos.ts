export interface DeviceTypeDto {
  id: number;
  deviceName: string;
}

export interface DeviceDto {
  id: number;
  branchNo: number;
  deviceTypeId: number;
  deviceTypeName: string;
  ipAddress: string;
  description: string;
}

export interface DeviceStatusDto {
  branchNo: number;
  deviceTypeId: number;
  deviceTypeName: string;
  ipAddress: string;
  description: string;
  online: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface SettingsTypeOptionDto {
  value: number;
  code: string;
  name: string;
  description: string;
  isKnown: boolean;
}

export interface BranchSettingsLookupsDto {
  scalesTypes: SettingsTypeOptionDto[];
  cashTypes: SettingsTypeOptionDto[];
}

export interface CashRegisterSettingsLookupsDto {
  cashTypes: SettingsTypeOptionDto[];
  terminalBanks: TerminalBankOptionDto[];
}

export interface TerminalBankOptionDto {
  paymentName: string;
  paymentTypeNo: number;
  accountCode: string;
  displayName: string;
}

export interface BranchDetailDto {
  branchNo: number;
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  scalesTypeName: string;
  scalesTypeDescription: string;
  poskonFolderPath: string;
  posGenelFolderPath: string;
}

export interface CashRegistryDto {
  detailId: number;
  branchNo: number;
  cashNo: number;
  cashRegisterNo?: number | null;
  cashType: number;
  cashRegisterType?: number | null;
  cashTypeName: string;
  cashRegisterTypeName?: string | null;
  cashTypeDescription: string;
  cashRegisterTypeDescription?: string | null;
  cashFinanceNumber?: string | null;
}

export interface CashRegisterResponse {
  branchNo: number;
  cashNo: number;
  cashType: number;
  cashTypeName: string;
  cashTypeDescription: string;
  terminals: CashRegisterTerminalDto[];
}

export interface CashRegisterTerminalDto {
  id: number;
  terminalNo: string;
  cashRegisterNo?: string | null;
  bank: string;
  terminalId: string;
  merchantNo: string;
  cashNo: number | null;
  paymentTypeNo?: number | null;
}

export interface CashRegisterTerminalLocationDto {
  terminalNo: string;
  branchNo: number;
  cashNo: number;
  bankRowCount: number;
  banks: string[];
}

export interface CashRegisterDefinitionIssueDto {
  code: string;
  severity: 'error' | 'warning' | string;
  branchNo: number;
  cashNo: number;
  terminalNo: string | null;
  bank: string | null;
  message: string;
}

export interface MoveCashRegisterTerminalGroupHttpRequest {
  targetBranchNo: number;
  targetCashNo: number;
}

export interface UpdateCashRegisterTypeHttpRequest {
  cashType: number;
}

export interface CashRegisterMessageStatusDto {
  branchNo: number;
  cashNo: number;
  cashType: number;
  cashTypeName: string;
  cashTypeDescription: string;
  state: number | null;
  stateName: string | null;
  filePath: string;
  error: string | null;
}

export interface CashierDto {
  cashierCode: number;
  cashierName: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

export interface CashierPasswordMutationDto {
  cashierCode: number;
  generatedPassword: string;
  cashier: CashierDto;
}

export interface CashierPasswordDto {
  cashierCode: number;
  cashierName: string;
  password: string;
}

export interface DespatchDriverDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  plateNumber: string;
  tckn: string;
  maskedTckn: string;
  isActive: boolean;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CreateDeviceHttpRequest {
  branchNo: number;
  deviceTypeId: number;
  ipAddress: string;
  description: string;
}

export interface CreateCashRegistryHttpRequest {
  cashNo: number;
  cashType: number;
}

export interface CreateBranchSettingsHttpRequest {
  branchNo: number;
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  poskonFolderPath: string;
  posGenelFolderPath: string;
  cashRegisters: CreateCashRegistryHttpRequest[];
}

export interface UpdateBranchSettingsHttpRequest {
  branchIpAddress: string;
  branchScalesFolderPath: string;
  scalesType: number;
  poskonFolderPath: string;
  posGenelFolderPath: string;
}

export interface CreateCashRegisterTerminalHttpRequest {
  terminalNo: string;
  bank: string;
  terminalId: string;
  merchantNo: string;
}

export interface CreateCashRegisterHttpRequest {
  branchNo: number;
  cashNo: number;
  cashType: number;
  terminals: CreateCashRegisterTerminalHttpRequest[];
}

export interface CreateCashierHttpRequest {
  cashierName: string;
  cashierAuthorization: string;
}

export interface UpdateCashierHttpRequest {
  cashierName: string;
  cashierAuthorization: string;
  cashierState: boolean;
}

export interface DespatchDriverListHttpRequest {
  search?: string | null;
  includeInactive?: boolean | null;
  take?: number | null;
}

export interface SaveDespatchDriverHttpRequest {
  firstName: string;
  lastName: string;
  plateNumber: string;
  tckn: string;
  isActive: boolean;
  notes?: string | null;
}

export interface B2BBulletinListHttpRequest {
  search?: string | null;
  take?: number | null;
}

export interface B2BBulletinDto {
  id: number;
  definition: string;
  link: string;
  createDate: string | null;
}

export interface SaveB2BBulletinHttpRequest {
  definition: string;
  link: string;
  createDate?: string | null;
}

export interface B2BUserListHttpRequest {
  search?: string | null;
  includeInactive?: boolean | null;
  take?: number | null;
}

export interface B2BUserDto {
  userId: string;
  userFullName: string;
  userMail: string;
  status: boolean;
  createDate: string | null;
  menus: string | null;
  userEndDate: string | null;
  accountCount: number;
  categories?: string[] | null;
}

export interface B2BUserAccountDto {
  id: number;
  accountId: string;
  category: string | null;
}

export interface B2BUserDetailDto extends B2BUserDto {
  accounts: B2BUserAccountDto[];
}

export interface UpdateB2BUserHttpRequest {
  userFullName: string;
  userMail: string;
  status: boolean;
  menus?: string | null;
  userEndDate?: string | null;
}

export type DatabaseMonitoringSeverity = 'info' | 'warning' | 'critical' | string;
export type DatabaseMonitoringOverallStatus = 'healthy' | 'warning' | 'critical' | string;

export interface DatabaseActiveRequestDto {
  sessionId: number;
  requestId: number;
  loginTime: string;
  hostProcessId: number | null;
  programName: string | null;
  hostName: string | null;
  clientAddress: string | null;
  databaseName: string | null;
  loginName: string | null;
  status: string | null;
  command: string | null;
  waitType: string | null;
  waitMilliseconds: number;
  waitResource: string | null;
  blockingSessionId: number | null;
  startTime: string;
  elapsedMilliseconds: number;
  cpuMilliseconds: number;
  reads: number;
  logicalReads: number;
  writes: number;
  openTransactionCount: number;
  percentComplete: number;
  severity: DatabaseMonitoringSeverity | null;
  recommendation: string | null;
  canTerminate: boolean;
  sqlText: string | null;
}

export interface DatabaseBlockingEdgeDto {
  rootSessionId: number;
  blockingSessionId: number;
  blockedSessionId: number;
  depth: number;
  waitType: string | null;
  waitMilliseconds: number;
  blockedSqlText: string | null;
}

export interface DatabaseOpenTransactionDto {
  sessionId: number;
  loginTime: string;
  hostProcessId: number | null;
  transactionId: number;
  transactionBeginTime: string;
  ageMilliseconds: number;
  transactionState: string | null;
  openTransactionCount: number;
  loginName: string | null;
  hostName: string | null;
  programName: string | null;
  clientAddress: string | null;
  severity: DatabaseMonitoringSeverity | null;
  recommendation: string | null;
  canTerminate: boolean;
  lastSqlText: string | null;
}

export interface DatabaseRecommendationDto {
  code: string | null;
  severity: DatabaseMonitoringSeverity | null;
  title: string | null;
  description: string | null;
  affectedSessionCount: number;
}

export interface DatabaseMonitoringThresholdsDto {
  blockingSeconds: number;
  longRunningSeconds: number;
  openTransactionSeconds: number;
  refreshSeconds: number;
  retentionHours: number;
  maxIncidentCount: number;
}

export interface DatabaseMonitoringSnapshotDto {
  generatedAtUtc: string;
  serverName: string | null;
  databaseName: string | null;
  overallStatus: DatabaseMonitoringOverallStatus | null;
  activeRequestCount: number;
  blockedRequestCount: number;
  rootBlockerCount: number;
  longRunningRequestCount: number;
  openTransactionCount: number;
  thresholds: DatabaseMonitoringThresholdsDto;
  requests: DatabaseActiveRequestDto[] | null;
  blocking: DatabaseBlockingEdgeDto[] | null;
  openTransactions: DatabaseOpenTransactionDto[] | null;
  recommendations: DatabaseRecommendationDto[] | null;
}

export interface DatabaseMonitoringIncidentDto {
  id: string;
  type: string | null;
  severity: DatabaseMonitoringSeverity | null;
  sessionId: number;
  blockingSessionId: number | null;
  databaseName: string | null;
  loginName: string | null;
  hostName: string | null;
  programName: string | null;
  waitType: string | null;
  elapsedMilliseconds: number;
  sqlText: string | null;
  recommendation: string | null;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  occurrenceCount: number;
  resolvedAtUtc: string | null;
}

export type SafeWriteMonitoringStatus = 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

export interface SafeWriteMonitoringListHttpRequest {
  searchText?: string | null;
  status?: SafeWriteMonitoringStatus | null;
  operationCode?: string | null;
  warehouseNo?: number | null;
  retryable?: boolean | null;
  includeCompleted?: boolean | null;
  createdFromUtc?: string | null;
  createdToUtc?: string | null;
  take?: number | null;
}

export interface SafeWriteMonitoringItemDto {
  id: string;
  operationCode: string | null;
  requestedByUserId: string;
  warehouseNo: number;
  clientRequestId: string;
  status: SafeWriteMonitoringStatus | null;
  errorCode: string | null;
  retryable: boolean | null;
  errorMessage: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  completedAtUtc: string | null;
  ageSeconds: number;
}

export interface SafeWriteReviewHttpRequest {
  reason: string;
}

export interface RecheckMobileSafeWriteHttpRequest {
  operationCode: string;
}

export interface SafeWriteReviewResultDto<T = unknown> {
  action: string | null;
  outcome: string | null;
  message: string | null;
  safeWrite: SafeWriteMonitoringItemDto;
  result: T | null;
  recoveryState: string | null;
  recommendedAction: string | null;
}

export interface SafeWriteReviewAuditDto {
  id: string;
  safeWriteId: string;
  action: string | null;
  outcome: string | null;
  reason: string | null;
  reviewedByUserId: string;
  reviewedAtUtc: string;
  previousStatus: string | null;
  previousErrorCode: string | null;
  resultStatus: string | null;
  resultErrorCode: string | null;
  message: string | null;
  source: 'System' | 'Review' | string;
}

export type WorkerMonitoringStatus = 'Healthy' | 'Degraded' | 'Unhealthy' | 'Disabled' | string;

export interface WorkerJobMonitoringDto {
  jobId: string;
  taskCode: string | null;
  taskName: string | null;
  warehouseNo: number | null;
  status: string | null;
  triggerSource: string | null;
  executionMode: string | null;
  createdAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  durationSeconds: number | null;
  affectedRecordCount: number;
  message: string | null;
  errorMessage: string | null;
}

export interface WorkerMonitoringItemDto {
  code: string | null;
  name: string | null;
  isCritical: boolean;
  isEnabled: boolean;
  status: WorkerMonitoringStatus | null;
  statusName: string | null;
  activity: string | null;
  registeredAtUtc: string;
  lastHeartbeatAtUtc: string | null;
  heartbeatAgeSeconds: number | null;
  lastSuccessAtUtc: string | null;
  lastFailureAtUtc: string | null;
  lastError: string | null;
  hasUnresolvedFailure: boolean;
  requiresAttention: boolean;
  recommendation: string | null;
  queuedCount: number;
  runningCount: number;
  oldestQueuedAtUtc: string | null;
  oldestQueuedAgeSeconds: number | null;
  staleAfterSeconds: number;
  currentJob: WorkerJobMonitoringDto | null;
  lastJob: WorkerJobMonitoringDto | null;
  unresolvedFailureCount: number;
  lastFailedJob: WorkerJobMonitoringDto | null;
}

export interface WorkerMonitoringSnapshotDto {
  generatedAtUtc: string;
  overallStatus: WorkerMonitoringStatus | null;
  workers: WorkerMonitoringItemDto[] | null;
}

export interface DatabaseIncidentOverviewDto {
  openCount: number;
  criticalCount: number;
  warningCount: number;
  lastSeenAtUtc: string | null;
}

export interface DatabaseMonitoringOverviewDto {
  status: string | null;
  activeRequestCount: number;
  blockedRequestCount: number;
  longRunningRequestCount: number;
  openTransactionCount: number;
}

export interface SafeWriteMonitoringOverviewDto {
  windowHours: number;
  processingCount: number;
  staleProcessingCount: number;
  retryableFailureCount: number;
  manualReviewCount: number;
  unclassifiedFailureCount: number;
  completedCount: number;
}

export interface MonitoringOverviewDto {
  generatedAtUtc: string;
  overallStatus: string | null;
  overallStatusName: string | null;
  headline: string | null;
  database: DatabaseMonitoringOverviewDto;
  workers: WorkerMonitoringSnapshotDto;
  incidents: DatabaseIncidentOverviewDto;
  safeWrites: SafeWriteMonitoringOverviewDto;
  liveDatabase: DatabaseMonitoringSnapshotDto;
}

export interface DatabaseSessionTerminationDto {
  id: string;
  sessionId: number;
  loginTime: string;
  hostProcessId: number | null;
  loginName: string | null;
  hostName: string | null;
  programName: string | null;
  databaseName: string | null;
  sqlText: string | null;
  reason: string | null;
  requestedByUserId: string;
  requestedAtUtc: string;
  isSucceeded: boolean;
  completedAtUtc: string | null;
  error: string | null;
}

export interface TerminateDatabaseSessionHttpRequest {
  expectedLoginTime: string;
  expectedHostProcessId: number | null;
  expectedProgramName: string | null;
  reason: string;
}

export interface DatabaseRollbackStatusDto {
  sessionId: number;
  isRollingBack: boolean;
  message: string | null;
  checkedAtUtc: string;
}

export interface TerminalInstallationListHttpRequest {
  warehouseNo?: number | null;
  search?: string | null;
  appVersion?: string | null;
  isCurrentVersion?: boolean | null;
  activeWithinDays?: number | null;
  take?: number | null;
}

export interface TerminalInstallationDto {
  id: string;
  deviceId: string | null;
  appVersion: string | null;
  buildNumber: number;
  warehouseNo: number;
  previousWarehouseNo: number | null;
  warehouseChangeCount: number;
  warehouseChangedAtUtc: string | null;
  userId: string;
  username: string | null;
  userFullName: string | null;
  manufacturer: string | null;
  deviceModel: string | null;
  androidVersion: string | null;
  androidSdk: number | null;
  supportedAbis: string[] | null;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  lastIpAddress: string | null;
  versionChangedAtUtc: string | null;
  isActiveLast24Hours: boolean;
  isActiveLast7Days: boolean;
  isCurrentVersion: boolean | null;
}

export interface TerminalVersionDistributionDto {
  appVersion: string | null;
  buildNumber: number;
  installationCount: number;
  activeLast7DaysCount: number;
  isCurrentVersion: boolean | null;
}

export interface TerminalWarehouseDistributionDto {
  warehouseNo: number;
  installationCount: number;
  activeLast7DaysCount: number;
  outdatedCount: number | null;
}

export interface TerminalInstallationSummaryDto {
  generatedAtUtc: string;
  currentAppVersion: string | null;
  currentBuildNumber: number | null;
  versionManifestCheckedAtUtc: string | null;
  isVersionManifestAvailable: boolean;
  registeredInstallationCount: number;
  activeLast24HoursCount: number;
  activeLast7DaysCount: number;
  activeLast30DaysCount: number;
  outdatedInstallationCount: number | null;
  warehouseChangedInstallationCount: number;
  versions: TerminalVersionDistributionDto[] | null;
  warehouses: TerminalWarehouseDistributionDto[] | null;
}

export interface TerminalHeartbeatHttpRequest {
  appVersion: string;
  buildNumber: number;
  manufacturer?: string | null;
  deviceModel?: string | null;
  androidVersion?: string | null;
  androidSdk?: number | null;
  supportedAbis?: string[] | null;
}

export interface YeniKasaAppSettingsDto {
  id: number;
  pavoFis: number;
  fisGenislik: string | null;
  printerDotsPerLine: number | null;
  fisFaturaLimit: number | null;
  nakitLimit: number | null;
  ftpHost: string | null;
  ftpPort: number | null;
  ftpUsername: string | null;
  ftpPassword: string | null;
  ftpFolderPath: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateYeniKasaAppSettingsRequest {
  pavoFis: number;
  fisGenislik?: string | null;
  printerDotsPerLine?: number | null;
  fisFaturaLimit?: number | null;
  nakitLimit?: number | null;
  ftpHost?: string | null;
  ftpUsername?: string | null;
  ftpPassword?: string | null;
}

export interface TestFtpConnectionRequest {
  ftpHost: string;
  ftpPort?: number | null;
  ftpUsername?: string | null;
  ftpPassword?: string | null;
  ftpFolderPath?: string | null;
}

export interface TestFtpConnectionResultDto {
  isSuccess: boolean;
  latencyMs: number;
  message: string;
}

export interface SyncPushResultDto {
  isSuccess: boolean;
  message: string;
  triggeredAtUtc: string;
}

export interface YeniKasaPaymentMethodDto {
  id: number;
  name: string;
  description: string | null;
  status: number;
  sirano: number;
  pavoIsActive: number;
  pavoType: string | null;
  pavoMediator: string | null;
  brand: string | null;
  group: string | null;
}

export interface UpdateYeniKasaPaymentMethodRequest {
  id: number;
  name: string;
  description?: string | null;
  status: number;
  sirano: number;
  pavoIsActive: number;
  pavoType?: string | null;
  pavoMediator?: string | null;
  brand?: string | null;
  group?: string | null;
}

export interface PaymentMethodOrderUpdateItem {
  id: number;
  sirano: number;
  status: number;
}

export interface YeniKasaPaymentLookupItemDto {
  code: string;
  label: string;
}

export interface YeniKasaPaymentMethodLookupsDto {
  groups: string[];
  brands: YeniKasaPaymentLookupItemDto[];
}

export interface UpdatePaymentMethodsOrderRequest {
  items: PaymentMethodOrderUpdateItem[];
}

export interface YeniKasaRoleDto {
  id: number;
  name: string;
  description: string | null;
}

export interface YeniKasaPermissionDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface YeniKasaRolePermissionDto {
  roleId: number;
  permissionId: number;
}

export interface YeniKasaRolePermissionMatrixDto {
  roles: YeniKasaRoleDto[];
  permissions: YeniKasaPermissionDto[];
  rolePermissions: YeniKasaRolePermissionDto[];
}

export interface UpdateRolePermissionsRequest {
  roleId: number;
  permissionIds: number[];
}

export interface BulkRolePermissionUpdateItem {
  roleId: number;
  permissionIds: number[];
}

export interface BulkUpdateRolePermissionsRequest {
  roles: BulkRolePermissionUpdateItem[];
}

export interface CopyRolePermissionsRequest {
  sourceRoleId: number;
  targetRoleId: number;
}

export interface CopyRolePermissionsResultDto {
  isSuccess: boolean;
  copiedPermissionCount: number;
  message: string;
}

export interface YeniKasaDisplaySettingsDto {
  id: number;
  pageType: string;
  isTwoSlider: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateYeniKasaDisplaySettingsRequest {
  id: number;
  isTwoSlider: number;
}

export interface YeniKasaDisplayContentDto {
  id: number;
  type: string | null;
  name: string;
  sirano: number;
  startDate: string | null;
  endDate: string | null;
  pageType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  imageUrl: string | null;
}

export interface CreateYeniKasaDisplayContentRequest {
  type?: string | null;
  name?: string | null;
  sirano?: number;
  startDate?: string | null;
  endDate?: string | null;
  pageType?: string | null;
  base64Data?: string | null;
}

export interface DisplayContentOrderUpdateItem {
  id: number;
  sirano: number;
}

export interface UpdateDisplayContentsOrderRequest {
  items: DisplayContentOrderUpdateItem[];
}

export interface YeniKasaStockLookupDto {
  stockCode: string;
  stockName: string;
  barcode: string | null;
  unit: string | null;
  salePrice: number | null;
}

export interface YeniKasaFastAccessCategoryDto {
  id: number;
  name: string;
  description: string | null;
  categoryKey: string;
  itemCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateFastAccessCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateFastAccessCategoryRequest {
  id: number;
  name: string;
  description?: string | null;
}

export interface YeniKasaFastAccessItemDto {
  id: number;
  inventoryCode: string;
  productName: string | null;
  barcode: string | null;
  imagePath: string | null;
  categoryKey: string;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateFastAccessItemRequest {
  categoryKey: string;
  inventoryCode: string;
  barcode?: string | null;
  base64Data?: string | null;
}
