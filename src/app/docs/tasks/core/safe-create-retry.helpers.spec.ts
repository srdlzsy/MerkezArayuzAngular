import { HttpErrorResponse } from '@angular/common/http';

import { SafeCreateRetryDraft, classifySafeCreateFailure } from './safe-create-retry.helpers';
import { SafeCreatePendingStore, type SafeCreatePendingScope } from './safe-create-pending.store';

interface TestCreateRequest {
  clientRequestId?: string;
  forceCreateNew?: boolean;
  warehouseNo: number;
  lines: Array<{ stockCode: string; quantity: number }>;
}

describe('SafeCreateRetryDraft', () => {
  const persistentScope: SafeCreatePendingScope = {
    userId: 'user-120',
    clientType: 'web',
    warehouseNo: 120,
    operationCode: 'inventory-count.create',
  };

  beforeEach(() => clearSafeCreateStorage());
  afterEach(() => clearSafeCreateStorage());

  it('keeps the same clientRequestId while the payload is unchanged', () => {
    const draft = new SafeCreateRetryDraft<TestCreateRequest>();
    const payload = {
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }],
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
      lines: [{ stockCode: '016445', quantity: 1 }],
    });
    const changed = draft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 2 }],
    });

    expect(changed.clientRequestId).not.toBe(first.clientRequestId);
  });

  it('creates a new clientRequestId after a completed draft is reset', () => {
    const draft = new SafeCreateRetryDraft<TestCreateRequest>();
    const payload = {
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }],
    };
    const completed = draft.withClientRequestId(payload);

    draft.reset();
    const nextDocument = draft.withClientRequestId(payload);

    expect(nextDocument.clientRequestId).not.toBe(completed.clientRequestId);
  });

  it('keeps the unresolved request and marks an explicit new attempt', () => {
    const store = new SafeCreatePendingStore();
    const draft = new SafeCreateRetryDraft<TestCreateRequest>({
      store,
      resolveScope: () => persistentScope,
    });
    const payload = {
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 1 }],
    };
    const unresolved = draft.withClientRequestId(payload);

    draft.startNewAttempt();
    const newAttempt = draft.withClientRequestId(payload);

    expect(newAttempt.clientRequestId).not.toBe(unresolved.clientRequestId);
    expect(newAttempt.forceCreateNew).toBeTrue();
    expect(
      store.read<TestCreateRequest>(persistentScope, unresolved.clientRequestId ?? ''),
    ).not.toBeNull();
    expect(
      store.read<TestCreateRequest>(persistentScope, newAttempt.clientRequestId ?? '')?.request,
    ).toEqual(newAttempt);
  });

  it('persists the exact request before it can be submitted', () => {
    const store = new SafeCreatePendingStore();
    const draft = new SafeCreateRetryDraft<TestCreateRequest>({
      store,
      resolveScope: () => persistentScope,
    });

    const request = draft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 6 }],
    });

    expect(
      store.read<TestCreateRequest>(persistentScope, request.clientRequestId ?? '')?.request,
    ).toEqual(request);
  });

  it('keeps a retryable failure pending and removes it after success', () => {
    const store = new SafeCreatePendingStore();
    const draft = new SafeCreateRetryDraft<TestCreateRequest>({
      store,
      resolveScope: () => persistentScope,
    });
    const request = draft.withClientRequestId({ warehouseNo: 120, lines: [] });

    draft.recordFailure(
      {
        message: 'Baglanti kesildi.',
        errorCode: null,
        retryable: true,
        blocksSubmit: false,
        allowsNewAttempt: false,
      },
      0,
    );
    expect(store.read(persistentScope, request.clientRequestId ?? '')?.state).toBe('pending');

    draft.reset();
    expect(store.read(persistentScope, request.clientRequestId ?? '')).toBeNull();
  });

  it('keeps unresolved requests for different documents independently', () => {
    const store = new SafeCreatePendingStore();
    const firstDraft = new SafeCreateRetryDraft<TestCreateRequest>({
      store,
      resolveScope: () => persistentScope,
    });
    const secondDraft = new SafeCreateRetryDraft<TestCreateRequest>({
      store,
      resolveScope: () => persistentScope,
    });
    const original = firstDraft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 6 }],
    });

    const second = secondDraft.withClientRequestId({
      warehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 12 }],
    });
    expect(
      store.read<TestCreateRequest>(persistentScope, original.clientRequestId ?? '')?.request,
    ).toEqual(original);
    expect(
      store.read<TestCreateRequest>(persistentScope, second.clientRequestId ?? '')?.request,
    ).toEqual(second);
  });
});

