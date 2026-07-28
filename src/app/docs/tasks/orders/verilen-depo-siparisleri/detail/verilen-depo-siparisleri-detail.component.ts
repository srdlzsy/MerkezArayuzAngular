import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseOrderDetailApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';

@Component({
  selector: 'app-verilen-depo-siparisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verilen-depo-siparisleri-detail.component.html',
  styleUrl: './verilen-depo-siparisleri-detail.component.scss'
})
export class VerilenDepoSiparisleriDetailComponent extends SiparisTaskDetailBase<
  IFurpaWarehouseOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-depo-siparisleri'];
  protected readonly screenTitle = 'Depo Siparis Detayi';
  protected override readonly printDocumentTitle = 'Verilen Depo Siparis Evraki';
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getVerilenDepoSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Verilen depo siparisleri detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}
