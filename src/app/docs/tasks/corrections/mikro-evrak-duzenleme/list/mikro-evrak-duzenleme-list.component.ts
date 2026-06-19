import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  CustomerMovementDocumentDto,
  CustomerMovementDocumentLineDto,
  CustomerMovementDocumentLookupHttpRequest,
  CustomerMovementDocumentUpdateResponse,
  StockCardDetailDto,
  StockCardListItemDto,
  StockCardPatchHttpRequest,
  StockCardUpdateResponse,
  StockMovementDocumentDto,
  StockMovementDocumentLineDto,
  StockMovementDocumentLookupHttpRequest,
  StockMovementDocumentUpdateResponse,
  UpdateCustomerMovementDocumentHttpRequest,
  UpdateStockMovementDocumentHttpRequest
} from '@interfaces';

import { DuzeltmeIslemleriService } from '../../../../../core/api/module-services/duzeltme-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type EditorTab = 'stock-card' | 'stock-movement' | 'customer-movement';
type BusyAction =
  | 'stock-search'
  | 'stock-detail'
  | 'stock-save'
  | 'movement-load'
  | 'movement-save'
  | 'customer-load'
  | 'customer-save';
type EditableRecord = Record<string, unknown>;

interface Feedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  wide?: boolean;
}

const STOCK_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
  { key: 'name', label: 'Stok Adı', wide: true },
  { key: 'shortName', label: 'Kısa Ad' },
  { key: 'foreignName', label: 'Yabancı Ad' },
  { key: 'supplierCode', label: 'Tedarikçi Kodu' },
  { key: 'unit1Name', label: 'Birim 1' },
  { key: 'unit2Name', label: 'Birim 2' },
  { key: 'unit3Name', label: 'Birim 3' },
  { key: 'unit4Name', label: 'Birim 4' },
  { key: 'categoryCode', label: 'Kategori' },
  { key: 'mainGroupCode', label: 'Ana Grup' },
  { key: 'subGroupCode', label: 'Alt Grup' },
  { key: 'brandCode', label: 'Marka' },
  { key: 'sectorCode', label: 'Sektör' },
  { key: 'rayonCode', label: 'Reyon' },
  { key: 'manufacturerCode', label: 'Üretici' },
  { key: 'responsibilityCode', label: 'Sorumluluk Merkezi' },
  { key: 'shelfCode', label: 'Raf Kodu' }
];

const STOCK_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
  { key: 'stockType', label: 'Stok Tipi', type: 'number' },
  { key: 'currencyType', label: 'Döviz Tipi', type: 'number' },
  { key: 'trackingType', label: 'Takip Tipi', type: 'number' },
  { key: 'retailTaxPointer', label: 'Perakende Vergi', type: 'number' },
  { key: 'wholesaleTaxPointer', label: 'Toptan Vergi', type: 'number' }
];

const STOCK_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'salesStopped', label: 'Satış Durduruldu' },
  { key: 'orderStopped', label: 'Sipariş Durduruldu' },
  { key: 'receivingStopped', label: 'Kabul Durduruldu' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'discountDisabled', label: 'İskonto Kapalı' }
];

const STOCK_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'movementDate', label: 'Hareket Tarihi', type: 'date' },
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentNo', label: 'Belge No' },
  { key: 'customerCode', label: 'Cari Kodu' },
  { key: 'inputWarehouseNo', label: 'Giriş Depo', type: 'number' },
  { key: 'outputWarehouseNo', label: 'Çıkış Depo', type: 'number' },
  { key: 'shippingWarehouseNo', label: 'Sevk Deposu', type: 'number' },
  { key: 'description', label: 'Açıklama', wide: true },
  { key: 'movementGroupCode1', label: 'Hareket Grup 1' },
  { key: 'movementGroupCode2', label: 'Hareket Grup 2' },
  { key: 'movementGroupCode3', label: 'Hareket Grup 3' },
  { key: 'customerResponsibilityCenter', label: 'Cari Sorumluluk' },
  { key: 'stockResponsibilityCenter', label: 'Stok Sorumluluk' },
  { key: 'projectCode', label: 'Proje Kodu' }
];

