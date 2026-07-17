/**
 * Fatura Islemleri DTOs
 */

export type IInvoiceStateFilterApiDto = -1 | 0 | 1;
export type IInvoiceRenderProfileApiDto = 'Auto' | 'EFatura' | 'EArsiv';
export type IInvoiceRenderProfileValueApiDto = IInvoiceRenderProfileApiDto | 0 | 1 | 2;
export type IInvoiceSendingScenarioApiDto = 'EFatura' | 'EArsiv';
export type IInvoiceSendingScenarioValueApiDto = IInvoiceSendingScenarioApiDto | 0 | 1;
export type IInvoiceSendingScenarioBodyApiDto = IInvoiceSendingScenarioValueApiDto;
export type IInvoiceViewingSearchFieldApiDto =
  | 'InvoiceDate'
  | 'InvoiceId'
  | 'DocumentId'
  | 'CustomerTitle'
  | 'CustomerTcknVkn'
  | 'InvoiceTotal'
  | 'DespatchId'
  | 'Any'
  | 'Status'
  | 'InvoiceType'
  | 'EnvelopeIdentifier'
  | 'OrderDocumentId'
  | 'Message';

export interface IInvoiceViewingListQueryApiDto {
  startDate: string;
  endDate: string;
  isProcessed?: IInvoiceStateFilterApiDto | null;
  processedState?: IInvoiceStateFilterApiDto | null;
  isPrinted?: IInvoiceStateFilterApiDto | null;
  printedState?: IInvoiceStateFilterApiDto | null;
  invoiceId?: string | null;
  invoiceNo?: string | null;
  despatchId?: string | null;
  despatchNo?: string | null;
  customerTitle?: string | null;
  customerTcknVkn?: string | null;
  tcknVkn?: string | null;
  documentId?: string | null;
  ettn?: string | null;
  orderDocumentId?: string | null;
  status?: string | null;
  invoiceType?: string | null;
  minInvoiceTotal?: number | null;
  maxInvoiceTotal?: number | null;
  hasDespatchId?: boolean | null;
  searchField?: IInvoiceViewingSearchFieldApiDto | null;
  searchText?: string | null;
  page?: number | null;
  pageNumber?: number | null;
  pageSize?: number | null;
}

export interface IInvoiceViewingListItemApiDto {
  documentId: string;
  invoiceId: string;
  customerTitle: string;
  customerTcknVkn: string;
  createDate: string | null;
  invoiceDate: string | null;
  invoiceType: string | null;
  invoiceTotal: number;
  despatchId: string | null;
  isProcessed: boolean;
  isPrinted: boolean;
  isStandard: boolean;
  statusCode: string | null;
  status: string | null;
  envelopeIdentifier: string | null;
  envelopeStatusCode: string | null;
  message: string | null;
  taxTotal: number;
  taxExclusiveAmount: number;
  documentCurrencyCode: string | null;
  exchangeRate: number;
  orderDocumentId: string | null;
  isArchived: boolean;
  invoiceTipType: string | null;
  invoiceTipTypeCode: number;
  isSeen: boolean | null;
}

export interface IInvoiceViewingListResponseApiDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  items: IInvoiceViewingListItemApiDto[];
}

export interface IInvoiceRenderedDocumentApiDto {
  source: string;
  documentId?: string | null;
  invoiceId: string | null;
  profile: IInvoiceRenderProfileValueApiDto | string;
  appliedXsltName: string | null;
  xsltSource: string | null;
  usedEmbeddedXslt: boolean;
  xmlContent: string | null;
  htmlContent: string | null;
}

export interface IInvoiceViewingDetailApiDto {
  summary: IInvoiceViewingListItemApiDto;
  document: IInvoiceRenderedDocumentApiDto;
}

export type IInvoiceViewingPdfResponseApiDto = Blob;

export interface IInvoiceViewingSynchronizationRequestApiDto {
  startDate: string;
  endDate: string;
  includeStatuses?: boolean | null;
}

export type IInvoiceViewingSynchronizationResponseApiDto =
  IInvoiceViewingSynchronizationProgressResponseApiDto;

export interface IInvoiceViewingSynchronizationProgressResponseApiDto {
  isRunning: boolean;
  status: string;
  startDate: string | null;
  endDate: string | null;
  includeStatuses: boolean;
  queryStartDate: string | null;
  queryEndDate: string | null;
  pageIndex: number | null;
  pageNumber: number | null;
  pageSize: number | null;
  totalCount: number;
  totalPage: number;
  fetchedCount: number;
  matchedCount: number;
  insertedCount: number;
  updatedCount: number;
  lastPageItemCount: number;
  lastPageMatchedCount: number;
  lastPageInsertedCount: number;
  lastPageUpdatedCount: number;
  progressPercent: number | null;
  startedAtUtc: string | null;
  lastUpdatedAtUtc: string | null;
  finishedAtUtc: string | null;
  elapsedMs: number | null;
  message: string | null;
}

export interface IInvoiceViewingRenderRequestApiDto {
  profile?: IInvoiceRenderProfileValueApiDto | null;
  preferEmbeddedXslt?: boolean | null;
  fallbackToGeneral?: boolean | null;
}

export interface IInvoiceViewingPrintedStateRequestApiDto {
  isPrinted: boolean;
  source: string;
}

export interface IInvoiceViewingPrintedStateResponseApiDto {
  summary: IInvoiceViewingListItemApiDto;
  source: string | null;
}

