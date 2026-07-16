import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { IFurpaWarehouseReturnListItemApiDto } from '@interfaces';

import {
  DepoIadeDirection,
  IadeIslemleriService
} from '../../../../../core/api/module-services/iade-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import {
  ApiListTableActionEvent,
  ApiListTableRowAction
} from '../../../core/api-list-table/api-list-table.types';
import { buildWarehouseMovementListColumns } from '../../../core/api-list-table/api-list-table-column-presets';
import {
  EDespatchDialogComponent,
  EDespatchDialogData
} from '../../../core/e-irsaliye-dialog/e-irsaliye-dialog.component';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { openDocsTaskDialog } from '../../../core/task-dialog.config';
import { injectDocsTaskContext } from '../../../core/task-permission-context';
import { DepoIadeCreateComponent } from '../create/depo-iade-create.component';
import { DepoIadeDetailComponent } from '../detail/depo-iade-detail.component';

interface DepoIadeDetailDialogData {
  seri: string;
  sira: number;
  direction: DepoIadeDirection;
  pageId: string;
}

const ROW_ACTIONS: readonly ApiListTableRowAction<IFurpaWarehouseReturnListItemApiDto>[] = [
  {
    key: 'send-e-irsaliye',
    label: 'E-Irsaliyeye Donustur',
    tone: 'success',
    isVisible: (row) => !row.descriptionEttn?.trim()
  },
  {
    key: 'show-pdf',
    label: 'PDF Goster',
    tone: 'neutral',
    isVisible: (row) => !!row.descriptionEttn?.trim()
  }
];

@Component({
  selector: 'app-depo-iade-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './depo-iade-list.component.scss'
})
export class DepoIadeListComponent extends ApiTaskListPageBase<
  IFurpaWarehouseReturnListItemApiDto,
  DepoIadeDetailDialogData
> {
  private readonly docsTaskContext = injectDocsTaskContext();
  private readonly currentTaskId = this.docsTaskContext.taskId ?? 'giden-depo-iadeleri';
  private readonly direction = this.resolveDirection(this.currentTaskId);
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.currentTaskId] ?? DOCS_PAGES['giden-depo-iadeleri'];
  protected readonly tableColumns = buildWarehouseMovementListColumns(
    this.direction === 'gelen' ? 'source' : 'target'
  );
  protected readonly detailComponent = DepoIadeDetailComponent;
  protected readonly createComponent = DepoIadeCreateComponent;
  protected override readonly canCreate = this.direction === 'giden';
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  protected override readonly requestPath = computed(() => {
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();
    const baseRoute = this.page.baseRouteOrFile;

    if (!startDate || !endDate) {
      return `${baseRoute}?StartDate=YYYY-MM-DD&EndDate=YYYY-MM-DD`;
    }

    const warehouseNo = this.resolveListWarehouseNo();
    const warehouseQuery = warehouseNo ? `&WarehouseNo=${warehouseNo}` : '';
    return `${baseRoute}?StartDate=${startDate}&EndDate=${endDate}${warehouseQuery}`;
  });
  private readonly iadeIslemleriService = inject(IadeIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.iadeIslemleriService.getDepoIadeleri(zamanlama, this.direction, warehouseNo);
  }

  protected override buildDetailData(row: IFurpaWarehouseReturnListItemApiDto): DepoIadeDetailDialogData {
    const payload = super.buildDetailData(row);

    return {
      ...payload,
      direction: this.direction,
      pageId: this.page.id
    };
  }

  protected override openCreate(): void {
    openDocsTaskDialog(this.dialog, this.createComponent, {
      data: {
        direction: this.direction,
        pageId: this.page.id
      }
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (!result) {
          return;
        }

        this.loadRows();
      });
  }

  protected override getAdditionalRowActions(): readonly ApiListTableRowAction<IFurpaWarehouseReturnListItemApiDto>[] {
    return this.direction === 'giden' ? ROW_ACTIONS : [];
  }

  protected override handleAdditionalRowAction(
    event: ApiListTableActionEvent<IFurpaWarehouseReturnListItemApiDto>
  ): void {
    if (this.direction !== 'giden') {
      return;
    }

    const row = event.row;

    if (event.actionKey === 'show-pdf') {
      this.errorMessage.set(null);
      this.iadeIslemleriService
        .getDepoIadeEirsaliyePdf(row.documentSerie, row.documentOrderNo)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob: Blob) => {
            this.openBlobInDialog(blob, row.documentNo || `${row.documentSerie}/${row.documentOrderNo}`);
          },
          error: (error: unknown) => {
            this.errorMessage.set(
              this.resolveHttpErrorMessage(
                error,
                'E-irsaliye PDF dosyasi acilamadi. Evrak daha once gonderilmemis olabilir.'
              )
            );
          }
        });
      return;
    }

    if (event.actionKey !== 'send-e-irsaliye') {
      return;
    }

    openDocsTaskDialog(this.dialog, EDespatchDialogComponent, {
      width: 'min(920px, 96vw)',
      maxWidth: '96vw',
      data: this.buildEDespatchDialogData(row)
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (result) {
          this.loadRows();
        }
      });
  }

  protected override getInitialStartDate(): string {
    return this.getFirstDayOfMonthOffset(-1);
  }

  private buildEDespatchDialogData(row: IFurpaWarehouseReturnListItemApiDto): EDespatchDialogData {
    return {
      kind: 'warehouse-return',
      pageTitle: this.page.title,
      row: {
        seri: row.documentSerie,
        sira: row.documentOrderNo,
        belgeNo: row.documentNo,
        muhatap: this.direction === 'gelen' ? row.sourceWarehouse : row.targetWarehouse,
        tarih: row.documentDate || row.movementDate || '',
        durumu: row.shippingState === 1 ? 'Tamamlandi' : 'Bekliyor',
        ettn: row.descriptionEttn ?? null
      }
    };
  }

  private resolveDirection(taskId: string): DepoIadeDirection {
    return taskId === 'gelen-depo-iadeleri' ? 'gelen' : 'giden';
  }
}
