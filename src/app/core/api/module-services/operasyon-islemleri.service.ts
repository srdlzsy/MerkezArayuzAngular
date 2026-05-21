import { Injectable } from '@angular/core';
import type {
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
  createScalesFileJob() {
    return this.get<OperationJobDto>('operations/scalesfile');
  }

  createProductBarcodePluFileJob() {
    return this.get<OperationJobDto>('operations/productbarcodeplunofile');
  }

  createCashierFileJob() {
    return this.get<OperationJobDto>('operations/cashierfile');
  }

  createPromoFileJob() {
    return this.get<OperationJobDto>('operations/promofile');
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
}



