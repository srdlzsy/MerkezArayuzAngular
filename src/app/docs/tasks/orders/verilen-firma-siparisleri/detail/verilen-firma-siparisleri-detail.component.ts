import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyOrderDetailApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';

@Component({
  selector: 'app-verilen-firma-siparisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verilen-firma-siparisleri-detail.component.html',
  styleUrl: './verilen-firma-siparisleri-detail.component.scss'
})
export class VerilenFirmaSiparisleriDetailComponent extends SiparisTaskDetailBase<
  IFurpaCompanyOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-firma-siparisleri'];
  protected readonly screenTitle = 'Siparis Detayi';
  protected override readonly printDocumentTitle = 'Verilen Firma Siparis Evraki';
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getVerilenSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Verilen siparis detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}
