import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyOrderListItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_SIPARISI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { VerilenSiparislerCreateComponent } from '../create/verilen-siparisler-create.component';
import { VerilenSiparislerDetailComponent } from '../detail/verilen-siparisler-detail.component';

@Component({
  selector: 'app-verilen-siparisler-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './verilen-siparisler-list.component.scss'
})
export class VerilenSiparislerListComponent extends ApiTaskListPageBase<IFurpaCompanyOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-firma-siparisleri'];
  protected readonly tableColumns = FIRMA_SIPARISI_LIST_COLUMNS;
  protected readonly detailComponent = VerilenSiparislerDetailComponent;
  protected readonly createComponent = VerilenSiparislerCreateComponent;
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getVerilenSiparisler(zamanlama, warehouseNo);
  }

  protected override getInitialStartDate(): string {
    return this.getRelativeDate(-1);
  }
}

