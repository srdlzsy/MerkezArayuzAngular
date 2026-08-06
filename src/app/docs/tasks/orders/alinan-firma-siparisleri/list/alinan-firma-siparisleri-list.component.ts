import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyOrderListItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_SIPARISI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { AlinanFirmaSiparisleriCreateComponent } from '../create/alinan-firma-siparisleri-create.component';
import { AlinanFirmaSiparisleriDetailComponent } from '../detail/alinan-firma-siparisleri-detail.component';

@Component({
  selector: 'app-alinan-firma-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './alinan-firma-siparisleri-list.component.scss'
})
export class AlinanFirmaSiparisleriListComponent extends ApiTaskListPageBase<IFurpaCompanyOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-firma-siparisleri'];
  protected readonly tableColumns = FIRMA_SIPARISI_LIST_COLUMNS;
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = AlinanFirmaSiparisleriDetailComponent;
  protected readonly createComponent = AlinanFirmaSiparisleriCreateComponent;
  protected override readonly canCreate = false;
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getAlinanSiparisler(zamanlama, warehouseNo);
  }

  protected override getInitialStartDate(): string {
    return this.getRelativeDate(-1);
  }
}

