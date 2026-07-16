import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { ToptanCikisFaturalariCreateComponent } from '../create/toptan-cikis-faturalari-create.component';
import { ToptanCikisFaturalariDetailComponent } from '../detail/toptan-cikis-faturalari-detail.component';

@Component({
  selector: 'app-toptan-cikis-faturalari-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './toptan-cikis-faturalari-list.component.scss'
})
export class ToptanCikisFaturalariListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = ToptanCikisFaturalariDetailComponent;
  protected readonly createComponent = ToptanCikisFaturalariCreateComponent;
  protected override readonly canCreate = false;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.sevkIslemleriService.getToptanCikisFaturalari(zamanlama, warehouseNo);
  }
}
