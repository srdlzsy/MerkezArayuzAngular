import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { GelenFirmaSevkleriCreateComponent } from '../create/gelen-firma-sevkleri-create.component';
import { GelenFirmaSevkleriDetailComponent } from '../detail/gelen-firma-sevkleri-detail.component';

@Component({
  selector: 'app-gelen-firma-sevkleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './gelen-firma-sevkleri-list.component.scss'
})
export class GelenFirmaSevkleriListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = GelenFirmaSevkleriDetailComponent;
  protected readonly createComponent = GelenFirmaSevkleriCreateComponent;
  protected override readonly canCreate = false;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.sevkIslemleriService.getToptanCikisFaturalari(zamanlama, warehouseNo);
  }
}
