import { HttpErrorResponse } from '@angular/common/http';

import {
  SafeCreateRetryDraft,
  classifySafeCreateFailure
} from './safe-create-retry.helpers';

interface TestCreateRequest {
  clientRequestId?: string;
  warehouseNo: number;
  lines: Array<{ stockCode: string; quantity: number }>;
}

describe('SafeCreateRetryDraft', () => {
  it('keeps the same clientRequestId while the payload is unchanged', () => {
    const draft = new SafeCreateRetryDraft<TestCreateRequest>();
    const payload = {
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }]
    };

    const first = draft.withClientRequestId(payload);
    const retry = draft.withClientRequestId(payload);

    expect(first.clientRequestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(retry.clientRequestId).toBe(first.clientRequestId);
  });

  it('creates a new clientRequestId when the payload changes', () => {
    const draft = new SafeCreateRetryDraft<TestCreateRequest>();
    const first = draft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }]
    });
    const changed = draft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 2 }]
    });

    expect(changed.clientRequestId).not.toBe(first.clientRequestId);
  });

  it('creates a new clientRequestId after a completed draft is reset', () => {
    const draft = new SafeCreateRetryDraft<TestCreateRequest>();
    const payload = {
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }]
    };
    const completed = draft.withClientRequestId(payload);

    draft.reset();
    const nextDocument = draft.withClientRequestId(payload);

    expect(nextDocument.clientRequestId).not.toBe(completed.clientRequestId);
  });
});

describe('classifySafeCreateFailure', () => {
  it('allows a safe retry for an unconfirmed Mikro write', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_WRITE_OUTCOME_UNCONFIRMED', true),
      'Kayit basarisiz.'
    );

    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeFalse();
    expect(failure.allowsNewAttempt).toBeFalse();
  });

  it('blocks retry when the Mikro document content differs', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_DOCUMENT_CONTENT_MISMATCH', false),
      'Kayit basarisiz.'
    );

    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.allowsNewAttempt).toBeFalse();
    expect(failure.message).toContain('Yetkili incelemesi');
  });

  it('requires an explicit new attempt for a changed payload', () => {
    const failure = classifySafeCreateFailure(
      createConflict('CLIENT_REQUEST_PAYLOAD_MISMATCH', false),
      'Kayit basarisiz.'
    );

    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.allowsNewAttempt).toBeTrue();
  });

  it('blocks an unclassified conflict', () => {
    const failure = classifySafeCreateFailure(
      new HttpErrorResponse({ status: 409, error: { detail: 'Genel cakisma.' } }),
      'Kayit basarisiz.'
    );

    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.allowsNewAttempt).toBeFalse();
  });

  it('includes the backend correlation id in the user-visible failure', () => {
    const failure = classifySafeCreateFailure(
      new HttpErrorResponse({
        status: 409,
        error: {
          detail: 'Genel cakisma.',
          correlationId: 'request-123'
        }
      }),
      'Kayit basarisiz.'
    );

    expect(failure.message).toContain('Takip No: request-123');
  });

  it('preserves the request identity after a network failure', () => {
    const failure = classifySafeCreateFailure(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
      'Baglanti kurulamadi.'
    );

    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeFalse();
  });
});

function createConflict(errorCode: string, retryable: boolean): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    error: {
      detail: 'Create istegi tamamlanamadi.',
      errorCode,
      retryable
    }
  });
}
