import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type { IManavKunyeTag, ManavCodeListItemDto, WarehouseLookupItemDto } from '@interfaces';

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
import { ManavKunyeEtiketPrintComponent } from './print/manav-kunye-etiket-print.component';

interface FeedbackState {
  tone: 'info' | 'error' | 'success';
  message: string;
}

export type ManavKunyeActiveTab = 'kunye-tags' | 'code-list';

export interface ManavCodeListPairRow {
  rowIndex: number;
  left: ManavCodeListItemDto;
  right: ManavCodeListItemDto | null;
}

export interface ManavCodeListGroupSection {
  groupName: string;
  totalCount: number;
  matchedCount: number;
  rows: ManavCodeListPairRow[];
}

const LIST_PERMISSION = 'kasa-islemleri.manav-kunye-etiket-yazdirma.list';
const GROUP_ORDER: Readonly<Record<string, number>> = {
  'MEYVE ÇEŞİTLERİ': 1,
  'SEBZE ÇEŞİTLERİ': 2,
  'DİĞER': 3
};

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
  protected readonly activeTab = signal<ManavKunyeActiveTab>('kunye-tags');

  // Existing Kunye Etiket Yazdirma state (untouched behavior)
  protected readonly tags = signal<IManavKunyeTag[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly feedback = signal<FeedbackState | null>(null);
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly selectedDate = signal('');
  protected readonly searchTerm = signal('');
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
  protected readonly currentWarehouseLabel = computed(() =>
    formatCurrentWarehouseLabel(this.authService.currentUser())
  );
  protected readonly selectedWarehouseLabel = computed(() => {
    if (!this.canUseWarehouseScope()) {
      return this.currentWarehouseLabel();
    }

    const warehouseNo = this.warehouseNo();
    if (!warehouseNo) {
      return 'Depo sec';
    }

    const warehouseName = this.selectedWarehouseName().trim();
    return warehouseName ? `${warehouseNo} - ${warehouseName}` : `Depo ${warehouseNo}`;
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

  // Additional Feature: Manav Kod Listesi (MNV / MNVSF) state
  protected readonly codeListItems = signal<ManavCodeListItemDto[]>([]);
  protected readonly isCodeListLoading = signal(false);
  protected readonly codeListLoaded = signal(false);
  protected readonly codeListFeedback = signal<FeedbackState | null>(null);
  protected readonly codeListPrintState = signal<'idle' | 'preparing'>('idle');
  protected readonly codeListSearchTerm = signal('');
  protected readonly codeListGroupFilter = signal<string>('ALL');

  protected readonly codeListFruitCount = computed(
    () => this.codeListItems().filter((item) => item.productGroup === 'MEYVE ÇEŞİTLERİ').length
  );
  protected readonly codeListVegetableCount = computed(
    () => this.codeListItems().filter((item) => item.productGroup === 'SEBZE ÇEŞİTLERİ').length
  );
  protected readonly codeListMatchedMnvsfCount = computed(
    () => this.codeListItems().filter((item) => item.mnvsfCode !== null && item.mnvsfCode !== undefined).length
  );
  protected readonly codeListDuplicateMnvsfCount = computed(
    () => this.codeListItems().filter((item) => (item.mnvsfMatchCount ?? 0) > 1).length
  );
  protected readonly codeListAvailableGroups = computed(() => {
    const groups = new Set<string>();
    for (const item of this.codeListItems()) {
      if (item.productGroup) {
        groups.add(item.productGroup);
      }
    }
    return Array.from(groups).sort(
      (a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99) || a.localeCompare(b, 'tr-TR')
    );
  });

  protected readonly filteredCodeListItems = computed(() => {
    const groupFilter = this.codeListGroupFilter();
    const term = this.normalizeSearch(this.codeListSearchTerm());

    return this.codeListItems().filter((item) => {
      if (groupFilter !== 'ALL' && item.productGroup !== groupFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        item.productName,
        item.productGroup,
        item.code,
        item.mnvsfCode ?? '',
        item.stockCode,
        item.mnvsfStockCode ?? ''
      ]
        .map((value) => this.normalizeSearch(value))
        .some((value) => value.includes(term));
    });
  });

  protected readonly codeListSections = computed<ManavCodeListGroupSection[]>(() =>
    this.buildCodeListSections(this.filteredCodeListItems())
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly aramaService = inject(AramaService);
  private activeTagsRequest: { unsubscribe(): void } | null = null;
  private activeWarehouseSearchRequest: { unsubscribe(): void } | null = null;
  private activeTagsRequestId = 0;

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

  protected setActiveTab(tab: ManavKunyeActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'code-list' && !this.codeListLoaded() && !this.isCodeListLoading()) {
      this.loadCodeList();
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
    this.warehouseSearchError.set('');
  }

  protected searchWarehouses(): void {
    if (!this.canUseWarehouseScope()) {
      return;
    }

    const query = this.warehouseSearchQuery().trim();
    const numericQuery = /^\d+$/.test(query) ? Number(query) : null;

    if (query.length === 1 && numericQuery === null) {
      this.warehouseSearchError.set('Depo aramasi icin en az 2 karakter veya depo no girin.');
      return;
    }

    this.activeWarehouseSearchRequest?.unsubscribe();
    this.activeWarehouseSearchRequest = null;
    this.warehouseSearchLoading.set(true);
    this.warehouseSearchError.set('');

    const request$ = !query
      ? this.aramaService.listAllWarehouses(100)
      : numericQuery !== null && numericQuery > 0
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
    this.warehouseSearchQuery.set(
      `${warehouse.warehouseNo} - ${warehouse.warehouseName || ''}`.trim()
    );
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
    this.clearLoadedTags();
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected loadTags(): void {
    this.cancelTagsRequest();

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
    const requestId = this.activeTagsRequestId;

    this.activeTagsRequest = this.kasaIslemleriService
      .getManavKunyeEtiketleri(warehouseNo, this.selectedDate() || null)
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
        next: (tags: IManavKunyeTag[]) => {
          if (requestId !== this.activeTagsRequestId) {
            return;
          }

          this.tags.set(tags ?? []);
          this.selection.clear();
          this.syncSelectionCount();

          if (!tags || tags.length === 0) {
            this.setFeedback('info', 'Secilen filtrelerle manav kunye etiketi bulunamadi.');
          }

        },
        error: () => {
          if (requestId !== this.activeTagsRequestId) {
            return;
          }

          this.tags.set([]);
          this.selection.clear();
          this.syncSelectionCount();
          this.setFeedback('error', 'Manav kunye etiketleri alinirken hata olustu.');
        }
      });
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

  protected loadCodeList(): void {
    if (!this.canListTags()) {
      this.codeListItems.set([]);
      this.codeListFeedback.set({
        tone: 'error',
        message: 'Manav kod listesini goruntuleme yetkiniz yok.'
      });
      return;
    }

    this.codeListFeedback.set(null);
    this.isCodeListLoading.set(true);

    this.kasaIslemleriService
      .getManavKodListesi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: ManavCodeListItemDto[]) => {
          const normalized = items ?? [];
          this.codeListItems.set(normalized);
          this.codeListLoaded.set(true);
          this.isCodeListLoading.set(false);

          if (normalized.length === 0) {
            this.codeListFeedback.set({
              tone: 'info',
              message: 'Aktif manav kisa kod kaydi bulunamadi.'
            });
          }
        },
        error: () => {
          this.codeListItems.set([]);
          this.isCodeListLoading.set(false);
          this.codeListFeedback.set({
            tone: 'error',
            message: 'Manav kod listesi alinirken hata olustu.'
          });
        }
      });
  }

  /**
   * MNVSF hucre metni. Karsiligi yoksa `emptyText` doner; ayni isimde birden fazla
   * MNVSF karti varsa ekranda kontrol icin "(!)" eklenir (baskida da gorunur ki kasada fark edilsin).
   */
  protected formatMnvsfCode(item: ManavCodeListItemDto, emptyText: string): string {
    if (item.mnvsfCode === null || item.mnvsfCode === undefined) {
      return emptyText;
    }

    return (item.mnvsfMatchCount ?? 0) > 1 ? `${item.mnvsfCode} (!)` : String(item.mnvsfCode);
  }

  protected onCodeListSearchChange(value: string): void {
    this.codeListSearchTerm.set(value);
  }

  protected onCodeListGroupFilterChange(value: string): void {
    this.codeListGroupFilter.set(value || 'ALL');
  }

  protected clearCodeListFilters(): void {
    this.codeListSearchTerm.set('');
    this.codeListGroupFilter.set('ALL');
  }

  protected async printCodeList(): Promise<void> {
    if (this.codeListPrintState() === 'preparing') {
      return;
    }

    if (!this.filteredCodeListItems().length) {
      this.codeListFeedback.set({
        tone: 'info',
        message: 'Yazdirilacak manav kod listesi kaydi bulunamadi.'
      });
      return;
    }

    this.codeListPrintState.set('preparing');
    const printRoot = document.querySelector<HTMLElement>(
      '#codeListPrintSection.manav-code-list-print-root'
    );

    if (!printRoot) {
      this.codeListPrintState.set('idle');
      this.codeListFeedback.set({
        tone: 'error',
        message: 'Manav kod listesi baski alani bulunamadi.'
      });
      return;
    }

    try {
      const started = await this.inPlacePrintService.print({
        styleId: 'manav-code-list-print-shell',
        styles: ManavKunyeEtiketYazdirmaListComponent.CODE_LIST_PRINT_STYLES,
        mount: { element: printRoot, documentClassName: 'manav-code-list-printing' },
        afterPrint: () => this.codeListPrintState.set('idle')
      });

      if (!started) {
        this.codeListPrintState.set('idle');
        this.codeListFeedback.set({
          tone: 'error',
          message: 'Manav kod listesi baskisi baslatilamadi.'
        });
      }
    } catch {
      this.codeListPrintState.set('idle');
      this.codeListFeedback.set({
        tone: 'error',
        message: 'Baski hazirlanamadi. Lutfen tarayicinin yazdirma iznini kontrol edip tekrar deneyin.'
      });
    }
  }

  private buildCodeListSections(
    items: readonly ManavCodeListItemDto[]
  ): ManavCodeListGroupSection[] {
    if (!items.length) {
      return [];
    }

    const grouped = new Map<string, ManavCodeListItemDto[]>();
    for (const item of items) {
      const groupName = item.productGroup || 'DİĞER';
      const bucket = grouped.get(groupName);
      if (bucket) {
        bucket.push(item);
      } else {
        grouped.set(groupName, [item]);
      }
    }

    const sortedGroupNames = Array.from(grouped.keys()).sort(
      (a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99) || a.localeCompare(b, 'tr-TR')
    );

    return sortedGroupNames.map((groupName) => {
      const groupItems = [...(grouped.get(groupName) ?? [])].sort((a, b) =>
        a.productName.localeCompare(b.productName, 'tr-TR')
      );
      const half = Math.ceil(groupItems.length / 2);
      const rows: ManavCodeListPairRow[] = [];

      for (let index = 0; index < half; index++) {
        rows.push({
          rowIndex: index,
          left: groupItems[index],
          right: groupItems[index + half] ?? null
        });
      }

      return {
        groupName,
        totalCount: groupItems.length,
        matchedCount: groupItems.filter(
          (item) => item.mnvsfCode !== null && item.mnvsfCode !== undefined
        ).length,
        rows
      };
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

  protected readonly trackByCodeListSection = (
    _index: number,
    section: ManavCodeListGroupSection
  ): string => section.groupName;

  protected readonly trackByCodeListPairRow = (
    _index: number,
    row: ManavCodeListPairRow
  ): string => `${row.left.stockCode}-${row.right?.stockCode ?? row.rowIndex}`;

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

  private static readonly CODE_LIST_PRINT_STYLES = `
    @page {
      size: A4 portrait;
      margin: 5mm;
    }

    @media print {
      html.manav-code-list-printing,
      body.manav-code-list-printing {
        width: auto !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body.manav-code-list-printing > :not(.manav-code-list-print-root) {
        display: none !important;
      }

      .app-sidebar,
      .topbar,
      .topbar-mobile,
      .sidebar-backdrop,
      .manav-kunye-screen,
      .kunye-print-root {
        display: none !important;
      }

      .manav-code-list-print-root {
        display: block !important;
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        background: #fff !important;
      }

      .code-sheet-print-page {
        width: 100%;
        max-width: 200mm;
        margin: 0 auto;
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
      }

      .code-sheet-group {
        margin-bottom: 2.2mm;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .code-sheet-group:last-child {
        margin-bottom: 0;
      }

      .code-sheet-group-banner {
        background: #111 !important;
        color: #fff !important;
        text-align: center;
        font-size: 8.5pt;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 0.9mm 2mm;
        border: 0.35mm solid #000;
        border-bottom: 0;
      }

      .code-sheet-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 0.35mm solid #000;
      }

      .code-sheet-table th,
      .code-sheet-table td {
        border: 0.25mm solid #000;
        padding: 0.45mm 1.2mm;
        font-size: 7.1pt;
        line-height: 1.12;
        color: #000;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .code-sheet-table thead th {
        background: #e5e7eb !important;
        font-size: 6.8pt;
        font-weight: 800;
        text-align: left;
      }

      .code-sheet-table th.col-code,
      .code-sheet-table td.col-code {
        width: 11mm;
        text-align: right;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .code-sheet-table th.col-mnvsf,
      .code-sheet-table td.col-mnvsf {
        width: 16mm;
        text-align: right;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .code-sheet-table td.col-name {
        font-weight: 800;
      }

      .code-sheet-table th.col-divider,
      .code-sheet-table td.col-divider {
        border-right: 0.5mm solid #000 !important;
      }
    }
  `;
}
