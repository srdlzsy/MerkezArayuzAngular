import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseShippingListItemApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { buildWarehouseMovementListColumns } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { DepoDagitimSevkFisleriCreateComponent } from '../create/depo-dagitim-sevk-fisleri-create.component';
import { DepoDagitimSevkFisleriDetailComponent } from '../detail/depo-dagitim-sevk-fisleri-detail.component';

@Component({
  selector: 'app-depo-dagitim-sevk-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './depo-dagitim-sevk-fisleri-list.component.scss'
})
export class DepoDagitimSevkFisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseShippingListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-depolar-arasi-sevkler'];
  protected readonly tableColumns = buildWarehouseMovementListColumns('source');
  protected readonly detailComponent = DepoDagitimSevkFisleriDetailComponent;
  protected readonly createComponent = DepoDagitimSevkFisleriCreateComponent;
  protected override readonly canCreate = false;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.sevkIslemleriService.getDepoDagitimSevkFisleri(zamanlama);
  }
}

