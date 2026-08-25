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

    const printWindow = window.open('', '_blank', 'width=960,height=720');

    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.buildManavOrderPrintMarkup(order.header, order.items ?? []));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 150);
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
    <h1>Gelen Siparisler</h1>

    <section class="meta">
      <p>
        <strong>Siparis Tarihi:</strong>${this.escapeHtml(this.formatPrintDate(header.documentDate))}
        <span>${this.escapeHtml(this.resolveRequesterWarehouseLabel(header))}</span>
      </p>
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
        (item, index) => `<tr>
          <td class="line-no">${this.escapeHtml(this.formatPrintNumber(index + 1))}</td>
          <td class="barcode">${this.escapeHtml(this.resolveLineBarcode(item))}</td>
          <td class="product">${this.escapeHtml(item.stockName || '-')}</td>
          <td class="quantity">${this.escapeHtml(this.formatPrintNumber(item.quantity))}</td>
          <td class="unit">${this.escapeHtml(item.unitName || '-')}</td>
        </tr>`
      )
      .join('');

    return `<table>
      <colgroup>
        <col class="col-no">
        <col class="col-barcode">
        <col>
        <col class="col-quantity">
        <col class="col-unit">
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Barkod</th>
          <th>Urun Adi</th>
          <th class="quantity">Miktar</th>
          <th class="unit">Birim</th>
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

  private resolveLineBarcode(item: WarehouseOrderLineItemDto): string {
    const rawItem = item as WarehouseOrderLineItemDto & {
      barcode?: string | null;
      barkodu?: string | null;
      stockBarcode?: string | null;
    };

    return (
      rawItem.barcode?.trim() ||
      rawItem.barkodu?.trim() ||
      rawItem.stockBarcode?.trim() ||
      item.stockCode?.trim() ||
      '-'
    );
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
        font-family: "Times New Roman", Times, serif;
      }

      .sheet {
        width: 170mm;
        min-height: 257mm;
        margin: 0 auto;
        padding: 12mm 8mm;
        background: #fff;
      }

      h1 {
        margin: 0 0 16px;
        text-align: center;
        font-size: 29px;
        line-height: 1.1;
        font-weight: 700;
      }

      .meta {
        margin: 0 0 12px;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 700;
      }

      .meta p {
        margin: 0 0 3px;
      }

      .meta strong {
        margin-right: 2px;
      }

      .meta span {
        margin-left: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .col-no {
        width: 25px;
      }

      .col-barcode {
        width: 86px;
      }

      .col-quantity {
        width: 72px;
      }

      .col-unit {
        width: 64px;
      }

      th,
      td {
        border: 0;
        padding: 1px 7px;
        vertical-align: top;
        font-size: 13px;
        line-height: 1.12;
      }

      th {
        padding-bottom: 4px;
        text-align: left;
        font-size: 15px;
        font-weight: 700;
      }

      .line-no,
      .quantity {
        text-align: right;
      }

      .unit {
        text-align: center;
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
