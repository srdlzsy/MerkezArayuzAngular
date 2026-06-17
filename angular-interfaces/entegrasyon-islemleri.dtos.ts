/**
 * Entegrasyon Islemleri DTOs - Axata synchronization contract models
 */

import type { IModuleActionScaffoldResponseApiDto } from './common-api.dtos';
import type {
  IFurpaCreateCompanyReceiptRequestApiDto,
  IFurpaCreateCompanyReceiptResponseApiDto
} from './firma-stok-hareketi.dtos';
import type {
  IFurpaCreateInventoryCountRequestApiDto,
  IFurpaCreateInventoryCountResponseApiDto
} from './sayim-sonucu.dtos';
import type {
  IFurpaAcceptWarehouseReceivingRequestApiDto,
  IFurpaAcceptWarehouseReceivingResponseApiDto,
  IFurpaCreateInterWarehouseShipmentResponseApiDto,
  IFurpaWarehouseReceiptDetailApiDto,
  IFurpaWarehouseReceiptListItemApiDto
} from './subeler-arasi-stok-hareketi.dtos';

export type IAxataExecutionMode = 'DryRun' | 'Outbox';

export interface IAxataSynchronizationTaskApiDto {
  code: string;
  name: string;
  description: string;
  flow: string;
  requiresWarehouseNo: boolean;
  enabled: boolean;
  scheduleEnabled: boolean;
  intervalMinutes: number;
  defaultWarehouseNo: number | null;
  sourceSystem: string;
  targetSystem: string;
  supportsManualDocuments: boolean;
  supportsLiveDispatch: boolean;
  liveOperationName?: string | null;
}

export interface IAxataSynchronizationJobArtifactApiDto {
  name: string;
  kind: string;
  path: string;
}

export interface IAxataSynchronizationJobApiDto {
  jobId: string;
  taskCode: string;
  taskName: string;
  status: string;
  executionMode: IAxataExecutionMode | string;
  triggerSource: string;
  warehouseNo: number | null;
  createdAtUtc: string | null;
}

export interface IAxataSynchronizationOverviewApiDto {
  enabled: boolean;
  workerEnabled: boolean;
  schedulerEnabled: boolean;
  sourceDatabaseProfile: string;
  mainEndpointUrl: string;
  extendedEndpointUrl: string;
  tasks: IAxataSynchronizationTaskApiDto[];
  recentJobs: IAxataSynchronizationJobApiDto[];
}

export interface IAxataSynchronizationPreviewItemApiDto {
  key: string;
  summary: string;
  payloadJson: string;
}

export interface IAxataSynchronizationPreviewApiDto {
  taskCode: string;
  taskName: string;
  warehouseNo: number | null;
  totalRecordCount: number;
  returnedRecordCount: number;
  generatedAtUtc: string | null;
  items: IAxataSynchronizationPreviewItemApiDto[];
  notes: string[];
}

export interface IAxataSynchronizationJobDetailApiDto extends IAxataSynchronizationJobApiDto {
  requestedByUserId: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  affectedRecordCount: number;
  message: string | null;
  errorMessage: string | null;
  artifacts: IAxataSynchronizationJobArtifactApiDto[];
}

export interface IAxataSynchronizationProbeApiDto {
  name: string;
  status: string;
  durationMs: number | null;
  message: string | null;
}

export interface IAxataSynchronizationConnectionTestApiDto {
  testedAtUtc: string | null;
  sourceDatabaseProfile: string;
  probes: IAxataSynchronizationProbeApiDto[];
}

export interface IAxataSynchronizationFetchProfileApiDto {
  code: string;
  name: string;
  sourceSystem: string;
  targetSystem: string;
  sourceEndpointKind: string;
  sourceEndpointUrl: string;
  fetchOperation: string;
  ackEndpointKind: string;
  ackEndpointUrl: string;
  ackOperation: string;
  companyCode: string;
  warehouseCode: string;
  movementType: string | null;
  pendingStatus: string;
  currentHandling: string;
  currentRoute: string | null;
  isImplemented: boolean;
}

