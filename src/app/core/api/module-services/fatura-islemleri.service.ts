import { Injectable } from '@angular/core';
import type {
  IInvoiceOutboxRenderQueryApiDto,
  IInvoiceOutboxSearchRequestApiDto,
  IInvoiceOutboxSearchResponseApiDto,
  IInvoicePreviewRequestApiDto,
  IInvoiceRenderedDocumentApiDto,
  IInvoiceSendingDetailApiDto,
  IInvoiceSendingListItemApiDto,
  IInvoiceSendingListQueryApiDto,
  IInvoiceSendingListResponseApiDto,
  IInvoiceSendingRenderRequestApiDto,
  IInvoiceSendingScenarioApiDto,
  IInvoiceViewingDetailApiDto,
  IInvoiceViewingListItemApiDto,
  IInvoiceViewingListQueryApiDto,
  IInvoiceViewingListResponseApiDto,
  IInvoiceViewingPdfResponseApiDto,
  IInvoiceViewingRenderRequestApiDto,
  IInvoiceViewingSynchronizationRequestApiDto,
  IInvoiceViewingPrintedStateRequestApiDto,
  IInvoiceViewingPrintedStateResponseApiDto,
  ISendInvoiceDocumentsRequestApiDto,
  ISendInvoiceDocumentsResponseApiDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

export type InvoiceViewingListItemDto = IInvoiceViewingListItemApiDto;
export type InvoiceViewingListResponseDto = IInvoiceViewingListResponseApiDto;
export type InvoiceViewingDetailDto = IInvoiceViewingDetailApiDto;
export type InvoiceViewingPdfResponseDto = IInvoiceViewingPdfResponseApiDto;
export type InvoiceViewingSynchronizationRequestDto =
  IInvoiceViewingSynchronizationRequestApiDto;
export type InvoiceViewingRenderRequestDto = IInvoiceViewingRenderRequestApiDto;
export type InvoiceRenderedDocumentDto = IInvoiceRenderedDocumentApiDto;
export type InvoiceOutboxSearchRequestDto = IInvoiceOutboxSearchRequestApiDto;
export type InvoiceOutboxSearchResponseDto = IInvoiceOutboxSearchResponseApiDto;
export type InvoicePreviewRequestDto = IInvoicePreviewRequestApiDto;
export type InvoiceViewingPrintedStateRequestDto = IInvoiceViewingPrintedStateRequestApiDto;
export type InvoiceViewingPrintedStateResponseDto = IInvoiceViewingPrintedStateResponseApiDto;
export type InvoiceSendingScenarioDto = IInvoiceSendingScenarioApiDto;
export type InvoiceSendingListItemDto = IInvoiceSendingListItemApiDto;
export type InvoiceSendingListResponseDto = IInvoiceSendingListResponseApiDto;
export type InvoiceSendingDetailDto = IInvoiceSendingDetailApiDto;
export type InvoiceSendingRenderRequestDto = IInvoiceSendingRenderRequestApiDto;
export type SendInvoiceDocumentsRequestDto = ISendInvoiceDocumentsRequestApiDto;
export type SendInvoiceDocumentsResponseDto = ISendInvoiceDocumentsResponseApiDto;

@Injectable({
  providedIn: 'root'
})
export class FaturaIslemleriService extends BaseApiService {
  listInvoiceSending(request: IInvoiceSendingListQueryApiDto) {
    const isSent = request.isSent ?? request.sentState ?? undefined;

    return this.getWithQuery<InvoiceSendingListResponseDto>(
      'fatura-islemleri/fatura-gonderimi',
      {
        StartDate: request.startDate,
        EndDate: request.endDate,
        Scenario: request.scenario ?? undefined,
        isSent,
        SentState: isSent
      }
    );
  }

  getInvoiceSendingDetail(
    documentSerie: string,
    documentOrderNo: number,
    scenario: IInvoiceSendingScenarioApiDto
  ) {
    return this.getWithQuery<InvoiceSendingDetailDto>(
      `fatura-islemleri/fatura-gonderimi/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      {
        scenario
      }
    );
  }

  renderInvoiceSendingDetail(
    documentSerie: string,
    documentOrderNo: number,
    request: InvoiceSendingRenderRequestDto
  ) {
    return this.post<InvoiceSendingDetailDto, InvoiceSendingRenderRequestDto>(
      `fatura-islemleri/fatura-gonderimi/${encodeURIComponent(documentSerie)}/${documentOrderNo}/render`,
      request
    );
  }

  sendInvoiceDocuments(request: SendInvoiceDocumentsRequestDto) {
    return this.post<SendInvoiceDocumentsResponseDto, SendInvoiceDocumentsRequestDto>(
      'fatura-islemleri/fatura-gonderimi/send',
      request
    );
  }

  listInvoiceViewing(request: IInvoiceViewingListQueryApiDto) {
    const isProcessed = request.isProcessed ?? request.processedState ?? undefined;
    const isPrinted = request.isPrinted ?? request.printedState ?? undefined;
    const page = request.page ?? request.pageNumber ?? undefined;

    return this.getWithQuery<InvoiceViewingListResponseDto>(
      'fatura-islemleri/fatura-goruntuleme',
      {
        StartDate: request.startDate,
        EndDate: request.endDate,
        isProcessed,
        ProcessedState: isProcessed,
        isPrinted,
        PrintedState: isPrinted,
        SearchField: request.searchField ?? undefined,
        SearchText:
          request.searchField && request.searchText?.trim() ? request.searchText.trim() : undefined,
        page,
        PageNumber: page,
        PageSize: request.pageSize ?? undefined
      }
    );
  }

  getInvoiceViewingPdf(documentId: string) {
    return this.get<InvoiceViewingPdfResponseDto>(
      `fatura-islemleri/fatura-goruntuleme/${encodeURIComponent(documentId)}`
    );
  }

  getInvoiceViewingDetail(documentId: string) {
    return this.getInvoiceViewingHtmlDetail(documentId);
  }

  getInvoiceViewingHtmlDetail(documentId: string) {
    return this.get<InvoiceViewingDetailDto>(
      `fatura-islemleri/fatura-goruntuleme/${encodeURIComponent(documentId)}/detail`
    );
  }

  synchronizeInvoiceViewing(request: InvoiceViewingSynchronizationRequestDto) {
    return this.post<void, InvoiceViewingSynchronizationRequestDto>(
      'fatura-islemleri/fatura-goruntuleme/senkronize',
      request
    );
  }

  renderInvoiceViewingDetail(
    documentId: string,
    request: InvoiceViewingRenderRequestDto
  ) {
    return this.post<InvoiceViewingDetailDto, InvoiceViewingRenderRequestDto>(
      `fatura-islemleri/fatura-goruntuleme/${encodeURIComponent(documentId)}/render`,
      request
    );
  }

  updateInvoiceViewingPrintedState(
    documentId: string,
    request: InvoiceViewingPrintedStateRequestDto
  ) {
    return this.patch<InvoiceViewingPrintedStateResponseDto, InvoiceViewingPrintedStateRequestDto>(
      `fatura-islemleri/fatura-goruntuleme/${encodeURIComponent(documentId)}/printed`,
      request
    );
  }

  searchOutboxInvoices(request: InvoiceOutboxSearchRequestDto) {
    return this.post<InvoiceOutboxSearchResponseDto, InvoiceOutboxSearchRequestDto>(
      'fatura-islemleri/fatura-gonderimi/outbox/search',
      request
    );
  }

  renderOutboxInvoice(invoiceId: string, query: IInvoiceOutboxRenderQueryApiDto = {}) {
    return this.getWithQuery<InvoiceRenderedDocumentDto>(
      `fatura-islemleri/fatura-gonderimi/outbox/${encodeURIComponent(invoiceId)}`,
      {
        profile: query.profile ?? undefined,
        preferEmbeddedXslt: query.preferEmbeddedXslt ?? undefined
      }
    );
  }

  previewInvoiceDocument(request: InvoicePreviewRequestDto) {
    return this.post<InvoiceRenderedDocumentDto, InvoicePreviewRequestDto>(
      'fatura-islemleri/fatura-gonderimi/preview',
      request
    );
  }
}
