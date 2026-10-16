import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import type {
  IFurpaWarehouseOrderDetailApiDto,
  WarehouseOrderHeaderDto,
  WarehouseOrderLineItemDto
} from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';
import { resolveWarehouseOrderPrintProfile } from './warehouse-order-print-profile';
import type { WarehouseOrderPrintProfile } from './warehouse-order-print-profile';

@Component({
  selector: 'app-alinan-depo-siparisleri-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alinan-depo-siparisleri-detail.component.html',
  styleUrl: './alinan-depo-siparisleri-detail.component.scss'
})
export class AlinanDepoSiparisleriDetailComponent extends SiparisTaskDetailBase<
  IFurpaWarehouseOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-depo-siparisleri'];
  protected readonly screenTitle = 'Alinan Depo Siparis Detayi';
  protected override readonly printDocumentTitle = 'Alinan Depo Siparis Evraki';
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getAlinanDepoSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Alinan depo siparisleri detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }

  protected canPrintSpecialWarehouseOrderForm(): boolean {
    const header = this.detail()?.header;

    return !!header && !!resolveWarehouseOrderPrintProfile(header);
  }

  protected specialWarehouseOrderPrintLabel(): string {
    const header = this.detail()?.header;

    return header
      ? resolveWarehouseOrderPrintProfile(header)?.buttonLabel ?? 'Siparis Formu'
      : 'Siparis Formu';
  }

  protected printSpecialWarehouseOrderForm(): void {
    const order = this.detail();
    const profile = order?.header
      ? resolveWarehouseOrderPrintProfile(order.header)
      : null;

    if (!order?.header || !profile) {
      return;
    }

    this.documentPrintService.printHtml({
      markup: this.buildWarehouseOrderPrintMarkup(order.header, order.items ?? [], profile)
    });
  }

  private buildWarehouseOrderPrintMarkup(
    header: WarehouseOrderHeaderDto,
    items: WarehouseOrderLineItemDto[],
    profile: WarehouseOrderPrintProfile
  ): string {
    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(profile.title)}</title>
  <style>${this.buildWarehouseOrderPrintStyles()}</style>
</head>
<body>
  <main class="sheet">
    <h1>${this.escapeHtml(profile.title)}</h1>

    <section class="meta">
      <p><strong>Siparis No:</strong> ${this.escapeHtml(this.orderIdentity())}</p>
      <p><strong>Siparis Tarihi:</strong> ${this.escapeHtml(this.formatPrintDate(header.documentDate))}</p>
      <p><strong>Siparis Veren Depo:</strong> ${this.escapeHtml(this.resolveRequesterWarehouseLabel(header, profile.warehouseNo))}</p>
      <p><strong>Siparis Verilen Depo:</strong> ${this.escapeHtml(this.resolveSpecialWarehouseLabel(header, profile))}</p>
    </section>

    ${this.renderWarehouseOrderRows(items)}
  </main>
</body>
</html>`;
  }

  private renderWarehouseOrderRows(items: WarehouseOrderLineItemDto[]): string {
    if (!items.length) {
      return '<p class="empty">Siparis kalemi bulunamadi.</p>';
    }

    const rows = items
      .map(
        (item, index) => `<tr>
          <td class="row-number">${index + 1}</td>
          <td class="product">${this.escapeHtml(item.stockName || '-')}</td>
          <td class="quantity">${this.escapeHtml(this.formatPrintNumber(item.quantity))}</td>
        </tr>`
      )
      .join('');

    return `<table>
      <colgroup>
        <col class="col-row-number">
        <col>
        <col class="col-quantity">
      </colgroup>
      <thead>
        <tr>
          <th class="row-number">#</th>
          <th>Urun Adi</th>
          <th>Miktar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  private resolveRequesterWarehouseLabel(
    header: WarehouseOrderHeaderDto,
    specialWarehouseNo: number
  ): string {
    if (header.outWarehouseNo === specialWarehouseNo) {
      return this.joinWarehouse(header.inWarehouseNo, header.inWarehouseName);
    }

    if (header.inWarehouseNo === specialWarehouseNo) {
      return this.joinWarehouse(header.outWarehouseNo, header.outWarehouseName);
    }

    if (header.relatedWarehouseNo && header.relatedWarehouseNo !== specialWarehouseNo) {
      return this.joinWarehouse(header.relatedWarehouseNo, header.relatedWarehouseName);
    }

    return this.joinWarehouse(header.warehouseNo, header.warehouseName);
  }

  private resolveSpecialWarehouseLabel(
    header: WarehouseOrderHeaderDto,
    profile: WarehouseOrderPrintProfile
  ): string {
    const candidates = [
      { no: header.outWarehouseNo, name: header.outWarehouseName },
      { no: header.warehouseNo, name: header.warehouseName },
      { no: header.relatedWarehouseNo, name: header.relatedWarehouseName },
      { no: header.inWarehouseNo, name: header.inWarehouseName }
    ];
    const specialWarehouse = candidates.find(
      (candidate) => candidate.no === profile.warehouseNo
    );

    return specialWarehouse?.name?.trim() || profile.fallbackWarehouseName;
  }

  private joinWarehouse(warehouseNo: number | null | undefined, warehouseName: string | null | undefined): string {
    const name = warehouseName?.trim();

    if (warehouseNo && name) {
      return `${warehouseNo} - ${name}`;
    }

    if (warehouseNo) {
      return `${warehouseNo}`;
    }

    return name || '-';
  }

  private formatPrintDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(date);
  }

  private formatPrintNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '-';
    }

    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  }

  private buildWarehouseOrderPrintStyles(): string {
    return `
      @page {
        size: A4 portrait;
        margin: 16mm 20mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 0;
        color: #000;
        background: #d9dadd;
        font-family: Arial, sans-serif;
        text-align: left;
      }

      .sheet {
        width: 170mm;
        min-height: 257mm;
        margin: 0 auto;
        padding: 12mm 8mm;
        background: #fff;
      }

      h1 {
        margin: 0 0 14px;
        text-align: left;
        font-size: 22px;
        line-height: 1.2;
        font-weight: 700;
      }

      .meta {
        margin: 0 0 16px;
        font-size: 13px;
        line-height: 1.45;
      }

      .meta p {
        margin: 0 0 2px;
      }

      .meta strong {
        margin-right: 2px;
      }

      table {
        width: 125mm;
        max-width: 100%;
        margin: 0;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .col-quantity {
        width: 26mm;
      }

      .col-row-number {
        width: 10mm;
      }

      th,
      td {
        padding: 5px 6px 5px 0;
        border: 0;
        border-bottom: 1px solid #d1d5db;
        vertical-align: middle;
        text-align: left;
        font-size: 13px;
        line-height: 1.25;
      }

      th {
        padding-top: 0;
        border-bottom: 1.5px solid #111;
        font-size: 13px;
        font-weight: 700;
      }

      .quantity {
        text-align: left;
      }

      .row-number {
        color: #4b5563;
        text-align: left;
        font-variant-numeric: tabular-nums;
      }

      .product {
        overflow-wrap: anywhere;
      }

      .empty {
        margin: 18px 0 0;
        font-size: 14px;
      }

      @media print {
        body {
          background: #fff;
        }

        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
        }
      }
    `;
  }
}
