import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject } from '@angular/core';

import { IadeIslemleriService } from '../../../../../core/api/module-services/iade-islemleri.service';
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
import { FirmaIadeCreateComponent } from '../create/firma-iade-create.component';
import { FirmaIadeDetailComponent } from '../detail/firma-iade-detail.component';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';
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
  selector: 'app-firma-iade-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './firma-iade-list.component.scss'
})
export class FirmaIadeListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['firma-iadeleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = FirmaIadeDetailComponent;
  protected readonly createComponent = FirmaIadeCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly iadeIslemleriService = inject(IadeIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.iadeIslemleriService.getFirmaIadeleri(zamanlama);
  }

  protected override getInitialStartDate(): string {
    return this.getFirstDayOfMonthOffset(-1);
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
      this.iadeIslemleriService
        .getFirmaIadeEirsaliyePdf(row.documentSerie, row.documentOrderNo)
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
      kind: 'company-return',
      pageTitle: this.page.title,
      row: {
        seri: row.documentSerie,
        sira: row.documentOrderNo,
        belgeNo: row.documentNo,
        muhatap: row.customerDisplayName || joinTruthy([row.customerName, row.customerTitle]),
        tarih: row.documentDate || row.movementDate || '',
        durumu: row.documentNo?.trim() ? 'Gonderildi' : 'Taslak',
 
      }
    };
  }
}
