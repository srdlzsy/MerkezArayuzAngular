import { DestroyRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { BrowserCreateDraftSession } from './browser-create-draft.session';
import { BrowserCreateDraftStore } from './browser-create-draft.store';

interface TestPayload {
  description: string;
  lines: string[];
}

describe('BrowserCreateDraftSession', () => {
  let changeControl: FormControl<number>;
  let currentPayload: TestPayload;
  let destroyRef: TestDestroyRef;
  let store: BrowserCreateDraftStore;
  let session: BrowserCreateDraftSession;

  beforeEach(() => {
    clearDraftStorage();
    changeControl = new FormControl(0, { nonNullable: true });
    currentPayload = { description: '', lines: [] };
    destroyRef = new TestDestroyRef();
    store = new BrowserCreateDraftStore();
    session = new BrowserCreateDraftSession(store, destroyRef);
    session.setup<TestPayload>({
      user: null,
      moduleCode: 'shipment',
      operationCode: 'company-shipment.create',
      changes$: changeControl.valueChanges,
      capture: () => structuredClone(currentPayload),
      restore: (payload) => {
        currentPayload = structuredClone(payload);
      },
      reset: () => {
        currentPayload = { description: '', lines: [] };
      },
      isMeaningful: (payload) => !!payload.description || payload.lines.length > 0,
      title: (payload) => payload.description || 'Yeni sevk',
      lineCount: (payload) => payload.lines.length,
      warehouseNo: () => 120
    });
  });

  afterEach(() => {
    destroyRef.destroy();
    clearDraftStorage();
  });

  it('automatically saves meaningful changes after the debounce delay', fakeAsync(() => {
    currentPayload = { description: 'Firma A', lines: ['016445'] };
    changeControl.setValue(1);

    tick(649);
    expect(session.drafts().length).toBe(0);

    tick(1);
    expect(session.drafts().length).toBe(1);
    expect(session.drafts()[0].title).toBe('Firma A');
    expect(session.drafts()[0].lineCount).toBe(1);
  }));

  it('flushes the latest form state when the dialog is destroyed', () => {
    currentPayload = { description: 'Kapanmadan once', lines: ['075876', '089563'] };
    changeControl.setValue(1);

    destroyRef.destroy();

    expect(session.drafts().length).toBe(1);
    expect(session.drafts()[0].lineCount).toBe(2);
  });

  it('removes only the active draft after a successful create', fakeAsync(() => {
    currentPayload = { description: 'Kaydedilecek sevk', lines: ['016445'] };
    changeControl.setValue(1);
    tick(650);

    expect(session.activeId()).not.toBeNull();
    session.complete();

    expect(session.activeId()).toBeNull();
    expect(session.drafts()).toEqual([]);
    expect(store.countForModule('unknown-user:unknown-warehouse', 'shipment')).toBe(0);
  }));
});

class TestDestroyRef extends DestroyRef {
  private callbacks: Array<() => void> = [];
  private isDestroyed = false;

  override get destroyed(): boolean {
    return this.isDestroyed;
  }

  override onDestroy(callback: () => void): () => void {
    if (this.isDestroyed) {
      callback();
      return () => undefined;
    }

    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((item) => item !== callback);
    };
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    const callbacks = [...this.callbacks];
    this.callbacks = [];
    callbacks.forEach((callback) => callback());
  }
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
