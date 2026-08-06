import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { FirmaMalKabulleriCreateComponent } from '../create/firma-mal-kabulleri-create.component';
import { FirmaMalKabulleriDetailComponent } from '../detail/firma-mal-kabulleri-detail.component';

@Component({
  selector: 'app-firma-mal-kabulleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './firma-mal-kabulleri-list.component.scss'
})
export class FirmaMalKabulleriListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['firma-mal-kabulleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = FirmaMalKabulleriDetailComponent;
  protected readonly createComponent = FirmaMalKabulleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';

  protected override getStartDateLabel(): string {
    return 'Belge Baslangic Tarihi';
  }

  protected override getEndDateLabel(): string {
    return 'Belge Bitis Tarihi';
  }

  protected override getDateRangeHelpText(): string {
    return '';
  }

  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.malKabulIslemleriService.getToptanGirisIrsaliyeleri(zamanlama, warehouseNo);
  }
}
