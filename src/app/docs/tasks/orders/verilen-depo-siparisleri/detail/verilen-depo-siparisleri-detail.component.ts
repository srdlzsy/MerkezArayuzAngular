import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import type { IFurpaWarehouseOrderDetailApiDto, WarehouseOrderLineItemDto } from '@interfaces';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { SiparisTaskDetailBase } from '../../../core/api-detail-page/siparis-task-detail.base';
import { ExcelExportButtonComponent } from '../../../core/excel-export/excel-export-button.component';
import { exportRowsToExcel } from '../../../core/excel-export/excel-export.utils';

const CENTRAL_WAREHOUSE_NO = 50;

@Component({
  selector: 'app-verilen-depo-siparisleri-detail',
  standalone: true,
  imports: [CommonModule, ExcelExportButtonComponent],
  templateUrl: './verilen-depo-siparisleri-detail.component.html',
  styleUrl: './verilen-depo-siparisleri-detail.component.scss'
})
export class VerilenDepoSiparisleriDetailComponent extends SiparisTaskDetailBase<
  IFurpaWarehouseOrderDetailApiDto
> {
  protected readonly page: DocsContentPage = DOCS_PAGES['verilen-depo-siparisleri'];
  protected readonly screenTitle = 'Depo Siparis Detayi';
  protected override readonly printDocumentTitle = 'Verilen Depo Siparis Evraki';
  protected readonly isRemainingExporting = signal(false);
  protected readonly remainingExportErrorMessage = signal<string | null>(null);
  protected readonly isCentralWarehouseOrder = computed(
    () => this.detail()?.header.outWarehouseNo === CENTRAL_WAREHOUSE_NO
  );
  protected readonly remainingOrderItems = computed(() =>
    (this.detail()?.items ?? []).filter((item) => this.hasRemainingQuantity(item))
  );
  protected readonly remainingExportSummary = computed(() => {
    const count = this.remainingOrderItems().length;
    return count ? `${count} kalan kalem` : 'Kalan yok';
  });
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override loadDetail(): void {
    this.loadOrderDetailRequest(
      (seri: string, sira: number, warehouseNo?: number) =>
        this.siparisIslemleriService.getVerilenDepoSiparisDetay(
          seri,
          sira,
          warehouseNo
        ),
      'Detay icin gerekli siparis anahtari bulunamadi.',
      'Verilen depo siparisleri detayi yuklenemedi. Lutfen tekrar deneyin.'
    );
  }

  protected shouldMarkRemainingItem(item: WarehouseOrderLineItemDto): boolean {
    return this.isCentralWarehouseOrder() && this.hasRemainingQuantity(item);
  }

  protected getRemainingStatusLabel(item: WarehouseOrderLineItemDto): string {
    const deliveredQuantity = Number(item.deliveredQuantity ?? 0);

    return deliveredQuantity > 0 ? 'Yarim geldi' : 'Gelmedi';
  }

  protected async exportRemainingItems(): Promise<void> {
    const detail = this.detail();
    const rows = this.remainingOrderItems();

    if (!detail || !this.isCentralWarehouseOrder() || !rows.length || this.isRemainingExporting()) {
      return;
    }

    this.isRemainingExporting.set(true);
    this.remainingExportErrorMessage.set(null);

    try {
      await exportRowsToExcel({
        fileName: `Verilen Depo Siparisi Kalan Kalemler ${detail.header.documentSerie}-${detail.header.documentOrderNo}`,
        sheetName: 'Kalan Kalemler',
        rows,
        columns: [
          { label: 'Durum', value: (row) => this.getRemainingStatusLabel(row) },
          { label: 'Stok Kodu', value: 'stockCode' },
          { label: 'Stok Ismi', value: 'stockName' },
          { label: 'Birim', value: 'unitName' },
          { label: 'Siparis', value: 'quantity', type: 'number' },
          { label: 'Teslim', value: 'deliveredQuantity', type: 'number' },
          { label: 'Kalan', value: 'remainingQuantity', type: 'number' },
          { label: 'Fiyat', value: 'unitPrice', type: 'currency' },
          { label: 'Tutar', value: 'lineAmount', type: 'currency' },
          { label: 'Aciklama', value: 'description' }
        ]
      });
    } catch {
      this.remainingExportErrorMessage.set('Kalan kalemler Excel dosyasina aktarilamadi.');
    } finally {
      this.isRemainingExporting.set(false);
    }
  }

  private hasRemainingQuantity(item: WarehouseOrderLineItemDto): boolean {
    const remainingQuantity = Number(item.remainingQuantity ?? 0);
    return Number.isFinite(remainingQuantity) && remainingQuantity > 0;
  }
}
