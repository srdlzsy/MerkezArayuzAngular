import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaVirmanListItemApiDto } from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { VIRMAN_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { StokVirmanCikisFisleriCreateComponent } from '../create/stok-virman-cikis-fisleri-create.component';
import { StokVirmanCikisFisleriDetailComponent } from '../detail/stok-virman-cikis-fisleri-detail.component';

@Component({
  selector: 'app-stok-virman-cikis-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './stok-virman-cikis-fisleri-list.component.scss'
})
export class StokVirmanCikisFisleriListComponent extends ApiTaskListPageBase<IFurpaVirmanListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['virmanlar'];
  protected readonly tableColumns = VIRMAN_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = StokVirmanCikisFisleriDetailComponent;
  protected readonly createComponent = StokVirmanCikisFisleriCreateComponent;
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.stokIslemleriService.getVirmanListe('StokVirmanCikisFisleri', zamanlama);
  }
}