const STOCK_LINE_FIELDS: readonly FieldDefinition[] = [
  { key: 'rowNo', label: 'Satır', type: 'number' },
  { key: 'stockCode', label: 'Stok Kodu' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'quantity', label: 'Miktar', type: 'number' },
  { key: 'secondaryQuantity', label: 'İkinci Miktar', type: 'number' },
  { key: 'amount', label: 'Tutar', type: 'number' },
  { key: 'discount1', label: 'İskonto 1', type: 'number' },
  { key: 'discount2', label: 'İskonto 2', type: 'number' },
  { key: 'discount3', label: 'İskonto 3', type: 'number' },
  { key: 'discount4', label: 'İskonto 4', type: 'number' },
  { key: 'discount5', label: 'İskonto 5', type: 'number' },
  { key: 'discount6', label: 'İskonto 6', type: 'number' },
  { key: 'expense1', label: 'Masraf 1', type: 'number' },
  { key: 'expense2', label: 'Masraf 2', type: 'number' },
  { key: 'expense3', label: 'Masraf 3', type: 'number' },
  { key: 'expense4', label: 'Masraf 4', type: 'number' },
  { key: 'taxPointer', label: 'Vergi Ptr', type: 'number' },
  { key: 'taxAmount', label: 'Vergi Tutarı', type: 'number' },
  { key: 'netWeight', label: 'Net Ağırlık', type: 'number' },
  { key: 'grossWeight', label: 'Brüt Ağırlık', type: 'number' },
  { key: 'description', label: 'Açıklama', wide: true },
  { key: 'partyCode', label: 'Parti Kodu' },
  { key: 'lotNo', label: 'Lot No', type: 'number' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'customerResponsibilityCenter', label: 'Cari Sorumluluk' },
  { key: 'stockResponsibilityCenter', label: 'Stok Sorumluluk' },
  { key: 'inputWarehouseNo', label: 'Giriş Depo', type: 'number' },
  { key: 'outputWarehouseNo', label: 'Çıkış Depo', type: 'number' }
];

const CUSTOMER_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'movementDate', label: 'Hareket Tarihi', type: 'date' },
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentNo', label: 'Belge No', wide: true },
  { key: 'customerCode', label: 'Cari Kodu' },
  { key: 'turnoverCustomerCode', label: 'Ciro Cari Kodu' },
  { key: 'description', label: 'Açıklama', wide: true },
  { key: 'sellerCode', label: 'Satıcı Kodu' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' }
];