export interface IAxataSynchronizationFetchProfilesOverviewApiDto {
  generatedAtUtc: string | null;
  profiles: IAxataSynchronizationFetchProfileApiDto[];
  notes: string[];
}

export interface IAxataIntegrationAuditQueryApiDto {
  startDate?: string | null;
  endDate?: string | null;
  warehouseNo?: number | null;
  take?: number | null;
  documentSerie?: string | null;
  documentOrderNo?: number | null;
}

export interface IAxataIntegrationAuditApiDto {
  isInSync: boolean;
  generatedAtUtc: string | null;
  startDate: string;
  endDate: string;
  warehouseNo: number | null;
  summary: IAxataIntegrationAuditSummaryApiDto;
  outboundDeliverySummaries: IAxataOutboundDeliveryMovementSummaryApiDto[];
  unsyncedWarehouseOrders: IAxataUnsyncedWarehouseOrderApiDto[];
  sentWarehouseOrdersMissingMikroShipments: IAxataSentWarehouseOrderMissingShipmentApiDto[];
  sentWarehouseOrdersWithShipmentDifferences: IAxataSentWarehouseOrderMissingShipmentApiDto[];
  pendingOutboundDeliveries: IAxataPendingOutboundDeliveryApiDto[];
  interventionCandidates: IAxataPendingOutboundDeliveryApiDto[];
  operations: IAxataIntegrationAuditOperationApiDto[];
  notes: string[];
}

export interface IAxataIntegrationAuditSummaryApiDto {
  mikroWarehouseOrderDocumentCount: number;
  sentWarehouseOrderDocumentCount: number;
  partiallySentWarehouseOrderDocumentCount: number;
  unsentWarehouseOrderDocumentCount: number;
  sentWarehouseOrderMissingMikroShipmentDocumentCount: number;
  sentWarehouseOrderMissingMikroShipmentLineCount: number;
  sentWarehouseOrderMissingMikroShipmentQuantity: number;
  sentWarehouseOrderShipmentDifferenceDocumentCount: number;
  sentWarehouseOrderShipmentDifferenceLineCount: number;
  sentWarehouseOrderShipmentDifferenceQuantity: number;
  pendingOutboundDeliveryDocumentCount: number;
  pendingOutboundDeliveryLineCount: number;
  pendingOutboundDeliveryQuantity: number;
  c01PendingDocumentCount: number;
  c01MissingInMikroDocumentCount: number;
  c01MikroExistsPendingAckDocumentCount: number;
}

export interface IAxataOutboundDeliveryMovementSummaryApiDto {
  movementType: string;
  pendingStatus: string;
  pendingDocumentCount: number;
  pendingLineCount: number;
  pendingQuantity: number;
  mikroMissingDocumentCount: number;
  mikroExistsPendingAckDocumentCount: number;
  checkLevel: string;
}

export interface IAxataIntegrationAuditOperationApiDto {
  code: string;
  title: string;
  state: string;
  severity: string;
  documentCount: number;
  lineCount: number;
  quantity: number;
  listRoute: string | null;
  previewRoute: string | null;
  executeRoute: string | null;
  canExecute: boolean;
  writesData: boolean;
  description: string;
}

export interface IAxataUnsyncedWarehouseOrderApiDto {
  documentSerie: string;
  documentOrderNo: number;
  documentDate: string;
  inWarehouseNo: number;
  outWarehouseNo: number;
  lineCount: number;
  sentLineCount: number;
  unsentLineCount: number;
  totalQuantity: number;
  sentQuantity: number;
  unsentQuantity: number;
  state: string;
  lastUpdateDate: string | null;
  warning: string;
}

export interface IAxataSentWarehouseOrderMissingShipmentApiDto {
  documentSerie: string;
  documentOrderNo: number;
  documentDate: string;
  inWarehouseNo: number;
  outWarehouseNo: number;
  lineCount: number;
  sentLineCount: number;
  missingMovementLinkLineCount: number;
  totalQuantity: number;
  sentQuantity: number;
  missingMovementLinkQuantity: number;
  deliveredQuantity: number;
  linkedMovementLineCount: number;
  differenceLineCount: number;
  differenceQuantity: number;
  differenceReason: string;
  state: string;
  lastUpdateDate: string | null;
  warning: string;
}

