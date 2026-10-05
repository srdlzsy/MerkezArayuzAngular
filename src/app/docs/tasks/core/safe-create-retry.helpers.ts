import { HttpErrorResponse } from '@angular/common/http';

import { generateClientRequestId } from '../../../core/api/furpa-merkez-api.utils';
import { appendHttpErrorCorrelation } from './api-error.helpers';

export interface ClientRequestPayload {
  clientRequestId?: string;
}

export type SafeCreateConflictCode =
  | 'MIKRO_WRITE_IN_PROGRESS'
  | 'MIKRO_WRITE_OUTCOME_UNCONFIRMED'
  | 'MIKRO_DOCUMENT_CONTENT_MISMATCH'
  | 'CLIENT_REQUEST_PAYLOAD_MISMATCH';

export interface SafeCreateFailure {
  message: string;
  errorCode: SafeCreateConflictCode | string | null;
  retryable: boolean | null;
  blocksSubmit: boolean;
  allowsNewAttempt: boolean;
}

interface ProblemDetailsBody {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  errorCode?: unknown;
  retryable?: unknown;
}

export function classifySafeCreateFailure(
  error: HttpErrorResponse,
  fallbackMessage: string
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
        ? `${message} Ayni istek kimligi korunarak tekrar deneyebilirsiniz.`
        : message,
      errorCode: null,
      retryable: outcomeIsUnconfirmed ? true : null,
      blocksSubmit: false,
      allowsNewAttempt: false
    };
  }

  const errorCode = readText(body?.errorCode)?.toLocaleUpperCase('tr-TR') || null;
  const retryable = typeof body?.retryable === 'boolean' ? body.retryable : null;

  if (
    (errorCode === 'MIKRO_WRITE_IN_PROGRESS' ||
      errorCode === 'MIKRO_WRITE_OUTCOME_UNCONFIRMED') &&
    retryable === true
  ) {
    return {
      message: `${message} Ayni istek kimligi korunarak tekrar deneyebilirsiniz.`,
      errorCode,
      retryable: true,
      blocksSubmit: false,
      allowsNewAttempt: false
    };
  }

  if (errorCode === 'CLIENT_REQUEST_PAYLOAD_MISMATCH') {
    return {
      message: `${message} Devam etmek icin Yeni islem olarak kaydet aksiyonunu kullanin.`,
      errorCode,
      retryable: false,
      blocksSubmit: true,
      allowsNewAttempt: true
    };
  }

  if (errorCode === 'MIKRO_DOCUMENT_CONTENT_MISMATCH') {
    return {
      message: `${message} Yetkili incelemesi gerekli; bu kayit tekrar gonderilemez.`,
      errorCode,
      retryable: false,
      blocksSubmit: true,
      allowsNewAttempt: false
    };
  }

  return {
    message: `${message} Bu cakisma otomatik olarak tekrar gonderilemez.`,
    errorCode,
    retryable,
    blocksSubmit: true,
    allowsNewAttempt: false
  };
}

export class SafeCreateRetryDraft<TRequest extends ClientRequestPayload> {
  private clientRequestId = '';
  private payloadSnapshot = '';

  withClientRequestId(request: Omit<TRequest, 'clientRequestId'>): TRequest {
    const nextPayloadSnapshot = JSON.stringify(request);

    if (!this.clientRequestId || this.payloadSnapshot !== nextPayloadSnapshot) {
      this.clientRequestId = generateClientRequestId();
      this.payloadSnapshot = nextPayloadSnapshot;
    }

    return {
      ...request,
      clientRequestId: this.clientRequestId
    } as TRequest;
  }

  reset(): void {
    this.clientRequestId = '';
    this.payloadSnapshot = '';
  }
}

function isProblemDetailsBody(value: unknown): value is ProblemDetailsBody {
  return typeof value === 'object' && value !== null;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
