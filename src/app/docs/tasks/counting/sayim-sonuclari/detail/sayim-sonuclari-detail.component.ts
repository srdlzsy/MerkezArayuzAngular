import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type {
  IFurpaInventoryCountDetailApiDto,
  IFurpaInventoryCountItemApiDto
} from '@interfaces';

import { SayimIslemleriService } from '../../../../../core/api/module-services/sayim-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiTaskDetailBase } from '../../../core/api-detail-page/api-task-detail.base';
import { DocumentPrintService } from '../../../core/document-print/document-print.service';

interface SayimSonuclariDetailDialogData {
  evrakNo: number ;
  tarih: string;
  warehouseNo?: number;
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
  private readonly documentPrintService = inject(DocumentPrintService);

  protected readonly printError = signal('');
  protected readonly activeDepoNo = computed(() => this.authService.currentUser()?.depoNo);
  protected readonly requestWarehouseNo = computed(() => {
    const rowWarehouseNo = this.data?.warehouseNo;

    return Number.isFinite(rowWarehouseNo) ? Number(rowWarehouseNo) : this.activeDepoNo();
  });
  protected readonly kalemler = computed(() => this.detail()?.items ?? []);
  protected readonly kalemCount = computed(() => this.kalemler().length);
  protected readonly currentDetail = computed(() => this.detail()?.header ?? null);
  protected readonly requestIdentity = computed(() => {
    const payload = this.data;
    const depoNo = this.requestWarehouseNo();

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

  protected printCurrentDocument(): void {
    const detail = this.currentDetail();

    if (!detail) {
      return;
    }

    this.printError.set('');
    const started = this.documentPrintService.print({
      title: 'Sayim Sonucu',
      subtitle: detail.name || `Sayim ${detail.documentNo}`,
      branch: `${detail.warehouseNo} - ${detail.warehouseName || 'Depo'}`,
      orientation: 'landscape',
      sections: [
        {
          title: 'Belge Bilgileri',
          fields: [
            { label: 'Evrak No', value: detail.documentNo },
            { label: 'Tarih', value: this.formatDate(detail.documentDate) },
            { label: 'Depo No', value: detail.warehouseNo },
            { label: 'Depo', value: detail.warehouseName },
            { label: 'Sayim Adi', value: detail.name, wide: true },
            { label: 'Kalem Sayisi', value: detail.lineCount },
            { label: 'Toplam Miktar', value: this.formatNumber(detail.totalQuantity) }
          ]
        }
      ],
      lineTitle: `Sayim Kalemleri (${this.kalemCount()})`,
      columns: [
        { label: '#', width: '4%', align: 'center' },
        { label: 'Stok Kodu', width: '9%' },
        { label: 'Stok Ismi', width: '24%' },
        { label: 'Barkod', width: '14%' },
        { label: 'Birim', width: '7%', align: 'center' },
        { label: 'Birim Musiri', width: '8%', align: 'center' },
        { label: 'Miktar 1', width: '7%', align: 'right' },
        { label: 'Miktar 2', width: '7%', align: 'right' },
        { label: 'Miktar 3', width: '7%', align: 'right' },
        { label: 'Miktar 4', width: '7%', align: 'right' },
        { label: 'Miktar 5', width: '7%', align: 'right' }
      ],
      rows: this.kalemler().map((kalem, index) => [
        index + 1,
        kalem.stockCode,
        kalem.stockName,
        kalem.barcode,
        kalem.unitName,
        kalem.unitPointer,
        this.formatNumber(kalem.quantity1),
        this.formatNumber(kalem.quantity2),
        this.formatNumber(kalem.quantity3),
        this.formatNumber(kalem.quantity4),
        this.formatNumber(kalem.quantity5)
      ])
    });

    if (!started) {
      this.printError.set('Yazdirma penceresi acilamadi. Tarayicinin acilir pencere iznini kontrol edin.');
    }
  }

  protected override loadDetail(): void {
    const warehouseNo = this.requestWarehouseNo();

    if (warehouseNo === null || warehouseNo === undefined) {
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
          warehouseNo,
          payload.tarih
        ),
      missingKeyMessage: 'Detay icin gerekli sayim anahtari bulunamadi.',
      loadErrorMessage: 'Sayim sonucu detayi yuklenemedi. Lutfen tekrar deneyin.'
    });
  }
}