export interface IAxataPendingOutboundDeliveryApiDto {
  movementType: string;
  status: string;
  axataSequenceNo: number;
  axataDeliveryNo: string;
  documentSerie: string;
  documentOrderNo: number | null;
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  axataDate: string | null;
  lineCount: number;
  quantity: number;
  mikroOrderLineCount: number;
  mikroOrderQuantity: number;
  mikroDeliveredQuantity: number;
  existingLinkedMovementLineCount: number;
  mikroCheckState: string;
  canIntervene: boolean;
  warning: string | null;
}

export interface IAxataSynchronizationManualDocumentApiDto {
  taskCode: string;
  taskName: string;
  flow: string;
  executionMode: IAxataExecutionMode | string;
  warehouseNo: number | null;
  documentReference: string;
  generatedAtUtc: string | null;
  affectedRecordCount: number;
  payloadJson: string;
  notes: string[];
  artifacts: IAxataSynchronizationJobArtifactApiDto[];
}

export interface IAxataSynchronizationManualDocumentCandidateItemApiDto {
  documentReference: string;
  summary: string;
  documentSerie: string | null;
  documentOrderNo: number | null;
  documentNo: number | null;
  documentDate: string | null;
  documentIdentifier: string | null;
  lineCount: number;
  totalQuantity: number;
}

export interface IAxataSynchronizationManualDocumentCandidatesApiDto {
  taskCode: string;
  taskName: string;
  flow: string;
  warehouseNo: number | null;
  startDate: string;
  endDate: string;
  totalRecordCount: number;
  skippedRecordCount: number;
  returnedRecordCount: number;
  generatedAtUtc: string | null;
  items: IAxataSynchronizationManualDocumentCandidateItemApiDto[];
  notes: string[];
}

export interface IAxataSynchronizationExecuteRequestApiDto {
  taskCode: string;
  executionMode: IAxataExecutionMode;
  warehouseNo?: number | null;
}

export interface IAxataSynchronizationExecuteTaskRequestApiDto {
  executionMode: IAxataExecutionMode;
  warehouseNo?: number | null;
}

export interface IAxataSynchronizationManualDocumentCandidatesQueryApiDto {
  warehouseNo?: number | null;
  startDate: string;
  endDate: string;
  skip?: number | null;
  take?: number | null;
}

export interface IAxataSynchronizationManualDocumentRequestApiDto {
  warehouseNo?: number | null;
  documentSerie?: string | null;
  documentOrderNo?: number | null;
  documentNo?: number | null;
  documentDate?: string | null;
}

export interface IAxataSynchronizationManualDocumentExecuteRequestApiDto
  extends IAxataSynchronizationManualDocumentRequestApiDto {
  executionMode: IAxataExecutionMode;
}

export interface IAxataSynchronizationManualDocumentItemApiDto {
  documentSerie?: string | null;
  documentOrderNo?: number | null;
  documentNo?: number | null;
  documentDate?: string | null;
}

export interface IAxataSynchronizationManualDocumentBatchRequestApiDto {
  warehouseNo?: number | null;
  continueOnError: boolean;
  documents: IAxataSynchronizationManualDocumentItemApiDto[];
}

export interface IAxataSynchronizationManualDocumentBatchExecuteRequestApiDto
  extends IAxataSynchronizationManualDocumentBatchRequestApiDto {
  executionMode: IAxataExecutionMode;
}

export interface IAxataSynchronizationManualDocumentBatchFailureApiDto {
  documentReference: string;
  errorMessage: string;
}