describe('classifySafeCreateFailure', () => {
  it('waits for readback instead of retrying an unconfirmed Mikro write', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_WRITE_OUTCOME_UNCONFIRMED', true),
      'Kayit basarisiz.',
    );

    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.recommendedAction).toBe('WaitAndCheck');
    expect(failure.allowsNewAttempt).toBeFalse();
  });

  it('keeps a queued warehouse shipment in status-check mode', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_WRITE_QUEUE_BUSY', true),
      'Sevk kaydi basarisiz.',
    );

    expect(failure.errorCode).toBe('MIKRO_WRITE_QUEUE_BUSY');
    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.recommendedAction).toBe('WaitAndCheck');
    expect(failure.allowsNewAttempt).toBeFalse();
    expect(failure.message).toContain('yeniden gonderim yapilmayacak');
  });

  it('allows the exact stored request only after explicit backend approval', () => {
    const failure = classifySafeCreateFailure(
      createConflict('SAFE_WRITE_RETRY_ALLOWED', true, 'RetrySameRequest'),
      'Kayit basarisiz.',
    );

    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeFalse();
    expect(failure.recommendedAction).toBe('RetrySameRequest');
  });

  it('blocks retry when the Mikro document content differs', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_DOCUMENT_CONTENT_MISMATCH', false),
      'Kayit basarisiz.',
    );

    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.recommendedAction).toBe('RecheckExisting');
    expect(failure.allowsNewAttempt).toBeFalse();
    expect(failure.message).toContain('Yetkili incelemesi');
  });

  it('blocks a changed payload until the original request is reconciled', () => {
    const failure = classifySafeCreateFailure(
      createConflict('CLIENT_REQUEST_PAYLOAD_MISMATCH', false),
      'Kayit basarisiz.',
    );

    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.recommendedAction).toBe('RestoreOriginalRequest');
    expect(failure.allowsNewAttempt).toBeFalse();
    expect(failure.message).toContain('uzlastirilmadan yeni islem acilamaz');
  });

  it('blocks an unclassified conflict', () => {
    const failure = classifySafeCreateFailure(
      new HttpErrorResponse({ status: 409, error: { detail: 'Genel cakisma.' } }),
      'Kayit basarisiz.',
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
          correlationId: 'request-123',
        },
      }),
      'Kayit basarisiz.',
    );

    expect(failure.message).toContain('Takip No: request-123');
  });

  it('preserves the request identity after a network failure', () => {
    const failure = classifySafeCreateFailure(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
      'Baglanti kurulamadi.',
    );

    expect(failure.retryable).toBeTrue();
    expect(failure.blocksSubmit).toBeTrue();
    expect(failure.recommendedAction).toBe('WaitAndCheck');
  });

  it('allows correction on pre-write business conflicts', () => {
    const failure = classifySafeCreateFailure(
      createConflict('MIKRO_DOCUMENT_IDENTITY_CONFLICT', false, 'EditAndRetry'),
      'Kayit basarisiz.',
    );

    expect(failure.blocksSubmit).toBeFalse();
    expect(failure.allowsNewAttempt).toBeTrue();
    expect(failure.recommendedAction).toBe('EditAndRetry');
  });

  it('allows list refresh when the referenced order line is already closed', () => {
    const failure = classifySafeCreateFailure(
      createConflict('WAREHOUSE_ORDER_LINE_CLOSED', false, 'RefreshList'),
      'Kayit basarisiz.',
    );

    expect(failure.blocksSubmit).toBeFalse();
    expect(failure.allowsNewAttempt).toBeTrue();
    expect(failure.recommendedAction).toBe('RefreshList');
  });
});

function createConflict(
  errorCode: string,
  retryable: boolean,
  recommendedAction?: string,
): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    error: {
      detail: 'Create istegi tamamlanamadi.',
      errorCode,
      retryable,
      recommendedAction,
    },
  });
}

function clearSafeCreateStorage(): void {
  for (const storage of [localStorage, sessionStorage]) {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith('furpa.safe-create.pending.v2.')) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
  }
}
