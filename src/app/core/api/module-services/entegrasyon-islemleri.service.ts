import { Injectable } from '@angular/core';
import type {
  IAxataInboundAtfCompanyReceivingBatchRequestApiDto,
  IAxataInboundAtfCompanyReceivingBatchResponseApiDto,
  IAxataInboundAtfCompanyReceivingRequestApiDto,
  IAxataInboundAtfCompanyReceivingResponseApiDto,
  IAxataIntegrationAuditApiDto,
  IAxataIntegrationAuditQueryApiDto,
  IAxataManualIncomingCompanyReceivingBatchRequestApiDto,
  IAxataManualIncomingCompanyReceivingBatchResponseApiDto,
  IAxataManualIncomingCompanyReceivingRequestApiDto,
  IAxataManualIncomingCompanyReceivingResponseApiDto,
  IAxataManualIncomingInventoryCountBatchRequestApiDto,
  IAxataManualIncomingInventoryCountBatchResponseApiDto,
  IAxataManualIncomingInventoryCountRequestApiDto,
  IAxataManualIncomingInventoryCountResponseApiDto,
  IAxataManualIncomingWarehouseReceivingAcceptRequestApiDto,
  IAxataManualIncomingWarehouseReceivingAcceptResponseApiDto,
  IAxataManualIncomingWarehouseReceivingBatchRequestApiDto,
  IAxataManualIncomingWarehouseReceivingBatchResponseApiDto,
  IAxataManualIncomingWarehouseReceivingDetailApiDto,
  IAxataManualIncomingWarehouseReceivingListItemApiDto,
  IAxataManualOutboundDeliveryBatchResponseApiDto,
  IAxataOutboundDeliveryImportExecuteApiDto,
  IAxataOutboundDeliveryImportExecuteRequestApiDto,
  IAxataOutboundDeliveryImportPreviewApiDto,
  IAxataOutboundDeliveryQueuePreviewApiDto,
  IAxataOutboundDeliveryQueuePreviewHttpRequestApiDto,
  IAxataSynchronizationConnectionTestApiDto,
  IAxataSynchronizationExecuteRequestApiDto,
  IAxataSynchronizationExecuteTaskRequestApiDto,
  IAxataSynchronizationFetchProfilesOverviewApiDto,
  IAxataSynchronizationJobApiDto,
  IAxataSynchronizationJobDetailApiDto,
  IAxataSynchronizationManualDispatchApiDto,
  IAxataSynchronizationManualDispatchBatchApiDto,
  IAxataSynchronizationManualDocumentBatchApiDto,
  IAxataSynchronizationManualDocumentBatchExecuteRequestApiDto,
  IAxataSynchronizationManualDocumentBatchRequestApiDto,
  IAxataSynchronizationManualDocumentApiDto,
  IAxataSynchronizationManualDocumentCandidatesApiDto,
  IAxataSynchronizationManualDocumentCandidatesQueryApiDto,
  IAxataSynchronizationManualDocumentExecuteRequestApiDto,
  IAxataSynchronizationManualDocumentRequestApiDto,
  IAxataOutboundDeliveryBatchRequestApiDto,
  IAxataOutboundDeliveryRequestApiDto,
  IAxataOutboundDeliveryResponseApiDto,
  IAxataSynchronizationOverviewApiDto,
  IAxataSynchronizationPreviewApiDto,
  ICashRegisterBranchMappingHttpRequestApiDto,
  ICashRegisterBranchMappingApiDto,
  ICashRegisterBranchMappingListHttpRequestApiDto,
  IBranchInvoiceDetailApiDto,
  IBranchInvoiceListItemApiDto,
  IExpenseNoteDetailApiDto,
  IExpenseNoteListItemApiDto,
  IImportPosDocumentsHttpRequestApiDto,
  IImportZReportsHttpRequestApiDto,
  IModuleActionScaffoldResponseApiDto,
  IPosAccountingBatchResultApiDto,
  IPosAccountingDateRangeHttpRequestApiDto,
  IPosAccountingImportResultApiDto,
  IPosAccountingDeleteHttpRequestApiDto,
  IPosAccountingModuleActionScaffoldResponseApiDto,
  IPosAccountingOverviewApiDto,
  IPosAccountingTransferHttpRequestApiDto,
  IUpdatePosAccountingDocumentHttpRequestApiDto,
  IZReportDetailApiDto,
  IZReportListItemApiDto,
  IUyumsoftConnectedServiceOverviewApiDto,
  IUyumsoftOperationDefinitionApiDto,
  IUyumsoftOperationRequestApiDto,
  IUyumsoftOperationResponseApiDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

export type AxataSynchronizationOverviewDto = IAxataSynchronizationOverviewApiDto;
export type AxataSynchronizationTaskPreviewDto = IAxataSynchronizationPreviewApiDto;
export type AxataSynchronizationJobDto = IAxataSynchronizationJobApiDto;
export type AxataSynchronizationJobDetailDto = IAxataSynchronizationJobDetailApiDto;
export type AxataSynchronizationHealthDto = IAxataSynchronizationConnectionTestApiDto;
export type AxataSynchronizationFetchProfilesOverviewDto =
  IAxataSynchronizationFetchProfilesOverviewApiDto;
export type AxataIntegrationAuditDto = IAxataIntegrationAuditApiDto;
export type AxataSynchronizationManualDocumentDto = IAxataSynchronizationManualDocumentApiDto;
export type AxataSynchronizationManualDocumentCandidatesDto =
  IAxataSynchronizationManualDocumentCandidatesApiDto;
export type AxataSynchronizationManualDocumentBatchDto =
  IAxataSynchronizationManualDocumentBatchApiDto;
export type AxataSynchronizationManualDispatchDto =
  IAxataSynchronizationManualDispatchApiDto;
export type AxataSynchronizationManualDispatchBatchDto =
  IAxataSynchronizationManualDispatchBatchApiDto;
export type AxataManualIncomingCompanyReceivingResponseDto =
  IAxataManualIncomingCompanyReceivingResponseApiDto;
export type AxataManualIncomingCompanyReceivingBatchResponseDto =
  IAxataManualIncomingCompanyReceivingBatchResponseApiDto;
export type AxataManualIncomingInventoryCountResponseDto =
  IAxataManualIncomingInventoryCountResponseApiDto;
export type AxataManualIncomingInventoryCountBatchResponseDto =
  IAxataManualIncomingInventoryCountBatchResponseApiDto;
export type AxataManualIncomingWarehouseReceivingListItemDto =
  IAxataManualIncomingWarehouseReceivingListItemApiDto;
export type AxataManualIncomingWarehouseReceivingDetailDto =
  IAxataManualIncomingWarehouseReceivingDetailApiDto;
export type AxataManualIncomingWarehouseReceivingAcceptResponseDto =
  IAxataManualIncomingWarehouseReceivingAcceptResponseApiDto;
export type AxataManualIncomingWarehouseReceivingBatchResponseDto =
  IAxataManualIncomingWarehouseReceivingBatchResponseApiDto;
export type AxataOutboundDeliveryResponseDto = IAxataOutboundDeliveryResponseApiDto;
export type AxataManualOutboundDeliveryBatchResponseDto =
  IAxataManualOutboundDeliveryBatchResponseApiDto;
export type AxataInboundAtfCompanyReceivingResponseDto =
  IAxataInboundAtfCompanyReceivingResponseApiDto;
export type AxataInboundAtfCompanyReceivingBatchResponseDto =
  IAxataInboundAtfCompanyReceivingBatchResponseApiDto;
export type AxataOutboundDeliveryImportPreviewDto =
  IAxataOutboundDeliveryImportPreviewApiDto;
export type AxataOutboundDeliveryImportExecuteDto =
  IAxataOutboundDeliveryImportExecuteApiDto;
export type AxataOutboundDeliveryQueuePreviewDto =
  IAxataOutboundDeliveryQueuePreviewApiDto;
export type ModuleActionScaffoldResponseDto = IModuleActionScaffoldResponseApiDto;
export type PosAccountingModuleActionScaffoldResponseDto =
  IPosAccountingModuleActionScaffoldResponseApiDto;
export type PosAccountingOverviewDto = IPosAccountingOverviewApiDto;
export type ZReportListItemDto = IZReportListItemApiDto;
export type ZReportDetailDto = IZReportDetailApiDto;
export type BranchInvoiceListItemDto = IBranchInvoiceListItemApiDto;
export type BranchInvoiceDetailDto = IBranchInvoiceDetailApiDto;
export type ExpenseNoteListItemDto = IExpenseNoteListItemApiDto;
export type ExpenseNoteDetailDto = IExpenseNoteDetailApiDto;
export type CashRegisterBranchMappingDto = ICashRegisterBranchMappingApiDto;
export type PosAccountingImportResultDto = IPosAccountingImportResultApiDto;
export type PosAccountingBatchResultDto = IPosAccountingBatchResultApiDto;
export type UyumsoftConnectedServiceOverviewDto =
  IUyumsoftConnectedServiceOverviewApiDto;
export type UyumsoftOperationDefinitionDto = IUyumsoftOperationDefinitionApiDto;
export type UyumsoftOperationResponseDto = IUyumsoftOperationResponseApiDto;

export function isAxataJobTerminalStatus(status: string | null | undefined): boolean {
  const normalizedStatus = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

  return (
    normalizedStatus === 'succeeded' ||
    normalizedStatus === 'failed' ||
    normalizedStatus === 'cancelled'
  );
}

@Injectable({
  providedIn: 'root'
})
export class EntegrasyonIslemleriService extends BaseApiService {
  private toUyumsoftGetQuery(request: IUyumsoftOperationRequestApiDto): {
    payloadXml?: string;
    parameter?: string[];
  } {
    const parameterValues =
      request.parameters
        ?.filter((item) => item.name?.trim())
        .map((item) => `${item.name.trim()}=${item.value ?? ''}`) ?? [];

    return {
      payloadXml: request.payloadXml ?? undefined,
      parameter: parameterValues.length ? parameterValues : undefined
    };
  }

  getAxataSynchronizationOverview() {
    return this.get<AxataSynchronizationOverviewDto>('integrations/axata-sync');
  }

  getAxataSynchronizationHealth() {
    return this.get<AxataSynchronizationHealthDto>('integrations/axata-sync/health');
  }

  getAxataSynchronizationFetchProfiles() {
    return this.get<AxataSynchronizationFetchProfilesOverviewDto>(
      'integrations/axata-sync/fetch-profiles'
    );
  }

  getAxataIntegrationAuditOverview(query: IAxataIntegrationAuditQueryApiDto) {
    return this.getWithQuery<AxataIntegrationAuditDto>(
      'integrations/axata-sync/live/audit/overview',
      {
        startDate: query.startDate ?? undefined,
        endDate: query.endDate ?? undefined,
        warehouseNo: query.warehouseNo ?? undefined,
        take: query.take ?? undefined
      }
    );
  }

  previewAxataC01OutboundDeliveryImport(take?: number | null) {
    return this.getWithQuery<AxataOutboundDeliveryImportPreviewDto>(
      'integrations/axata-sync/live/axata/outbound-deliveries/c01/preview',
      {
        take: take ?? undefined
      }
    );
  }

  previewAxataOutboundDeliveryQueue(
    query: IAxataOutboundDeliveryQueuePreviewHttpRequestApiDto
  ) {
    const movementType = query.movementType?.trim();

    return this.getWithQuery<AxataOutboundDeliveryQueuePreviewDto>(
      'integrations/axata-sync/live/axata/outbound-deliveries/preview',
      {
        movementType: movementType || undefined,
        take: query.take ?? undefined
      }
    );
  }

  executeAxataC01OutboundDeliveryImport(
    request: IAxataOutboundDeliveryImportExecuteRequestApiDto
  ) {
    return this.post<
      AxataOutboundDeliveryImportExecuteDto,
      IAxataOutboundDeliveryImportExecuteRequestApiDto
    >('integrations/axata-sync/live/axata/outbound-deliveries/c01/import', request);
  }

  getAxataSynchronizationTaskPreview(
    taskCode: string,
    warehouseNo?: number | null,
    take?: number | null
  ) {
    return this.getWithQuery<AxataSynchronizationTaskPreviewDto>(
      `integrations/axata-sync/tasks/${encodeURIComponent(taskCode)}/preview`,
      {
        warehouseNo: warehouseNo ?? undefined,
        take: take ?? undefined
      }
    );
  }

  createAxataSynchronizationJob(request: IAxataSynchronizationExecuteRequestApiDto) {
    return this.post<AxataSynchronizationJobDto, IAxataSynchronizationExecuteRequestApiDto>(
      'integrations/axata-sync/jobs',
      request
    );
  }

  executeAxataSynchronizationTask(
    taskCode: string,
    request: IAxataSynchronizationExecuteTaskRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationJobDto,
      IAxataSynchronizationExecuteTaskRequestApiDto
    >(`integrations/axata-sync/tasks/${encodeURIComponent(taskCode)}/execute`, request);
  }

  getAxataSynchronizationJobDetail(jobId: string) {
    return this.get<AxataSynchronizationJobDetailDto>(
      `integrations/axata-sync/jobs/${encodeURIComponent(jobId)}`
    );
  }

  getAxataManualDocumentCandidates(
    taskCode: string,
    query: IAxataSynchronizationManualDocumentCandidatesQueryApiDto
  ) {
    return this.getWithQuery<AxataSynchronizationManualDocumentCandidatesDto>(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/candidates`,
      {
        warehouseNo: query.warehouseNo ?? undefined,
        startDate: query.startDate,
        endDate: query.endDate,
        take: query.take ?? undefined
      }
    );
  }

  previewAxataManualDocument(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDocumentDto,
      IAxataSynchronizationManualDocumentRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/preview`,
      request
    );
  }

  executeAxataManualDocument(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentExecuteRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDocumentDto,
      IAxataSynchronizationManualDocumentExecuteRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/execute`,
      request
    );
  }

  dispatchAxataManualDocument(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDispatchDto,
      IAxataSynchronizationManualDocumentRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/dispatch`,
      request
    );
  }

  previewAxataManualDocumentBatch(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentBatchRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDocumentBatchDto,
      IAxataSynchronizationManualDocumentBatchRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/preview-batch`,
      request
    );
  }

  executeAxataManualDocumentBatch(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentBatchExecuteRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDocumentBatchDto,
      IAxataSynchronizationManualDocumentBatchExecuteRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/execute-batch`,
      request
    );
  }

  dispatchAxataManualDocumentBatch(
    taskCode: string,
    request: IAxataSynchronizationManualDocumentBatchRequestApiDto
  ) {
    return this.post<
      AxataSynchronizationManualDispatchBatchDto,
      IAxataSynchronizationManualDocumentBatchRequestApiDto
    >(
      `integrations/axata-sync/manual/tasks/${encodeURIComponent(taskCode)}/documents/dispatch-batch`,
      request
    );
  }

  createManualIncomingCompanyReceiving(
    request: IAxataManualIncomingCompanyReceivingRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingCompanyReceivingResponseDto,
      IAxataManualIncomingCompanyReceivingRequestApiDto
    >('integrations/axata-sync/manual/incoming/company-receivings', request);
  }

  createManualIncomingCompanyReceivingBatch(
    request: IAxataManualIncomingCompanyReceivingBatchRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingCompanyReceivingBatchResponseDto,
      IAxataManualIncomingCompanyReceivingBatchRequestApiDto
    >('integrations/axata-sync/manual/incoming/company-receivings/batch', request);
  }

  createManualIncomingInventoryCount(
    request: IAxataManualIncomingInventoryCountRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingInventoryCountResponseDto,
      IAxataManualIncomingInventoryCountRequestApiDto
    >('integrations/axata-sync/manual/incoming/inventory-counts', request);
  }

  createManualIncomingInventoryCountBatch(
    request: IAxataManualIncomingInventoryCountBatchRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingInventoryCountBatchResponseDto,
      IAxataManualIncomingInventoryCountBatchRequestApiDto
    >('integrations/axata-sync/manual/incoming/inventory-counts/batch', request);
  }

  getManualIncomingWarehouseReceivings(
    warehouseNo: number,
    startDate: string,
    endDate: string
  ) {
    return this.getWithQuery<AxataManualIncomingWarehouseReceivingListItemDto[]>(
      'integrations/axata-sync/manual/incoming/warehouse-receivings',
      {
        warehouseNo,
        startDate,
        endDate
      }
    );
  }

  getManualIncomingWarehouseReceivingDetail(
    documentSerie: string,
    documentOrderNo: number,
    warehouseNo: number
  ) {
    return this.getWithQuery<AxataManualIncomingWarehouseReceivingDetailDto>(
      `integrations/axata-sync/manual/incoming/warehouse-receivings/${encodeURIComponent(documentSerie)}/${documentOrderNo}`,
      {
        warehouseNo
      }
    );
  }

  acceptManualIncomingWarehouseReceiving(
    documentSerie: string,
    documentOrderNo: number,
    request: IAxataManualIncomingWarehouseReceivingAcceptRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingWarehouseReceivingAcceptResponseDto,
      IAxataManualIncomingWarehouseReceivingAcceptRequestApiDto
    >(
      `integrations/axata-sync/manual/incoming/warehouse-receivings/${encodeURIComponent(documentSerie)}/${documentOrderNo}/accept`,
      request
    );
  }

  acceptManualIncomingWarehouseReceivingBatch(
    request: IAxataManualIncomingWarehouseReceivingBatchRequestApiDto
  ) {
    return this.post<
      AxataManualIncomingWarehouseReceivingBatchResponseDto,
      IAxataManualIncomingWarehouseReceivingBatchRequestApiDto
    >('integrations/axata-sync/manual/incoming/warehouse-receivings/accept-batch', request);
  }

  createAxataOutboundDeliveryInterWarehouseShipment(
    request: IAxataOutboundDeliveryRequestApiDto
  ) {
    return this.post<
      AxataOutboundDeliveryResponseDto,
      IAxataOutboundDeliveryRequestApiDto
    >(
      'integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments',
      request
    );
  }

  createAxataOutboundDeliveryInterWarehouseShipmentBatch(
    request: IAxataOutboundDeliveryBatchRequestApiDto
  ) {
    return this.post<
      AxataManualOutboundDeliveryBatchResponseDto,
      IAxataOutboundDeliveryBatchRequestApiDto
    >(
      'integrations/axata-sync/manual/axata/outbound-deliveries/inter-warehouse-shipments/batch',
      request
    );
  }

  createAxataInboundAtfCompanyReceiving(
    request: IAxataInboundAtfCompanyReceivingRequestApiDto
  ) {
    return this.post<
      AxataInboundAtfCompanyReceivingResponseDto,
      IAxataInboundAtfCompanyReceivingRequestApiDto
    >('integrations/axata-sync/manual/axata/inbound-atf/company-receivings', request);
  }

  createAxataInboundAtfCompanyReceivingBatch(
    request: IAxataInboundAtfCompanyReceivingBatchRequestApiDto
  ) {
    return this.post<
      AxataInboundAtfCompanyReceivingBatchResponseDto,
      IAxataInboundAtfCompanyReceivingBatchRequestApiDto
    >('integrations/axata-sync/manual/axata/inbound-atf/company-receivings/batch', request);
  }

  getPosAccountingOverview(query: IPosAccountingDateRangeHttpRequestApiDto) {
    return this.getWithQuery<
      PosAccountingOverviewDto,
      IPosAccountingDateRangeHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi', query);
  }

  getPosAccountingZReports(query: IPosAccountingDateRangeHttpRequestApiDto) {
    return this.getWithQuery<
      ZReportListItemDto[],
      IPosAccountingDateRangeHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari', query);
  }

  getPosAccountingZReportDetail(totalId: number) {
    return this.get<ZReportDetailDto>(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/${totalId}`
    );
  }

  importPosAccountingZReports(request: IImportZReportsHttpRequestApiDto) {
    return this.post<
      PosAccountingImportResultDto,
      IImportZReportsHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/ice-aktar', request);
  }

  transferPosAccountingZReports(request: IPosAccountingTransferHttpRequestApiDto) {
    return this.post<
      PosAccountingBatchResultDto,
      IPosAccountingTransferHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari/erpye-gonder', request);
  }

  deletePosAccountingZReports(request: IPosAccountingDeleteHttpRequestApiDto) {
    return this.deleteWithBody<
      PosAccountingBatchResultDto,
      IPosAccountingDeleteHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/z-raporlari', request);
  }

  getPosAccountingInvoices(query: IPosAccountingDateRangeHttpRequestApiDto) {
    return this.getWithQuery<
      BranchInvoiceListItemDto[],
      IPosAccountingDateRangeHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar', query);
  }

  getPosAccountingInvoiceDetail(invoiceId: number) {
    return this.get<BranchInvoiceDetailDto>(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/${invoiceId}`
    );
  }

  importPosAccountingInvoices(request: IImportPosDocumentsHttpRequestApiDto) {
    return this.post<
      PosAccountingImportResultDto,
      IImportPosDocumentsHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/ice-aktar', request);
  }

  transferPosAccountingInvoices(request: IPosAccountingTransferHttpRequestApiDto) {
    return this.post<
      PosAccountingBatchResultDto,
      IPosAccountingTransferHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/erpye-gonder', request);
  }

  updatePosAccountingInvoice(
    invoiceId: number,
    request: IUpdatePosAccountingDocumentHttpRequestApiDto
  ) {
    return this.put<
      BranchInvoiceDetailDto,
      IUpdatePosAccountingDocumentHttpRequestApiDto
    >(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar/${invoiceId}`,
      request
    );
  }

  deletePosAccountingInvoices(request: IPosAccountingDeleteHttpRequestApiDto) {
    return this.deleteWithBody<
      PosAccountingBatchResultDto,
      IPosAccountingDeleteHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/pos-faturalar', request);
  }

  getPosAccountingExpenseNotes(query: IPosAccountingDateRangeHttpRequestApiDto) {
    return this.getWithQuery<
      ExpenseNoteListItemDto[],
      IPosAccountingDateRangeHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari', query);
  }

  getPosAccountingExpenseNoteDetail(expenseId: number) {
    return this.get<ExpenseNoteDetailDto>(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/${expenseId}`
    );
  }

  importPosAccountingExpenseNotes(request: IImportPosDocumentsHttpRequestApiDto) {
    return this.post<
      PosAccountingImportResultDto,
      IImportPosDocumentsHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/ice-aktar', request);
  }

  transferPosAccountingExpenseNotes(request: IPosAccountingTransferHttpRequestApiDto) {
    return this.post<
      PosAccountingBatchResultDto,
      IPosAccountingTransferHttpRequestApiDto
    >(
      'entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/erpye-gonder',
      request
    );
  }

  updatePosAccountingExpenseNote(
    expenseId: number,
    request: IUpdatePosAccountingDocumentHttpRequestApiDto
  ) {
    return this.put<
      ExpenseNoteDetailDto,
      IUpdatePosAccountingDocumentHttpRequestApiDto
    >(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari/${expenseId}`,
      request
    );
  }

  deletePosAccountingExpenseNotes(request: IPosAccountingDeleteHttpRequestApiDto) {
    return this.deleteWithBody<
      PosAccountingBatchResultDto,
      IPosAccountingDeleteHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/gider-pusulalari', request);
  }

  getPosAccountingCashRegisterMappings(
    query: ICashRegisterBranchMappingListHttpRequestApiDto
  ) {
    return this.getWithQuery<
      CashRegisterBranchMappingDto[],
      ICashRegisterBranchMappingListHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri', query);
  }

  createPosAccountingCashRegisterMapping(
    request: ICashRegisterBranchMappingHttpRequestApiDto
  ) {
    return this.post<
      CashRegisterBranchMappingDto,
      ICashRegisterBranchMappingHttpRequestApiDto
    >('entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri', request);
  }

  updatePosAccountingCashRegisterMapping(
    mappingId: number,
    request: ICashRegisterBranchMappingHttpRequestApiDto
  ) {
    return this.put<
      CashRegisterBranchMappingDto,
      ICashRegisterBranchMappingHttpRequestApiDto
    >(
      `entegrasyon-islemleri/pos-muhasebe-aktarimi/kasa-eslemeleri/${mappingId}`,
      request
    );
  }

  getUyumsoftEInvoiceOverview() {
    return this.get<UyumsoftConnectedServiceOverviewDto>(
      'entegrasyon-islemleri/uyumsoft/e-fatura'
    );
  }

  getUyumsoftEInvoiceOperations() {
    return this.get<UyumsoftOperationDefinitionDto[]>(
      'entegrasyon-islemleri/uyumsoft/e-fatura/operations'
    );
  }

  executeUyumsoftEInvoiceGetOperation(
    operationName: string,
    request: IUyumsoftOperationRequestApiDto
  ) {
    return this.post<UyumsoftOperationResponseDto, IUyumsoftOperationRequestApiDto>(
      `entegrasyon-islemleri/uyumsoft/e-fatura/get/${encodeURIComponent(operationName)}`,
      request
    );
  }

  executeUyumsoftEInvoiceGetOperationWithQuery(
    operationName: string,
    request: IUyumsoftOperationRequestApiDto
  ) {
    return this.getWithQuery<UyumsoftOperationResponseDto>(
      `entegrasyon-islemleri/uyumsoft/e-fatura/get/${encodeURIComponent(operationName)}`,
      this.toUyumsoftGetQuery(request)
    );
  }

  getUyumsoftEDespatchOverview() {
    return this.get<UyumsoftConnectedServiceOverviewDto>(
      'entegrasyon-islemleri/uyumsoft/e-irsaliye'
    );
  }

  getUyumsoftEDespatchOperations() {
    return this.get<UyumsoftOperationDefinitionDto[]>(
      'entegrasyon-islemleri/uyumsoft/e-irsaliye/operations'
    );
  }

  executeUyumsoftEDespatchGetOperation(
    operationName: string,
    request: IUyumsoftOperationRequestApiDto
  ) {
    return this.post<UyumsoftOperationResponseDto, IUyumsoftOperationRequestApiDto>(
      `entegrasyon-islemleri/uyumsoft/e-irsaliye/get/${encodeURIComponent(operationName)}`,
      request
    );
  }

  executeUyumsoftEDespatchGetOperationWithQuery(
    operationName: string,
    request: IUyumsoftOperationRequestApiDto
  ) {
    return this.getWithQuery<UyumsoftOperationResponseDto>(
      `entegrasyon-islemleri/uyumsoft/e-irsaliye/get/${encodeURIComponent(operationName)}`,
      this.toUyumsoftGetQuery(request)
    );
  }
}



