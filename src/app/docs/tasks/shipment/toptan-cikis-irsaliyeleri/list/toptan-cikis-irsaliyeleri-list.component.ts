import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import {
  ApiListTableActionEvent,
  ApiListTableRowAction
} from '../../../core/api-list-table/api-list-table.types';
import { FIRMA_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import {
  EDespatchDialogComponent,
  EDespatchDialogData
} from '../../../core/e-irsaliye-dialog/e-irsaliye-dialog.component';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { openDocsTaskDialog } from '../../../core/task-dialog.config';
import { ToptanCikisIrsaliyeleriCreateComponent } from '../create/toptan-cikis-irsaliyeleri-create.component';
import { ToptanCikisIrsaliyeleriDetailComponent } from '../detail/toptan-cikis-irsaliyeleri-detail.component';
import { joinTruthy } from '@core/api/furpa-merkez-api.utils';

const ROW_ACTIONS: readonly ApiListTableRowAction<IFurpaCompanyMovementListItemApiDto>[] = [
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
  selector: 'app-toptan-cikis-irsaliyeleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './toptan-cikis-irsaliyeleri-list.component.scss'
})
export class ToptanCikisIrsaliyeleriListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['giden-firma-sevkleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = ToptanCikisIrsaliyeleriDetailComponent;
  protected readonly createComponent = ToptanCikisIrsaliyeleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.sevkIslemleriService.getToptanCikisIrsaliyeleri(zamanlama, warehouseNo);
  }

  protected override getAdditionalRowActions(): readonly ApiListTableRowAction<IFurpaCompanyMovementListItemApiDto>[] {
    return ROW_ACTIONS;
  }

  protected override handleAdditionalRowAction(
    event: ApiListTableActionEvent<IFurpaCompanyMovementListItemApiDto>
  ): void {
    const row = event.row;

    if (event.actionKey === 'show-pdf') {
      this.errorMessage.set(null);
      this.sevkIslemleriService
        .getGidenFirmaSevkEirsaliyePdf(row.documentSerie, row.documentOrderNo, row.warehouseNo)
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

  private buildEDespatchDialogData(row: IFurpaCompanyMovementListItemApiDto): EDespatchDialogData {
    return {
      kind: 'company-shipment',
      pageTitle: this.page.title,
      row: {
        seri: row.documentSerie,
        sira: row.documentOrderNo,
        warehouseNo: row.warehouseNo,
        belgeNo: row.documentNo,
        muhatap: row.customerDisplayName || joinTruthy([row.customerName, row.customerTitle]),
        tarih: row.documentDate || row.movementDate || '',
        durumu: row.documentNo?.trim() ? 'Gonderildi' : 'Taslak',
       
      }
    };  
  }
}
