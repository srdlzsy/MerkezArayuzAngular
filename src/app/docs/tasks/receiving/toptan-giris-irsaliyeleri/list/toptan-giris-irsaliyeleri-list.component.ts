import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementListItemApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { FIRMA_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { ToptanGirisIrsaliyeleriCreateComponent } from '../create/toptan-giris-irsaliyeleri-create.component';
import { ToptanGirisIrsaliyeleriDetailComponent } from '../detail/toptan-giris-irsaliyeleri-detail.component';

@Component({
  selector: 'app-toptan-giris-irsaliyeleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './toptan-giris-irsaliyeleri-list.component.scss'
})
export class ToptanGirisIrsaliyeleriListComponent extends ApiTaskListPageBase<IFurpaCompanyMovementListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['firma-mal-kabulleri'];
  protected readonly tableColumns = FIRMA_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = ToptanGirisIrsaliyeleriDetailComponent;
  protected readonly createComponent = ToptanGirisIrsaliyeleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.malKabulIslemleriService.getToptanGirisIrsaliyeleri(zamanlama);
  }
}
