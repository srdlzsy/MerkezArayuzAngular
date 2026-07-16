import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type { IFurpaInventoryCountListItemApiDto } from '@interfaces';

import { SayimIslemleriService } from '../../../../../core/api/module-services/sayim-islemleri.service';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { SAYIM_SONUCLARI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SayimSonuclariCreateComponent } from '../create/sayim-sonuclari-create.component';
import { SayimSonuclariDetailComponent } from '../detail/sayim-sonuclari-detail.component';

interface SayimSonuclariDetailDialogData {
  evrakNo: number;
  tarih: string;
}

@Component({
  selector: 'app-sayim-sonuclari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: './sayim-sonuclari-list.component.html',
  styleUrl: './sayim-sonuclari-list.component.scss'
})
export class SayimSonuclariListComponent extends ApiTaskListPageBase<
  IFurpaInventoryCountListItemApiDto,
  SayimSonuclariDetailDialogData
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['sayim-sonuclari'];
  protected readonly tableColumns = SAYIM_SONUCLARI_LIST_COLUMNS;
  protected readonly detailComponent = SayimSonuclariDetailComponent;
  protected readonly createComponent = SayimSonuclariCreateComponent;
  private readonly sayimIslemleriService = inject(SayimIslemleriService);

  protected readonly uniqueCounterCount = computed(() => {
    const counters = new Set(
      this.rows()
        .map((row) => (row.name || row.warehouseName || '').trim())
        .filter((name): name is string => !!name)
    );

    return counters.size;
  });

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.sayimIslemleriService.getSayimSonuclariListe(zamanlama, warehouseNo);
  }

  protected override buildDetailData(row: IFurpaInventoryCountListItemApiDto): SayimSonuclariDetailDialogData {
    return {
      evrakNo: row.documentNo,
      tarih: row.documentDate || ''
    };
  }

  protected override getInitialStartDate(): string {
    return this.getFirstDayOfMonthOffset(0);
  }
}
