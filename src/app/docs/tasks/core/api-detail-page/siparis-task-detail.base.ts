import { Directive, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { joinTruthy } from '@core/api/furpa-merkez-api.utils';
import { DocsContentPage } from '../../../models/docs.models';
import {
  DocumentPrintColumn,
  DocumentPrintField,
  DocumentPrintService
} from '../document-print/document-print.service';
import { ApiTaskDetailBase } from './api-task-detail.base';

interface SeriSiraPayload {
  seri: string;
  sira: number;
  warehouseNo?: number;
}

type SiparisPrintMode = 'company' | 'warehouse';

interface SiparisPrintColumn extends DocumentPrintColumn {
  value: (item: any) => unknown;
}

@Directive()
export abstract class SiparisTaskDetailBase<
  TDetail extends { header?: unknown; items?: readonly unknown[] | null }
>
  extends ApiTaskDetailBase<SeriSiraPayload, TDetail>
{
  protected abstract override readonly page: DocsContentPage;
  protected abstract override readonly screenTitle: string;
  protected readonly printDocumentTitle: string = '';
  protected readonly printDocumentNoLabel: string = 'Siparis No';
  protected readonly printLineTitle: string = 'Siparis Kalemleri';
  protected readonly itemCount = computed(() => this.items().length);
  protected readonly canPrintDocument = computed(() => !this.isLoading() && !!this.detail()?.header);
  protected readonly orderIdentity = computed(() => {
    const payload = this.data;

    if (!payload?.seri || payload.sira === null || payload.sira === undefined) {
      return '-';
    }

    return `${payload.seri}-${payload.sira}`;
  });

  private readonly documentPrintService = inject(DocumentPrintService);

  protected abstract override loadDetail(): void;

  protected loadOrderDetailRequest(
    requestFactory: (seri: string, sira: number, warehouseNo?: number) => Observable<TDetail>,
    missingKeyMessage: string,
    loadErrorMessage: string
  ): void {
    this.runDetailRequest({
      validatePayload: (payload: SeriSiraPayload | null): payload is SeriSiraPayload =>
        !!payload?.seri && payload.sira !== null && payload.sira !== undefined,
      requestFactory: (payload: SeriSiraPayload) =>
        requestFactory(payload.seri, payload.sira, payload.warehouseNo),
      missingKeyMessage,
      loadErrorMessage
    });
  }

  protected getStatusLabel(isClosed: boolean): string {
    return isClosed ? 'Kapali' : 'Acik';
  }

  protected getStatusTone(isClosed: boolean): string {
    return isClosed ? 'status-pill-success' : 'status-pill-warn';
  }

  protected hasGreenGrocerCase(item: any): boolean {
    return !!item?.greenGrocerCase;
  }

  protected formatGreenGrocerCase(item: any): string {
    const caseInfo = item?.greenGrocerCase;

    if (!caseInfo) {
      return '';
    }

    const inputQuantity = this.getRecordNumber(caseInfo, 'inputQuantity');
    const inputMode = this.formatGreenGrocerInputMode(this.getRecordText(caseInfo, 'inputMode'));
    const estimatedQuantity = this.getRecordNumber(caseInfo, 'estimatedQuantity');
    const microUnit = this.getRecordText(caseInfo, 'microUnit') || this.getRecordText(item, 'unitName');

    return `${this.formatNumber(inputQuantity)} ${inputMode} ~= ${this.formatNumber(estimatedQuantity)} ${microUnit}`.trim();
  }

  protected formatGreenGrocerAverage(item: any): string {
    const caseInfo = item?.greenGrocerCase;

    if (!caseInfo) {
      return '';
    }

    const averageKgPerCase = this.getRecordNumber(caseInfo, 'averageKgPerCase');
    const unitsPerCase = this.getRecordNumber(caseInfo, 'unitsPerCase');
    const microUnit = this.getRecordText(caseInfo, 'microUnit') || this.getRecordText(item, 'unitName');

    if (averageKgPerCase !== null) {
      return `Ort ${this.formatNumber(averageKgPerCase)} ${microUnit}/kasa`;
    }

    if (unitsPerCase !== null) {
      return `Ort ${this.formatNumber(unitsPerCase)} ${microUnit}/koli`;
    }

    return this.getRecordText(caseInfo, 'confidence', 'status');
  }

  protected readonly trackByItem = (index: number, item: any): string =>
    [
      this.getRecordText(item, 'stockCode'),
      this.getRecordText(item, 'orderGuid', 'lineGuid'),
      `${this.getRecordNumber(item, 'lineNo') ?? index}`
    ]
      .filter((value): value is string => !!value?.trim())
      .join('-');

  protected printCurrentDocument(): void {
    const order = this.detail();
    const header = order?.header as any;

    if (!header) {
      return;
    }

    const mode = this.resolvePrintMode(header);
    const printColumns = this.buildPrintColumns();
    const documentColumns = printColumns.map(({ value: _value, ...column }) => column);

    this.documentPrintService.print({
      title: this.printDocumentTitle || joinTruthy([this.page.title, this.screenTitle], ' - '),
      subtitle: `${this.printDocumentNoLabel}: ${this.orderIdentity()}`,
      branch: this.resolvePrintBranch(header, mode),
      sections: this.buildPrintSections(header, mode),
      lineTitle: this.printLineTitle,
      columns: documentColumns,
      rows: this.items().map((item) => printColumns.map((column) => column.value(item))),
      signatures: this.buildPrintSignatures(header, mode)
    });
  }

  private items(): any[] {
    return ((this.detail() as any)?.items as any[] | null) ?? [];
  }

  private resolvePrintMode(header: any): SiparisPrintMode {
    return this.getRecordText(header, 'customerCode', 'customerDisplayName', 'customerTitle')
      ? 'company'
      : 'warehouse';
  }

  private resolvePrintBranch(header: any, mode: SiparisPrintMode): string {
    if (mode === 'warehouse') {
      return this.joinCodeAndName(
        this.getRecordNumber(header, 'warehouseNo', 'inWarehouseNo', 'outWarehouseNo'),
        this.getRecordText(header, 'warehouseName', 'inWarehouseName', 'outWarehouseName')
      );
    }

    return this.joinCodeAndName(
      this.getRecordNumber(header, 'warehouseNo'),
      this.getRecordText(header, 'warehouseName')
    );
  }

  private buildPrintSections(header: any, mode: SiparisPrintMode) {
    const commonFields: DocumentPrintField[] = [
      { label: 'Evrak Seri', value: this.getRecordText(header, 'documentSerie') },
      { label: 'Evrak Sira', value: this.getRecordNumber(header, 'documentOrderNo') },
      { label: 'Evrak Tarihi', value: this.formatDate(this.getRecordText(header, 'documentDate')) },
      { label: 'Teslim Tarihi', value: this.formatDate(this.getRecordText(header, 'deliveryDate')), optional: true },
      { label: 'Belge No', value: this.getRecordText(header, 'documentNumber', 'documentNo'), optional: true }
    ];

    if (mode === 'company') {
      return [
        { title: 'Evrak Bilgileri', fields: commonFields },
        {
          title: 'Cari Bilgileri',
          fields: [
            { label: 'Cari', value: this.getRecordText(header, 'customerDisplayName', 'customerTitle'), wide: true },
            { label: 'Cari Kod', value: this.getRecordText(header, 'customerCode'), optional: true },
            { label: 'Adres', value: this.getRecordText(header, 'customerAddress'), wide: true, optional: true },
            { label: 'Teslim Eden', value: this.getRecordText(header, 'deliverer'), optional: true },
            { label: 'Teslim Alan', value: this.getRecordText(header, 'receiver'), optional: true },
            { label: 'Aciklama', value: this.getRecordText(header, 'description1', 'description2'), wide: true, optional: true }
          ]
        },
        { title: 'Toplamlar', fields: this.buildTotalFields(header) }
      ];
    }

    return [
      { title: 'Evrak Bilgileri', fields: commonFields },
      {
        title: 'Depo Bilgileri',
        fields: [
          {
            label: 'Ilgili Depo',
            value: this.joinCodeAndName(
              this.getRecordNumber(header, 'relatedWarehouseNo'),
              this.getRecordText(header, 'relatedWarehouseName')
            )
          },
          {
            label: 'Giren Depo',
            value: this.joinCodeAndName(
              this.getRecordNumber(header, 'inWarehouseNo'),
              this.getRecordText(header, 'inWarehouseName')
            )
          },
          {
            label: 'Cikan Depo',
            value: this.joinCodeAndName(
              this.getRecordNumber(header, 'outWarehouseNo'),
              this.getRecordText(header, 'outWarehouseName')
            )
          }
        ]
      },
      { title: 'Toplamlar', fields: this.buildTotalFields(header) }
    ];
  }

  private buildTotalFields(header: any): DocumentPrintField[] {
    return [
      { label: 'Kalem Sayisi', value: this.itemCount() },
      { label: 'Toplam Miktar', value: this.formatNumber(this.getRecordNumber(header, 'totalQuantity')) },
      { label: 'Teslim', value: this.formatNumber(this.getRecordNumber(header, 'totalDeliveredQuantity')), optional: true },
      { label: 'Kalan', value: this.formatNumber(this.getRecordNumber(header, 'totalRemainingQuantity')), optional: true },
      { label: 'Toplam Tutar', value: this.formatNumber(this.getRecordNumber(header, 'totalAmount')) },
      { label: 'Durum', value: this.getStatusLabel(!!header?.isClosed) }
    ];
  }

  private buildPrintColumns(): SiparisPrintColumn[] {
    return [
      {
        label: 'Sira',
        width: '9mm',
        align: 'center',
        value: (item) => this.getRecordNumber(item, 'lineNo') ?? '-'
      },
      {
        label: 'Urun Kodu',
        width: '22mm',
        value: (item) => this.getRecordText(item, 'stockCode') || '-'
      },
      {
        label: 'Urun Adi',
        value: (item) => this.getRecordText(item, 'stockName') || '-'
      },
      {
        label: 'Birim',
        width: '13mm',
        align: 'center',
        value: (item) => this.getRecordText(item, 'unitName') || '-'
      },
      {
        label: 'Siparis',
        width: '16mm',
        align: 'right',
        value: (item) => this.formatNumber(this.getRecordNumber(item, 'quantity'))
      },
      {
        label: 'Teslim',
        width: '16mm',
        align: 'right',
        value: (item) => this.formatNumber(this.getRecordNumber(item, 'deliveredQuantity'))
      },
      {
        label: 'Kalan',
        width: '16mm',
        align: 'right',
        value: (item) => this.formatNumber(this.getRecordNumber(item, 'remainingQuantity'))
      },
      {
        label: 'Fiyat',
        width: '17mm',
        align: 'right',
        value: (item) => this.formatNumber(this.getRecordNumber(item, 'unitPrice'))
      },
      {
        label: 'Tutar',
        width: '19mm',
        align: 'right',
        value: (item) => this.formatNumber(this.getRecordNumber(item, 'lineAmount'))
      },
      {
        label: 'Aciklama',
        width: '26mm',
        value: (item) => this.getRecordText(item, 'description') || '-'
      }
    ];
  }

  private buildPrintSignatures(header: any, mode: SiparisPrintMode) {
    if (mode === 'company') {
      return [
        { label: 'Teslim Eden', value: this.getRecordText(header, 'deliverer') },
        { label: 'Teslim Alan', value: this.getRecordText(header, 'receiver') }
      ];
    }

    return [
      { label: 'Hazirlayan', value: this.getRecordText(header, 'warehouseName') },
      { label: 'Teslim Alan', value: this.getRecordText(header, 'relatedWarehouseName') }
    ];
  }

  private joinCodeAndName(code: number | null, name: string): string {
    return joinTruthy([code === null ? '' : `${code}`, name], ' - ');
  }

  private formatGreenGrocerInputMode(value: string): string {
    switch (value) {
      case 'Case':
        return 'kasa';
      case 'Pack':
        return 'koli';
      case 'Piece':
        return 'adet';
      case 'KgDirect':
        return 'kg';
      case 'Sarf':
        return 'sarf';
      default:
        return value.trim().toLocaleLowerCase('tr-TR') || 'miktar';
    }
  }

  private getRecordText(record: any, ...keys: string[]): string {
    for (const key of keys) {
      const value = record?.[key];

      if (typeof value === 'string') {
        const normalizedValue = value.trim();

        if (normalizedValue) {
          return normalizedValue;
        }
      }
    }

    return '';
  }

  private getRecordNumber(record: any, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = record?.[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsedValue = Number(value);

        if (Number.isFinite(parsedValue)) {
          return parsedValue;
        }
      }
    }

    return null;
  }
}
