import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseReceiptListItemApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { buildWarehouseMovementListColumns } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { DepolarArasiNakliyeMalKabulFisleriCreateComponent } from '../create/depolar-arasi-nakliye-mal-kabul-fisleri-create.component';
import { DepolarArasiNakliyeMalKabulFisleriDetailComponent } from '../detail/depolar-arasi-nakliye-mal-kabul-fisleri-detail.component';

@Component({
  selector: 'app-depolar-arasi-nakliye-mal-kabul-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './depolar-arasi-nakliye-mal-kabul-fisleri-list.component.scss'
})
export class DepolarArasiNakliyeMalKabulFisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseReceiptListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['depo-mal-kabulleri'];
  protected readonly tableColumns = buildWarehouseMovementListColumns('source');
  protected readonly detailComponent = DepolarArasiNakliyeMalKabulFisleriDetailComponent;
  protected readonly createComponent = DepolarArasiNakliyeMalKabulFisleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.malKabulIslemleriService.getDepolarArasiNakliyeMalKabulFisleri(zamanlama);
  }

  protected override getCreateButtonLabel(): string {
    return 'Kabul Et';
  }
}

