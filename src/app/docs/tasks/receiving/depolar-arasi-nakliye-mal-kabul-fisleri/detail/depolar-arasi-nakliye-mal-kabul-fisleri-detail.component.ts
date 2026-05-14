import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type { IFurpaWarehouseReceiptDetailApiDto } from '@interfaces';

import { MalKabulIslemleriService } from '../../../../../core/api/module-services/mal-kabul-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { KalemliTaskDetailBase } from '../../../core/api-detail-page/kalemli-task-detail.base';

@Component({
  selector: 'app-depolar-arasi-nakliye-mal-kabul-fisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './depolar-arasi-nakliye-mal-kabul-fisleri-detail.component.html',
  styleUrl: './depolar-arasi-nakliye-mal-kabul-fisleri-detail.component.scss'
})
export class DepolarArasiNakliyeMalKabulFisleriDetailComponent extends KalemliTaskDetailBase<IFurpaWarehouseReceiptDetailApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['depo-mal-kabulleri'];
  protected readonly screenTitle = 'Mal Kabul Fisi Detayi';
  private readonly malKabulIslemleriService = inject(MalKabulIslemleriService);

  protected override loadDetail(): void {
    this.loadDetailRequest(
      (seri: string, sira: number) => this.malKabulIslemleriService.getDepolarArasiNakliyeMalKabulFisDetay(seri, sira),
      'Detay icin gerekli fis anahtari bulunamadi.',
      'Mal kabul fisi detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }
}

