import { SafeCreateRetryDraft } from './safe-create-retry.helpers';

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
