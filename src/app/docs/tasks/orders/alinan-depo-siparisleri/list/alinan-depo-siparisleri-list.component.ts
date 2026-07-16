import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseOrderListItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { AlinanDepoSiparisleriCreateComponent } from '../create/alinan-depo-siparisleri-create.component';
import { AlinanDepoSiparisleriDetailComponent } from '../detail/alinan-depo-siparisleri-detail.component';

@Component({
  selector: 'app-alinan-depo-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './alinan-depo-siparisleri-list.component.scss'
})
export class AlinanDepoSiparisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-depo-siparisleri'];
  protected readonly tableColumns = DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS;
  protected readonly detailComponent = AlinanDepoSiparisleriDetailComponent;
  protected readonly createComponent = AlinanDepoSiparisleriCreateComponent;
  protected override readonly canCreate = false;
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getAlinanDepoSiparisleri(zamanlama, warehouseNo);
  }
}
