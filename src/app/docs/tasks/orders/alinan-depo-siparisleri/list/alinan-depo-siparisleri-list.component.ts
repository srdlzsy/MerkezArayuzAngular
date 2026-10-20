import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  BakeryProductionReportDto,
  IFurpaWarehouseOrderListItemApiDto
} from '@interfaces';
import { finalize } from 'rxjs';

import { SiparisIslemleriService } from '../../../../../core/api/module-services/siparis-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { getCurrentWarehouseNo } from '../../../core/admin-warehouse.helpers';
import { ApiListTableComponent } from '../../../core/api-list-table/api-list-table.component';
import { DEPOLAR_ARASI_SIPARIS_LIST_COLUMNS } from '../../../core/api-list-table/api-list-table-column-presets';
import {
  ApiListQueryAction,
  ApiTaskListPageBase
} from '../../../core/api-list-page/api-task-list-page.base';
import { DocumentPrintService } from '../../../core/document-print/document-print.service';
import { AlinanDepoSiparisleriCreateComponent } from '../create/alinan-depo-siparisleri-create.component';
import { AlinanDepoSiparisleriDetailComponent } from '../detail/alinan-depo-siparisleri-detail.component';
import {
  BakeryProductionReportMode,
  buildBakeryProductionReportMarkup
} from './bakery-production-report-print';

const BAKERY_SOURCE_WAREHOUSE_NOS = new Set([55, 62]);

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
  protected readonly bakeryReportLoading = signal<BakeryProductionReportMode | null>(null);
  protected readonly canPrintBakeryReport = computed(() => {
    const warehouseNo = this.resolveBakerySourceWarehouseNo();
    return this.canBulkPrint() && warehouseNo !== null && BAKERY_SOURCE_WAREHOUSE_NOS.has(warehouseNo);
  });
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
  private readonly authService = inject(AuthService);
  private readonly documentPrintService = inject(DocumentPrintService);

  protected override fetchRows(zamanlama: string, warehouseNo?: number) {
    return this.siparisIslemleriService.getAlinanDepoSiparisleri(zamanlama, warehouseNo);
  }

  protected override shouldShowTableSelection(): boolean {
    return this.canBulkPrint();
  }

  protected override getAdditionalQueryActions(): readonly ApiListQueryAction[] {
    if (!this.canPrintBakeryReport()) {
      return [];
    }

    const loading = this.bakeryReportLoading();
    return [
      {
        key: 'bakery-summary',
        label: loading === 'summary' ? 'Hazirlaniyor...' : 'Unlu Toplu Rapor',
        iconClass: 'fa-solid fa-layer-group',
        title: 'Unlu uretim siparislerini urun ve grup bazinda yazdir'
      },
      {
        key: 'bakery-branch',
        label: loading === 'branch' ? 'Hazirlaniyor...' : 'Unlu Sube Detayli',
        iconClass: 'fa-solid fa-table-list',
        title: 'Unlu uretim siparislerini sube ve evrak bazinda yazdir'
      }
    ];
  }

  protected override isAdditionalQueryActionDisabled(_key: string): boolean {
    return this.isLoading() || this.bakeryReportLoading() !== null;
  }

  protected override handleAdditionalQueryAction(key: string): void {
    if (key === 'bakery-summary') {
      this.printBakeryProductionReport('summary');
    } else if (key === 'bakery-branch') {
      this.printBakeryProductionReport('branch');
    }
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

  private printBakeryProductionReport(mode: BakeryProductionReportMode): void {
    const reportDate = this.startDate().trim();
    const sourceWarehouseNo = this.resolveBakerySourceWarehouseNo();

    if (!reportDate || reportDate !== this.endDate().trim()) {
      this.errorMessage.set('Unlu uretim raporu icin baslangic ve bitis tarihini ayni gun secin.');
      return;
    }

    if (!sourceWarehouseNo || !BAKERY_SOURCE_WAREHOUSE_NOS.has(sourceWarehouseNo)) {
      this.errorMessage.set('Unlu uretim raporu icin kaynak depo 55 veya 62 secilmelidir.');
      return;
    }

    const previewWindow = window.open('', '_blank', 'width=960,height=720');
    if (!previewWindow) {
      this.errorMessage.set('Rapor penceresi acilamadi. Tarayicida acilir pencereye izin verin.');
      return;
    }

    previewWindow.document.title = 'Unlu Uretim Raporu Hazirlaniyor';
    previewWindow.document.body.textContent = 'Rapor hazirlaniyor...';
    this.bakeryReportLoading.set(mode);
    this.errorMessage.set(null);

    this.siparisIslemleriService
      .getBakeryProductionReport(reportDate, this.resolveListWarehouseNo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.bakeryReportLoading.set(null))
      )
      .subscribe({
        next: (report: BakeryProductionReportDto) => {
          if (!report.items.length) {
            previewWindow.close();
            this.errorMessage.set('Secilen tarihte unlu uretim siparisi bulunamadi.');
            return;
          }

          this.documentPrintService.printHtml({
            markup: buildBakeryProductionReportMarkup(report, mode),
            targetWindow: previewWindow
          });
        },
        error: (error: HttpErrorResponse) => {
          previewWindow.close();
          this.errorMessage.set(
            this.resolveHttpErrorMessage(error, 'Unlu uretim raporu hazirlanamadi.')
          );
        }
      });
  }

  private resolveBakerySourceWarehouseNo(): number | null {
    return this.resolveListWarehouseNo()
      ?? getCurrentWarehouseNo(this.authService.currentUser());
  }

  private getDocumentKey(row: IFurpaWarehouseOrderListItemApiDto): string | null {
    return row.documentKey?.trim() || null;
  }
}
