import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaVirmanDetailApiDto } from '@interfaces';

import { StokIslemleriService } from '../../../../../core/api/module-services/stok-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-stok-virman-cikis-fisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stok-virman-cikis-fisleri-detail.component.html',
  styleUrl: './stok-virman-cikis-fisleri-detail.component.scss'
})
export class StokVirmanCikisFisleriDetailComponent extends KalemliTaskDetailBase<IFurpaVirmanDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['virmanlar'];
  protected readonly screenTitle = 'Virman Fisi Detayi';
  private readonly stokIslemleriService = inject(StokIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.stokIslemleriService.getVirmanDetay('StokVirmanCikisFisleri', seri, sira),
      'Detay icin gerekli fis anahtari bulunamadi.',
      `${this.page.title} detayi yuklenemedi. Lutfen tekrar deneyin.`
    );
  }
}

