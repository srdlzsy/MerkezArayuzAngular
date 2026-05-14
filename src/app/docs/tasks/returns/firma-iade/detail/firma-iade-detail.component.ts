import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaCompanyMovementDetailApiDto } from '@interfaces';

import { IadeIslemleriService } from '../../../../../core/api/module-services/iade-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-firma-iade-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firma-iade-detail.component.html',
  styleUrl: './firma-iade-detail.component.scss'
})
export class FirmaIadeDetailComponent extends KalemliTaskDetailBase<IFurpaCompanyMovementDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['firma-iadeleri'];
  protected readonly screenTitle = 'Firma Iade Detayi';
  private readonly iadeIslemleriService = inject(IadeIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.iadeIslemleriService.getFirmaIadeDetay(seri, sira),
      'Detay icin gerekli iade anahtari bulunamadi.',
      'Firma iade detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

