import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseShippingDetailApiDto } from '@interfaces';

import { SevkIslemleriService } from '../../../../../core/api/module-services/sevk-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-depo-dagitim-sevk-fisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './depo-dagitim-sevk-fisleri-detail.component.html',
  styleUrl: './depo-dagitim-sevk-fisleri-detail.component.scss'
})
export class DepoDagitimSevkFisleriDetailComponent extends KalemliTaskDetailBase<IFurpaWarehouseShippingDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['gelen-depolar-arasi-sevkler'];
  protected readonly screenTitle = 'Sevk Fisi Detayi';
  private readonly sevkIslemleriService = inject(SevkIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.sevkIslemleriService.getDepoDagitimSevkFisDetay(seri, sira),
      'Detay icin gerekli fis anahtari bulunamadi.',
      'Depo dagitim sevk fisi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