export interface IAxataSynchronizationManualDocumentBatchApiDto {
  taskCode: string;
  taskName: string;
  flow: string;
  executionMode: IAxataExecutionMode | string;
  warehouseNo: number | null;
  generatedAtUtc: string | null;
  requestedDocumentCount: number;
  succeededDocumentCount: number;
  failedDocumentCount: number;
  documents: IAxataSynchronizationManualDocumentApiDto[];
  failures: IAxataSynchronizationManualDocumentBatchFailureApiDto[];
  notes: string[];
}

export interface IAxataSynchronizationManualDispatchApiDto {
  taskCode: string;
  taskName: string;
  flow: string;
  warehouseNo: number | null;
  documentReference: string;
  operationName: string;
  endpointUrl: string;
  dispatchedAtUtc: string | null;
  isSuccess: boolean;
  serviceState: number | null;
  serviceMessage: string;
  payloadJson: string;
  requestPayloadJson: string;
  responsePayloadJson: string;
  notes: string[];
}

export interface IAxataSynchronizationManualDispatchBatchApiDto {
  taskCode: string;
  taskName: string;
  flow: string;
  warehouseNo: number | null;
  dispatchedAtUtc: string | null;
  requestedDocumentCount: number;
  succeededDocumentCount: number;
  failedDocumentCount: number;
  documents: IAxataSynchronizationManualDispatchApiDto[];
  failures: IAxataSynchronizationManualDocumentBatchFailureApiDto[];
  notes: string[];
}

export interface IAxataManualIncomingBatchFailureResponseApiDto {
  reference: string;
  errorMessage: string;
}

export interface IAxataOutboundDeliveryImportPreviewQueryApiDto {
  take?: number | null;
}

export interface IAxataOutboundDeliveryQueuePreviewHttpRequestApiDto {
  movementType?: string | null;
  take?: number | null;
}

export interface IAxataOutboundDeliveryImportExecuteRequestApiDto {
  take?: number | null;
  continueOnError: boolean;
  acknowledge: boolean;
}

export interface IAxataOutboundDeliveryDocumentImportExecuteRequestApiDto {
  status?: string | null;
  acknowledge: boolean;
}

export interface IAxataOutboundDeliveryImportPreviewApiDto {
  movementType: string;
  pendingStatus: string;
  generatedAtUtc: string | null;
  totalFetchedDocumentCount: number;
  returnedDocumentCount: number;
  totalLineCount: number;
  totalQuantity: number;
  documents: IAxataOutboundDeliveryImportDocumentApiDto[];
  notes: string[];
}

export interface IAxataOutboundDeliveryImportExecuteApiDto {
  movementType: string;
  pendingStatus: string;
  generatedAtUtc: string | null;
  requestedDocumentCount: number;
  succeededDocumentCount: number;
  failedDocumentCount: number;
  skippedDocumentCount: number;
  createdMovementLineCount: number;
  createdMovementQuantity: number;
  results: IAxataOutboundDeliveryImportResultApiDto[];
  failures: IAxataOutboundDeliveryImportFailureApiDto[];
  notes: string[];
}

export interface IAxataOutboundDeliveryQueuePreviewApiDto {
  movementType: string;
  pendingStatus: string;
  generatedAtUtc: string | null;
  totalFetchedDocumentCount: number;
  returnedDocumentCount: number;
  totalLineCount: number;
  totalQuantity: number;
  documents: IAxataOutboundDeliveryQueueDocumentApiDto[];
  notes: string[];
}

export interface IAxataOutboundDeliveryQueueDocumentApiDto {
  axataSequenceNo: number;
  axataDeliveryNo: string;
  documentSerie: string;
  documentOrderNo: number | null;
  movementType: string;
  status: string;
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  axataDate: string | null;
  lineCount: number;
  quantity: number;
  hasLiveImport: boolean;
  currentHandling: string;
  warning: string | null;
}

export interface IAxataOutboundDeliveryImportDocumentApiDto {
  axataSequenceNo: number;
  axataDeliveryNo: string;
  documentSerie: string;
  documentOrderNo: number;
  movementType: string;
  status: string;
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  axataDate: string | null;
  axataLineCount: number;
  axataQuantity: number;
  mikroOrderLineCount: number;
  mikroOrderQuantity: number;
  mikroDeliveredQuantity: number;
  existingLinkedMovementLineCount: number;
  canImport: boolean;
  warning: string | null;
}

