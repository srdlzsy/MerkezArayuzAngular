import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { IFurpaWarehouseOrderListItemApiDto } from '@interfaces';
import { finalize } from 'rxjs';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import { ApiTaskListPageBase } from '../../../core/api-list-page/api-task-list-page.base';
import { AlinanDepoSiparisleriCreateComponent } from '../create/alinan-depo-siparisleri-create.component';
import { AlinanDepoSiparisleriDetailComponent } from '../detail/alinan-depo-siparisleri-detail.component';

@Component({
  selector: 'app-alinan-depo-siparisleri-list',
  standalone: true,
  imports: [CommonModule, ApiListTableComponent],
  templateUrl: '../../../core/api-list-page/api-list-page.template.html',
  styleUrl: './alinan-depo-siparisleri-list.component.scss'
})
export class AlinanDepoSiparisleriListComponent extends ApiTaskListPageBase<IFurpaWarehouseOrderListItemApiDto> {
  protected readonly page: DocsContentPage = DOCS_PAGES['alinan-depo-siparisleri'];
  protected readonly tableColumns = DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS;
  protected override readonly fitTableToWidth = true;
  protected readonly detailComponent = AlinanDepoSiparisleriDetailComponent;
  protected readonly createComponent = AlinanDepoSiparisleriCreateComponent;
  protected override readonly canCreate = false;
  protected readonly canBulkPrint = computed(() => this.hasTaskActionPermission('print'));
  protected readonly selectedDocumentKeys = signal<ReadonlySet<string>>(new Set());
  protected readonly bulkPrintLoading = signal(false);
  protected readonly printableDocumentKeys = computed(() => {
    const keys = new Set<string>();

    for (const row of this.rows()) {
      const documentKey = this.getDocumentKey(row);
      if (documentKey) {
        keys.add(documentKey);
      }
    }

    return [...keys];
  });
  protected readonly selectedPrintableDocumentKeys = computed(() => {
    const availableKeys = new Set(this.printableDocumentKeys());
    return [...this.selectedDocumentKeys()].filter((key) => availableKeys.has(key));
  });
  private readonly siparisIslemleriService = inject(SiparisIslemleriService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getAlinanDepoSiparisleri(zamanlama, warehouseNo);
  }

  protected override shouldShowTableSelection(): boolean {
    return this.canBulkPrint();
  }

  protected override getTableSelectedRowKeys(): ReadonlySet<string> {
    return this.selectedDocumentKeys();
  }

  protected override getTableSelectionKey(row: IFurpaWarehouseOrderListItemApiDto): string | null {
    return this.getDocumentKey(row);
  }

  protected override getTableSelectionActionLabel(): string {
    const count = this.selectedPrintableDocumentKeys().length;
    return count ? `Secilenleri Yazdir (${count})` : 'Secilenleri Yazdir';
  }

  protected override isTableSelectionActionDisabled(): boolean {
    const count = this.selectedPrintableDocumentKeys().length;
    return this.bulkPrintLoading() || count === 0 || count > 100;
  }

  protected override shouldShowTableSelectAllAction(): boolean {
    return this.canBulkPrint();
  }

  protected override getTableSelectAllActionLabel(): string {
    return `Bugunun Tumunu Yazdir (${this.printableDocumentKeys().length})`;
  }

  protected override isTableSelectAllActionDisabled(): boolean {
    const count = this.printableDocumentKeys().length;
    return this.bulkPrintLoading() || count === 0 || count > 100;
  }

  protected override isTableSelectionActionLoading(): boolean {
    return this.bulkPrintLoading();
  }

  protected override handleTableSelectionChanged(keys: ReadonlySet<string>): void {
    this.selectedDocumentKeys.set(new Set(keys));
  }

  protected override handleTableSelectionAction(): void {
    this.printOrders(this.selectedPrintableDocumentKeys());
  }

  protected override handleTableSelectAllAction(): void {
    this.printOrders(this.printableDocumentKeys());
  }

  private printOrders(documentKeys: readonly string[]): void {
    const distinctKeys = [...new Set(documentKeys.map((key) => key.trim()).filter(Boolean))];

    if (!distinctKeys.length) {
      this.errorMessage.set('Yazdirilacak en az bir siparis secin.');
      return;
    }

    if (distinctKeys.length > 100) {
      this.errorMessage.set('Tek seferde en fazla 100 siparis yazdirilabilir.');
      return;
    }

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      this.errorMessage.set('PDF onizleme penceresi acilamadi. Tarayicida acilir pencereye izin verin.');
      return;
    }

    previewWindow.document.title = 'Siparis PDF Hazirlaniyor';
    this.bulkPrintLoading.set(true);
    this.errorMessage.set(null);

    this.siparisIslemleriService
      .printReceivedWarehouseOrders({ documentKeys: distinctKeys })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.bulkPrintLoading.set(false))
      )
      .subscribe({
        next: (blob: Blob) => {
          if (!blob.size) {
            previewWindow.close();
            this.errorMessage.set('Yazdirilacak PDF bos dondu.');
            return;
          }

          const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
          const objectUrl = URL.createObjectURL(pdfBlob);
          previewWindow.location.replace(objectUrl);
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: (error: HttpErrorResponse) => {
          previewWindow.close();
          this.errorMessage.set(
            this.resolveHttpErrorMessage(error, 'Siparis PDF dosyasi hazirlanamadi.')
          );
        }
      });
  }

  private getDocumentKey(row: IFurpaWarehouseOrderListItemApiDto): string | null {
    return row.documentKey?.trim() || null;
  }
}
