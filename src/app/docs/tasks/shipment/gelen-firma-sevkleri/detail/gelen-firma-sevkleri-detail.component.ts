import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementDetailApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-gelen-firma-sevkleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gelen-firma-sevkleri-detail.component.html',
  styleUrl: './gelen-firma-sevkleri-detail.component.scss'
})
export class GelenFirmaSevkleriDetailComponent extends KalemliTaskDetailBase<IFurpaCompanyMovementDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-firma-sevkleri'];
  protected readonly screenTitle = 'Fatura Detayi';
  protected override readonly printDocumentTitle = 'Toptan Cikis Fatura Evraki';
  protected override readonly printDocumentNoLabel = 'Fatura No';
  protected override readonly printLineTitle = 'Fatura Kalemleri';
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

