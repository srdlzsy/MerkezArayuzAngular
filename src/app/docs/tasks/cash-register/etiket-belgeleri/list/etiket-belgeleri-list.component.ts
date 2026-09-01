import { Dialog } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, map, of } from 'rxjs';
import type {
  IEtiketBasimProduct,
  ILabelDocument,
  IProductPromotion
} from '@interfaces';

import { KasaIslemleriService } from '../../../../../core/api/module-services/kasa-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { FiyatetiketComponent } from '../a4-fiyat-etiketi/fiyatetiket.component';
import { A5DortluFiyatEtiketiComponent } from '../a5-dortlu-fiyat-etiketi/a5-dortlu-fiyat-etiketi.component';
import { A5IkiliFurparaKartEtiketiComponent } from '../a5-ikili-furpara-kart-etiketi/a5-ikili-furpara-kart-etiketi.component';
import { A5IkiliAyinEtiketiComponent } from '../a5-ikili-ayin-etiketi/a5-ikili-ayin-etiketi.component';
import { A5IkiliFiyatEtiketiComponent } from '../a5-ikili-fiyat-etiketi/a5-ikili-fiyat-etiketi.component';
import { A5TekliFiyatEtiketiComponent } from '../a5-tekli-fiyat-etiketi/a5-tekli-fiyat-etiketi.component';
import { AddLabel } from '../add-label/add-label';
import { renderBarcodeSvg, type BarcodeRenderOptions } from '../etiket-barcode.util';
import { ETIKET_TIPLERI, IEtiketTipiConfig } from '../etiket-belgeleri.config';
import { PrintChangePrice } from '../print-change-price/print-change-price';
import { RafEtiketA5Component } from '../raf-etiket-a5/raf-etiket-a5.component';
import { RafetiketiComponent } from '../raf-etiketi/rafetiketi.component';
import { A5IkiliAyinUrunuFiyatEtiketi } from '../a5-ikili-ayin-urunu-fiyat-etiketi/a5-ikili-ayin-urunu-fiyat-etiketi';

type PreviewMode = 'labels' | 'price-changes';

interface ActionFeedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

type ProductListFilter =
  | 'all'
  | 'promotions'
  | 'price-changes'
  | 'price-increased'
  | 'price-decreased'
  | 'missing-barcode';

