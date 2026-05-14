import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaStockReceiptListItemApiDto } from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { SUBE_ICI_STOK_HAREKETI_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { SarfDepoCikisFisleriCreateComponent } from '../create/sarf-depo-cikis-fisleri-create.component';
import { SarfDepoCikisFisleriDetailComponent } from '../detail/sarf-depo-cikis-fisleri-detail.component';

@Component({
  selector: 'app-sarf-depo-cikis-fisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './sarf-depo-cikis-fisleri-list.component.scss'
})
export class SarfDepoCikisFisleriListComponent extends ApiTaskListPageBase<IFurpaStockReceiptListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['masraf-fisleri'];
  protected readonly tableColumns = SUBE_ICI_STOK_HAREKETI_LIST_COLUMNS;
  protected readonly detailComponent = SarfDepoCikisFisleriDetailComponent;
  protected readonly createComponent = SarfDepoCikisFisleriCreateComponent;
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected override fetchRows(zamanlama: string) {
    return this.stokIslemleriService.getSubeIciListe('SarfDepoCikisFisleri', zamanlama);
  }
}