export interface IAxataOutboundDeliveryImportResultApiDto {
  axataSequenceNo: number;
  axataDeliveryNo: string;
  documentSerie: string;
  documentOrderNo: number;
  movementSerie: string;
  movementOrderNo: number;
  createdMovementLineCount: number;
  createdMovementQuantity: number;
  acknowledged: boolean;
  message: string;
}

export interface IAxataOutboundDeliveryImportFailureApiDto {
  axataSequenceNo: number | null;
  axataDeliveryNo: string | null;
  errorMessage: string;
}

export interface IAxataOutboundDeliveryLineRequestApiDto {
  lineNo: number;
  stockCode: string;
  quantity: number;
  unitPrice?: number | null;
  unitPointer: number;
  description?: string | null;
  partyCode?: string | null;
  lotNo?: number | null;
  projectCode?: string | null;
  customerResponsibilityCenter?: string | null;
  productResponsibilityCenter?: string | null;
  warehouseOrderLineGuid?: string | null;
}

export interface IAxataOutboundDeliveryRequestApiDto {
  sourceWarehouseNo: number;
  targetWarehouseNo: number;
  transitWarehouseNo?: number | null;
  movementDate: string;
  documentDate: string;
  documentNo?: string | null;
  axataDeliveryNo?: string | null;
  movementCode?: string | null;
  description?: string | null;
  lines: IAxataOutboundDeliveryLineRequestApiDto[];
}

export interface IAxataOutboundDeliveryBatchRequestApiDto {
  continueOnError: boolean;
  items: IAxataOutboundDeliveryRequestApiDto[];
}

export interface IAxataInboundAtfCompanyReceivingLineRequestApiDto {
  lineNo: number;
  stockCode: string;
  quantity: number;
  unitPrice?: number | null;
  unitPointer: number;
  lastConsumingDate?: string | null;
  orderGuid?: string | null;
  description?: string | null;
  partyCode?: string | null;
  lotNo?: number | null;
  projectCode?: string | null;
  customerResponsibilityCenter?: string | null;
  productResponsibilityCenter?: string | null;
}

export interface IAxataInboundAtfCompanyReceivingRequestApiDto {
  warehouseNo: number;
  customerCode: string;
  movementDate: string;
  documentDate: string;
  documentNo?: string | null;
  axataOrderNo?: string | null;
  invoiceNo?: string | null;
  deliverer?: string | null;
  receiver?: string | null;
  description?: string | null;
  allowOrderOverReceiving?: boolean;
  lines: IAxataInboundAtfCompanyReceivingLineRequestApiDto[];
}

export interface IAxataInboundAtfCompanyReceivingBatchRequestApiDto {
  continueOnError: boolean;
  items: IAxataInboundAtfCompanyReceivingRequestApiDto[];
}

export interface IAxataManualIncomingCompanyReceivingBatchRequestApiDto {
  continueOnError: boolean;
  items: IFurpaCreateCompanyReceiptRequestApiDto[];
}

export interface IAxataManualIncomingCompanyReceivingBatchResponseApiDto {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  results: IFurpaCreateCompanyReceiptResponseApiDto[];
  failures: IAxataManualIncomingBatchFailureResponseApiDto[];
}

export interface IAxataManualIncomingInventoryCountBatchRequestApiDto {
  continueOnError: boolean;
  items: IFurpaCreateInventoryCountRequestApiDto[];
}

export interface IAxataManualIncomingInventoryCountBatchResponseApiDto {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  results: IFurpaCreateInventoryCountResponseApiDto[];
  failures: IAxataManualIncomingBatchFailureResponseApiDto[];
}

export interface IAxataManualIncomingWarehouseReceivingBatchItemRequestApiDto {
  documentSerie: string;
  documentOrderNo: number;
  allowDiscrepancy: boolean;
  lines: IFurpaAcceptWarehouseReceivingRequestApiDto['lines'];
}

