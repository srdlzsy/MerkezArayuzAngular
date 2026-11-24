import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { IKunyeTag, WarehouseLookupItemDto } from '@interfaces';
import { finalize } from 'rxjs';

import { AramaService } from '../../../../../core/api/module-services/arama.service';
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
import { KunyeEtiketPrintComponent } from './print/kunye-etiket-print.component';

interface FeedbackState {
  tone: 'info' | 'error' | 'success';
  message: string;
}

const LIST_PERMISSION = 'kasa-islemleri.kunye-etiket-yazdirma.list';

@Component({
  selector: 'app-kunye-etiket-yazdirma-list',
  standalone: true,
  imports: [CommonModule, FormsModule, KunyeEtiketPrintComponent],
  templateUrl: './kunye-etiket-yazdirma-list.component.html',
  styleUrl: './kunye-etiket-yazdirma-list.component.scss'
})
export class KunyeEtiketYazdirmaListComponent implements OnInit {
  @ViewChild(KunyeEtiketPrintComponent) private readonly printComponent?: KunyeEtiketPrintComponent;
  protected readonly page: DocsContentPage = DOCS_PAGES['kunye-etiket-yazdirma'];
  protected readonly tags = signal<IKunyeTag[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly selectedDate = signal(this.getTodayDate());
  protected readonly warehouseNo = signal<number | null>(null);
  protected readonly selectedWarehouseName = signal('');
  protected readonly warehouseSearchQuery = signal('');
  protected readonly warehouseSearchResults = signal<WarehouseLookupItemDto[]>([]);
  protected readonly warehouseSearchLoading = signal(false);
  protected readonly warehouseSearchError = signal('');
  protected readonly canListTags = computed(() =>
    currentUserHasPermission(this.authService.currentUser(), LIST_PERMISSION)
  );
  protected readonly canUseWarehouseScope = computed(() =>
    currentUserCanUseAllWarehouses(
      this.authService.currentUser(),
      buildAllWarehousesPermissionCode(this.page.id, this.page.baseRouteOrFile)
    )
  );
  protected readonly selectedWarehouseLabel = computed(() => {
    if (!this.canUseWarehouseScope()) {
      return formatCurrentWarehouseLabel(this.authService.currentUser());
    }

    const warehouseNo = this.warehouseNo();
    return warehouseNo
      ? (this.selectedWarehouseName().trim() ? `${warehouseNo} - ${this.selectedWarehouseName().trim()}` : `Depo ${warehouseNo}`)
      : 'Depo sec';
  });
  protected readonly selection = new SelectionModel<IKunyeTag>(true, []);

  protected readonly selectedCount = signal(0);
  protected readonly selectedTags = signal<IKunyeTag[]>([]);

  private readonly destroyRef = inject(DestroyRef);
  private readonly aramaService = inject(AramaService);
  private activeWarehouseSearchRequest: { unsubscribe(): void } | null = null;
  private activeTagsRequest: { unsubscribe(): void } | null = null;
  private activeTagsRequestId = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly kasaIslemleriService: KasaIslemleriService,
    private readonly inPlacePrintService: InPlacePrintService
  ) {
    this.warehouseNo.set(this.authService.currentUser()?.depoNo ?? null);
  }

  ngOnInit(): void {
    if (this.canListTags() && this.getWarehouseNoForRequest()) {
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
    this.selectedWarehouseName.set('');
    this.clearLoadedTags();
  }

  protected onWarehouseSearchQueryChange(value: string): void {
    this.warehouseSearchQuery.set(value);
    if (!value.trim()) {
      this.warehouseSearchResults.set([]);
      this.warehouseSearchError.set('');
    }
  }

  protected searchWarehouses(): void {
    if (!this.canUseWarehouseScope()) {
      return;
    }

    const query = this.warehouseSearchQuery().trim();
    const numericQuery = /^\d+$/.test(query) ? Number(query) : undefined;

    if (query.length === 1 && numericQuery === undefined) {
      this.warehouseSearchError.set('Depo aramak icin en az 2 karakter veya depo no girin.');
      this.warehouseSearchResults.set([]);
      return;
    }

    this.activeWarehouseSearchRequest?.unsubscribe();
    this.warehouseSearchError.set('');
    this.warehouseSearchLoading.set(true);

    const request$ = !query
      ? this.aramaService.listAllWarehouses(100)
      : numericQuery !== undefined
        ? this.aramaService.searchWarehouse(undefined, 30, numericQuery)
        : this.aramaService.searchWarehouse(query, 30);

    this.activeWarehouseSearchRequest = request$
      .pipe(
        finalize(() => {
          this.activeWarehouseSearchRequest = null;
          this.warehouseSearchLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results: WarehouseLookupItemDto[]) => {
          const items = results ?? [];
          this.warehouseSearchResults.set(items);
          if (!items.length) {
            this.warehouseSearchError.set('Eslesen depo bulunamadi.');
          }
        },
        error: () => {
          this.warehouseSearchResults.set([]);
          this.warehouseSearchError.set('Depo aramasi sirasinda hata olustu.');
        }
      });
  }

  protected selectWarehouse(warehouse: WarehouseLookupItemDto): void {
    if (!this.canUseWarehouseScope()) {
      return;
    }

    this.warehouseNo.set(warehouse.warehouseNo);
    this.selectedWarehouseName.set(warehouse.warehouseName?.trim() || '');
    this.warehouseSearchQuery.set(`${warehouse.warehouseNo} - ${warehouse.warehouseName || ''}`.trim());
    this.warehouseSearchResults.set([]);
    this.warehouseSearchError.set('');
    this.loadTags();
  }

  protected clearWarehouseSearch(): void {
    this.warehouseSearchQuery.set('');
    this.warehouseSearchResults.set([]);
    this.warehouseSearchError.set('');
  }

  protected trackByWarehouse = (_index: number, item: WarehouseLookupItemDto): number =>
    item.warehouseNo;

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.loadTags();
  }

