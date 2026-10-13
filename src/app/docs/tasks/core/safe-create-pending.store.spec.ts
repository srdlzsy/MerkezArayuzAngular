import { SafeCreatePendingStore, type SafeCreatePendingScope } from './safe-create-pending.store';

interface TestRequest {
  clientRequestId?: string;
  sourceWarehouseNo: number;
  lines: Array<{ stockCode: string; quantity: number }>;
}

describe('SafeCreatePendingStore', () => {
  const scope: SafeCreatePendingScope = {
    userId: 'user-120',
    clientType: 'web',
    warehouseNo: 120,
    operationCode: 'inter-warehouse-shipment.create'
  };
  let store: SafeCreatePendingStore;

  beforeEach(() => {
    clearSafeCreateStorage();
    store = new SafeCreatePendingStore();
  });

  afterEach(() => clearSafeCreateStorage());

  it('updates only the record with the same clientRequestId', () => {
    const first: TestRequest = {
      clientRequestId: 'request-1',
      sourceWarehouseNo: 120,
      lines: [{ stockCode: '016445', quantity: 6 }]
    };
    const updated: TestRequest = {
      ...first,
      lines: [{ stockCode: '016445', quantity: 12 }]
    };

    store.save(scope, first);
    store.save(scope, updated);

    expect(store.findForOperation<TestRequest>('user-120', 'web', scope.operationCode).length).toBe(1);
    expect(store.read<TestRequest>(scope, 'request-1')?.request).toEqual(updated);
  });

  it('keeps separate unresolved documents in the same operation scope', () => {
    store.save(scope, { clientRequestId: 'request-1', sourceWarehouseNo: 120, lines: [] });
    store.save(scope, { clientRequestId: 'request-2', sourceWarehouseNo: 120, lines: [] });

    expect(store.findForOperation<TestRequest>('user-120', 'web', scope.operationCode)
      .map((record) => record.request.clientRequestId)
      .sort()).toEqual(['request-1', 'request-2']);
  });

  it('keeps retryable failures pending and non-retryable conflicts for review', () => {
    store.save(scope, {
      clientRequestId: 'request-1',
      sourceWarehouseNo: 120,
      lines: []
    });

    store.markFailure(scope, 'request-1', {
      message: 'Yazma devam ediyor.',
      errorCode: 'MIKRO_WRITE_IN_PROGRESS',
      retryable: true,
      blocksSubmit: false,
      allowsNewAttempt: false
    });
    expect(store.read(scope, 'request-1')?.state).toBe('pending');

    store.markFailure(scope, 'request-1', {
      message: 'Yetkili incelemesi gerekli.',
      errorCode: 'MIKRO_DOCUMENT_CONTENT_MISMATCH',
      retryable: false,
      blocksSubmit: true,
      allowsNewAttempt: false
    });
    expect(store.read(scope, 'request-1')?.state).toBe('needsReview');
  });

  it('removes the pending payload and recovery marker after success', () => {
    store.save(scope, {
      clientRequestId: 'request-1',
      sourceWarehouseNo: 120,
      lines: []
    });
    store.markRecoveryAttemptedInSession(scope, 'request-1');

    store.remove(scope, 'request-1');

    expect(store.read(scope, 'request-1')).toBeNull();
    expect(store.wasRecoveryAttemptedInSession(scope, 'request-1')).toBeFalse();
  });

  it('isolates pending records by user and warehouse', () => {
    const otherWarehouseScope = { ...scope, warehouseNo: 165 };
    const otherUserScope = { ...scope, userId: 'user-165', warehouseNo: 165 };
    const request: TestRequest = {
      clientRequestId: 'request-1',
      sourceWarehouseNo: 120,
      lines: []
    };

    store.save(scope, request);
    store.save(otherWarehouseScope, { ...request, clientRequestId: 'request-2' });
    store.save(otherUserScope, { ...request, clientRequestId: 'request-3' });

    const currentUserRecords = store.findForOperation<TestRequest>(
      scope.userId,
      scope.clientType,
      scope.operationCode
    );

    expect(currentUserRecords.map((record) => record.scope.warehouseNo)).toEqual([120, 165]);
    expect(store.read<TestRequest>(otherUserScope, 'request-3')?.request.clientRequestId).toBe('request-3');
    expect(store.read<TestRequest>({ ...scope, warehouseNo: 999 }, 'request-1')).toBeNull();
  });
});

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
