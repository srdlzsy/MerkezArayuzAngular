import { Dialog } from '@angular/cdk/dialog';
import { DestroyRef, EventEmitter, signal } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import type { IFurpaSendEDespatchResponseApiDto } from '@interfaces';

import {
  createEDespatchListSync,
  EDespatchListRowLike,
  EDespatchListSyncController
} from './e-irsaliye-list-refresh.helpers';

interface TestMovementRow extends EDespatchListRowLike {
  descriptionEttn: string;
  warehouseNo: number;
}

describe('createEDespatchListSync', () => {
  const createDestroyRefStub = (): { destroyRef: DestroyRef; triggerDestroy: () => void } => {
    const callbacks: Array<() => void> = [];
    return {
      destroyRef: {
        destroyed: false,
        onDestroy: (callback: () => void) => {
          callbacks.push(callback);
          return () => {};
        }
      } as DestroyRef,
      triggerDestroy: () => {
        for (const callback of callbacks) {
          callback();
        }
      }
    };
  };

  it('immediately patches rows, preserves converted values while Mikro catches up, and refreshes on dialog close', fakeAsync(() => {
    const rows = signal<TestMovementRow[]>([
      {
        documentSerie: 'F146',
        documentOrderNo: 4149,
        documentNo: '',
        descriptionEttn: '',
        warehouseNo: 146
      }
    ]);
    const loadRows = jasmine.createSpy('loadRows');
    const { destroyRef, triggerDestroy } = createDestroyRefStub();

    const sync: EDespatchListSyncController<TestMovementRow> = createEDespatchListSync<TestMovementRow>({
      destroyRef,
      rows,
      prepareRows: (input) => sync.applyConvertedRows(input),
      loadRows,
      getWarehouseNo: (row) => row.warehouseNo ?? 0
    });

    const closed$ = new EventEmitter<unknown>();
    let capturedData: { onSuccess?: (response: IFurpaSendEDespatchResponseApiDto) => void } = {};
    const dialog = {
      open: jasmine.createSpy('open').and.callFake((_comp: unknown, config: { data: typeof capturedData }) => {
        capturedData = config.data;
        return { closed: closed$ };
      })
    } as unknown as Dialog;

    sync.openDialog(dialog, rows()[0], {
      kind: 'company-return',
      pageTitle: 'Firma Iadeleri',
      row: {
        seri: 'F146',
        sira: 4149,
        warehouseNo: 146,
        belgeNo: '',
        muhatap: 'Test',
        tarih: '2026-11-11',
        durumu: 'Taslak'
      }
    });

    capturedData.onSuccess?.({
      documentType: 2,
      documentSerie: 'F146',
      documentOrderNo: 4149,
      eDespatchDocumentNo: 'FRM2026000001234',
      eDespatchUuid: '11111111-1111-1111-1111-111111111111',
      serviceDocumentId: 'srv-1',
      serviceDocumentNumber: 'SRV-1',
      sentAt: '2026-11-11T14:00:00Z',
      endpointUrl: 'https://test',
      localMikroMetadataUpdateQueued: true,
      localMikroMetadataUpdated: false
    });

    expect(rows()[0].documentNo).toBe('FRM2026000001234');
    expect(rows()[0].descriptionEttn).toBe('11111111-1111-1111-1111-111111111111');
    expect(loadRows).not.toHaveBeenCalled();

    // Even if server briefly returns empty values before Mikro worker finishes, converted state is preserved.
    const mergedBeforeMikroSync = sync.applyConvertedRows([
      {
        documentSerie: 'F146',
        documentOrderNo: 4149,
        documentNo: '',
        descriptionEttn: '',
        warehouseNo: 146
      }
    ]);
    expect(mergedBeforeMikroSync[0].documentNo).toBe('FRM2026000001234');
    expect(mergedBeforeMikroSync[0].descriptionEttn).toBe('11111111-1111-1111-1111-111111111111');

    // Closing dialog always triggers a refresh instead of being blocked by a one-shot guard.
    closed$.emit(true);
    expect(loadRows).toHaveBeenCalledTimes(1);

    // Delayed resync fires after 5.5s, sees server synced, and skips second resync at 12s.
    tick(5_500);
    expect(loadRows).toHaveBeenCalledTimes(2);

    sync.applyConvertedRows([
      {
        documentSerie: 'F146',
        documentOrderNo: 4149,
        documentNo: 'FRM2026000001234',
        descriptionEttn: '11111111-1111-1111-1111-111111111111',
        warehouseNo: 146
      }
    ]);

    tick(10_000);
    expect(loadRows).toHaveBeenCalledTimes(2);
    triggerDestroy();
  }));
});
