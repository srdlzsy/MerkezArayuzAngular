import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IManavKunyeTag } from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import {
  buildAllWarehousesPermissionCode,
  currentUserCanUseAllWarehouses,
  currentUserHasPermission,
  formatCurrentWarehouseLabel
} from '../../../core/admin-warehouse.helpers';
import { InPlacePrintService } from '../../../core/document-print/in-place-print.service';
import { ManavKunyeEtiketPrintComponent } from './print/manav-kunye-etiket-print.component';

interface FeedbackState {
  tone: 'info' | 'error' | 'success';
  message: string;
}

const LIST_PERMISSION = 'kasa-islemleri.manav-kunye-etiket-yazdirma.list';

@Component({
  selector: 'app-manav-kunye-etiket-yazdirma-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ManavKunyeEtiketPrintComponent],
  templateUrl: './manav-kunye-etiket-yazdirma-list.component.html',
  styleUrl: './manav-kunye-etiket-yazdirma-list.component.scss'
})
export class ManavKunyeEtiketYazdirmaListComponent implements OnInit {
  @ViewChild(ManavKunyeEtiketPrintComponent)
  private readonly printComponent?: ManavKunyeEtiketPrintComponent;

  protected readonly page: DocsContentPage = DOCS_PAGES['manav-kunye-etiket-yazdirma'];
  protected readonly tags = signal<IManavKunyeTag[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly selectedDate = signal('');
  protected readonly searchTerm = signal('');
  protected readonly warehouseNo = signal<number | null>(null);
  protected readonly canListTags = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), LIST_PERMISSION)
  );
  protected readonly canUseWarehouseScope = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    )
  );
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly selectedWarehouseLabel = computed(() => {
    if (!this.canUseWarehouseScope()) {
      return this.currentWarehouseLabel();
    }

    const warehouseNo = this.warehouseNo();
    return warehouseNo ? `Depo ${warehouseNo}` : 'Depo sec';
  });
  protected readonly selection = new SelectionModel<IManavKunyeTag>(true, []);
  protected readonly selectedCount = signal(0);
  protected readonly selectedTags = signal<IManavKunyeTag[]>([]);
  protected readonly filteredTags = computed(() => {
    const term = this.normalizeSearch(this.searchTerm());

    if (!term) {
      return this.tags();
    }

    return this.tags().filter((tag) =>
      [
        tag.stockCode,
        tag.stockName,
        tag.barcode,
        tag.productName,
        tag.goodsGenus,
        tag.goodsType,
        tag.productUnit,
        tag.takenTag,
        tag.productionCity,
        tag.productionDistrict,
        tag.manufacturer,
        tag.buyer
      ]
        .map((value) => this.normalizeSearch(value))
        .some((value) => value.includes(term))
    );
  });

  constructor(
    private readonly authService: AuthService,
    private readonly kasaIslemleriService: KasaIslemleriService,
    private readonly inPlacePrintService: InPlacePrintService
  ) {
    this.warehouseNo.set(this.authService.currentUser()?.depoNo ?? null);
  }

  ngOnInit(): void {
    if (this.canListTags() && this.warehouseNo()) {
      this.loadTags();
    }
  }

  protected onWarehouseNoChange(value: number | string | null): void {
    if (!this.canUseWarehouseScope()) {
      this.warehouseNo.set(this.authService.currentUser()?.depoNo ?? null);
      return;
    }

    const numericValue = Number(value);
    this.warehouseNo.set(Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null);
  }

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected loadTags(): void {
    if (!this.canListTags()) {
      this.tags.set([]);
      this.setFeedback('error', 'Manav kunye etiketlerini listeleme yetkiniz yok.');
      return;
    }

    const warehouseNo = this.getWarehouseNoForRequest();

    if (!warehouseNo || warehouseNo < 1) {
      this.setFeedback('error', 'Manav kunye etiketleri icin depo no zorunludur.');
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);

    this.kasaIslemleriService
      .getManavKunyeEtiketleri(warehouseNo, this.selectedDate() || null)
      .subscribe({
        next: (tags: IManavKunyeTag[]) => {
          this.tags.set(tags ?? []);
          this.selection.clear();
          this.syncSelectionCount();

          if (!tags || tags.length === 0) {
            this.setFeedback('info', 'Secilen filtrelerle manav kunye etiketi bulunamadi.');
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.tags.set([]);
          this.selection.clear();
          this.syncSelectionCount();
          this.isLoading.set(false);
          this.setFeedback('error', 'Manav kunye etiketleri alinirken hata olustu.');
        }
      });
  }

  private getWarehouseNoForRequest(): number | null {
    if (!this.canUseWarehouseScope()) {
      return this.authService.currentUser()?.depoNo ?? null;
    }

    return this.warehouseNo();
  }

  protected clearDate(): void {
    this.selectedDate.set('');
    this.loadTags();
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  protected clearList(): void {
    this.tags.set([]);
    this.selection.clear();
    this.clearSearch();
    this.feedback.set(null);
    this.syncSelectionCount();
  }

  protected masterToggle(): void {
    const visibleTags = this.filteredTags();

    this.isAllSelected()
      ? visibleTags.forEach((row) => this.selection.deselect(row))
      : visibleTags.forEach((row) => this.selection.select(row));
    this.syncSelectionCount();
  }

  protected isAllSelected(): boolean {
    const visibleTags = this.filteredTags();
    const numSelected = visibleTags.filter((tag) => this.selection.isSelected(tag)).length;
    const numRows = visibleTags.length;
    return numSelected === numRows && numRows > 0;
  }

  protected toggleRow(tag: IManavKunyeTag): void {
    this.selection.toggle(tag);
    this.syncSelectionCount();
  }

  protected async printSelected(): Promise<void> {
    if (this.printState() === 'preparing') {
      return;
    }

    if (!this.selectedCount()) {
      this.setFeedback('info', 'Yazdirilacak etiket secilmedi.');
      return;
    }

    try {
      await this.printWithStylesheet('/assets/manav-kunye-a5.css');
    } catch {
      this.setFeedback(
        'error',
        'Baski hazirlanamadi. Lutfen tarayicinin yazdirma iznini ve baglantinizi kontrol edip tekrar deneyin.'
      );
    }
  }

  protected readonly trackByTag = (_index: number, tag: IManavKunyeTag): string =>
    `${tag.stockCode}-${tag.takenTag}`;

  private setFeedback(tone: FeedbackState['tone'], message: string): void {
    this.feedback.set({ tone, message });
  }

  private syncSelectionCount(): void {
    this.selectedCount.set(this.selection.selected.length);
    this.selectedTags.set(this.tags().filter((tag) => this.selection.isSelected(tag)));
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .trim();
  }

  private async printWithStylesheet(stylesheetHref: string): Promise<void> {
    this.printState.set('preparing');
    const printRoot = document.querySelector<HTMLElement>('#printSection.kunye-print-root');

    if (!printRoot) {
      this.printState.set('idle');
      throw new Error('Manav kunye baski alani bulunamadi.');
    }

    const started = await this.inPlacePrintService.print({
      styleId: 'kunye-print-shell',
      styles: `
      @media print {
        html.kunye-printing,
        body.kunye-printing {
          width: auto !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        body.kunye-printing > :not(.kunye-print-root) {
          display: none !important;
        }

        .app-sidebar,
        .topbar,
        .topbar-mobile,
        .sidebar-backdrop,
        .kunye-print-hidden,
        .manav-kunye-screen {
          display: none !important;
        }

        .content-wrapper {
          padding: 0 !important;
        }

        html,
        body,
        #printSection,
        .kunye-print-root {
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #printSection::-webkit-scrollbar,
        .kunye-print-root::-webkit-scrollbar,
        .manav-a4-sheet::-webkit-scrollbar,
        .manav-a5-page::-webkit-scrollbar,
        .price-side::-webkit-scrollbar,
        .kunye-card::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        .kunye-print-root {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          position: static !important;
          left: auto !important;
          top: auto !important;
          width: auto !important;
          height: auto !important;
          visibility: visible !important;
          overflow: hidden !important;
          pointer-events: auto !important;
        }
      }
    `,
      stylesheets: [{ id: 'kunye-print-style', href: stylesheetHref }],
      mount: { element: printRoot, documentClassName: 'kunye-printing' },
      beforePrint: () => this.printComponent?.prepareForPrint(),
      onBeforePrint: () => this.printComponent?.renderBarcodesNow(),
      afterPrint: () => this.printState.set('idle')
    });

    if (!started) {
      this.printState.set('idle');
      throw new Error('Manav kunye baskisi baslatilamadi.');
    }
  }
}
