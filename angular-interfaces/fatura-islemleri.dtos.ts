/**
 * Fatura Islemleri DTOs
 */

import type {
  IUyumsoftOperationRequestApiDto,
  IUyumsoftOperationResponseApiDto
} from './entegrasyon-islemleri.dtos';

export type IInvoiceStateFilterApiDto = -1 | 0 | 1;
export type IInvoiceRenderProfileApiDto = 'Auto' | 'EFatura' | 'EArsiv';
export type IInvoiceSendingScenarioApiDto = 'EFatura' | 'EArsiv';
export type IInvoiceViewingSearchFieldApiDto =
  | 'InvoiceDate'
  | 'InvoiceId'
  | 'CustomerTitle'
  | 'CustomerTcknVkn'
  | 'InvoiceTotal'
  | 'DespatchId';

export interface IInvoiceViewingListQueryApiDto {
  startDate: string;
  endDate: string;
  isProcessed?: IInvoiceStateFilterApiDto | null;
  processedState?: IInvoiceStateFilterApiDto | null;
  isPrinted?: IInvoiceStateFilterApiDto | null;
  printedState?: IInvoiceStateFilterApiDto | null;
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
  profile: IInvoiceRenderProfileApiDto | string;
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

export type IInvoiceViewingPdfResponseApiDto = IUyumsoftOperationResponseApiDto;

export interface IInvoiceViewingSynchronizationRequestApiDto {
  startDate: string;
  endDate: string;
}

export interface IInvoiceViewingRenderRequestApiDto {
  profile?: IInvoiceRenderProfileApiDto | null;
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

export interface IInvoiceOutboxRenderQueryApiDto {
  profile?: IInvoiceRenderProfileApiDto | null;
  preferEmbeddedXslt?: boolean | null;
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
  isSent: boolean;
  customerCode: string;
  customerTitle: string;
  customerTcknVkn: string;
  targetAlias: string | null;
  invoiceProfileId: string | null;
  invoiceTypeCode: string | null;
  scenario: IInvoiceSendingScenarioApiDto | string;
  lineExtensionTotal: number;
  taxTotal: number;
  chargeTotal: number;
  payableTotal: number;
  shipmentDocumentNo: string | null;
  shipmentDocumentDate: string | null;
  warehouseName: string | null;
  description: string | null;
}

export interface IInvoiceSendingListResponseApiDto {
  totalCount: number;
  items: IInvoiceSendingListItemApiDto[];
}

export interface IInvoiceSendingDetailApiDto {
  summary: IInvoiceSendingListItemApiDto;
  document: IInvoiceRenderedDocumentApiDto;
}

export interface IInvoiceSendingRenderRequestApiDto {
  scenario?: IInvoiceSendingScenarioApiDto | null;
  profile?: IInvoiceRenderProfileApiDto | null;
  preferEmbeddedXslt?: boolean | null;
  fallbackToGeneral?: boolean | null;
}

export interface IInvoiceSendingDocumentKeyApiDto {
  documentSerie: string;
  documentOrderNo: number;
}

export interface ISendInvoiceDocumentsRequestApiDto {
  scenario?: IInvoiceSendingScenarioApiDto | null;
  documents: IInvoiceSendingDocumentKeyApiDto[];
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
  scenario: IInvoiceSendingScenarioApiDto | string;
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  items: ISendInvoiceDocumentResultApiDto[];
}

export interface IInvoicePreviewRequestApiDto {
  invoiceId?: string | null;
  xmlContent: string;
  profile?: IInvoiceRenderProfileApiDto | null;
  preferEmbeddedXslt?: boolean | null;
}

export type IInvoiceOutboxSearchRequestApiDto = IUyumsoftOperationRequestApiDto;
export type IInvoiceOutboxSearchResponseApiDto = IUyumsoftOperationResponseApiDto;
