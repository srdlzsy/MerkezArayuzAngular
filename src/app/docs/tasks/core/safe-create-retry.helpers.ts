import { HttpErrorResponse } from '@angular/common/http';

import { generateClientRequestId } from '../../../core/api/furpa-merkez-api.utils';
import { appendHttpErrorCorrelation } from './api-error.helpers';
import { SafeCreatePendingStore, type SafeCreatePendingScope } from './safe-create-pending.store';

export interface ClientRequestPayload {
  clientRequestId?: string;
  forceCreateNew?: boolean;
}

export interface SafeCreatePersistenceOptions<TRequest extends ClientRequestPayload> {
  store: SafeCreatePendingStore;
  resolveScope: (request: TRequest) => SafeCreatePendingScope;
}

export type SafeCreateConflictCode =
  | 'MIKRO_WRITE_QUEUE_BUSY'
  | 'MIKRO_WRITE_IN_PROGRESS'
  | 'MIKRO_WRITE_OUTCOME_UNCONFIRMED'
  | 'MIKRO_DOCUMENT_INCOMPLETE'
  | 'MIKRO_DOCUMENT_CONTENT_MISMATCH'
  | 'MIKRO_DOCUMENT_IDENTITY_CONFLICT'
  | 'MIKRO_OFFICIAL_DOCUMENT_ALREADY_RECEIVED'
  | 'WAREHOUSE_ORDER_LINE_CLOSED'
  | 'CREATE_REFERENCE_NOT_FOUND'
  | 'MIKRO_BUSINESS_RULE_REJECTED'
  | 'SAFE_WRITE_RETRY_ALLOWED'
  | 'SAFE_WRITE_CANCELLED'
  | 'CLIENT_REQUEST_PAYLOAD_MISMATCH';

export type SafeCreateRecommendedAction =
  | 'Completed'
  | 'WaitAndCheck'
  | 'RetrySameRequest'
  | 'RecheckExisting'
  | 'EditAndRetry'
  | 'RefreshList'
  | 'RestoreOriginalRequest'
  | 'NeedsReview'
  | 'ClearCancelled';

export interface SafeCreateFailure {
  message: string;
  errorCode: SafeCreateConflictCode | string | null;
  retryable: boolean | null;
  recoveryState?: string | null;
  recommendedAction?: SafeCreateRecommendedAction | string | null;
  blocksSubmit: boolean;
  allowsNewAttempt: boolean;
}

interface ProblemDetailsBody {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  errorCode?: unknown;
  retryable?: unknown;
  recoveryState?: unknown;
  recommendedAction?: unknown;
}

