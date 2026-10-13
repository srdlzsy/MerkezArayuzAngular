import {
  BrowserCreateDraftStore,
  MAX_BROWSER_CREATE_DRAFTS_PER_MODULE,
  type BrowserCreateDraftScope
} from './browser-create-draft.store';

interface TestPayload {
  description: string;
  lines: Array<{ stockCode: string; quantity: number }>;
}

describe('BrowserCreateDraftStore', () => {
  const shipmentScope: BrowserCreateDraftScope = {
    userId: 'user-120',
    moduleCode: 'shipment',
    operationCode: 'company-shipment.create',
    warehouseNo: 120
  };
  let store: BrowserCreateDraftStore;

  beforeEach(() => {
    clearDraftStorage();
    store = new BrowserCreateDraftStore();
  });

  afterEach(() => clearDraftStorage());

  it('updates an existing draft without consuming another module slot', () => {
    const firstSave = store.save(shipmentScope, {
      id: 'draft-1',
      title: 'Firma A',
      lineCount: 1,
      payload: createPayload('ilk')
    });
    const updatedSave = store.save(shipmentScope, {
      id: 'draft-1',
      title: 'Firma A',
      lineCount: 2,
      payload: createPayload('guncel')
    });

    expect(firstSave.ok).toBeTrue();
    expect(updatedSave.ok).toBeTrue();
    expect(store.countForModule('user-120', 'shipment')).toBe(1);
    expect(store.read<TestPayload>(shipmentScope, 'draft-1')?.payload.description).toBe('guncel');
  });

  it('allows at most five drafts across operations in the same module', () => {
    for (let index = 1; index <= MAX_BROWSER_CREATE_DRAFTS_PER_MODULE; index += 1) {
      const scope = index % 2 === 0
        ? { ...shipmentScope, operationCode: 'warehouse-shipment.create' }
        : shipmentScope;
      const result = store.save(scope, {
        id: `draft-${index}`,
        title: `Taslak ${index}`,
        lineCount: index,
        payload: createPayload(`taslak-${index}`)
      });
      expect(result.ok).toBeTrue();
    }

    const sixthSave = store.save(shipmentScope, {
      id: 'draft-6',
      title: 'Altinci taslak',
      lineCount: 1,
      payload: createPayload('limit')
    });

    expect(sixthSave).toEqual({ ok: false, reason: 'limit' });
    expect(store.countForModule('user-120', 'shipment')).toBe(5);
  });

  it('lists only drafts compatible with the current create screen', () => {
    store.save(shipmentScope, {
      id: 'company-draft',
      title: 'Firma sevki',
      lineCount: 1,
      payload: createPayload('firma')
    });
    store.save({ ...shipmentScope, operationCode: 'warehouse-shipment.create' }, {
      id: 'warehouse-draft',
      title: 'Depo sevki',
      lineCount: 1,
      payload: createPayload('depo')
    });

    const companyDrafts = store.listForOperation<TestPayload>(shipmentScope);

    expect(companyDrafts.map((record) => record.id)).toEqual(['company-draft']);
    expect(store.countForModule('user-120', 'shipment')).toBe(2);
  });

  it('isolates the module limit by user and module', () => {
    for (let index = 1; index <= MAX_BROWSER_CREATE_DRAFTS_PER_MODULE; index += 1) {
      store.save(shipmentScope, {
        id: `shipment-${index}`,
        title: `Sevk ${index}`,
        lineCount: 0,
        payload: createPayload('sevk')
      });
    }

    const orderResult = store.save({ ...shipmentScope, moduleCode: 'orders' }, {
      id: 'order-1',
      title: 'Siparis',
      lineCount: 1,
      payload: createPayload('siparis')
    });
    const otherUserResult = store.save({ ...shipmentScope, userId: 'user-165' }, {
      id: 'shipment-other-user',
      title: 'Diger kullanici sevki',
      lineCount: 1,
      payload: createPayload('diger')
    });

    expect(orderResult.ok).toBeTrue();
    expect(otherUserResult.ok).toBeTrue();
    expect(store.countForModule('user-120', 'orders')).toBe(1);
    expect(store.countForModule('user-165', 'shipment')).toBe(1);
  });

  it('removes only the selected draft', () => {
    store.save(shipmentScope, {
      id: 'draft-1',
      title: 'Bir',
      lineCount: 1,
      payload: createPayload('bir')
    });
    store.save(shipmentScope, {
      id: 'draft-2',
      title: 'Iki',
      lineCount: 1,
      payload: createPayload('iki')
    });

    store.remove(shipmentScope, 'draft-1');

    expect(store.read(shipmentScope, 'draft-1')).toBeNull();
    expect(store.read(shipmentScope, 'draft-2')).not.toBeNull();
  });
});

function createPayload(description: string): TestPayload {
  return {
    description,
    lines: [{ stockCode: '016445', quantity: 6 }]
  };
}

function clearDraftStorage(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('furpa.create-draft.v1.')) {
      keys.push(key);
    }
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