export interface IAxataManualIncomingWarehouseReceivingBatchRequestApiDto {
  continueOnError: boolean;
  items: IAxataManualIncomingWarehouseReceivingBatchItemRequestApiDto[];
}

export interface IAxataManualIncomingWarehouseReceivingBatchResponseApiDto {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  results: IFurpaAcceptWarehouseReceivingResponseApiDto[];
  failures: IAxataManualIncomingBatchFailureResponseApiDto[];
}

export interface IAxataManualOutboundDeliveryBatchResponseApiDto {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  results: IFurpaCreateInterWarehouseShipmentResponseApiDto[];
  failures: IAxataManualIncomingBatchFailureResponseApiDto[];
}

export interface IAxataInboundAtfCompanyReceivingBatchResponseApiDto {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  results: IFurpaCreateCompanyReceiptResponseApiDto[];
  failures: IAxataManualIncomingBatchFailureResponseApiDto[];
}

export interface IUyumsoftOperationParameterApiDto {
  name: string;
  value: string | null;
}

export interface IUyumsoftOperationRequestApiDto {
  parameters?: IUyumsoftOperationParameterApiDto[];
}

export interface IUyumsoftOperationDefinitionApiDto {
  operationName: string;
  groupName: string;
  soapAction: string;
  requestHint: string;
}

export interface IUyumsoftConnectedServiceOverviewApiDto {
  serviceKey: string;
  serviceName: string;
  endpointUrl: string;
  wsdlUrl: string;
  contractName: string;
  supportedGetOperations: IUyumsoftOperationDefinitionApiDto[];
}

export interface IUyumsoftResponseNodeApiDto {
  name: string;
  value: string | null;
  attributes: Record<string, string | null>;
  children: IUyumsoftResponseNodeApiDto[];
}

export interface IUyumsoftOperationResponseApiDto {
  serviceKey: string;
  serviceName: string;
  operationName: string;
  resultElementName: string;
  isSucceeded: boolean;
  message: string | null;
  scalarValue: string | null;
  resultAttributes: Record<string, string | null>;
  nodes: IUyumsoftResponseNodeApiDto[];
  responsePayloadJson: string;
}

export type IAxataManualIncomingCompanyReceivingRequestApiDto =
  IFurpaCreateCompanyReceiptRequestApiDto;
export type IAxataManualIncomingCompanyReceivingResponseApiDto =
  IFurpaCreateCompanyReceiptResponseApiDto;
export type IAxataManualIncomingInventoryCountRequestApiDto =
  IFurpaCreateInventoryCountRequestApiDto;
export type IAxataManualIncomingInventoryCountResponseApiDto =
  IFurpaCreateInventoryCountResponseApiDto;
export type IAxataManualIncomingWarehouseReceivingListItemApiDto =
  IFurpaWarehouseReceiptListItemApiDto;
export type IAxataManualIncomingWarehouseReceivingDetailApiDto =
  IFurpaWarehouseReceiptDetailApiDto;
export type IAxataManualIncomingWarehouseReceivingAcceptRequestApiDto =
  IFurpaAcceptWarehouseReceivingRequestApiDto;
export type IAxataManualIncomingWarehouseReceivingAcceptResponseApiDto =
  IFurpaAcceptWarehouseReceivingResponseApiDto;
export type IAxataOutboundDeliveryResponseApiDto =
  IFurpaCreateInterWarehouseShipmentResponseApiDto;
export type IAxataInboundAtfCompanyReceivingResponseApiDto =
  IFurpaCreateCompanyReceiptResponseApiDto;

export interface IPosAccountingDateRangeHttpRequestApiDto {
  startDate?: string | null;
  endDate?: string | null;
  warehouseNo?: number | null;
  onlyPending: boolean;
}

export interface IImportZReportsHttpRequestApiDto {
  warehouseNo?: number | null;
  businessDate?: string | null;
  reportPath?: string | null;
  importMode?: string | null;
  sourceCode?: string | null;
  overwriteExisting: boolean;
}

