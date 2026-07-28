import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseOrderDetailApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';

@Component({
  selector: 'app-alinan-depo-siparisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alinan-depo-siparisleri-detail.component.html',
  styleUrl: './alinan-depo-siparisleri-detail.component.scss'
})
export class AlinanDepoSiparisleriDetailComponent extends SiparisTaskDetailBase<
  IFurpaWarehouseOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-depo-siparisleri'];
  protected readonly screenTitle = 'Alinan Depo Siparis Detayi';
  protected override readonly printDocumentTitle = 'Alinan Depo Siparis Evraki';
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getAlinanDepoSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Alinan depo siparisleri detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}
