import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseOrderListItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { VerilenDepoSiparisleriCreateComponent } from '../create/verilen-depo-siparisleri-create.component';
import { VerilenDepoSiparisleriDetailComponent } from '../detail/verilen-depo-siparisleri-detail.component';

@Component({
  selector: 'app-verilen-depo-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './verilen-depo-siparisleri-list.component.scss'
})
export class VerilenDepoSiparisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-depo-siparisleri'];
  protected readonly tableColumns = DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS;
  protected readonly detailComponent = VerilenDepoSiparisleriDetailComponent;
  protected readonly createComponent = VerilenDepoSiparisleriCreateComponent;
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.siparisIslemleriService.getVerilenDepoSiparisleri(zamanlama);
  }
}
