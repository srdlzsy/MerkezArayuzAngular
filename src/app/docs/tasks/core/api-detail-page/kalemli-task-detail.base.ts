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

type KalemliPrintMode = 'company' | 'warehouse' | 'stock';

type DetailHeader<TDetail> = NonNullable<
  TDetail extends { header?: infer THeader } ? THeader : never
> & object;
type DetailLine<TDetail> = (
  TDetail extends { items?: readonly (infer TLine)[] | null } ? TLine : never
) & object;

interface KalemliPrintColumn<TLine extends object> extends DocumentPrintColumn {
  value: (kalem: TLine, index: number) => unknown;
}

@Directive()
export abstract class KalemliTaskDetailBase<
  TDetail extends { header?: object | null; items?: readonly object[] | null }
>
  extends ApiTaskDetailBase<SeriSiraPayload, TDetail>
{
  protected abstract override readonly page: DocsContentPage;
  protected abstract override readonly screenTitle: string;
  protected readonly printDocumentTitle: string = '';
  protected readonly printDocumentNoLabel: string = 'Kayit No';
  protected readonly printLineTitle: string = 'Kalemler';
  protected readonly header = computed<DetailHeader<TDetail> | null>(
    () => (this.detail()?.header ?? null) as DetailHeader<TDetail> | null
  );
  protected readonly kalemler = computed<DetailLine<TDetail>[]>(
    () => [...(this.detail()?.items ?? [])] as DetailLine<TDetail>[]
  );
  protected readonly canPrintDocument = computed(() => !this.isLoading() && !!this.header());
  protected readonly kalemCount = computed(() => this.kalemler().length);
  protected readonly orderIdentity = computed(() => {
    const payload = this.data;

    if (!payload?.seri || payload.sira === null || payload.sira === undefined) {
      return '-';
    }

    return `${payload.seri}-${payload.sira}`;
  });

  protected abstract override loadDetail(): void;

  protected loadDetailRequest(
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

  protected getStatusTone(status: string | null | undefined): string {
    const normalized = status?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (normalized.includes('tamam') || normalized.includes('kapand') || normalized.includes('onay')) {
      return 'status-pill-success';
    }

    if (
      normalized.includes('bekle') ||
      normalized.includes('hazir') ||
      normalized.includes('taslak') ||
      normalized.includes('olustur')
    ) {
      return 'status-pill-warn';
    }

    if (normalized.includes('iptal') || normalized.includes('red')) {
      return 'status-pill-danger';
    }

    return 'status-pill-neutral';
  }

  protected readonly trackByKalem = (index: number, kalem: DetailLine<TDetail>): string =>
    [
      this.getLineText(kalem, 'stockCode', 'stokKodu'),
      this.getLineText(kalem, 'barcode', 'barkodu'),
      this.getLineText(kalem, 'stockName', 'stokIsmi'),
      this.getLineText(kalem, 'rowNo', 'lineNo'),
      `${index}`
    ]
      .filter((value): value is string => !!value?.trim())
      .join('-');

  private readonly documentPrintService = inject(DocumentPrintService);

  protected getHeaderText(header: object | null | undefined, ...keys: string[]): string {
    return this.getRecordText(header, ...keys);
  }

  protected getHeaderNumber(header: object | null | undefined, ...keys: string[]): number | null {
    return this.getRecordNumber(header, ...keys);
  }

  protected getLineText(line: object | null | undefined, ...keys: string[]): string {
    return this.getRecordText(line, ...keys);
  }

  protected getLineNumber(line: object | null | undefined, ...keys: string[]): number | null {
    return this.getRecordNumber(line, ...keys);
  }

  protected resolvePrimaryDate(header: object): string {
    return this.getHeaderText(header, 'documentDate', 'movementDate', 'tarih');
  }

  protected resolveCompanyPerson(header: object): string {
    return (
      this.getHeaderText(header, 'customerDisplayName', 'muhatapAdSoyad', 'customerName') ||
      this.getHeaderText(header, 'customerTitle')
    );
  }

  protected resolveCompanyTitle(header: object): string {
    return (
      this.getHeaderText(header, 'customerDisplayName', 'muhatapFirmaUnvan') ||
      joinTruthy([
        this.getHeaderText(header, 'customerName'),
        this.getHeaderText(header, 'customerTitle')
      ])
    );
  }

  protected resolveCompanyStatus(header: object): string {
    const isClosed = this.readRecordValue(header, 'isClosed');

    if (typeof isClosed === 'boolean') {
      return isClosed ? 'Kapali' : 'Acik';
    }

    if (this.getHeaderText(header, 'documentNo', 'belgeNo')) {
      return 'Gonderildi';
    }

    const totalAmount = this.getHeaderNumber(header, 'totalAmount');
    return totalAmount !== null && totalAmount > 0 ? 'Hazir' : 'Acik';
  }

  protected resolveWarehouseStatus(header: object): string {
    return this.getHeaderNumber(header, 'shippingState') === 1 ? 'Tamamlandi' : 'Bekliyor';
  }

  protected resolveWarehouseOrderNumbers(header: object): string {
    const headerOrderNo = this.getHeaderText(header, 'warehouseOrderNo');

    if (headerOrderNo) {
      return headerOrderNo;
    }

    const warehouseOrderNos = this.readRecordValue(header, 'warehouseOrderNos');
    if (Array.isArray(warehouseOrderNos)) {
      const headerOrderNos = warehouseOrderNos
        .map((orderNo: unknown) => `${orderNo ?? ''}`.trim())
        .filter(Boolean);

      if (headerOrderNos.length) {
        return Array.from(new Set(headerOrderNos)).join(', ');
      }
    }

    const lineOrderNos = this.kalemler()
      .map((line) => this.getLineText(line, 'warehouseOrderNo'))
      .filter(Boolean);

    return Array.from(new Set(lineOrderNos)).join(', ');
  }

  protected resolveWarehouseName(header: object, side: 'source' | 'target'): string {
    return this.getHeaderText(
      header,
      side === 'source' ? 'sourceWarehouse' : 'targetWarehouse',
      'muhatapDepoIsim',
      'muhatapAdSoyad'
    );
  }

  protected resolveWarehouseNo(header: object, side: 'source' | 'target'): number | null {
    return this.getHeaderNumber(
      header,
      side === 'source' ? 'sourceWarehouseNo' : 'targetWarehouseNo',
      'muhatapDepoNo'
    );
  }

  protected resolveStockReceiptOwner(header: object): string {
    return this.getHeaderText(header, 'creator', 'acceptor', 'ekleyenAdSoyad');
  }

  protected printCurrentDocument(): void {
    const header = this.header();

    if (!header) {
      return;
    }

    const mode = this.resolvePrintMode(header);
    const printColumns = this.buildPrintColumns(mode);
    const documentColumns = printColumns.map(({ value: _value, ...column }) => column);

    this.documentPrintService.print({
      title: this.resolvePrintTitle(),
      subtitle: `${this.printDocumentNoLabel}: ${this.orderIdentity()}`,
      branch: this.resolvePrintBranch(header, mode),
      sections: this.buildPrintSections(header, mode),
      lineTitle: this.printLineTitle,
      columns: documentColumns,
      rows: this.kalemler().map((kalem, index) => printColumns.map((column) => column.value(kalem, index))),
      signatures: this.buildPrintSignatures(header, mode)
    });
  }

  private resolvePrintTitle(): string {
    return this.printDocumentTitle || joinTruthy([this.page.title, this.screenTitle], ' - ');
  }

  private resolvePrintMode(header: object): KalemliPrintMode {
    if (
      this.getHeaderText(header, 'customerCode', 'customerDisplayName', 'customerTitle') ||
      this.getHeaderNumber(header, 'inputWarehouseNo', 'outputWarehouseNo') !== null
    ) {
      return 'company';
    }

    if (
      this.getHeaderText(header, 'sourceWarehouse', 'targetWarehouse', 'warehouseOrderNo') ||
      this.getHeaderNumber(header, 'sourceWarehouseNo', 'targetWarehouseNo') !== null
    ) {
      return 'warehouse';
    }

    return 'stock';
  }

  private resolvePrintBranch(header: object, mode: KalemliPrintMode): string {
    if (mode === 'warehouse') {
      return this.joinCodeAndName(
        this.getHeaderNumber(header, 'targetWarehouseNo', 'shippingWarehouseNo'),
        this.getHeaderText(header, 'targetWarehouse', 'muhatapDepoIsim')
      );
    }

    return this.joinCodeAndName(
      this.getHeaderNumber(header, 'warehouseNo', 'inputWarehouseNo', 'outputWarehouseNo'),
      this.getHeaderText(header, 'warehouseName', 'inputWarehouseName', 'outputWarehouseName')
    );
  }

  private buildPrintSections(header: object, mode: KalemliPrintMode) {
    const commonFields: DocumentPrintField[] = [
      { label: 'Evrak Seri', value: this.getHeaderText(header, 'documentSerie') },
      { label: 'Evrak Sira', value: this.getHeaderNumber(header, 'documentOrderNo') },
      { label: 'Evrak Tarihi', value: this.formatDate(this.resolvePrimaryDate(header)) },
      { label: 'Belge No', value: this.getHeaderText(header, 'documentNo', 'documentNumber'), optional: true }
    ];

    if (mode === 'company') {
      return [
        { title: 'Evrak Bilgileri', fields: commonFields },
        {
          title: 'Cari Bilgileri',
          fields: [
            { label: 'Cari', value: this.resolveCompanyTitle(header) || this.resolveCompanyPerson(header), wide: true },
            { label: 'Cari Kod', value: this.getHeaderText(header, 'customerCode'), optional: true },
            { label: 'Adres', value: this.getHeaderText(header, 'customerAddress'), wide: true, optional: true },
            { label: 'Teslim Eden', value: this.getHeaderText(header, 'deliverer'), optional: true },
            { label: 'Teslim Alan', value: this.getHeaderText(header, 'receiver'), optional: true },
            { label: 'Aciklama', value: this.getHeaderText(header, 'description', 'description1'), wide: true, optional: true }
          ]
        },
        {
          title: 'Toplamlar',
          fields: [
            { label: 'Kalem Sayisi', value: this.kalemCount() },
            { label: 'Toplam Miktar', value: this.formatNumber(this.getHeaderNumber(header, 'totalQuantity')) },
            {
              label: 'Net Kabul',
              value: this.formatNumber(this.getHeaderNumber(header, 'totalNetAcceptedQuantity')),
              optional: true
            },
            {
              label: 'Iade Farki',
              value: this.formatNumber(this.getHeaderNumber(header, 'totalReturnedQuantity')),
              optional: true
            },
            { label: 'Toplam Tutar', value: this.formatNumber(this.getHeaderNumber(header, 'totalAmount')) }
          ]
        }
      ];
    }

    if (mode === 'warehouse') {
      return [
        { title: 'Evrak Bilgileri', fields: commonFields },
        {
          title: 'Depo Bilgileri',
          fields: [
            {
              label: 'Tip',
              value: this.readRecordValue(header, 'isReturn') ? 'Depo Iadesi' : 'Depo Sevki'
            },
            {
              label: 'Cikis Depo',
              value: this.joinCodeAndName(
                this.getHeaderNumber(header, 'sourceWarehouseNo'),
                this.getHeaderText(header, 'sourceWarehouse')
              )
            },
            {
              label: 'Hedef Depo',
              value: this.joinCodeAndName(
                this.getHeaderNumber(header, 'targetWarehouseNo'),
                this.getHeaderText(header, 'targetWarehouse')
              )
            },
            {
              label: 'Siparis No',
              value: this.resolveWarehouseOrderNumbers(header),
              optional: true
            },
            { label: 'Plaka', value: this.getHeaderText(header, 'plaque'), optional: true },
            { label: 'Sofor', value: this.getHeaderText(header, 'driverNameSurname'), optional: true },
            { label: 'ETTN', value: this.getHeaderText(header, 'descriptionEttn'), wide: true, optional: true }
          ]
        },
        {
          title: 'Toplamlar',
          fields: [
            { label: 'Kalem Sayisi', value: this.kalemCount() },
            { label: 'Toplam Miktar', value: this.formatNumber(this.getHeaderNumber(header, 'totalQuantity')) },
            { label: 'Toplam Tutar', value: this.formatNumber(this.getHeaderNumber(header, 'totalAmount')) }
          ]
        }
      ];
    }

    return [
      { title: 'Evrak Bilgileri', fields: commonFields },
      {
        title: 'Depo Bilgileri',
        fields: [
          {
            label: 'Depo',
            value: this.joinCodeAndName(
              this.getHeaderNumber(header, 'warehouseNo'),
              this.getHeaderText(header, 'warehouseName')
            )
          },
          { label: 'Olusturan', value: this.getHeaderText(header, 'creator'), optional: true },
          { label: 'Onaylayan', value: this.getHeaderText(header, 'acceptor'), optional: true },
          { label: 'Is Emri', value: this.getHeaderText(header, 'workOrderExpenseCode'), optional: true },
          {
            label: 'Hareket Tipleri',
            value: Array.isArray(this.readRecordValue(header, 'movementTypes'))
              ? (this.readRecordValue(header, 'movementTypes') as unknown[]).join(', ')
              : '',
            optional: true
          },
          { label: 'Aciklama', value: this.getHeaderText(header, 'description'), wide: true, optional: true }
        ]
      },
      {
        title: 'Toplamlar',
        fields: [
          { label: 'Kalem Sayisi', value: this.kalemCount() },
          { label: 'Toplam Miktar', value: this.formatNumber(this.getHeaderNumber(header, 'totalQuantity')) },
          { label: 'Toplam Tutar', value: this.formatNumber(this.getHeaderNumber(header, 'totalAmount')) }
        ]
      }
    ];
  }

  private buildPrintColumns(mode: KalemliPrintMode): KalemliPrintColumn<DetailLine<TDetail>>[] {
    const lines = this.kalemler();
    const isCompanyReceiving =
      mode === 'company' && this.hasAnyLineNumber(lines, 'dispatchQuantity', 'physicalAcceptedQuantity');
    const columns: KalemliPrintColumn<DetailLine<TDetail>>[] = [
      {
        label: 'Sira',
        width: '9mm',
        align: 'center',
        value: (_kalem, index) => index + 1
      },
      {
        label: 'Urun Kodu',
        width: '22mm',
        value: (kalem) => this.getLineText(kalem, 'stockCode', 'stokKodu') || '-'
      },
      {
        label: 'Urun Adi',
        value: (kalem) => this.getLineText(kalem, 'stockName', 'stokIsmi') || '-'
      },
      {
        label: 'Birim',
        width: '13mm',
        align: 'center',
        value: (kalem) => this.getLineText(kalem, 'unitName') || '-'
      }
    ];

    if (isCompanyReceiving) {
      columns.push(
        {
          label: 'Irsaliye',
          width: '16mm',
          align: 'right',
          value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'dispatchQuantity', 'quantity'))
        },
        {
          label: 'Kabul',
          width: '16mm',
          align: 'right',
          value: (kalem) =>
            this.formatNumber(this.getLineNumber(kalem, 'physicalAcceptedQuantity', 'quantity'))
        }
      );

      if (this.hasAnyLineNonZero(lines, 'returnQuantity')) {
        columns.push({
          label: 'Iade',
          width: '14mm',
          align: 'right',
          value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'returnQuantity'))
        });
      }
    } else {
      columns.push({
        label: 'Miktar',
        width: '16mm',
        align: 'right',
        value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'quantity'))
      });

      if (this.hasAnyLineNonZero(lines, 'quantity2')) {
        columns.push({
          label: 'Miktar 2',
          width: '16mm',
          align: 'right',
          value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'quantity2'))
        });
      }
    }

    if (!isCompanyReceiving && this.hasAnyLineNonZero(lines, 'unitPrice', 'lineAmount')) {
      columns.push(
        {
          label: 'Fiyat',
          width: '17mm',
          align: 'right',
          value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'unitPrice'))
        },
        {
          label: 'Tutar',
          width: '19mm',
          align: 'right',
          value: (kalem) => this.formatNumber(this.getLineNumber(kalem, 'lineAmount'))
        }
      );
    }

    if (this.hasAnyLineText(lines, 'partyCode')) {
      columns.push({
        label: 'Parti',
        width: '17mm',
        value: (kalem) => this.getLineText(kalem, 'partyCode') || '-'
      });
    }

    if (this.hasAnyLineNonZero(lines, 'lotNo')) {
      columns.push({
        label: 'Lot',
        width: '12mm',
        align: 'center',
        value: (kalem) => this.getLineNumber(kalem, 'lotNo') ?? '-'
      });
    }

    if (this.hasAnyLineText(lines, 'description')) {
      columns.push({
        label: 'Aciklama',
        width: '26mm',
        value: (kalem) => this.getLineText(kalem, 'description') || '-'
      });
    }

    return columns;
  }

  private buildPrintSignatures(header: object, mode: KalemliPrintMode) {
    if (mode === 'stock') {
      return [
        { label: 'Olusturan', value: this.getHeaderText(header, 'creator') },
        { label: 'Onaylayan', value: this.getHeaderText(header, 'acceptor') }
      ];
    }

    if (mode === 'warehouse') {
      return [
        { label: 'Teslim Eden', value: this.getHeaderText(header, 'sourceWarehouse') },
        { label: 'Teslim Alan', value: this.getHeaderText(header, 'targetWarehouse') }
      ];
    }

    return [
      { label: 'Teslim Eden', value: this.getHeaderText(header, 'deliverer') },
      { label: 'Teslim Alan', value: this.getHeaderText(header, 'receiver') }
    ];
  }

  private hasAnyLineText(lines: readonly object[], ...keys: string[]): boolean {
    return lines.some((line) => !!this.getLineText(line, ...keys));
  }

  private hasAnyLineNumber(lines: readonly object[], ...keys: string[]): boolean {
    return lines.some((line) => this.getLineNumber(line, ...keys) !== null);
  }

  private hasAnyLineNonZero(lines: readonly object[], ...keys: string[]): boolean {
    return lines.some((line) => {
      const value = this.getLineNumber(line, ...keys);
      return value !== null && value !== 0;
    });
  }

  private joinCodeAndName(code: number | null, name: string): string {
    return joinTruthy([code === null ? '' : `${code}`, name], ' - ');
  }

  private getRecordText(record: object | null | undefined, ...keys: string[]): string {
    for (const key of keys) {
      const value = this.readRecordValue(record, key);

      if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized) {
          return normalized;
        }
      }
    }

    return '';
  }

  private getRecordNumber(record: object | null | undefined, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = this.readRecordValue(record, key);

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

  private readRecordValue(record: object | null | undefined, key: string): unknown {
    return record ? (record as Record<string, unknown>)[key] : undefined;
  }
}
