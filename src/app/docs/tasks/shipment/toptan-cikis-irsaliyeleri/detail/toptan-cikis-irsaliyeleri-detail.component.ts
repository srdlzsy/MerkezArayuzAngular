import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementDetailApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-toptan-cikis-irsaliyeleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toptan-cikis-irsaliyeleri-detail.component.html',
  styleUrl: './toptan-cikis-irsaliyeleri-detail.component.scss'
})
export class ToptanCikisIrsaliyeleriDetailComponent extends KalemliTaskDetailBase<IFurpaCompanyMovementDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['giden-firma-sevkleri'];
  protected readonly screenTitle = 'Irsaliye Detayi';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.sevkIslemleriService.getSevkDetay('ToptanCikisIrsaliyeleri', seri, sira, warehouseNo),
      'Detay icin gerekli irsaliye anahtari bulunamadi.',
      'Toptan cikis irsaliyesi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

