import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementDetailApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-toptan-cikis-faturalari-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toptan-cikis-faturalari-detail.component.html',
  styleUrl: './toptan-cikis-faturalari-detail.component.scss'
})
export class ToptanCikisFaturalariDetailComponent extends KalemliTaskDetailBase<IFurpaCompanyMovementDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly screenTitle = 'Fatura Detayi';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.sevkIslemleriService.getSevkDetay('ToptanCikisFaturalari', seri, sira, warehouseNo),
      'Detay icin gerekli fatura anahtari bulunamadi.',
      'Toptan cikis faturasi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

