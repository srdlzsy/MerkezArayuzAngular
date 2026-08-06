import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyOrderListItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_SIPARISI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { VerilenFirmaSiparisleriCreateComponent } from '../create/verilen-firma-siparisleri-create.component';
import { VerilenFirmaSiparisleriDetailComponent } from '../detail/verilen-firma-siparisleri-detail.component';

@Component({
  selector: 'app-verilen-firma-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './verilen-firma-siparisleri-list.component.scss'
})
export class VerilenFirmaSiparisleriListComponent extends ApiTaskListPageBase<IFurpaCompanyOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-firma-siparisleri'];
  protected readonly tableColumns = FIRMA_SIPARISI_LIST_COLUMNS;
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = VerilenFirmaSiparisleriDetailComponent;
  protected readonly createComponent = VerilenFirmaSiparisleriCreateComponent;
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getVerilenSiparisler(zamanlama, warehouseNo);
  }

  protected override getInitialStartDate(): string {
    return this.getRelativeDate(-1);
  }
}

