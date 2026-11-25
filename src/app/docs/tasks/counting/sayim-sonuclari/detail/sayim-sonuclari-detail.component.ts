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
import {
  DocumentPrintColumn,
  DocumentPrintService
} from '../../../core/document-print/document-print.service';

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
  protected readonly lineSearchTerm = signal('');
  protected readonly activeDetailTab = signal<'all' | 'lines' | 'summary'>('all');
  protected readonly activeDepoNo = computed(() => this.authService.currentUser()?.depoNo);
  protected readonly requestWarehouseNo = computed(() => {
    const rowWarehouseNo = this.data?.warehouseNo;

    return Number.isFinite(rowWarehouseNo) ? Number(rowWarehouseNo) : this.activeDepoNo();
  });
  protected readonly rawKalemler = computed(() => this.detail()?.items ?? []);
  protected readonly kalemler = computed(() => {
    const items = this.rawKalemler();
    const term = this.lineSearchTerm().trim().toLocaleLowerCase('tr-TR');

    if (!term) {
      return items;
    }

    return items.filter((item) =>
      [item.stockCode, item.stockName, item.barcode, item.unitName]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(term)
    );
  });
  protected readonly kalemCount = computed(() => this.rawKalemler().length);
  protected readonly filteredKalemCount = computed(() => this.kalemler().length);
  protected readonly hasActiveLineFilter = computed(() => this.lineSearchTerm().trim().length > 0);
  protected readonly hasQuantity2 = computed(() =>
    this.rawKalemler().some((item) => this.hasNonZeroQuantity(item.quantity2))
  );
  protected readonly hasQuantity3 = computed(() =>
    this.rawKalemler().some((item) => this.hasNonZeroQuantity(item.quantity3))
  );
  protected readonly hasQuantity4 = computed(() =>
    this.rawKalemler().some((item) => this.hasNonZeroQuantity(item.quantity4))
  );
  protected readonly hasQuantity5 = computed(() =>
    this.rawKalemler().some((item) => this.hasNonZeroQuantity(item.quantity5))
  );
  protected readonly hasExtraQuantities = computed(
    () =>
      this.hasQuantity2() ||
      this.hasQuantity3() ||
      this.hasQuantity4() ||
      this.hasQuantity5()
  );
  protected readonly currentDetail = computed(() => this.detail()?.header ?? null);

  protected updateLineSearch(term: string): void {
    this.lineSearchTerm.set(term);
  }

  protected clearLineFilters(): void {
    this.lineSearchTerm.set('');
  }

  protected setDetailTab(tab: 'all' | 'lines' | 'summary'): void {
    this.activeDetailTab.set(tab);
  }
  protected readonly requestIdentity = computed(() => {
    const payload = this.data;
    const depoNo = this.requestWarehouseNo();

    if (!payload?.evrakNo || !payload.tarih || depoNo === null || depoNo === undefined) {
      return '-';
    }

    return `${payload.evrakNo} / Depo ${depoNo} / ${this.formatDocumentDate(payload.tarih)}`;
  });

  private hasNonZeroQuantity(value: number | null | undefined): boolean {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric !== 0;
  }

  protected formatDocumentDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(date);
  }

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
    const showQty2 = this.hasQuantity2();
    const showQty3 = this.hasQuantity3();
    const showQty4 = this.hasQuantity4();
    const showQty5 = this.hasQuantity5();
    const extraCount = [showQty2, showQty3, showQty4, showQty5].filter(Boolean).length;

    const columns: DocumentPrintColumn[] = [
      { label: '#', width: extraCount ? '4%' : '5%', align: 'center' },
      { label: 'Stok Kodu', width: extraCount ? '11%' : '13%' },
      { label: 'Stok Ismi', width: `${extraCount ? 52 - extraCount * 8 : 42}%` },
      { label: 'Barkod', width: extraCount ? '16%' : '18%' },
      { label: 'Birim', width: extraCount ? '8%' : '10%', align: 'center' },
      {
        label: extraCount ? 'Miktar 1' : 'Miktar',
        width: extraCount ? '9%' : '12%',
        align: 'right'
      }
    ];

    if (showQty2) {
      columns.push({ label: 'Miktar 2', width: '8%', align: 'right' });
    }
    if (showQty3) {
      columns.push({ label: 'Miktar 3', width: '8%', align: 'right' });
    }
    if (showQty4) {
      columns.push({ label: 'Miktar 4', width: '8%', align: 'right' });
    }
    if (showQty5) {
      columns.push({ label: 'Miktar 5', width: '8%', align: 'right' });
    }

    const started = this.documentPrintService.print({
      title: 'Sayim Sonucu',
      subtitle: detail.name || `Sayim ${detail.documentNo}`,
      branch: `${detail.warehouseNo} - ${detail.warehouseName || 'Depo'}`,
      orientation: 'portrait',
      density: extraCount >= 2 ? 'dense' : 'compact',
      sections: [
        {
          title: 'Belge Bilgileri',
          fields: [
            { label: 'Evrak No', value: detail.documentNo },
            { label: 'Tarih', value: this.formatDocumentDate(detail.documentDate) },
            { label: 'Depo No', value: detail.warehouseNo },
            { label: 'Depo', value: detail.warehouseName },
            { label: 'Sayim Adi', value: detail.name, wide: true },
            { label: 'Kalem Sayisi', value: detail.lineCount },
            { label: 'Toplam Miktar', value: this.formatNumber(detail.totalQuantity) }
          ]
        }
      ],
      lineTitle: `Sayim Kalemleri (${this.kalemCount()})`,
      columns,
      rows: this.rawKalemler().map((kalem, index) => {
        const row: unknown[] = [
          index + 1,
          kalem.stockCode,
          kalem.stockName,
          kalem.barcode,
          kalem.unitName,
          this.formatNumber(kalem.quantity1)
        ];

        if (showQty2) {
          row.push(this.formatNumber(kalem.quantity2));
        }
        if (showQty3) {
          row.push(this.formatNumber(kalem.quantity3));
        }
        if (showQty4) {
          row.push(this.formatNumber(kalem.quantity4));
        }
        if (showQty5) {
          row.push(this.formatNumber(kalem.quantity5));
        }

        return row;
      })
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
