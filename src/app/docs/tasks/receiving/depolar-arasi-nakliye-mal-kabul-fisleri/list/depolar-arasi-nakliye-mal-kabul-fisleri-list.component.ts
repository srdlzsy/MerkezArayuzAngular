import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseReceiptListItemApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import {
  ApiListTableActionEvent,
  ApiListTableRowAction
} from '../../../core/api-list-table/api-list-table.types';
import { buildWarehouseMovementListColumns } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { openDocsTaskDialog } from '../../../core/task-dialog.config';
import { DepolarArasiNakliyeMalKabulFisleriCreateComponent } from '../create/depolar-arasi-nakliye-mal-kabul-fisleri-create.component';
import { DepolarArasiNakliyeMalKabulFisleriDetailComponent } from '../detail/depolar-arasi-nakliye-mal-kabul-fisleri-detail.component';

const ROW_ACTIONS: readonly ApiListTableRowAction<IFurpaWarehouseReceiptListItemApiDto>[] = [
  {
    key: 'accept-receipt',
    label: 'Kabul Et',
    tone: 'success',
    isVisible: (row) => hasSourceEDespatch(row)
  }
];

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
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = DepolarArasiNakliyeMalKabulFisleriDetailComponent;
  protected readonly createComponent = DepolarArasiNakliyeMalKabulFisleriCreateComponent;
  protected override readonly unknownStatusLabel = 'Bilinmiyor';
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.malKabulIslemleriService.getDepolarArasiNakliyeMalKabulFisleri(zamanlama, warehouseNo);
  }

  protected override resolveDetailWarehouseNo(
    row: IFurpaWarehouseReceiptListItemApiDto
  ): number | undefined {
    return Number.isFinite(row.targetWarehouseNo) && row.targetWarehouseNo > 0
      ? row.targetWarehouseNo
      : super.resolveDetailWarehouseNo(row);
  }

  protected override getCreateButtonLabel(): string {
    return 'Kabul Et';
  }

  protected override getAdditionalRowActions(): readonly ApiListTableRowAction<IFurpaWarehouseReceiptListItemApiDto>[] {
    return ROW_ACTIONS;
  }

  protected override handleAdditionalRowAction(
    event: ApiListTableActionEvent<IFurpaWarehouseReceiptListItemApiDto>
  ): void {
    if (event.actionKey !== 'accept-receipt') {
      return;
    }

    const row = event.row;

    openDocsTaskDialog(this.dialog, this.createComponent, {
      data: {
        seri: row.documentSerie,
        sira: row.documentOrderNo,
        warehouseNo: this.resolveDetailWarehouseNo(row),
        autoLoad: true
      }
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: unknown) => {
        if (result) {
          this.loadRows();
        }
      });
  }
}

function hasSourceEDespatch(row: IFurpaWarehouseReceiptListItemApiDto): boolean {
  const documentNo = row.documentNo?.trim() ?? '';
  const ettn = row.descriptionEttn?.trim() ?? '';

  return !!ettn || !!documentNo;
}
