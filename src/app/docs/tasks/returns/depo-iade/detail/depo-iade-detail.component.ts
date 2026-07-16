import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseReturnDetailApiDto } from '@interfaces';

import {
  DepoIadeDirection,
  IadeIslemleriService
} from '../../../../../core/api/module-services/iade-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

interface DepoIadeDetailDialogData {
  seri?: string;
  sira?: number;
  direction?: DepoIadeDirection;
  pageId?: string;
}

@Component({
  selector: 'app-depo-iade-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './depo-iade-detail.component.html',
  styleUrl: './depo-iade-detail.component.scss'
})
export class DepoIadeDetailComponent extends KalemliTaskDetailBase<IFurpaWarehouseReturnDetailApiDto> {
  protected readonly page: DocsContentPage =
    DOCS_PAGES[this.resolveDialogData().pageId ?? 'giden-depo-iadeleri'] ??
    DOCS_PAGES['giden-depo-iadeleri'];
  protected readonly screenTitle = 'Depo Iade Detayi';
  private readonly iadeIslemleriService = inject(IadeIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.iadeIslemleriService.getDepoIadeDetay(seri, sira, this.resolveDirection(), warehouseNo),
      'Detay icin gerekli iade anahtari bulunamadi.',
      'Depo iade detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }

  private resolveDialogData(): DepoIadeDetailDialogData {
    return (this.data as DepoIadeDetailDialogData | null) ?? {};
  }

  private resolveDirection(): DepoIadeDirection {
    return this.resolveDialogData().direction ?? 'giden';
  }
}