export interface IImportPosDocumentsHttpRequestApiDto {
  warehouseNo?: number | null;
  businessDate?: string | null;
  dateToGet?: string | null;
  includePreviouslyImported: boolean;
  overwriteExisting: boolean;
}

export interface IPosAccountingTransferHttpRequestApiDto {
  warehouseNo?: number | null;
  documentIds?: ReadonlyArray<number>;
  totalIds?: ReadonlyArray<number>;
  invoiceIds?: ReadonlyArray<number>;
  expenseIds?: ReadonlyArray<number>;
  continueOnError: boolean;
}

export interface IPosAccountingDeleteHttpRequestApiDto {
  warehouseNo?: number | null;
  documentIds?: ReadonlyArray<number>;
  totalIds?: ReadonlyArray<number>;
  invoiceIds?: ReadonlyArray<number>;
  expenseIds?: ReadonlyArray<number>;
}

export interface IUpdatePosAccountingDocumentHttpRequestApiDto {
  documentNo?: string | null;
  customerTaxNo?: string | null;
  paymentType?: string | null;
  branchNo?: number | null;
  description?: string | null;
}

export interface ICashRegisterBranchMappingListHttpRequestApiDto {
  branchNo?: number | null;
  cashRegisterNo?: string | null;
}

export interface ICashRegisterBranchMappingHttpRequestApiDto {
  cashRegisterNo: string;
  branchNo?: number | null;
  branchName?: string | null;
  description?: string | null;
}

export interface IPosAccountingOverviewApiDto {
  [key: string]: unknown;
}

export interface IZReportListItemApiDto {
  totalId: number;
  billNo?: string | null;
  zNo?: string | null;
  cashRegisterNo?: string | null;
  branchName?: string | null;
  date?: string | null;
  cashPaymentTotal?: number | null;
  creditCardPaymentTotal?: number | null;
  greatTotal?: number | null;
  isSent: boolean;
}

export interface IZReportDetailApiDto {
  header?: Record<string, unknown> | null;
  details?: ReadonlyArray<Record<string, unknown>>;
  bankDetails?: ReadonlyArray<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IBranchInvoiceListItemApiDto {
  invoiceId: number;
  invoiceGuid?: string | null;
  branchNo?: number | null;
  branchName?: string | null;
  documentNo?: string | null;
  customerTaxNo?: string | null;
  customerName?: string | null;
  invoiceDate?: string | null;
  paymentType?: string | null;
  invoiceTotal?: number | null;
  isSent: boolean;
}

export interface IBranchInvoiceDetailApiDto {
  header?: Record<string, unknown> | null;
  lines?: ReadonlyArray<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IExpenseNoteListItemApiDto {
  expenseId: number;
  expenseGuid?: string | null;
  documentNo?: string | null;
  branchNo?: number | null;
  branchName?: string | null;
  expenseDate?: string | null;
  paymentType?: string | null;
  expenseTotal?: number | null;
  isSent: boolean;
}

export interface IExpenseNoteDetailApiDto {
  header?: Record<string, unknown> | null;
  lines?: ReadonlyArray<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ICashRegisterBranchMappingApiDto {
  id: number;
  cashRegisterNo: string;
  branchNo?: number | null;
  branchName?: string | null;
  description?: string | null;
}

export interface IPosAccountingOperationResultApiDto {
  documentId?: number | null;
  sourceGuid?: string | null;
  success: boolean;
  message?: string | null;
}

export interface IPosAccountingImportResultApiDto {
  documentKind: string;
  businessDate: string;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  results: ReadonlyArray<IPosAccountingOperationResultApiDto>;
}

export interface IPosAccountingBatchResultApiDto {
  documentKind: string;
  requestedCount: number;
  successCount: number;
  errorCount: number;
  results: ReadonlyArray<IPosAccountingOperationResultApiDto>;
}

export type IPosAccountingModuleActionScaffoldResponseApiDto =
  IModuleActionScaffoldResponseApiDto;
