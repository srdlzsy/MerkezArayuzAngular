import { Injectable } from '@angular/core';
import type {
  IInvoicePreviewRequestApiDto,
  IInvoiceRenderedDocumentApiDto,
  IInvoiceReturnReferenceApiDto,
  IInvoiceReturnReferenceCandidatesResponseApiDto,
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
  IUpdateInvoiceReturnReferenceRequestApiDto,
  IValidateInvoiceDocumentsResponseApiDto,
  ISendInvoiceDocumentsRequestApiDto,
  ISendInvoiceDocumentsResponseApiDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

type InvoiceSendingScenarioBodyValue = 0 | 1;
type InvoiceRenderProfileBodyValue = 0 | 1 | 2;

export type InvoiceViewingListItemDto = IInvoiceViewingListItemApiDto;
export type InvoiceViewingListResponseDto = IInvoiceViewingListResponseApiDto;
export type InvoiceViewingDetailDto = IInvoiceViewingDetailApiDto;
export type InvoiceViewingPdfResponseDto = IInvoiceViewingPdfResponseApiDto;
export type InvoiceViewingSynchronizationRequestDto =
  IInvoiceViewingSynchronizationRequestApiDto;
export type InvoiceViewingRenderRequestDto = IInvoiceViewingRenderRequestApiDto;
export type InvoiceRenderedDocumentDto = IInvoiceRenderedDocumentApiDto;
export type InvoicePreviewRequestDto = IInvoicePreviewRequestApiDto;
export type InvoiceViewingPrintedStateRequestDto = IInvoiceViewingPrintedStateRequestApiDto;
export type InvoiceViewingPrintedStateResponseDto = IInvoiceViewingPrintedStateResponseApiDto;
export type InvoiceSendingScenarioDto = IInvoiceSendingScenarioApiDto;
export type InvoiceSendingListItemDto = IInvoiceSendingListItemApiDto;
export type InvoiceSendingListResponseDto = IInvoiceSendingListResponseApiDto;
export type InvoiceSendingDetailDto = IInvoiceSendingDetailApiDto;
export type InvoiceSendingRenderRequestDto = IInvoiceSendingRenderRequestApiDto;
export type InvoiceReturnReferenceDto = IInvoiceReturnReferenceApiDto;
export type InvoiceReturnReferenceCandidatesResponseDto =
  IInvoiceReturnReferenceCandidatesResponseApiDto;
export type UpdateInvoiceReturnReferenceRequestDto =
  IUpdateInvoiceReturnReferenceRequestApiDto;
export type SendInvoiceDocumentsRequestDto = ISendInvoiceDocumentsRequestApiDto;
export type ValidateInvoiceDocumentsResponseDto = IValidateInvoiceDocumentsResponseApiDto;
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
    const body: InvoiceSendingRenderRequestDto = {
      ...request,
      scenario: this.toInvoiceSendingScenarioBodyValue(request.scenario),
      profile: this.toInvoiceRenderProfileBodyValue(request.profile)
    };

    return this.post<InvoiceSendingDetailDto, InvoiceSendingRenderRequestDto>(
      `fatura-islemleri/fatura-gonderimi/${encodeURIComponent(documentSerie)}/${documentOrderNo}/render`,
      body
    );
  }

  getInvoiceReturnReferenceCandidates(
    documentSerie: string,
    documentOrderNo: number,
    scenario: IInvoiceSendingScenarioApiDto
  ) {
    return this.getWithQuery<InvoiceReturnReferenceCandidatesResponseDto>(
      `fatura-islemleri/fatura-gonderimi/${encodeURIComponent(documentSerie)}/${documentOrderNo}/return-reference-candidates`,
      {
        scenario
      }
    );
  }

  updateInvoiceReturnReference(
    documentSerie: string,
    documentOrderNo: number,
    request: UpdateInvoiceReturnReferenceRequestDto
  ) {
    const body: UpdateInvoiceReturnReferenceRequestDto = {
      ...request,
      scenario: this.toInvoiceSendingScenarioBodyValue(request.scenario)
    };

    return this.put<InvoiceReturnReferenceDto | null, UpdateInvoiceReturnReferenceRequestDto>(
      `fatura-islemleri/fatura-gonderimi/${encodeURIComponent(documentSerie)}/${documentOrderNo}/return-reference`,
      body
    );
  }

  sendInvoiceDocuments(request: SendInvoiceDocumentsRequestDto) {
    const body: SendInvoiceDocumentsRequestDto = {
      ...request,
      scenario: this.toInvoiceSendingScenarioBodyValue(request.scenario)
    };

    return this.post<SendInvoiceDocumentsResponseDto, SendInvoiceDocumentsRequestDto>(
      'fatura-islemleri/fatura-gonderimi/send',
      body
    );
  }

  validateInvoiceDocuments(request: SendInvoiceDocumentsRequestDto) {
    const body: SendInvoiceDocumentsRequestDto = {
      ...request,
      scenario: this.toInvoiceSendingScenarioBodyValue(request.scenario)
    };

    return this.post<ValidateInvoiceDocumentsResponseDto, SendInvoiceDocumentsRequestDto>(
      'fatura-islemleri/fatura-gonderimi/validate',
      body
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

  getUyumsoftEInvoiceInboxPdfFile(invoiceUuid: string) {
    return this.getBlob(
      `entegrasyon-islemleri/uyumsoft/e-fatura/inbox/invoices/${encodeURIComponent(invoiceUuid)}/pdf-file`
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
    const body: InvoiceViewingRenderRequestDto = {
      ...request,
      profile: this.toInvoiceRenderProfileBodyValue(request.profile)
    };

    return this.post<InvoiceViewingDetailDto, InvoiceViewingRenderRequestDto>(
      `fatura-islemleri/fatura-goruntuleme/${encodeURIComponent(documentId)}/render`,
      body
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

  previewInvoiceDocument(request: InvoicePreviewRequestDto) {
    const body: InvoicePreviewRequestDto = {
      ...request,
      profile: this.toInvoiceRenderProfileBodyValue(request.profile)
    };

    return this.post<InvoiceRenderedDocumentDto, InvoicePreviewRequestDto>(
      'fatura-islemleri/fatura-gonderimi/preview',
      body
    );
  }

  private toInvoiceSendingScenarioBodyValue(
    value: string | number | null | undefined
  ): InvoiceSendingScenarioBodyValue | undefined {
    if (value === 0 || value === 1) {
      return value;
    }

    if (typeof value === 'number') {
      return value === 2 ? 1 : 0;
    }

    const normalizedValue = (value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLocaleLowerCase('tr-TR');

    if (!normalizedValue) {
      return undefined;
    }

    return normalizedValue.includes('arsiv') || normalizedValue.includes('archive') ? 1 : 0;
  }

  private toInvoiceRenderProfileBodyValue(
    value: string | number | null | undefined
  ): InvoiceRenderProfileBodyValue | undefined {
    if (value === 0 || value === 1 || value === 2) {
      return value;
    }

    if (typeof value === 'number') {
      return value <= 0 ? 0 : value === 1 ? 1 : 2;
    }

    const normalizedValue = (value ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLocaleLowerCase('tr-TR');

    if (!normalizedValue) {
      return undefined;
    }

    if (normalizedValue.includes('arsiv') || normalizedValue.includes('archive')) {
      return 2;
    }

    if (normalizedValue.includes('fatura') || normalizedValue.includes('invoice')) {
      return 1;
    }

    return 0;
  }
}