export interface IInvoiceSendingListQueryApiDto {
  startDate: string;
  endDate: string;
  scenario?: IInvoiceSendingScenarioApiDto | null;
  isSent?: IInvoiceStateFilterApiDto | null;
  sentState?: IInvoiceStateFilterApiDto | null;
}

export interface IInvoiceSendingListItemApiDto {
  documentSerie: string;
  documentOrderNo: number;
  invoiceId: string;
  documentDate: string | null;
  sentDocumentNo: string | null;
  serviceDocumentId?: string | null;
  isSent: boolean;
  customerCode: string;
  customerTitle: string;
  customerTcknVkn: string;
  targetAlias: string | null;
  invoiceProfileId: string | null;
  invoiceTypeCode: string | null;
  scenario: IInvoiceSendingScenarioValueApiDto;
  lineExtensionTotal: number;
  taxTotal: number;
  chargeTotal: number;
  payableTotal: number;
  shipmentDocumentNo: string | null;
  shipmentDocumentDate: string | null;
  returnInvoiceNo: string | null;
  returnInvoiceDate: string | null;
  warehouseName: string | null;
  description: string | null;
  sourceLineCount?: number | null;
  sourceLineSummary?: string | null;
  taxRateSummary?: string | null;
}

export interface IInvoiceSendingListResponseApiDto {
  totalCount: number;
  items: IInvoiceSendingListItemApiDto[];
}

export interface IInvoiceSendingDetailApiDto {
  summary: IInvoiceSendingListItemApiDto;
  document: IInvoiceRenderedDocumentApiDto;
}

export type IInvoiceSendingPdfResponseApiDto = Blob;

export interface IInvoiceReturnReferenceApiDto {
  sourceDocumentSerie: string | null;
  sourceDocumentOrderNo: number | null;
  invoiceNo: string;
  invoiceDate: string | null;
  payableTotal?: number | null;
  invoiceTotal?: number | null;
  totalAmount?: number | null;
  amount?: number | null;
  isFallbackCandidate: boolean;
  isGeneratedInvoiceNo: boolean;
}

export interface IInvoiceReturnReferenceInvoiceApiDto {
  documentSerie: string;
  documentOrderNo: number;
  invoiceId: string;
  invoiceTypeCode: string | null;
  scenario: IInvoiceSendingScenarioValueApiDto;
  returnInvoiceNo: string | null;
  returnInvoiceDate: string | null;
}

export interface IInvoiceReturnReferenceCandidatesResponseApiDto {
  invoice?: IInvoiceReturnReferenceInvoiceApiDto | null;
  currentReference: IInvoiceReturnReferenceApiDto | null;
  fallbackReference: IInvoiceReturnReferenceApiDto | null;
  candidates: IInvoiceReturnReferenceApiDto[];
}

export interface IUpdateInvoiceReturnReferenceRequestApiDto {
  scenario?: IInvoiceSendingScenarioBodyApiDto | null;
  sourceDocumentSerie?: string | null;
  sourceDocumentOrderNo?: number | null;
  useFallbackWhenNotSelected?: boolean | null;
}

export interface IInvoiceSendingRenderRequestApiDto {
  scenario?: IInvoiceSendingScenarioBodyApiDto | null;
  profile?: IInvoiceRenderProfileValueApiDto | null;
  preferEmbeddedXslt?: boolean | null;
  fallbackToGeneral?: boolean | null;
}

export interface IInvoiceSendingDocumentKeyApiDto {
  documentSerie: string;
  documentOrderNo: number;
}

export interface ISendInvoiceDocumentsRequestApiDto {
  scenario?: IInvoiceSendingScenarioBodyApiDto | null;
  documents: IInvoiceSendingDocumentKeyApiDto[];
}

export interface IValidateInvoiceDocumentResultApiDto extends IInvoiceSendingDocumentKeyApiDto {
  invoiceId: string | null;
  customerCode: string | null;
  customerTitle: string | null;
  isValid: boolean;
  message: string | null;
}

export interface IValidateInvoiceDocumentsResponseApiDto {
  scenario: IInvoiceSendingScenarioValueApiDto;
  requestedCount: number;
  validCount: number;
  invalidCount: number;
  items: IValidateInvoiceDocumentResultApiDto[];
}

export interface ISendInvoiceDocumentResultApiDto extends IInvoiceSendingDocumentKeyApiDto {
  invoiceId: string | null;
  customerCode: string | null;
  customerTitle: string | null;
  isSucceeded: boolean;
  serviceDocumentId: string | null;
  serviceDocumentNumber: string | null;
  message: string | null;
}

export interface ISendInvoiceDocumentsResponseApiDto {
  scenario: IInvoiceSendingScenarioValueApiDto;
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  items: ISendInvoiceDocumentResultApiDto[];
}

export interface IRetryInvoiceDocumentResultApiDto extends IInvoiceSendingDocumentKeyApiDto {
  invoiceId: string | null;
  serviceInvoiceId: string | null;
  isSucceeded: boolean;
  message: string | null;
}

export interface IRetryInvoiceDocumentsResponseApiDto {
  scenario: IInvoiceSendingScenarioValueApiDto;
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  items: IRetryInvoiceDocumentResultApiDto[];
}

export interface IInvoicePreviewRequestApiDto {
  invoiceId?: string | null;
  xmlContent: string;
  profile?: IInvoiceRenderProfileValueApiDto | null;
  preferEmbeddedXslt?: boolean | null;
}
