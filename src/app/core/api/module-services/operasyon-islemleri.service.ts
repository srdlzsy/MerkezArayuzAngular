import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  DocumentFlowDetailDto,
  DocumentFlowListHttpRequest,
  DocumentFlowListResponse,
  WarehouseOperationPanelHttpRequest,
  WarehouseOperationPanelResponse,
  IAuthorizationFileItemDto,
  IOperationJobDetailDto,
  IOperationJobDto,
  ISaveAuthorizationFileRequestApiDto
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

export type OperationJobDto = IOperationJobDto;
export type OperationJobDetailDto = IOperationJobDetailDto;

export function isOperationJobTerminalStatus(status: string | null | undefined): boolean {
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
export class OperasyonIslemleriService extends BaseApiService {
  createScalesFileJob(warehouseNo?: number | null) {
    return this.getWithOptionalWarehouse<OperationJobDto>('operations/scalesfile', warehouseNo);
  }

  createProductBarcodePluFileJob(warehouseNo?: number | null) {
    return this.getWithOptionalWarehouse<OperationJobDto>(
      'operations/productbarcodeplunofile',
      warehouseNo
    );
  }

  createCashierFileJob(warehouseNo?: number | null) {
    return this.getWithOptionalWarehouse<OperationJobDto>('operations/cashierfile', warehouseNo);
  }

  createPromoFileJob(warehouseNo?: number | null) {
    return this.getWithOptionalWarehouse<OperationJobDto>('operations/promofile', warehouseNo);
  }

  getJobDetail(jobId: string) {
    return this.get<OperationJobDetailDto>(`operations/jobs/${encodeURIComponent(jobId)}`);
  }

  getAuthorizationFiles() {
    return this.get<IAuthorizationFileItemDto[]>('operations/authorization-files');
  }

  saveAuthorizationFiles(request: ISaveAuthorizationFileRequestApiDto[]) {
    return this.post<void, ISaveAuthorizationFileRequestApiDto[]>(
      'operations/authorization-files',
      request
    );
  }

  getDocumentFlows(request: DocumentFlowListHttpRequest): Observable<DocumentFlowListResponse> {
    return this.getWithQuery<DocumentFlowListResponse, DocumentFlowListHttpRequest>(
      'operasyon-islemleri/belge-akis-takibi',
      request
    );
  }

  getDocumentFlowDetail(id: string): Observable<DocumentFlowDetailDto> {
    return this.get<DocumentFlowDetailDto>(
      `operasyon-islemleri/belge-akis-takibi/${encodeURIComponent(id)}`
    );
  }

  getWarehouseOperationPanel(
    request: WarehouseOperationPanelHttpRequest
  ): Observable<WarehouseOperationPanelResponse> {
    return this.getWithQuery<WarehouseOperationPanelResponse, WarehouseOperationPanelHttpRequest>(
      'operasyon-islemleri/depo-operasyon-paneli',
      request
    );
  }

  private getWithOptionalWarehouse<TResponse>(
    endpoint: string,
    warehouseNo?: number | null
  ): Observable<TResponse> {
    const normalizedWarehouseNo = this.toOptionalWarehouseNo(warehouseNo);

    return normalizedWarehouseNo === undefined
      ? this.get<TResponse>(endpoint)
      : this.getWithQuery<TResponse>(endpoint, { warehouseNo: normalizedWarehouseNo });
  }

  private toOptionalWarehouseNo(value?: number | null): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  }
}