  protected loadTags(): void {
    this.cancelTagsRequest();

    if (!this.canListTags()) {
      this.tags.set([]);
      this.setFeedback('error', 'Kunye etiketlerini listeleme yetkiniz yok.');
      return;
    }

    const warehouseNo = this.getWarehouseNoForRequest();

    if (!warehouseNo) {
      this.tags.set([]);
      this.setFeedback('error', 'Kunye etiketleri icin depo secin.');
      return;
    }

    const selectedDate = this.selectedDate();

    if (!selectedDate) {
      this.setFeedback('error', 'Gecerli bir tarih secin.');
      return;
    }

    const formattedDate = this.formatDate(selectedDate);

    if (!formattedDate) {
      this.setFeedback('error', 'Tarih formati okunamadi.');
      return;
    }

    this.feedback.set(null);
    this.isLoading.set(true);
    const requestId = this.activeTagsRequestId;

    this.activeTagsRequest = this.kasaIslemleriService
      .getKunyeler(formattedDate, warehouseNo)
      .pipe(
        finalize(() => {
          if (requestId === this.activeTagsRequestId) {
            this.activeTagsRequest = null;
            this.isLoading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
      next: (tags: IKunyeTag[]) => {
        if (requestId !== this.activeTagsRequestId) {
          return;
        }

        this.tags.set(tags ?? []);
        this.selection.clear();
        this.syncSelectionCount();

        if (!tags || tags.length === 0) {
          this.setFeedback('info', 'Secilen tarihe ait etiket bulunamadi.');
        }

      },
      error: () => {
        if (requestId !== this.activeTagsRequestId) {
          return;
        }

        this.tags.set([]);
        this.selection.clear();
        this.syncSelectionCount();
        this.setFeedback('error', 'Veri alinirken hata olustu.');
      }
    });
  }

  protected masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.tags().forEach((row) => this.selection.select(row));
    this.syncSelectionCount();
  }

  protected isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.tags().length;
    return numSelected === numRows && numRows > 0;
  }

  protected toggleRow(tag: IKunyeTag): void {
    this.selection.toggle(tag);
    this.syncSelectionCount();
  }

  protected hasData(): boolean {
    return this.tags().length > 0;
  }

  protected async printSelected(): Promise<void> {
    if (this.printState() === 'preparing') {
      return;
    }

    if (!this.selectedCount()) {
      this.setFeedback('info', 'Yazdirilacak etiket bulunamadi.');
      return;
    }

    await this.printWithStylesheet('/assets/tagLabel.css');
  }

  protected readonly trackByTag = (_index: number, tag: IKunyeTag): string =>
    `${tag.takenTag}-${tag.productName}`;

  private setFeedback(tone: FeedbackState['tone'], message: string): void {
    this.feedback.set({ tone, message });
  }

  private syncSelectionCount(): void {
    this.selectedCount.set(this.selection.selected.length);
    this.selectedTags.set([...this.selection.selected]);
  }

  private clearLoadedTags(): void {
    this.cancelTagsRequest();
    this.tags.set([]);
    this.selection.clear();
    this.syncSelectionCount();
    this.feedback.set(null);
  }

  private cancelTagsRequest(): void {
    this.activeTagsRequestId += 1;
    this.activeTagsRequest?.unsubscribe();
    this.activeTagsRequest = null;
    this.isLoading.set(false);
  }

  private getWarehouseNoForRequest(): number | null {
    if (!this.canUseWarehouseScope()) {
      return this.authService.currentUser()?.depoNo ?? null;
    }

    return this.warehouseNo();
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day} 00:00:00`;
  }

  private async printWithStylesheet(stylesheetHref: string): Promise<void> {
    this.printState.set('preparing');
    const printRoot = document.querySelector<HTMLElement>('.kunye-print-root');

    if (!printRoot) {
      this.printState.set('idle');
      this.setFeedback('error', 'Kunye baski alani bulunamadi.');
      return;
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
        .kunye-print-hidden {
          display: none !important;
        }

        .content-wrapper {
          padding: 0 !important;
        }

        html,
        body,
        .kunye-print-root {
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        .kunye-print-root::-webkit-scrollbar,
        .print-sheet::-webkit-scrollbar,
        .label-wrapper::-webkit-scrollbar,
        .tag-label::-webkit-scrollbar {
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
      this.setFeedback('error', 'Kunye baskisi baslatilamadi. Lutfen tekrar deneyin.');
    }
  }
}
