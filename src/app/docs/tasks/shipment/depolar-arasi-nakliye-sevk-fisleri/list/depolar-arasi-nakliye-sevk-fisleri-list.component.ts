import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseShippingListItemApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
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
import { DepolarArasiNakliyeSevkFisleriCreateComponent } from '../create/depolar-arasi-nakliye-sevk-fisleri-create.component';
import { DepolarArasiNakliyeSevkFisleriDetailComponent } from '../detail/depolar-arasi-nakliye-sevk-fisleri-detail.component';

const ROW_ACTIONS: readonly ApiListTableRowAction<IFurpaWarehouseShippingListItemApiDto>[] = [
  {
    key: 'send-e-irsaliye',
    label: 'E-Irsaliyeye Donustur',
    tone: 'success',
    isVisible: (row) => !row.documentNo?.trim()
  },
  {
    key: 'show-pdf',
    label: 'PDF Goster',
    tone: 'neutral',
    isVisible: (row) => !!row.documentNo?.trim()
  }
];

@Component({
  selector: 'app-depolar-arasi-nakliye-sevk-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './depolar-arasi-nakliye-sevk-fisleri-list.component.scss'
})
export class DepolarArasiNakliyeSevkFisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseShippingListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['giden-depolar-arasi-sevkler'];
  protected readonly tableColumns = buildWarehouseMovementListColumns('target');
  protected readonly detailComponent = DepolarArasiNakliyeSevkFisleriDetailComponent;
  protected readonly createComponent = DepolarArasiNakliyeSevkFisleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.sevkIslemleriService.getDepolarArasiNakliyeSevkFisleri(zamanlama);
  }

  protected override getAdditionalRowActions(): readonly ApiListTableRowAction<IFurpaWarehouseShippingListItemApiDto>[] {
    return ROW_ACTIONS;
  }

  protected override handleAdditionalRowAction(
    event: ApiListTableActionEvent<IFurpaWarehouseShippingListItemApiDto>
  ): void {
    const row = event.row;

    if (event.actionKey === 'show-pdf') {
      this.errorMessage.set(null);
      this.sevkIslemleriService
        .getGidenDepolarArasiSevkEirsaliyePdf(row.documentSerie, row.documentOrderNo)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob: Blob) => {
            const opened = this.openBlobInNewTab(blob);

            if (!opened) {
              this.errorMessage.set('PDF yeni sekmede acilamadi. Tarayici popup engelliyor olabilir.');
            }
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

  private buildEDespatchDialogData(row: IFurpaWarehouseShippingListItemApiDto): EDespatchDialogData {
    return {
      kind: 'warehouse-shipment',
      pageTitle: this.page.title,
      row: {
        seri: row.documentSerie,
        sira: row.documentOrderNo,
        belgeNo: row.documentNo,
        muhatap: row.targetWarehouse,
        tarih: row.documentDate || row.movementDate || '',
        durumu: row.shippingState === 1 ? 'Tamamlandi' : 'Bekliyor',
        ettn: row.descriptionEttn ?? null
      }
    };
  }
}
