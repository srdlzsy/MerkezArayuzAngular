import { Directive, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { joinTruthy } from '@core/api/furpa-merkez-api.utils';
import { DocsContentPage } from '../../../models/docs.models';
import { ApiTaskDetailBase } from './api-task-detail.base';

interface SeriSiraPayload {
  seri: string;
  sira: number;
}

@Directive()
export abstract class KalemliTaskDetailBase<
  TDetail extends { header?: unknown; items?: readonly unknown[] | null }
>
  extends ApiTaskDetailBase<SeriSiraPayload, TDetail>
{
  protected abstract override readonly page: DocsContentPage;
  protected abstract override readonly screenTitle: string;
  protected readonly header = computed<any>(() => (this.detail() as any)?.header ?? null);
  protected readonly kalemler = computed<any[]>(() => ((this.detail() as any)?.items as any[] | null) ?? []);
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
    requestFactory: (seri: string, sira: number) => Observable<TDetail>,
    missingKeyMessage: string,
    loadErrorMessage: string
  ): void {
    this.runDetailRequest({
      validatePayload: (payload: SeriSiraPayload | null): payload is SeriSiraPayload =>
        !!payload?.seri && payload.sira !== null && payload.sira !== undefined,
      requestFactory: (payload: SeriSiraPayload) => requestFactory(payload.seri, payload.sira),
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

  protected readonly trackByKalem = (index: number, kalem: any): string =>
    [
      this.getLineText(kalem, 'stockCode', 'stokKodu'),
      this.getLineText(kalem, 'barcode', 'barkodu'),
      this.getLineText(kalem, 'stockName', 'stokIsmi'),
      this.getLineText(kalem, 'rowNo', 'lineNo'),
      `${index}`
    ]
      .filter((value): value is string => !!value?.trim())
      .join('-');

  protected getHeaderText(header: any, ...keys: string[]): string {
    return this.getRecordText(header, ...keys);
  }

  protected getHeaderNumber(header: any, ...keys: string[]): number | null {
    return this.getRecordNumber(header, ...keys);
  }

  protected getLineText(line: any, ...keys: string[]): string {
    return this.getRecordText(line, ...keys);
  }

  protected getLineNumber(line: any, ...keys: string[]): number | null {
    return this.getRecordNumber(line, ...keys);
  }

  protected resolvePrimaryDate(header: any): string {
    return this.getHeaderText(header, 'documentDate', 'movementDate', 'tarih');
  }

  protected resolveCompanyPerson(header: any): string {
    return (
      this.getHeaderText(header, 'customerDisplayName', 'muhatapAdSoyad', 'customerName') ||
      this.getHeaderText(header, 'customerTitle')
    );
  }

  protected resolveCompanyTitle(header: any): string {
    return (
      this.getHeaderText(header, 'customerDisplayName', 'muhatapFirmaUnvan') ||
      joinTruthy([
        this.getHeaderText(header, 'customerName'),
        this.getHeaderText(header, 'customerTitle')
      ])
    );
  }

  protected resolveCompanyStatus(header: any): string {
    const isClosed = header?.isClosed;

    if (typeof isClosed === 'boolean') {
      return isClosed ? 'Kapali' : 'Acik';
    }

    if (this.getHeaderText(header, 'documentNo', 'belgeNo')) {
      return 'Gonderildi';
    }

    const totalAmount = this.getHeaderNumber(header, 'totalAmount');
    return totalAmount !== null && totalAmount > 0 ? 'Hazir' : 'Acik';
  }

  protected resolveWarehouseStatus(header: any): string {
    return this.getHeaderNumber(header, 'shippingState') === 1 ? 'Tamamlandi' : 'Bekliyor';
  }

  protected resolveWarehouseName(header: any, side: 'source' | 'target'): string {
    return this.getHeaderText(
      header,
      side === 'source' ? 'sourceWarehouse' : 'targetWarehouse',
      'muhatapDepoIsim',
      'muhatapAdSoyad'
    );
  }

  protected resolveWarehouseNo(header: any, side: 'source' | 'target'): number | null {
    return this.getHeaderNumber(
      header,
      side === 'source' ? 'sourceWarehouseNo' : 'targetWarehouseNo',
      'muhatapDepoNo'
    );
  }

  protected resolveStockReceiptOwner(header: any): string {
    return this.getHeaderText(header, 'creator', 'acceptor', 'ekleyenAdSoyad');
  }

  private getRecordText(record: any, ...keys: string[]): string {
    for (const key of keys) {
      const value = record?.[key];

      if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized) {
          return normalized;
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
