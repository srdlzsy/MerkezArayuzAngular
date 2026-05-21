import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import type {
  IFurpaInventoryCountDetailApiDto,
  IFurpaInventoryCountItemApiDto
} from '@interfaces';

import { SayimIslemleriService } from '../../../../../core/api/module-services/sayim-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiTaskDetailBase } from '../../../core/api-detail-page/api-task-detail.base';

interface SayimSonuclariDetailDialogData {
  evrakNo: number ;
  tarih: string;
}

@Component({
  selector: 'app-sayim-sonuclari-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sayim-sonuclari-detail.component.html',
  styleUrl: './sayim-sonuclari-detail.component.scss'
})
export class SayimSonuclariDetailComponent extends ApiTaskDetailBase<
  SayimSonuclariDetailDialogData,
  IFurpaInventoryCountDetailApiDto
> {
  protected override readonly page: DocsContentPage = DOCS_PAGES['sayim-sonuclari'];
  protected override readonly screenTitle = 'Sayim Sonucu Detayi';
  private readonly authService = inject(AuthService);
  private readonly sayimIslemleriService = inject(SayimIslemleriService);

  protected readonly activeDepoNo = computed(() => this.authService.currentUser()?.depoNo);
  protected readonly kalemler = computed(() => this.detail()?.items ?? []);
  protected readonly kalemCount = computed(() => this.kalemler().length);
  protected readonly currentDetail = computed(() => this.detail()?.header ?? null);
  protected readonly requestIdentity = computed(() => {
    const payload = this.data;
    const depoNo = this.activeDepoNo();

    if (!payload?.evrakNo || !payload.tarih || depoNo === null || depoNo === undefined) {
      return '-';
    }

    return `${payload.evrakNo} / ${depoNo} / ${payload.tarih}`;
  });

  protected trackByKalem(index: number, kalem: IFurpaInventoryCountItemApiDto): string {
    return [
      kalem.stockCode,
      kalem.barcode,
      kalem.stockName,
      `${kalem.rowNo}`,
      `${index}`
    ]
      .filter((value): value is string => !!value?.trim())
      .join('-');
  }

  protected override loadDetail(): void {
    if (this.activeDepoNo() === null || this.activeDepoNo() === undefined) {
      this.errorMessage.set('Aktif kullanici depo bilgisi bulunamadigi icin detay getirilemedi.');
      return;
    }

    this.runDetailRequest({
      validatePayload: (
        payload: SayimSonuclariDetailDialogData | null
      ): payload is SayimSonuclariDetailDialogData => !!payload?.evrakNo && !!payload.tarih,
      requestFactory: (payload: SayimSonuclariDetailDialogData) =>
        this.sayimIslemleriService.getSayimSonucuDetay(
          payload.evrakNo,
          this.activeDepoNo() as number,
          payload.tarih
        ),
      missingKeyMessage: 'Detay icin gerekli sayim anahtari bulunamadi.',
      loadErrorMessage: 'Sayim sonucu detayi yuklenemedi. Lutfen tekrar deneyin.'
    });
  }
}
