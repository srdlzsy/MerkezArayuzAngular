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
  private readonly manavWarehouseNo = 56;
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

  protected canPrintManavOrderForm(): boolean {
    const header = this.detail()?.header;

    return !!header && this.hasManavWarehouse(header);
  }

  protected printManavOrderForm(): void {
    const order = this.detail();

    if (!order?.header) {
      return;
    }

    this.documentPrintService.printHtml({
      markup: this.buildManavOrderPrintMarkup(order.header, order.items ?? [])
    });
  }

  private hasManavWarehouse(header: WarehouseOrderHeaderDto): boolean {
    return [
      header.warehouseNo,
      header.relatedWarehouseNo,
      header.inWarehouseNo,
      header.outWarehouseNo
    ].includes(this.manavWarehouseNo);
  }

  private buildManavOrderPrintMarkup(
    header: WarehouseOrderHeaderDto,
    items: WarehouseOrderLineItemDto[]
  ): string {
    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Manav Siparis Formu</title>
  <style>${this.buildManavOrderPrintStyles()}</style>
</head>
<body>
  <main class="sheet">
    <h1>Manav Siparis Formu</h1>

    <section class="meta">
      <p><strong>Siparis No:</strong> ${this.escapeHtml(this.orderIdentity())}</p>
      <p><strong>Siparis Tarihi:</strong> ${this.escapeHtml(this.formatPrintDate(header.documentDate))}</p>
      <p><strong>Siparis Veren Depo:</strong> ${this.escapeHtml(this.resolveRequesterWarehouseLabel(header))}</p>
      <p><strong>Siparis Verilen Depo:</strong> ${this.escapeHtml(this.resolveManavWarehouseLabel(header))}</p>
    </section>

    ${this.renderManavOrderRows(items)}
  </main>
</body>
</html>`;
  }

  private renderManavOrderRows(items: WarehouseOrderLineItemDto[]): string {
    if (!items.length) {
      return '<p class="empty">Siparis kalemi bulunamadi.</p>';
    }

    const rows = items
      .map(
        (item) => `<tr>
          <td class="product">${this.escapeHtml(item.stockName || '-')}</td>
          <td class="quantity">${this.escapeHtml(this.formatPrintNumber(item.quantity))}</td>
        </tr>`
      )
      .join('');

    return `<table>
      <colgroup>
        <col>
        <col class="col-quantity">
      </colgroup>
      <thead>
        <tr>
          <th>Urun Adi</th>
          <th>Miktar</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  private resolveRequesterWarehouseLabel(header: WarehouseOrderHeaderDto): string {
    if (header.outWarehouseNo === this.manavWarehouseNo) {
      return this.joinWarehouse(header.inWarehouseNo, header.inWarehouseName);
    }

    if (header.inWarehouseNo === this.manavWarehouseNo) {
      return this.joinWarehouse(header.outWarehouseNo, header.outWarehouseName);
    }

    if (header.relatedWarehouseNo && header.relatedWarehouseNo !== this.manavWarehouseNo) {
      return this.joinWarehouse(header.relatedWarehouseNo, header.relatedWarehouseName);
    }

    return this.joinWarehouse(header.warehouseNo, header.warehouseName);
  }

  private resolveManavWarehouseLabel(header: WarehouseOrderHeaderDto): string {
    const candidates = [
      { no: header.outWarehouseNo, name: header.outWarehouseName },
      { no: header.warehouseNo, name: header.warehouseName },
      { no: header.relatedWarehouseNo, name: header.relatedWarehouseName },
      { no: header.inWarehouseNo, name: header.inWarehouseName }
    ];
    const manavWarehouse = candidates.find((candidate) => candidate.no === this.manavWarehouseNo);

    return manavWarehouse?.name?.trim() || 'MANAV DEPO';
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

  private buildManavOrderPrintStyles(): string {
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
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .col-quantity {
        width: 36mm;
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
