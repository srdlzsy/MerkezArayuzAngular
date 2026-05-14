import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type { IFurpaCompanyOrderDetailApiDto, IFurpaCompanyOrderItemApiDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiTaskDetailBase } from '../../../core/api-detail-page/api-task-detail.base';

interface SeriSiraPayload {
  seri: string;
  sira: number;
}

@Component({
  selector: 'app-verilen-siparisler-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verilen-siparisler-detail.component.html',
  styleUrl: './verilen-siparisler-detail.component.scss'
})
export class VerilenSiparislerDetailComponent extends ApiTaskDetailBase<
  SeriSiraPayload,
  IFurpaCompanyOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-firma-siparisleri'];
  protected readonly screenTitle = 'Siparis Detayi';
  protected readonly itemCount = computed(() => this.detail()?.items.length ?? 0);
  protected readonly orderIdentity = computed(() => {
    const payload = this.data;

    if (!payload?.seri || payload.sira === null || payload.sira === undefined) {
      return '-';
    }

    return `${payload.seri}-${payload.sira}`;
  });
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.runDetailRequest({
      validatePayload: (payload: SeriSiraPayload | null): payload is SeriSiraPayload =>
        !!payload?.seri && payload.sira !== null && payload.sira !== undefined,
      requestFactory: (payload: SeriSiraPayload) =>
        this.siparisIslemleriService.getVerilenSiparisDetay(payload.seri, payload.sira),
      missingKeyMessage: 'Detay icin gerekli siparis anahtari bulunamadi.',
      loadErrorMessage: 'Verilen siparis detayi yuklenemedi. Lutfen tekrar deneyin.'
    });
  }

  protected getStatusLabel(isClosed: boolean): string {
    return isClosed ? 'Kapali' : 'Acik';
  }

  protected getStatusTone(isClosed: boolean): string {
    return isClosed ? 'status-pill-success' : 'status-pill-warn';
  }

  protected readonly trackByItem = (_index: number, item: IFurpaCompanyOrderItemApiDto): string =>
    `${item.stockCode}-${item.orderGuid || item.lineNo}`;
}
