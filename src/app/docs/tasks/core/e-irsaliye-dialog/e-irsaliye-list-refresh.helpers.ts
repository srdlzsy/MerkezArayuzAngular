import { Dialog } from '@angular/cdk/dialog';
import { DestroyRef, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { IFurpaSendEDespatchResponseApiDto } from '@interfaces';

import { openDocsTaskDialog } from '../task-dialog.config';
import {
  EDespatchDialogComponent,
  EDespatchDialogData
} from './e-irsaliye-dialog.component';

export interface EDespatchListRowLike {
  documentSerie: string;
  documentOrderNo: number;
  documentNo: string;
  descriptionEttn?: string;
  warehouseNo?: number;
  sourceWarehouseNo?: number;
}

interface PendingEDespatchState {
  documentNo: string;
  descriptionEttn: string;
}

export interface CreateEDespatchListSyncOptions<Row extends EDespatchListRowLike> {
  destroyRef: DestroyRef;
  rows: WritableSignal<Row[]>;
  prepareRows: (rows: Row[]) => Row[];
  loadRows: () => void;
  getWarehouseNo?: (row: Pick<Row, 'warehouseNo' | 'sourceWarehouseNo'>) => number;
}

export interface EDespatchListSyncController<Row extends EDespatchListRowLike> {
  applyConvertedRows: (rows: Row[]) => Row[];
  openDialog: (dialog: Dialog, row: Row, dialogData: EDespatchDialogData) => void;
}

const METADATA_RESYNC_DELAYS_MS = [5_500, 12_000] as const;

/**
 * Keeps list rows visibly up to date immediately after an e-despatch conversion,
 * preserving the converted state while the backend Mikro metadata worker finishes.
 */
export function createEDespatchListSync<Row extends EDespatchListRowLike>(
  options: CreateEDespatchListSyncOptions<Row>
): EDespatchListSyncController<Row> {
  const convertedByKey = new Map<string, PendingEDespatchState>();
  const pendingTimers = new Set<number>();

  options.destroyRef.onDestroy(() => {
    for (const timerId of pendingTimers) {
      window.clearTimeout(timerId);
    }
    pendingTimers.clear();
  });

  const resolveWarehouseNo = (row: { warehouseNo?: number; sourceWarehouseNo?: number }): number => {
    if (options.getWarehouseNo) {
      return options.getWarehouseNo(row);
    }

    return Number(row.sourceWarehouseNo ?? row.warehouseNo ?? 0) || 0;
  };

  const buildKey = (
    documentSerie: string | null | undefined,
    documentOrderNo: number | null | undefined,
    warehouseNo: number
  ): string => `${(documentSerie ?? '').trim().toUpperCase()}|${Number(documentOrderNo ?? 0)}|${warehouseNo}`;

  const isRowSyncedWithServer = (row: Row, pending: PendingEDespatchState): boolean => {
    const hasDocNo = !pending.documentNo || !!row.documentNo?.trim();
    const hasEttnField = 'descriptionEttn' in row;
    const hasEttn = !hasEttnField || !pending.descriptionEttn || !!row.descriptionEttn?.trim();
    return hasDocNo && hasEttn;
  };

  const applyConvertedRows = (rows: Row[]): Row[] => {
    if (!convertedByKey.size) {
      return rows;
    }

    return rows.map((row) => {
      const key = buildKey(row.documentSerie, row.documentOrderNo, resolveWarehouseNo(row));
      const pending = convertedByKey.get(key);
      if (!pending) {
        return row;
      }

      if (isRowSyncedWithServer(row, pending)) {
        convertedByKey.delete(key);
        return row;
      }

      const nextDocNo = row.documentNo?.trim() || pending.documentNo;
      if ('descriptionEttn' in row) {
        const nextEttn = row.descriptionEttn?.trim() || pending.descriptionEttn;
        return {
          ...row,
          documentNo: nextDocNo,
          descriptionEttn: nextEttn
        };
      }

      return {
        ...row,
        documentNo: nextDocNo
      };
    });
  };

  const scheduleDelayedResync = (key: string): void => {
    for (const delayMs of METADATA_RESYNC_DELAYS_MS) {
      const timerId = window.setTimeout(() => {
        pendingTimers.delete(timerId);
        if (!convertedByKey.has(key)) {
          return;
        }
        options.loadRows();
      }, delayMs);

      pendingTimers.add(timerId);
    }
  };

  const openDialog = (dialog: Dialog, row: Row, dialogData: EDespatchDialogData): void => {
    let refreshRequired = false;
    const warehouseNo = resolveWarehouseNo(row);

    openDocsTaskDialog(dialog, EDespatchDialogComponent, {
      width: 'min(920px, 96vw)',
      maxWidth: '96vw',
      data: {
        ...dialogData,
        onSuccess: (response: IFurpaSendEDespatchResponseApiDto) => {
          const key = buildKey(
            response.documentSerie || row.documentSerie,
            response.documentOrderNo || row.documentOrderNo,
            warehouseNo
          );
          const nextState: PendingEDespatchState = {
            documentNo: response.eDespatchDocumentNo?.trim() ?? '',
            descriptionEttn: response.eDespatchUuid?.trim() ?? ''
          };

          if (nextState.documentNo || nextState.descriptionEttn) {
            convertedByKey.set(key, nextState);
            options.rows.update((currentRows) => options.prepareRows(currentRows));
          }

          refreshRequired = true;
          if (response.localMikroMetadataUpdateQueued) {
            scheduleDelayedResync(key);
          } else {
            options.loadRows();
          }
        },
        onRefreshRequired: () => {
          refreshRequired = true;
          options.loadRows();
        }
      }
    })
      .closed.pipe(takeUntilDestroyed(options.destroyRef))
      .subscribe((result: unknown) => {
        if (result || refreshRequired) {
          options.loadRows();
        }
      });
  };

  return {
    applyConvertedRows,
    openDialog
  };
}
