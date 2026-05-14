import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaStockReceiptDetailApiDto } from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-fire-depo-cikis-fisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fire-depo-cikis-fisleri-detail.component.html',
  styleUrl: './fire-depo-cikis-fisleri-detail.component.scss'
})
export class FireDepoCikisFisleriDetailComponent extends KalemliTaskDetailBase<IFurpaStockReceiptDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['zayiat-fisleri'];
  protected readonly screenTitle = 'Cikis Fisi Detayi';
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.stokIslemleriService.getSubeIciDetay('FireDepoCikisFisleri', seri, sira),
      'Detay icin gerekli fis anahtari bulunamadi.',
      `${this.page.title} detayi yuklenemedi. Lutfen tekrar deneyin.`
    );
  }
}

