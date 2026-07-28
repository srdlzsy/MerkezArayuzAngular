import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyOrderDetailApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';

@Component({
  selector: 'app-alinan-siparisler-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alinan-siparisler-detail.component.html',
  styleUrl: './alinan-siparisler-detail.component.scss'
})
export class AlinanSiparislerDetailComponent extends SiparisTaskDetailBase<
  IFurpaCompanyOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-firma-siparisleri'];
  protected readonly screenTitle = 'Alinan Siparis Detayi';
  protected override readonly printDocumentTitle = 'Alinan Firma Siparis Evraki';
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getAlinanSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Alinan siparis detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}