export function classifySafeCreateFailure(
  error: HttpErrorResponse,
  fallbackMessage: string,
): SafeCreateFailure {
  const body = isProblemDetailsBody(error.error) ? error.error : null;
  const detail =
    readText(body?.detail) ||
    readText(body?.message) ||
    readText(body?.error) ||
    readText(error.error);
  const message = appendHttpErrorCorrelation(error, detail || error.message || fallbackMessage);

  if (error.status !== 409) {
    const outcomeIsUnconfirmed =
      error.status === 0 || error.status >= 500 || (error as Error).name === 'TimeoutError';

    return {
      message: outcomeIsUnconfirmed
        ? `${message} Kayit sonucu kontrol edilecek; bu asamada yeniden gondermeyin.`
        : message,
      errorCode: null,
      retryable: outcomeIsUnconfirmed ? true : null,
      recoveryState: outcomeIsUnconfirmed ? 'Unknown' : null,
      recommendedAction: outcomeIsUnconfirmed ? 'WaitAndCheck' : null,
      blocksSubmit: outcomeIsUnconfirmed,
      allowsNewAttempt: false,
    };
  }

  const errorCode = readText(body?.errorCode)?.toLocaleUpperCase('tr-TR') || null;
  const retryable = typeof body?.retryable === 'boolean' ? body.retryable : null;
  const recoveryState = readText(body?.recoveryState) || null;
  const recommendedAction = readText(body?.recommendedAction) || null;

  if (recommendedAction === 'RetrySameRequest' || errorCode === 'SAFE_WRITE_RETRY_ALLOWED') {
    return {
      message: `${message} Kayitli ayni istek guvenli olarak yeniden gonderilebilir.`,
      errorCode,
      retryable: true,
      recoveryState,
      recommendedAction: 'RetrySameRequest',
      blocksSubmit: false,
      allowsNewAttempt: false,
    };
  }

  if (
    recommendedAction === 'EditAndRetry' ||
    errorCode === 'MIKRO_DOCUMENT_IDENTITY_CONFLICT' ||
    errorCode === 'CREATE_REFERENCE_NOT_FOUND' ||
    errorCode === 'MIKRO_BUSINESS_RULE_REJECTED'
  ) {
    return {
      message: `${message} Bilgileri duzeltip yeniden kaydedebilirsiniz.`,
      errorCode,
      retryable: false,
      recoveryState,
      recommendedAction: 'EditAndRetry',
      blocksSubmit: false,
      allowsNewAttempt: true,
    };
  }

  if (
    recommendedAction === 'RefreshList' ||
    errorCode === 'MIKRO_OFFICIAL_DOCUMENT_ALREADY_RECEIVED' ||
    errorCode === 'WAREHOUSE_ORDER_LINE_CLOSED'
  ) {
    return {
      message: `${message} Listeyi yenileyip guncel kayitla devam edin.`,
      errorCode,
      retryable: false,
      recoveryState,
      recommendedAction: 'RefreshList',
      blocksSubmit: false,
      allowsNewAttempt: true,
    };
  }

  if (
    (errorCode === 'MIKRO_WRITE_QUEUE_BUSY' ||
      errorCode === 'MIKRO_WRITE_IN_PROGRESS' ||
      errorCode === 'MIKRO_WRITE_OUTCOME_UNCONFIRMED' ||
      errorCode === 'MIKRO_DOCUMENT_INCOMPLETE') &&
    retryable === true
  ) {
    return {
      message: `${message} Kayit sonucu kontrol edilmeden yeniden gonderim yapilmayacak.`,
      errorCode,
      retryable: true,
      recoveryState,
      recommendedAction: recommendedAction || 'WaitAndCheck',
      blocksSubmit: true,
      allowsNewAttempt: false,
    };
  }

  if (errorCode === 'CLIENT_REQUEST_PAYLOAD_MISMATCH') {
    return {
      message: `${message} Orijinal istek ve onceki sonuc uzlastirilmadan yeni islem acilamaz.`,
      errorCode,
      retryable: false,
      recoveryState: recoveryState || 'RequestChanged',
      recommendedAction: recommendedAction || 'RestoreOriginalRequest',
      blocksSubmit: true,
      allowsNewAttempt: false,
    };
  }

  if (errorCode === 'MIKRO_DOCUMENT_CONTENT_MISMATCH') {
    return {
      message: `${message} Yetkili incelemesi gerekli; bu kayit tekrar gonderilemez.`,
      errorCode,
      retryable: false,
      recoveryState: recoveryState || 'Mismatch',
      recommendedAction: recommendedAction || 'RecheckExisting',
      blocksSubmit: true,
      allowsNewAttempt: false,
    };
  }

  return {
    message: `${message} Bu cakisma otomatik olarak tekrar gonderilemez.`,
    errorCode,
    retryable,
    recoveryState,
    recommendedAction: recommendedAction || 'NeedsReview',
    blocksSubmit: true,
    allowsNewAttempt: false,
  };
}

export class SafeCreateRetryDraft<TRequest extends ClientRequestPayload> {
  private clientRequestId = '';
  private payloadSnapshot = '';
  private activeScope: SafeCreatePendingScope | null = null;
  private forceCreateNew = false;

  constructor(private readonly persistence: SafeCreatePersistenceOptions<TRequest> | null = null) {}

  withClientRequestId(requestWithoutId: Omit<TRequest, 'clientRequestId'>): TRequest {
    const nextPayloadSnapshot = JSON.stringify(requestWithoutId);

    if (!this.clientRequestId || this.payloadSnapshot !== nextPayloadSnapshot) {
      this.clientRequestId = generateClientRequestId();
      this.payloadSnapshot = nextPayloadSnapshot;
    }

    const request = {
      ...requestWithoutId,
      ...(this.forceCreateNew ? { forceCreateNew: true } : {}),
      clientRequestId: this.clientRequestId,
    } as TRequest;

    if (this.persistence) {
      const scope = this.persistence.resolveScope(request);
      this.persistence.store.save(scope, request);
      this.activeScope = scope;
    }

    return request;
  }

  reset(): void {
    if (this.persistence && this.activeScope) {
      this.persistence.store.remove(this.activeScope, this.clientRequestId);
    }

    this.clientRequestId = '';
    this.payloadSnapshot = '';
    this.activeScope = null;
    this.forceCreateNew = false;
  }

  startNewAttempt(): void {
    this.clientRequestId = '';
    this.payloadSnapshot = '';
    this.activeScope = null;
    this.forceCreateNew = true;
  }

  recordFailure(failure: SafeCreateFailure, httpStatus: number): void {
    if (!this.persistence || !this.activeScope) {
      return;
    }

    if (
      (failure.retryable === true || httpStatus === 409) &&
      !failure.allowsNewAttempt
    ) {
      this.persistence.store.markFailure(this.activeScope, this.clientRequestId, failure);
      return;
    }

    this.persistence.store.remove(this.activeScope, this.clientRequestId);
    this.activeScope = null;
  }
}

function isProblemDetailsBody(value: unknown): value is ProblemDetailsBody {
  return typeof value === 'object' && value !== null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
