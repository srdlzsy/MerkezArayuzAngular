import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementDetailApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-toptan-giris-irsaliyeleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toptan-giris-irsaliyeleri-detail.component.html',
  styleUrl: './toptan-giris-irsaliyeleri-detail.component.scss'
})
export class ToptanGirisIrsaliyeleriDetailComponent extends KalemliTaskDetailBase<IFurpaCompanyMovementDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['firma-mal-kabulleri'];
  protected readonly screenTitle = 'Irsaliye Detayi';
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.malKabulIslemleriService.getCompanyReceiptDetail(seri, sira),
      'Detay icin gerekli irsaliye anahtari bulunamadi.',
      'Toptan giris irsaliyesi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

