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
  requestXml: string;
  responseXml: string;
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

export interface IAxataOutboundDeliveryLineRequestApiDto {
  stockCode: string;
  quantity: number;
  unitPrice?: number | null;
  unitPointer: number;
  description?: string | null;
  partyCode?: string | null;
  lotNo?: number | null;
  projectCode?: string | null;
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
  payloadXml?: string | null;
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
  rawXml: string;
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
  importMode?: string | null;
  sourceCode?: string | null;
  overwriteExisting: boolean;
}

export interface IImportPosDocumentsHttpRequestApiDto {
  warehouseNo?: number | null;
  businessDate?: string | null;
  includePreviouslyImported: boolean;
  overwriteExisting: boolean;
}

export interface IPosAccountingTransferHttpRequestApiDto {
  warehouseNo?: number | null;
  documentIds: ReadonlyArray<string>;
  continueOnError: boolean;
}

export interface IPosAccountingDeleteHttpRequestApiDto {
  warehouseNo?: number | null;
  documentIds: ReadonlyArray<string>;
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

export type IPosAccountingModuleActionScaffoldResponseApiDto =
  IModuleActionScaffoldResponseApiDto;