const CUSTOMER_LINE_FIELDS: readonly FieldDefinition[] = [
  { key: 'rowNo', label: 'Satır', type: 'number' },
  { key: 'customerCode', label: 'Cari Kodu' },
  { key: 'turnoverCustomerCode', label: 'Ciro Cari Kodu' },
  { key: 'quantity', label: 'Miktar', type: 'number' },
  { key: 'amount', label: 'Tutar', type: 'number' },
  { key: 'subAmount', label: 'Alt Tutar', type: 'number' },
  { key: 'dueDay', label: 'Vade Gün', type: 'number' },
  { key: 'discount1', label: 'İskonto 1', type: 'number' },
  { key: 'discount2', label: 'İskonto 2', type: 'number' },
  { key: 'discount3', label: 'İskonto 3', type: 'number' },
  { key: 'discount4', label: 'İskonto 4', type: 'number' },
  { key: 'discount5', label: 'İskonto 5', type: 'number' },
  { key: 'discount6', label: 'İskonto 6', type: 'number' },
  { key: 'expense1', label: 'Masraf 1', type: 'number' },
  { key: 'expense2', label: 'Masraf 2', type: 'number' },
  { key: 'expense3', label: 'Masraf 3', type: 'number' },
  { key: 'expense4', label: 'Masraf 4', type: 'number' },
  { key: 'tax1', label: 'Vergi 1', type: 'number' },
  { key: 'tax2', label: 'Vergi 2', type: 'number' },
  { key: 'tax3', label: 'Vergi 3', type: 'number' },
  { key: 'tax4', label: 'Vergi 4', type: 'number' },
  { key: 'tax5', label: 'Vergi 5', type: 'number' },
  { key: 'description', label: 'Açıklama', wide: true },
  { key: 'sellerCode', label: 'Satıcı Kodu' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' }
];

@Component({
  selector: 'app-mikro-evrak-duzenleme-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mikro-evrak-duzenleme-list.component.html',
  styleUrl: './mikro-evrak-duzenleme-list.component.scss'
})
export class MikroEvrakDuzenlemeListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['mikro-evrak-duzenleme'];
  protected readonly tabs = [
    { id: 'stock-card' as const, label: 'Stok Kartı', icon: 'fa-box' },
    { id: 'stock-movement' as const, label: 'Stok Hareketi', icon: 'fa-right-left' },
    { id: 'customer-movement' as const, label: 'Cari Hareketi', icon: 'fa-receipt' }
  ];
  protected readonly stockCardTextFields = STOCK_CARD_TEXT_FIELDS;
  protected readonly stockCardNumberFields = STOCK_CARD_NUMBER_FIELDS;
  protected readonly stockCardBooleanFields = STOCK_CARD_BOOLEAN_FIELDS;
  protected readonly stockHeaderFields = STOCK_HEADER_FIELDS;
  protected readonly stockLineFields = STOCK_LINE_FIELDS;
  protected readonly customerHeaderFields = CUSTOMER_HEADER_FIELDS;
  protected readonly customerLineFields = CUSTOMER_LINE_FIELDS;

  private readonly service = inject(DuzeltmeIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<EditorTab>('stock-card');
  protected readonly busyAction = signal<BusyAction | null>(null);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly stockCards = signal<StockCardListItemDto[]>([]);
  protected readonly selectedStockCard = signal<StockCardDetailDto | null>(null);
  protected readonly stockCardDraft = signal<StockCardDetailDto | null>(null);
  protected readonly stockMovement = signal<StockMovementDocumentDto | null>(null);
  protected readonly stockMovementDraft = signal<StockMovementDocumentDto | null>(null);
  protected readonly customerMovement = signal<CustomerMovementDocumentDto | null>(null);
  protected readonly customerMovementDraft = signal<CustomerMovementDocumentDto | null>(null);

  protected stockSearch = {
    searchText: '',
    includePassive: false,
    take: 50
  };
  protected stockLookup: StockMovementDocumentLookupHttpRequest = {
    documentSerie: '',
    documentOrderNo: 0,
    documentType: null,
    movementType: null,
    movementKind: null,
    normalReturn: null,
    warehouseNo: this.authService.currentUser()?.depoNo ?? null
  };
  protected customerLookup: CustomerMovementDocumentLookupHttpRequest = {
    documentSerie: '',
    documentOrderNo: 0,
    documentType: null,
    movementType: null,
    movementKind: null,
    normalReturn: null,
    customerCode: ''
  };

  protected readonly canList = computed(() =>
    this.hasPermission('duzeltme-islemleri.mikro-evrak-duzenleme.list')
  );
  protected readonly canDetail = computed(() =>
    this.hasPermission('duzeltme-islemleri.mikro-evrak-duzenleme.detail')
  );
  protected readonly canUpdate = computed(() =>
    this.hasPermission('duzeltme-islemleri.mikro-evrak-duzenleme.update')
  );
  protected readonly changedStockCardFieldCount = computed(() =>
    this.countChanges(this.selectedStockCard(), this.stockCardDraft(), [
      ...STOCK_CARD_TEXT_FIELDS,
      ...STOCK_CARD_NUMBER_FIELDS,
      ...STOCK_CARD_BOOLEAN_FIELDS
    ])
  );
  protected readonly changedStockMovementCount = computed(() =>
    this.countDocumentChanges(
      this.stockMovement(),
      this.stockMovementDraft(),
      STOCK_HEADER_FIELDS,
      STOCK_LINE_FIELDS
    )
  );
  protected readonly changedCustomerMovementCount = computed(() =>
    this.countDocumentChanges(
      this.customerMovement(),
      this.customerMovementDraft(),
      CUSTOMER_HEADER_FIELDS,
      CUSTOMER_LINE_FIELDS
    )
  );

  protected selectTab(tab: EditorTab): void {
    this.activeTab.set(tab);
    this.feedback.set(null);
  }

  protected isBusy(action: BusyAction): boolean {
    return this.busyAction() === action;
  }

  protected searchStockCards(): void {
    if (!this.canList()) {
      return;
    }

    this.busyAction.set('stock-search');
    this.feedback.set(null);
    this.service
      .searchStockCards(this.stockSearch)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (rows: StockCardListItemDto[]) => {
          this.stockCards.set(rows ?? []);
          if (!rows?.length) {
            this.setInfo('Kayıt bulunamadı', 'Arama ölçütlerine uygun stok kartı bulunamadı.');
          }
        },
        error: (error: unknown) => this.handleError(error, 'Stok kartları getirilemedi.')
      });
  }

  protected loadStockCard(stockCode: string): void {
    if (!this.canDetail()) {
      return;
    }

    this.busyAction.set('stock-detail');
    this.feedback.set(null);
    this.service
      .getStockCard(stockCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (card: StockCardDetailDto) => this.applyStockCard(card),
        error: (error: unknown) => this.handleError(error, 'Stok kartı detayı getirilemedi.')
      });
  }

  protected saveStockCard(): void {
    const original = this.selectedStockCard();
    const draft = this.stockCardDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildPatch(
      original,
      draft,
      [...STOCK_CARD_TEXT_FIELDS, ...STOCK_CARD_NUMBER_FIELDS, ...STOCK_CARD_BOOLEAN_FIELDS]
    ) as StockCardPatchHttpRequest;

    if (!Object.keys(request).length) {
      this.setInfo('Değişiklik yok', 'Kaydedilecek bir stok kartı değişikliği bulunmuyor.');
      return;
    }

    this.busyAction.set('stock-save');
    this.feedback.set(null);
    this.service
      .updateStockCard(original.stockCode, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: StockCardUpdateResponse) => {
          this.applyStockCard({
            ...draft,
            ...response.stockCard
          });
          this.feedback.set({
            tone: 'success',
            title: 'Stok kartı güncellendi',
            message: `${response.summary.updatedRowCount} kayıt güncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Stok kartı güncellenemedi.')
      });
  }

  protected loadStockMovement(): void {
    if (!this.canDetail() || !this.validateLookup(this.stockLookup)) {
      return;
    }

    this.busyAction.set('movement-load');
    this.feedback.set(null);
    this.service
      .getStockMovementDocument(this.cleanLookup(this.stockLookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (document: StockMovementDocumentDto) => this.applyStockMovement(document),
        error: (error: unknown) => this.handleError(error, 'Stok hareket evrakı getirilemedi.')
      });
  }

  protected saveStockMovement(): void {
    const original = this.stockMovement();
    const draft = this.stockMovementDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildDocumentRequest(
      original,
      draft,
      this.cleanLookup(this.stockLookup),
      STOCK_HEADER_FIELDS,
      STOCK_LINE_FIELDS
    ) as UpdateStockMovementDocumentHttpRequest;

    if (!request.header && !request.lines?.length) {
      this.setInfo('Değişiklik yok', 'Kaydedilecek stok hareketi değişikliği bulunmuyor.');
      return;
    }

    this.busyAction.set('movement-save');
    this.feedback.set(null);
    this.service
      .updateStockMovementDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: StockMovementDocumentUpdateResponse) => {
          this.applyStockMovement(response.document);
          this.feedback.set({
            tone: 'success',
            title: 'Stok hareketi güncellendi',
            message: `${response.summary.updatedRowCount} satır güncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Stok hareketi güncellenemedi.')
      });
  }

  protected loadCustomerMovement(): void {
    if (!this.canDetail() || !this.validateLookup(this.customerLookup)) {
      return;
    }

    this.busyAction.set('customer-load');
    this.feedback.set(null);
    this.service
      .getCustomerMovementDocument(this.cleanLookup(this.customerLookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (document: CustomerMovementDocumentDto) =>
          this.applyCustomerMovement(document),
        error: (error: unknown) => this.handleError(error, 'Cari hareket evrakı getirilemedi.')
      });
  }

  protected saveCustomerMovement(): void {
    const original = this.customerMovement();
    const draft = this.customerMovementDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildDocumentRequest(
      original,
      draft,
      this.cleanLookup(this.customerLookup),
      CUSTOMER_HEADER_FIELDS,
      CUSTOMER_LINE_FIELDS
    ) as UpdateCustomerMovementDocumentHttpRequest;

    if (!request.header && !request.lines?.length) {
      this.setInfo('Değişiklik yok', 'Kaydedilecek cari hareket değişikliği bulunmuyor.');
      return;
    }

    this.busyAction.set('customer-save');
    this.feedback.set(null);
    this.service
      .updateCustomerMovementDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: CustomerMovementDocumentUpdateResponse) => {
          this.applyCustomerMovement(response.document);
          this.feedback.set({
            tone: 'success',
            title: 'Cari hareket güncellendi',
            message: `${response.summary.updatedRowCount} satır güncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Cari hareket güncellenemedi.')
      });
  }

  protected resetStockCard(): void {
    const original = this.selectedStockCard();
    this.stockCardDraft.set(original ? this.clone(original) : null);
  }

  protected resetStockMovement(): void {
    const original = this.stockMovement();
    this.stockMovementDraft.set(original ? this.prepareStockMovement(original) : null);
  }

  protected resetCustomerMovement(): void {
    const original = this.customerMovement();
    this.customerMovementDraft.set(original ? this.prepareCustomerMovement(original) : null);
  }

  protected fieldValue(target: object, key: string): unknown {
    return (target as EditableRecord)[key];
  }

  protected setField(target: object, key: string, value: unknown): void {
    (target as EditableRecord)[key] = value;
    this.stockCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.stockMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.customerMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
  }

  protected trackByStockCode = (_index: number, row: StockCardListItemDto): string =>
    row.stockCode;
  protected trackByGuid = (
    _index: number,
    row: StockMovementDocumentLineDto | CustomerMovementDocumentLineDto
  ): string => row.movementGuid;
  protected trackByField = (_index: number, field: FieldDefinition): string => field.key;

  private applyStockCard(card: StockCardDetailDto): void {
    this.selectedStockCard.set(this.clone(card));
    this.stockCardDraft.set(this.clone(card));
  }

  private applyStockMovement(document: StockMovementDocumentDto): void {
    const prepared = this.prepareStockMovement(document);
    this.stockLookup = {
      ...this.stockLookup,
      documentSerie: prepared.header.documentSerie,
      documentOrderNo: prepared.header.documentOrderNo,
      documentType: prepared.header.documentType,
      movementType:
        prepared.header.movementTypes.length === 1
          ? prepared.header.movementTypes[0] ?? null
          : this.stockLookup.movementType,
      movementKind: prepared.header.movementKind,
      normalReturn: prepared.header.normalReturn
    };
    this.stockMovement.set(this.clone(prepared));
    this.stockMovementDraft.set(this.clone(prepared));
  }

  private applyCustomerMovement(document: CustomerMovementDocumentDto): void {
    const prepared = this.prepareCustomerMovement(document);
    this.customerLookup = {
      ...this.customerLookup,
      documentSerie: prepared.header.documentSerie,
      documentOrderNo: prepared.header.documentOrderNo,
      documentType: prepared.header.documentType,
      movementType:
        prepared.header.movementTypes.length === 1
          ? prepared.header.movementTypes[0] ?? null
          : this.customerLookup.movementType,
      movementKind: prepared.header.movementKind,
      normalReturn: prepared.header.normalReturn,
      customerCode: prepared.header.customerCode
    };
    this.customerMovement.set(this.clone(prepared));
    this.customerMovementDraft.set(this.clone(prepared));
  }

  private prepareStockMovement(document: StockMovementDocumentDto): StockMovementDocumentDto {
    const clone = this.clone(document);
    clone.header.movementDate = this.toDateInput(clone.header.movementDate);
    clone.header.documentDate = this.toDateInput(clone.header.documentDate);
    return clone;
  }

  private prepareCustomerMovement(
    document: CustomerMovementDocumentDto
  ): CustomerMovementDocumentDto {
    const clone = this.clone(document);
    clone.header.movementDate = this.toDateInput(clone.header.movementDate);
    clone.header.documentDate = this.toDateInput(clone.header.documentDate);
    return clone;
  }

  private buildDocumentRequest<TLookup extends object>(
    original: { header: object; lines: Array<{ movementGuid: string }> },
    draft: { header: object; lines: Array<{ movementGuid: string }> },
    lookup: TLookup,
    headerFields: readonly FieldDefinition[],
    lineFields: readonly FieldDefinition[]
  ): { lookup: TLookup; header?: EditableRecord; lines?: EditableRecord[] } {
    const header = this.buildPatch(original.header, draft.header, headerFields);
    const originalLines = new Map(original.lines.map((line) => [line.movementGuid, line]));
    const lines = draft.lines.flatMap((line) => {
      const originalLine = originalLines.get(line.movementGuid);
      if (!originalLine) {
        return [];
      }

      const patch = this.buildPatch(originalLine, line, lineFields);
      return Object.keys(patch).length ? [{ movementGuid: line.movementGuid, ...patch }] : [];
    });

    return {
      lookup,
      ...(Object.keys(header).length ? { header } : {}),
      ...(lines.length ? { lines } : {})
    };
  }

  private buildPatch(
    original: object,
    draft: object,
    fields: readonly FieldDefinition[]
  ): EditableRecord {
    const originalRecord = original as EditableRecord;
    const draftRecord = draft as EditableRecord;

    return Object.fromEntries(
      fields.flatMap((field) =>
        this.valuesEqual(originalRecord[field.key], draftRecord[field.key])
          ? []
          : [[field.key, draftRecord[field.key]]]
      )
    );
  }

  private countChanges(
    original: object | null,
    draft: object | null,
    fields: readonly FieldDefinition[]
  ): number {
    return original && draft ? Object.keys(this.buildPatch(original, draft, fields)).length : 0;
  }

  private countDocumentChanges(
    original: { header: object; lines: Array<{ movementGuid: string }> } | null,
    draft: { header: object; lines: Array<{ movementGuid: string }> } | null,
    headerFields: readonly FieldDefinition[],
    lineFields: readonly FieldDefinition[]
  ): number {
    if (!original || !draft) {
      return 0;
    }

    const headerCount = Object.keys(
      this.buildPatch(original.header, draft.header, headerFields)
    ).length;
    const originalLines = new Map(original.lines.map((line) => [line.movementGuid, line]));
    const lineCount = draft.lines.reduce((count, line) => {
      const originalLine = originalLines.get(line.movementGuid);
      return (
        count +
        (originalLine ? Object.keys(this.buildPatch(originalLine, line, lineFields)).length : 0)
      );
    }, 0);

    return headerCount + lineCount;
  }

  private validateLookup(lookup: {
    documentSerie: string;
    documentOrderNo: number;
  }): boolean {
    if (!lookup.documentSerie.trim() || !Number.isFinite(lookup.documentOrderNo) || lookup.documentOrderNo <= 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Seri ve sıra zorunlu',
        message: 'Evrakı getirmek için belge serisi ve sıfırdan büyük belge sıra numarası girin.'
      });
      return false;
    }

    return true;
  }

  private cleanLookup<T extends object>(lookup: T): T {
    return Object.fromEntries(
      Object.entries(lookup).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    ) as T;
  }

  private hasPermission(code: string): boolean {
    const user = this.authService.currentUser();
    return (
      (user?.roller ?? []).some(
        (role) => role.toLocaleLowerCase('tr-TR') === 'administrator'
      ) ||
      (user?.permissions ?? []).includes(code) ||
      this.authService.getTaskPermissionCodes('mikro-evrak-duzenleme').includes(code)
    );
  }

  private handleError(error: unknown, fallback: string): void {
    const httpError = error as HttpErrorResponse;
    const conflictMessage =
      httpError?.status === 409
        ? 'Aynı seri-sıra birden fazla evrakla eşleşti. Evrak tipi, hareket tipi, cins veya normal/iade filtresiyle aramayı daraltın.'
        : null;

    this.feedback.set({
      tone: 'error',
      title: httpError?.status === 409 ? 'Evrak eşleşmesi belirsiz' : 'İşlem tamamlanamadı',
      message: conflictMessage ?? getErrorMessage(error, fallback)
    });
  }

  private setInfo(title: string, message: string): void {
    this.feedback.set({ tone: 'info', title, message });
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    return left === right || (left == null && right == null);
  }

  private toDateInput(value: string): string {
    return value?.slice(0, 10) ?? '';
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
