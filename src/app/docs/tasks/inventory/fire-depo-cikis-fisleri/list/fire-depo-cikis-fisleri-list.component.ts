import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaStockReceiptListItemApiDto } from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { SUBE_ICI_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { FireDepoCikisFisleriCreateComponent } from '../create/fire-depo-cikis-fisleri-create.component';
import { FireDepoCikisFisleriDetailComponent } from '../detail/fire-depo-cikis-fisleri-detail.component';

@Component({
  selector: 'app-fire-depo-cikis-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './fire-depo-cikis-fisleri-list.component.scss'
})
export class FireDepoCikisFisleriListComponent extends ApiTaskListPageBase<IFurpaStockReceiptListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['zayiat-fisleri'];
  protected readonly tableColumns = SUBE_ICI_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = FireDepoCikisFisleriDetailComponent;
  protected readonly createComponent = FireDepoCikisFisleriCreateComponent;
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.stokIslemleriService.getSubeIciListe('FireDepoCikisFisleri', zamanlama);
  }
}