@Component({
  selector: 'app-etiket-belgeleri-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FiyatetiketComponent,
    A5IkiliFiyatEtiketiComponent,
    A5DortluFiyatEtiketiComponent,
    A5IkiliFurparaKartEtiketiComponent,
    A5TekliFiyatEtiketiComponent,
    A5IkiliAyinUrunuFiyatEtiketi,
    RafetiketiComponent,
    RafEtiketA5Component,
    A5IkiliAyinEtiketiComponent,
    PrintChangePrice
  ],
  templateUrl: './etiket-belgeleri-list.component.html',
  styleUrl: './etiket-belgeleri-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EtiketBelgeleriListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['etiket-belgeleri'];
  protected readonly etiketTipleri = ETIKET_TIPLERI;
  protected readonly filtersForm = new FormGroup({
    labelType: new FormControl<string>(ETIKET_TIPLERI[0]?.etiketTipi ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    startDate: new FormControl<string>(this.getDefaultStartDate(), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    documentId: new FormControl<number | null>({
      value: null,
      disabled: true
    }),
    documentSearch: new FormControl<string>('', {
      nonNullable: true
    }),
    productSearch: new FormControl<string>('', {
      nonNullable: true
    })
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);
  private readonly authService = inject(AuthService);
  private readonly kasaIslemleriService = inject(KasaIslemleriService);

  private activeLoadId = 0;
  private productSearchDebounceId: number | undefined;
  private lastProductSearchQuery = '';
  private recentDocumentsWarehouseNo: number | null = null;
  private lastHandledDocumentId: number | null = null;
  private readonly productSearchTerm = signal('');
  private readonly currentPage = signal(1);
  protected readonly pageSize = signal(25);
  protected readonly readonlyPageSizeOptions = [25, 50, 100] as const;
  private readonly selectedLabelType = signal<string>(
    ETIKET_TIPLERI[0]?.etiketTipi ?? ''
  );
  protected readonly productTableFilter = signal<ProductListFilter>('all');

  protected readonly products = signal<IEtiketBasimProduct[]>([]);
  private readonly hiddenProductKeysState = signal<readonly string[]>([]);
  protected readonly recentDocuments = signal<ILabelDocument[]>([]);
  protected readonly feedback = signal<ActionFeedback | null>(null);
  protected readonly isLoadingProducts = signal(false);
  protected readonly isLoadingDocuments = signal(false);
  protected readonly previewMode = signal<PreviewMode>('labels');
  protected readonly lastLoadedSource = signal('Henuz veri yuklenmedi');
  protected readonly printState = signal<'idle' | 'preparing'>('idle');
  protected readonly isPrintPreviewMounted = signal(false);
  protected readonly printPreviewMode = signal<PreviewMode>('labels');
  protected readonly printPreviewProducts = signal<readonly IEtiketBasimProduct[]>([]);
  protected readonly printPreviewLabelConfig = signal<IEtiketTipiConfig | null>(null);

  protected readonly currentWarehouseNo = computed(
    () => this.authService.currentUser()?.depoNo ?? null
  );
  protected readonly branchLabel = computed(() => {
    const user = this.authService.currentUser();

    if (!user) {
      return 'Depo secilmedi';
    }

    if (user.depoIsmi && user.depoNo !== null) {
      return `${user.depoIsmi} ${user.depoNo}`;
    }

    return user.depoIsmi || (user.depoNo !== null ? `Depo ${user.depoNo}` : 'Depo secilmedi');
  });
  protected readonly selectedEtiket = computed<IEtiketTipiConfig | null>(() => {
    const labelType = this.selectedLabelType();
    return this.etiketTipleri.find((item) => item.etiketTipi === labelType) ?? null;
  });
  protected readonly hiddenProductKeys = computed(() => new Set(this.hiddenProductKeysState()));
  protected readonly activeProducts = computed(() =>
    this.products().filter((product) => !this.hiddenProductKeys().has(this.getProductKey(product)))
  );
  protected readonly hiddenProducts = computed(() =>
    this.products().filter((product) => this.hiddenProductKeys().has(this.getProductKey(product)))
  );
  protected readonly hiddenProductCount = computed(() => this.hiddenProducts().length);
  protected readonly promotionProducts = computed(() =>
    this.activeProducts().filter((product) => product.promotionPrice ? product.promotionPrice > 0 : false)
  );
  protected readonly priceChangeProducts = computed(() =>
    this.activeProducts().filter((product) => this.hasPriceChanged(product))
  );
  protected readonly priceIncreasedProducts = computed(() =>
    this.activeProducts().filter((product) => this.hasPriceIncreased(product))
  );
  protected readonly priceDecreasedProducts = computed(() =>
    this.activeProducts().filter((product) => this.hasPriceDecreased(product))
  );
  protected readonly missingBarcodeProducts = computed(() =>
    this.activeProducts().filter((product) => !product.barcode.trim())
  );
  protected readonly packageFactorProducts = computed(() =>
    this.activeProducts().filter((product) => !!product.packageFactor)
  );
  protected readonly previewProducts = computed(() => {
    const selectedEtiket = this.selectedEtiket();

    if (!selectedEtiket) {
      return [];
    }

    return selectedEtiket.veriKumesi === 'promosyonlu-urunler'
      ? this.promotionProducts()
      : this.activeProducts();
  });
  protected readonly labelPrintProducts = computed(() =>
    this.applyProductTools(this.previewProducts())
  );
  protected readonly priceChangePrintProducts = computed(() =>
    this.applyProductTools(this.priceChangeProducts())
  );
  protected readonly activePreviewCount = computed(() =>
    this.previewMode() === 'price-changes'
      ? this.priceChangePrintProducts().length
      : this.labelPrintProducts().length
  );
  protected readonly visibleProducts = computed(() => {
    return this.applyProductTools(this.activeProducts());
  });
  protected readonly hasActiveTableTools = computed(
    () => this.productTableFilter() !== 'all' || !!this.productSearchTerm()
  );
  protected readonly isBusy = computed(
    () =>
      this.isLoadingProducts() ||
      this.isLoadingDocuments() ||
      this.printState() === 'preparing'
  );
  protected readonly busyLabel = computed(() => {
    if (this.printState() === 'preparing') {
      return 'Baski hazirlaniyor';
    }

    if (this.isLoadingProducts()) {
      return 'Urunler yukleniyor';
    }

    if (this.isLoadingDocuments()) {
      return 'Belgeler yenileniyor';
    }

    return 'Hazir';
  });
  protected readonly canLoadDocuments = computed(
    () => this.currentWarehouseNo() !== null && this.currentWarehouseNo() !== undefined
  );
  protected readonly canLoadByDate = computed(
    () => !this.isBusy() && this.filtersForm.controls.startDate.valid
  );
  protected readonly canSearchDocument = computed(
    () => !this.isBusy() && !!this.filtersForm.controls.documentSearch.value.trim()
  );
  protected readonly canPrintLabels = computed(() => {
    const selectedEtiket = this.selectedEtiket();

    return !!selectedEtiket?.kullanimaHazir && this.labelPrintProducts().length > 0;
  });
  protected readonly canPrintPriceChanges = computed(
    () => this.priceChangePrintProducts().length > 0
  );
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.visibleProducts().length / this.pageSize()))
  );
  protected readonly currentPageSafe = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );
  protected readonly paginatedProducts = computed(() => {
    const page = this.currentPageSafe();
    const pageSize = this.pageSize();
    const startIndex = (page - 1) * pageSize;

    return this.visibleProducts().slice(startIndex, startIndex + pageSize);
  });
  protected readonly pageStartIndex = computed(() => {
    if (!this.visibleProducts().length) {
      return 0;
    }

    return (this.currentPageSafe() - 1) * this.pageSize() + 1;
  });
  protected readonly pageEndIndex = computed(() => {
    if (!this.visibleProducts().length) {
      return 0;
    }

    return Math.min(this.currentPageSafe() * this.pageSize(), this.visibleProducts().length);
  });
  protected readonly canGoToPreviousPage = computed(() => this.currentPageSafe() > 1);
  protected readonly canGoToNextPage = computed(
    () => this.currentPageSafe() < this.totalPages()
  );

  constructor() {
    effect(() => {
      const warehouseNo = this.currentWarehouseNo();

      if (warehouseNo === null || warehouseNo === undefined) {
        this.recentDocuments.set([]);
        this.recentDocumentsWarehouseNo = null;
        this.syncRecentDocumentControl([]);
        return;
      }

      if (this.recentDocumentsWarehouseNo === warehouseNo) {
        return;
      }

      this.loadRecentDocumentsInternal(warehouseNo);
    });

    this.filtersForm.controls.documentId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((documentId: number | null) => {
        if (typeof documentId !== 'number' || Number.isNaN(documentId)) {
          this.lastHandledDocumentId = null;
          return;
        }

        if (this.lastHandledDocumentId === documentId) {
          return;
        }

        this.lastHandledDocumentId = documentId;
        this.loadSelectedDocument();
      });

    this.filtersForm.controls.labelType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((labelType: string | null) => {
        const nextLabelType = labelType?.trim() || ETIKET_TIPLERI[0]?.etiketTipi || '';

        this.selectedLabelType.set(nextLabelType);
        this.previewMode.set('labels');
        this.currentPage.set(1);
      });

    this.filtersForm.controls.productSearch.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query: string | null) => this.queueProductSearch(query));

    this.destroyRef.onDestroy(() => {
      if (this.productSearchDebounceId !== undefined) {
        window.clearTimeout(this.productSearchDebounceId);
      }
    });
  }

  protected loadByDate(): void {
    const rawStartDate = this.filtersForm.controls.startDate.value.trim();

    if (!rawStartDate) {
      this.setFeedback('error', 'Tarih gerekli', 'Lutfen gecerli bir baslangic tarihi secin.');
      return;
    }

    const startDate = new Date(rawStartDate);
    const endDate = new Date();

    if (Number.isNaN(startDate.getTime())) {
      this.setFeedback('error', 'Gecersiz tarih', 'Secilen tarih okunamadi.');
      return;
    }

    if (startDate > endDate) {
      this.setFeedback(
        'error',
        'Tarih araligi gecersiz',
        'Baslangic tarihi su andan ileri olamaz.'
      );
      return;
    }

    const zamanlama = `aralik-${this.formatZamanlamaDate(startDate)}-${this.formatZamanlamaDate(endDate)}`;
    const sourceLabel = `Tarih araligi: ${this.formatReadableDate(startDate)} - ${this.formatReadableDate(endDate)}`;

    this.fetchProducts(this.kasaIslemleriService.getUrunEtiketleri(zamanlama), sourceLabel);
  }

  protected loadSelectedDocument(): void {
    const documentId = Number(this.filtersForm.controls.documentId.value);

    if (!documentId || Number.isNaN(documentId)) {
      this.setFeedback(
        'error',
        'Belge secilmedi',
        'Lutfen son belgeler listesinden bir belge secin.'
      );
      return;
    }

    this.fetchProducts(
      this.kasaIslemleriService.getEtiketBelgesi(documentId),
      `Belge yuklendi: #${documentId}`
    );
  }

  protected searchDocument(): void {
    const rawDocumentId = this.filtersForm.controls.documentSearch.value.trim();
    const documentId = Number(rawDocumentId);

    if (!rawDocumentId || !documentId || Number.isNaN(documentId)) {
      this.setFeedback(
        'error',
        'Belge no gerekli',
        'Lutfen aranacak belge numarasini girin.'
      );
      return;
    }

    this.fetchProducts(
      this.kasaIslemleriService.getEtiketBelgesi(documentId),
      `Belge arandi: #${documentId}`
    );
  }

  protected refreshRecentDocuments(): void {
    const warehouseNo = this.currentWarehouseNo();

    if (warehouseNo === null || warehouseNo === undefined) {
      this.setFeedback(
        'error',
        'Depo bilgisi eksik',
        'Kullaniciya ait depo numarasi bulunamadi.'
      );
      return;
    }

    this.loadRecentDocumentsInternal(warehouseNo, true);
  }

  protected clearList(): void {
    this.products.set([]);
    this.hiddenProductKeysState.set([]);
    this.resetPrintPreview();
    this.previewMode.set('labels');
    this.clearProductTableTools();
    this.currentPage.set(1);
    this.lastLoadedSource.set('Liste temizlendi');
    this.feedback.set({
      tone: 'info',
      title: 'Liste temizlendi',
      message: 'Yuklenen urunler ve aktif onizleme sifirlandi.'
    });
  }

  protected openAddProductDialog(): void {
    const dialogRef = this.dialog.open(AddLabel, {
      width: '720px',
      maxWidth: '92vw',
      autoFocus: false,
      restoreFocus: false,
      panelClass: ['docs-task-dialog-panel', 'etiket-add-dialog'],
      backdropClass: 'docs-task-dialog-backdrop'
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((product: IEtiketBasimProduct | undefined) => {
        if (!product) {
          return;
        }

        const key = this.getProductKey(product);
        const exists = this.products().some(
          (item) => this.getProductKey(item) === key
        );

        if (exists) {
          if (this.hiddenProductKeys().has(key)) {
            this.setProductHidden(key, false);
            this.currentPage.set(1);
            this.setFeedback(
              'success',
              'Urun geri alindi',
              `${this.getProductDisplayName(product)} tum etiket tiplerinin yazdirma listesine geri eklendi.`
            );
            return;
          }

          this.setFeedback(
            'info',
            'Urun zaten listede',
            `${this.getProductDisplayName(product)} listede bulundugu icin yeniden eklenmedi.`
          );
          return;
        }

        this.products.update((items) => [...items, product]);
        this.setProductHidden(key, false);
        this.previewMode.set('labels');
        this.clearProductTableTools();
        this.currentPage.set(this.totalPages());
        this.lastLoadedSource.set('Manuel urun ekleme');
        this.setFeedback(
          'success',
          'Urun eklendi',
          `${this.getProductDisplayName(product)} etiket listesine eklendi.`
        );
      });
  }

  protected removeProduct(product: IEtiketBasimProduct): void {
    const key = this.getProductKey(product);

    this.setProductHidden(key, true);
    this.currentPage.set(Math.min(this.currentPageSafe(), this.totalPages()));

    this.setFeedback(
      'info',
      'Urun yazdirmadan cikarildi',
      `${this.getProductDisplayName(product)} tum etiket tiplerinin yazdirma listesinden cikarildi.`
    );
  }

  protected restoreHiddenProducts(): void {
    if (!this.hiddenProductCount()) {
      return;
    }

    const count = this.hiddenProductCount();

    this.clearHiddenProducts();
    this.currentPage.set(1);
    this.setFeedback(
      'success',
      'Urunler geri alindi',
      `${count} urun tum etiket tiplerinin yazdirma listesine geri eklendi.`
    );
  }

  protected setPreviewMode(mode: PreviewMode): void {
    this.previewMode.set(mode);
  }

  protected getPriceTrendLabel(product: IEtiketBasimProduct): string {
    if (this.hasPriceIncreased(product)) {
      return 'Fiyat artti';
    }

    if (this.hasPriceDecreased(product)) {
      return 'Fiyat azaldi';
    }

    return 'Fiyat ayni';
  }

  protected getPriceTrendClass(product: IEtiketBasimProduct): string {
    if (this.hasPriceIncreased(product)) {
      return 'table-badge-price-up';
    }

    if (this.hasPriceDecreased(product)) {
      return 'table-badge-price-down';
    }

    return 'table-badge-neutral';
  }

  protected setProductTableFilter(filter: ProductListFilter): void {
    this.productTableFilter.set(filter);
    this.currentPage.set(1);
  }

  protected clearProductTableTools(): void {
    this.productTableFilter.set('all');
    this.lastProductSearchQuery = '';
    if (this.productSearchDebounceId !== undefined) {
      window.clearTimeout(this.productSearchDebounceId);
      this.productSearchDebounceId = undefined;
    }
    this.filtersForm.controls.productSearch.setValue('', { emitEvent: false });
    this.productSearchTerm.set('');
    this.currentPage.set(1);
  }

  protected setPageSize(size: number): void {
    if (!this.readonlyPageSizeOptions.includes(size as 25 | 50 | 100)) {
      return;
    }

    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  protected goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPageSafe() - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.set(Math.min(this.totalPages(), this.currentPageSafe() + 1));
  }

  protected printLabels(): void {
    if (this.printState() === 'preparing') {
      return;
    }

    const selectedEtiket = this.selectedEtiket();

    if (!selectedEtiket?.kullanimaHazir) {
      this.setFeedback(
        'error',
        'Sablon hazir degil',
        'Secilen etiket tipi icin ozel component henuz eklenmedi.'
      );
      return;
    }

    if (!this.labelPrintProducts().length) {
      this.setFeedback(
        'error',
        'Yazdirilacak urun yok',
        'Once etiket verisi yukleyin veya manuel urun ekleyin.'
      );
      return;
    }

    const productsToPrint = this.labelPrintProducts();

    this.previewMode.set('labels');
    this.printPreviewMode.set('labels');
    this.printPreviewLabelConfig.set(selectedEtiket);
    this.printPreviewProducts.set(productsToPrint);
    this.isPrintPreviewMounted.set(true);
    void this.printWithStylesheet(selectedEtiket.ozelCss);
  }

  protected printPriceChanges(): void {
    if (this.printState() === 'preparing') {
      return;
    }

    if (!this.priceChangePrintProducts().length) {
      this.setFeedback(
        'error',
        'Fiyat degisim listesi bos',
        'Eski fiyat ile yeni fiyat arasinda fark olan urun bulunamadi.'
      );
      return;
    }

    const productsToPrint = this.priceChangePrintProducts();

    this.previewMode.set('price-changes');
    this.printPreviewMode.set('price-changes');
    this.printPreviewLabelConfig.set(null);
    this.printPreviewProducts.set(productsToPrint);
    this.isPrintPreviewMounted.set(true);
    void this.printWithStylesheet('/assets/price-change-list-print.css');
  }

  protected readonly trackByProduct = (
    index: number,
    product: IEtiketBasimProduct
  ): string => this.getProductKey(product) || `row-${index}`;

  protected formatDocumentDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return this.formatReadableDate(parsedDate);
  }

  private fetchProducts(
    request$: ReturnType<KasaIslemleriService['getUrunEtiketleri']>,
    sourceLabel: string
  ): void {
    const loadId = ++this.activeLoadId;

    this.feedback.set(null);
    this.isLoadingProducts.set(true);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((products: IEtiketBasimProduct[]) => {
   
          return this.dedupeProducts(products);
        }),
        finalize(() => {
          if (loadId === this.activeLoadId) {
            this.isLoadingProducts.set(false);
          }
        })
      )
      .subscribe({
        next: ({ products, removedCount }: { products: IEtiketBasimProduct[]; removedCount: number }) => {
          if (loadId !== this.activeLoadId) {
            return;
          }

          this.products.set(products);
          this.hiddenProductKeysState.set([]);
          this.previewMode.set('labels');
          this.clearProductTableTools();
          this.currentPage.set(1);
          this.lastLoadedSource.set(sourceLabel);
          this.setFeedback(
            products.length ? 'success' : 'info',
            products.length ? 'Urunler yuklendi' : 'Kayit bulunamadi',
            products.length
              ? `${products.length} urun etiket listesine alindi.${removedCount ? ` ${removedCount} tekrar eden kayit ayiklandi.` : ''}`
              : 'Secilen kaynaktan yazdirilabilir urun kaydi donmedi.'
          );
          this.attachPromotions(products, loadId);
        },
        error: () => {
          if (loadId !== this.activeLoadId) {
            return;
          }

          this.products.set([]);
          this.hiddenProductKeysState.set([]);
          this.setFeedback(
            'error',
            'Veri getirilemedi',
            'Etiket verisi alinirken bir hata olustu. Lutfen tekrar deneyin.'
          );
        }
      });
  }

  private attachPromotions(products: readonly IEtiketBasimProduct[], loadId: number): void {
    const promotionCandidates = products.filter((product) => product.pluNo > 0);

    if (!promotionCandidates.length) {
      return;
    }

    promotionCandidates.forEach((product) => {
      this.kasaIslemleriService
        .getEtiketPromosyonlari(product.pluNo)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError(() => of([] as IProductPromotion[]))
        )
        .subscribe((promotions: IProductPromotion[]) => {
          if (loadId !== this.activeLoadId || !promotions.length) {
            return;
          }

          const promotion = promotions[0];
          const key = this.getProductKey(product);

          this.products.update((items) =>
            items.map((item) =>
              this.getProductKey(item) === key
                ? {
                    ...item,
                    promotionPrice: this.calculatePromotionPrice(item.price, promotion),
                    expirationDate: promotion.expirationDate || item.expirationDate
                  }
                : item
            )
          );
        });
    });
  }

  private loadRecentDocumentsInternal(
    warehouseNo: number,
    forceReload = false
  ): void {
    if (!forceReload && this.recentDocumentsWarehouseNo === warehouseNo) {
      return;
    }

    this.recentDocumentsWarehouseNo = warehouseNo;
    this.isLoadingDocuments.set(true);

    this.kasaIslemleriService
      .getEklenenSonOnEtiketBelgesi(warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoadingDocuments.set(false);
        })
      )
      .subscribe({
        next: (documents: ILabelDocument[]) => {
        

          this.recentDocuments.set(documents);
          this.syncRecentDocumentControl(documents);
        },
        error: () => {
          this.recentDocuments.set([]);
          this.syncRecentDocumentControl([]);
          this.setFeedback(
            'error',
            'Belgeler yuklenemedi',
            'Son etiket belgeleri su anda getirilemedi.'
          );
        }
      });
  }

  private calculatePromotionPrice(
    currentPrice: number,
    promotion: IProductPromotion
  ): number {
    if (promotion.discountAmount > 0) {
      return Math.max(0, currentPrice - promotion.discountAmount);
    }

    if (promotion.discountRate > 0) {
      return Math.max(0, currentPrice - currentPrice * (promotion.discountRate / 100));
    }

    return 0;
  }

  private getProductKey(product: IEtiketBasimProduct): string {
    return [
      product.productCode,
      product.barcode,
      product.pluNo,
      product.productName,
      product.unitName,
      product.alternativeUnitName,
      product.unitPriceFactor,
      product.packageFactor
    ].map((value) => `${value ?? ''}`.trim()).join('|');
  }

  private getProductDisplayName(product: IEtiketBasimProduct): string {
    return product.productName?.trim() || product.productCode?.trim() || product.barcode?.trim() || 'Urun';
  }

  protected getProductUnitLabel(product: IEtiketBasimProduct): string {
    const baseUnit = product.unitName?.trim() || '-';
    const alternativeUnit = product.alternativeUnitName?.trim();
    const unitPriceFactor = Number(product.unitPriceFactor);
    const factorLabel = Number.isFinite(unitPriceFactor) && unitPriceFactor > 0
      ? `${unitPriceFactor.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL/${alternativeUnit || baseUnit}`
      : '';
    const packageFactor = product.packageFactor?.trim();

    return [
      baseUnit,
      alternativeUnit && alternativeUnit !== baseUnit ? alternativeUnit : '',
      factorLabel,
      packageFactor ? `Koli ${packageFactor}` : ''
    ].filter(Boolean).join(' / ') || '-';
  }

  protected getAlternativeBarcodeLabel(product: IEtiketBasimProduct): string {
    const primaryBarcode = product.barcode?.trim();
    const barcodes = (product.barcodes ?? [])
      .map((barcode) => barcode.trim())
      .filter((barcode) => barcode && barcode !== primaryBarcode);

    return barcodes.length ? `Diger: ${barcodes.join(', ')}` : '';
  }

  private setProductHidden(key: string, hidden: boolean): void {
    if (!key) {
      return;
    }

    this.hiddenProductKeysState.update((keys) => {
      const nextKeys = new Set(keys);

      if (hidden) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }

      return [...nextKeys];
    });
  }

  private clearHiddenProducts(): void {
    this.hiddenProductKeysState.set([]);
  }

  private applyProductTools(products: readonly IEtiketBasimProduct[]): IEtiketBasimProduct[] {
    const filter = this.productTableFilter();
    const query = this.productSearchTerm();
    let items = [...products];

    if (filter === 'promotions') {
      items = items.filter((product) => product.promotionPrice ? product.promotionPrice > 0 : false);
    } else if (filter === 'price-changes') {
      items = items.filter((product) => this.hasPriceChanged(product));
    } else if (filter === 'price-increased') {
      items = items.filter((product) => this.hasPriceIncreased(product));
    } else if (filter === 'price-decreased') {
      items = items.filter((product) => this.hasPriceDecreased(product));
    } else if (filter === 'missing-barcode') {
      items = items.filter((product) => !product.barcode.trim());
    }

    if (!query) {
      return items;
    }

    return items.filter((product) =>
      [
        product.productCode,
        product.productName,
        product.barcode,
        ...(product.barcodes ?? []),
        product.origin,
        product.priceChangeDate,
        product.packageFactor,
        product.unitName,
        product.alternativeUnitName
      ].some((value) => `${value ?? ''}`.toLocaleLowerCase('tr-TR').includes(query))
    );
  }

  private queueProductSearch(query: string | null): void {
    const nextQuery = query?.trim().toLocaleLowerCase('tr-TR') ?? '';

    if (this.productSearchDebounceId !== undefined) {
      window.clearTimeout(this.productSearchDebounceId);
    }

    this.productSearchDebounceId = window.setTimeout(() => {
      if (this.lastProductSearchQuery === nextQuery) {
        return;
      }

      this.lastProductSearchQuery = nextQuery;
      this.productSearchTerm.set(nextQuery);
      this.currentPage.set(1);
    }, 120);
  }

  private hasPriceChanged(product: IEtiketBasimProduct): boolean {
    return this.hasComparablePrice(product) && product.oldPrice !== product.price;
  }

  private hasPriceIncreased(product: IEtiketBasimProduct): boolean {
    return this.hasComparablePrice(product) && product.price > product.oldPrice;
  }

  private hasPriceDecreased(product: IEtiketBasimProduct): boolean {
    return this.hasComparablePrice(product) && product.price < product.oldPrice;
  }

  private hasComparablePrice(product: IEtiketBasimProduct): boolean {
    return Number.isFinite(product.oldPrice) && product.oldPrice > 0 && Number.isFinite(product.price);
  }

  private dedupeProducts(products: readonly IEtiketBasimProduct[]): {
    products: IEtiketBasimProduct[];
    removedCount: number;
  } {
    const seenKeys = new Set<string>();
    const uniqueProducts: IEtiketBasimProduct[] = [];
    let removedCount = 0;

    products.forEach((product) => {
      const key = this.getProductKey(product);

      if (seenKeys.has(key)) {
        removedCount += 1;
        return;
      }

      seenKeys.add(key);
      uniqueProducts.push(product);
    });

    return {
      products: uniqueProducts,
      removedCount
    };
  }

  private syncRecentDocumentControl(documents: readonly ILabelDocument[]): void {
    const documentControl = this.filtersForm.controls.documentId;
    const currentValue = documentControl.getRawValue();

    if (!documents.length) {
      this.lastHandledDocumentId = null;
      documentControl.setValue(null, { emitEvent: false });
      documentControl.disable({ emitEvent: false });
      return;
    }

    if (documentControl.disabled) {
      documentControl.enable({ emitEvent: false });
    }

    const hasCurrentSelection = documents.some((document) => document.documentId === currentValue);

    if (!hasCurrentSelection) {
      this.lastHandledDocumentId = null;
      documentControl.setValue(null, { emitEvent: false });
    }
  }

  private async printWithStylesheet(stylesheetHref: string): Promise<void> {
    this.printState.set('preparing');

    const existingLink = document.getElementById('etiket-belgeleri-print-style');
    const existingStyle = document.getElementById('etiket-belgeleri-print-shell');

    existingLink?.remove();
    existingStyle?.remove();

    const link = document.createElement('link');
    link.id = 'etiket-belgeleri-print-style';
    link.rel = 'stylesheet';
    link.href = `${stylesheetHref}${stylesheetHref.includes('?') ? '&' : '?'}v=${Date.now()}`;

    const shellStyle = document.createElement('style');
    shellStyle.id = 'etiket-belgeleri-print-shell';
    shellStyle.textContent = `
      @media print {
        html,
        body,
        app-root,
        .admin-layout,
        .main-content,
        .content-wrapper,
        .label-workspace,
        .preview-shell-hidden,
        .etiket-print-root,
        .preview-stage,
        app-a5-dortlu-fiyat-etiketi,
        app-a5-ikili-ayin-urunu-fiyat-etiketi {
          width: auto !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #fff !important;
          color: #000 !important;
        }

        *,
        *::before,
        *::after {
          scrollbar-width: none !important;
        }

        *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        app-root,
        .admin-layout,
        .main-content,
        .content-wrapper,
        .label-workspace {
          display: block !important;
        }

        .app-sidebar,
        .topbar,
        .topbar-mobile,
        .sidebar-backdrop,
        .etiket-print-hidden {
          display: none !important;
        }

        .preview-shell-hidden,
        .etiket-print-root {
          position: static !important;
          inset: auto !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .preview-stage {
          border: 0 !important;
          box-shadow: none !important;
        }
      }
    `;

    let cleanedUp = false;
    let cleanupTimer: number | undefined;

    const cleanup = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      if (cleanupTimer !== undefined) {
        window.clearTimeout(cleanupTimer);
      }
      link.remove();
      shellStyle.remove();
      this.printState.set('idle');
      this.resetPrintPreview();
      window.removeEventListener('afterprint', cleanup);
    };

    document.head.appendChild(shellStyle);
    window.addEventListener('afterprint', cleanup);

    try {
      await this.appendPrintStylesheet(link);
      await this.waitForFonts();
      await this.waitForNextPaint();
      await this.renderPrintBarcodes();

      cleanupTimer = window.setTimeout(cleanup, 60_000);
      window.print();
    } catch {
      cleanup();
      this.setFeedback(
        'error',
        'Baski hazirlanamadi',
        'Etiket baski stili yuklenemedi. Lutfen tekrar deneyin.'
      );
    }
  }

  private appendPrintStylesheet(link: HTMLLinkElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(`Baski stili zamaninda yuklenemedi: ${link.href}`));
      }, 5_000);

      link.addEventListener(
        'load',
        () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
        { once: true }
      );
      link.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeoutId);
          reject(new Error(`Baski stili yuklenemedi: ${link.href}`));
        },
        { once: true }
      );

      document.head.appendChild(link);
    });
  }

  private async waitForFonts(): Promise<void> {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }

  private async renderPrintBarcodes(): Promise<void> {
    const svgs = [
      ...document.querySelectorAll<SVGSVGElement>('.etiket-print-root svg[data-code]')
    ];
    const chunkSize = 40;

    for (let index = 0; index < svgs.length; index += chunkSize) {
      svgs.slice(index, index + chunkSize).forEach((svg) => {
        renderBarcodeSvg(
          svg,
          svg.getAttribute('data-code'),
          this.getPrintBarcodeOptions(svg)
        );
      });

      await this.waitForNextPaint();
    }
  }

  private getPrintBarcodeOptions(svg: SVGSVGElement): BarcodeRenderOptions {
    if (svg.classList.contains('a5-quad-barcode')) {
      return {
        barWidth: 0.82,
        barHeight: 21,
        fontSize: 7,
        marginX: 0,
        marginTop: 0
      };
    }

    if (svg.classList.contains('a5-single-barcode')) {
      return {
        barWidth: 1,
        barHeight: 35,
        fontSize: 13,
        marginX: 0,
        marginTop: 0
      };
    }

    if (svg.classList.contains('a5-card-barcode')) {
      return {
        barWidth: 1,
        barHeight: 32,
        fontSize: 12,
        marginX: 0,
        marginTop: 0
      };
    }

    if (svg.classList.contains('a5-advantage-product-barcode')) {
      return {
        barWidth: 1,
        barHeight: 30,
        fontSize: 11,
        marginX: 0,
        marginTop: 0
      };
    }

    return {
      barWidth: 1,
      barHeight: 35,
      fontSize: 13,
      marginX: 0,
      marginTop: 0
    };
  }

  private resetPrintPreview(): void {
    this.isPrintPreviewMounted.set(false);
    this.printPreviewProducts.set([]);
    this.printPreviewLabelConfig.set(null);
  }

  private setFeedback(
    tone: ActionFeedback['tone'],
    title: string,
    message: string
  ): void {
    this.feedback.set({
      tone,
      title,
      message
    });
  }

  private formatZamanlamaDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
  }

  private formatReadableDate(date: Date): string {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  private getDefaultStartDate(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
}
