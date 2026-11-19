import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  BanknoteTrackDetailDto,
  BanknoteTrackPatchHttpRequest,
  BanknoteTrackUpdateResponse,
  CompanyOrderDocumentDto,
  CompanyOrderDocumentLineDto,
  CompanyOrderDocumentLookupHttpRequest,
  CompanyOrderDocumentUpdateResponse,
  CustomerCardDetailDto,
  CustomerCardListItemDto,
  CustomerCardPatchHttpRequest,
  CustomerCardUpdateResponse,
  CustomerMovementDocumentDto,
  CustomerMovementDocumentLineDto,
  CustomerMovementDocumentLookupHttpRequest,
  CustomerMovementDocumentUpdateResponse,
  InventoryCountDocumentDto,
  InventoryCountDocumentLineDto,
  InventoryCountDocumentLookupHttpRequest,
  InventoryCountDocumentSearchHttpRequest,
  InventoryCountDocumentUpdateResponse,
  MikroDocumentCandidateDto,
  MikroDocumentDeleteResponse,
  MikroDocumentFieldCatalogDto,
  MikroDocumentFieldCatalogFieldDto,
  StockCardDetailDto,
  StockCardListItemDto,
  StockCardPatchHttpRequest,
  StockCardUpdateResponse,
  StockCardWarehousePatchHttpRequest,
  StockCardWarehouseSettingsDto,
  StockCardWarehouseUpdateResponse,
  StockSalesPriceDto,
  StockSalesPriceDeleteHttpRequest,
  StockSalesPriceUpsertHttpRequest,
  StockSalesPriceUpsertResponse,
  StockMovementDocumentDto,
  StockMovementDocumentLineDto,
  StockMovementDocumentLookupHttpRequest,
  StockMovementDocumentUpdateResponse,
  UpdateCompanyOrderDocumentHttpRequest,
  UpdateCustomerMovementDocumentHttpRequest,
  UpdateInventoryCountDocumentHttpRequest,
  UpdateStockMovementDocumentHttpRequest,
  UpdateWarehouseOrderDocumentHttpRequest,
  WarehouseCardDetailDto,
  WarehouseCardListItemDto,
  WarehouseCardPatchHttpRequest,
  WarehouseCardUpdateResponse,
  WarehouseOrderDocumentDto,
  WarehouseOrderDocumentLineDto,
  WarehouseOrderDocumentLookupHttpRequest,
  WarehouseOrderDocumentUpdateResponse
} from '@interfaces';

import { DuzeltmeIslemleriService } from '../../../../../core/api/module-services/duzeltme-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { AppConfirmDialogService } from '../../../../../core/ui/app-confirm-dialog/app-confirm-dialog.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';
import { CustomerAddressEditorComponent } from './customer-address-editor/customer-address-editor.component';
import {
  BANKNOTE_TRACK_FIELDS,
  type BusyAction,
  COMPANY_ORDER_BOOLEAN_FIELDS,
  COMPANY_ORDER_HEADER_FIELDS,
  COMPANY_ORDER_LINE_FIELDS,
  CUSTOMER_CARD_BOOLEAN_FIELDS,
  CUSTOMER_CARD_NUMBER_FIELDS,
  CUSTOMER_CARD_TEXT_FIELDS,
  CUSTOMER_HEADER_FIELDS,
  CUSTOMER_LINE_FIELDS,
  type EditableRecord,
  type EditorTab,
  type Feedback,
  type FieldContext,
  type FieldDefinition,
  INVENTORY_COUNT_HEADER_FIELDS,
  INVENTORY_COUNT_LINE_FIELDS,
  MIKRO_EDITOR_TABS,
  STOCK_CARD_BOOLEAN_FIELDS,
  STOCK_CARD_NUMBER_FIELDS,
  STOCK_CARD_TEXT_FIELDS,
  STOCK_CARD_WAREHOUSE_FIELDS,
  STOCK_HEADER_FIELDS,
  STOCK_LINE_FIELDS,
  STOCK_SALES_PRICE_FIELDS,
  WAREHOUSE_CARD_BOOLEAN_FIELDS,
  WAREHOUSE_CARD_DATE_FIELDS,
  WAREHOUSE_CARD_NUMBER_FIELDS,
  WAREHOUSE_CARD_TEXT_FIELDS,
  WAREHOUSE_ORDER_BOOLEAN_FIELDS,
  WAREHOUSE_ORDER_HEADER_FIELDS,
  WAREHOUSE_ORDER_LINE_FIELDS
} from './mikro-evrak-duzenleme.helpers';

@Component({
  selector: 'app-mikro-evrak-duzenleme-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerAddressEditorComponent],
  templateUrl: './mikro-evrak-duzenleme-list.component.html',
  styleUrl: './mikro-evrak-duzenleme-list.component.scss'
})
export class MikroEvrakDuzenlemeListComponent {
  protected readonly page: DocsContentPage = DOCS_PAGES['mikro-evrak-duzenleme'];
  protected readonly tabs = MIKRO_EDITOR_TABS;
  protected readonly stockCardTextFields = STOCK_CARD_TEXT_FIELDS;
  protected readonly stockCardNumberFields = STOCK_CARD_NUMBER_FIELDS;
  protected readonly stockCardBooleanFields = STOCK_CARD_BOOLEAN_FIELDS;
  protected readonly stockCardWarehouseFields = STOCK_CARD_WAREHOUSE_FIELDS;
  protected readonly stockSalesPriceFields = STOCK_SALES_PRICE_FIELDS;
  protected readonly warehouseCardTextFields = WAREHOUSE_CARD_TEXT_FIELDS;
  protected readonly warehouseCardNumberFields = WAREHOUSE_CARD_NUMBER_FIELDS;
  protected readonly warehouseCardDateFields = WAREHOUSE_CARD_DATE_FIELDS;
  protected readonly warehouseCardBooleanFields = WAREHOUSE_CARD_BOOLEAN_FIELDS;
  protected readonly customerCardTextFields = CUSTOMER_CARD_TEXT_FIELDS;
  protected readonly customerCardNumberFields = CUSTOMER_CARD_NUMBER_FIELDS;
  protected readonly customerCardBooleanFields = CUSTOMER_CARD_BOOLEAN_FIELDS;
  protected readonly stockHeaderFields = STOCK_HEADER_FIELDS;
  protected readonly stockLineFields = STOCK_LINE_FIELDS;
  protected readonly inventoryCountHeaderFields = INVENTORY_COUNT_HEADER_FIELDS;
  protected readonly inventoryCountLineFields = INVENTORY_COUNT_LINE_FIELDS;
  protected readonly customerHeaderFields = CUSTOMER_HEADER_FIELDS;
  protected readonly customerLineFields = CUSTOMER_LINE_FIELDS;
  protected readonly companyOrderHeaderFields = COMPANY_ORDER_HEADER_FIELDS;
  protected readonly companyOrderBooleanFields = COMPANY_ORDER_BOOLEAN_FIELDS;
  protected readonly companyOrderLineFields = COMPANY_ORDER_LINE_FIELDS;
  protected readonly warehouseOrderHeaderFields = WAREHOUSE_ORDER_HEADER_FIELDS;
  protected readonly warehouseOrderBooleanFields = WAREHOUSE_ORDER_BOOLEAN_FIELDS;
  protected readonly warehouseOrderLineFields = WAREHOUSE_ORDER_LINE_FIELDS;
  protected readonly banknoteTrackFields = BANKNOTE_TRACK_FIELDS;

  private readonly service = inject(DuzeltmeIslemleriService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(AppConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private documentSearchRevision = 0;

  protected readonly activeTab = signal<EditorTab>('stock-card');
  protected readonly busyAction = signal<BusyAction | null>(null);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly documentCandidates = signal<MikroDocumentCandidateDto[]>([]);
  protected readonly selectedDocumentCandidate = signal<MikroDocumentCandidateDto | null>(null);
  protected readonly stockCards = signal<StockCardListItemDto[]>([]);
  protected readonly selectedStockCard = signal<StockCardDetailDto | null>(null);
  protected readonly stockCardDraft = signal<StockCardDetailDto | null>(null);
  protected readonly stockCardWarehouseSettings = signal<StockCardWarehouseSettingsDto[]>([]);
  protected readonly selectedWarehouseSetting = signal<StockCardWarehouseSettingsDto | null>(null);
  protected readonly warehouseSettingDraft = signal<StockCardWarehouseSettingsDto | null>(null);
  protected readonly warehouseBusyAction = signal<'load' | 'save' | 'delete' | null>(null);
  protected readonly stockSalesPrices = signal<StockSalesPriceDto[]>([]);
  protected readonly selectedSalesPrice = signal<StockSalesPriceDto | null>(null);
  protected readonly salesPriceDraft = signal<StockSalesPriceDto | null>(null);
  protected readonly warehouseCards = signal<WarehouseCardListItemDto[]>([]);
  protected readonly showWarehousesWithoutRegion = signal(false);
  protected readonly visibleWarehouseCards = computed(() => {
    const rows = this.warehouseCards();
    return this.showWarehousesWithoutRegion()
      ? rows.filter((row) => !row.regionCode?.trim())
      : rows;
  });
  protected readonly selectedWarehouseCard = signal<WarehouseCardDetailDto | null>(null);
  protected readonly warehouseCardDraft = signal<WarehouseCardDetailDto | null>(null);
  protected readonly customerCards = signal<CustomerCardListItemDto[]>([]);
  protected readonly selectedCustomerCard = signal<CustomerCardDetailDto | null>(null);
  protected readonly customerCardDraft = signal<CustomerCardDetailDto | null>(null);
  protected readonly stockMovement = signal<StockMovementDocumentDto | null>(null);
  protected readonly stockMovementDraft = signal<StockMovementDocumentDto | null>(null);
  protected readonly stockMovementMatches = signal<StockMovementDocumentDto[]>([]);
  protected readonly inventoryCount = signal<InventoryCountDocumentDto | null>(null);
  protected readonly inventoryCountDraft = signal<InventoryCountDocumentDto | null>(null);
  protected readonly inventoryCountMatches = signal<InventoryCountDocumentDto[]>([]);
  protected readonly customerMovement = signal<CustomerMovementDocumentDto | null>(null);
  protected readonly customerMovementDraft = signal<CustomerMovementDocumentDto | null>(null);
  protected readonly customerMovementMatches = signal<CustomerMovementDocumentDto[]>([]);
  protected readonly companyOrder = signal<CompanyOrderDocumentDto | null>(null);
  protected readonly companyOrderDraft = signal<CompanyOrderDocumentDto | null>(null);
  protected readonly companyOrderMatches = signal<CompanyOrderDocumentDto[]>([]);
  protected readonly warehouseOrder = signal<WarehouseOrderDocumentDto | null>(null);
  protected readonly warehouseOrderDraft = signal<WarehouseOrderDocumentDto | null>(null);
  protected readonly warehouseOrderMatches = signal<WarehouseOrderDocumentDto[]>([]);
  protected readonly lineSearchText = signal<string>('');
  protected readonly expandAllLines = signal<boolean>(false);
  protected readonly banknoteTrack = signal<BanknoteTrackDetailDto | null>(null);
  protected readonly banknoteTrackDraft = signal<BanknoteTrackDetailDto | null>(null);
  protected readonly fieldCatalogLoading = signal(false);
  private readonly fieldCatalog = signal<MikroDocumentFieldCatalogDto | null>(null);
  private readonly fieldCatalogFieldMap = computed(() => {
    const map = new Map<string, MikroDocumentFieldCatalogFieldDto>();

    for (const section of this.fieldCatalog()?.sections ?? []) {
      for (const field of section.fields ?? []) {
        map.set(`${section.code}|${field.apiField}`, field);
      }
    }

    return map;
  });
  private readonly fieldContexts: readonly FieldContext[] = [
    { sectionCode: 'stock-card', scope: 'body', fields: STOCK_CARD_TEXT_FIELDS },
    { sectionCode: 'stock-card', scope: 'body', fields: STOCK_CARD_NUMBER_FIELDS },
    { sectionCode: 'stock-card', scope: 'body', fields: STOCK_CARD_BOOLEAN_FIELDS },
    { sectionCode: 'stock-card-warehouse', scope: 'body', fields: STOCK_CARD_WAREHOUSE_FIELDS },
    { sectionCode: 'stock-sales-price', scope: 'body', fields: STOCK_SALES_PRICE_FIELDS },
    { sectionCode: 'warehouse-card', scope: 'body', fields: WAREHOUSE_CARD_TEXT_FIELDS },
    { sectionCode: 'warehouse-card', scope: 'body', fields: WAREHOUSE_CARD_NUMBER_FIELDS },
    { sectionCode: 'warehouse-card', scope: 'body', fields: WAREHOUSE_CARD_DATE_FIELDS },
    { sectionCode: 'warehouse-card', scope: 'body', fields: WAREHOUSE_CARD_BOOLEAN_FIELDS },
    { sectionCode: 'customer-card', scope: 'body', fields: CUSTOMER_CARD_TEXT_FIELDS },
    { sectionCode: 'customer-card', scope: 'body', fields: CUSTOMER_CARD_NUMBER_FIELDS },
    { sectionCode: 'customer-card', scope: 'body', fields: CUSTOMER_CARD_BOOLEAN_FIELDS },
    { sectionCode: 'stock-movement', scope: 'header', fields: STOCK_HEADER_FIELDS },
    { sectionCode: 'stock-movement', scope: 'line', fields: STOCK_LINE_FIELDS },
    { sectionCode: 'inventory-count', scope: 'header', fields: INVENTORY_COUNT_HEADER_FIELDS },
    { sectionCode: 'inventory-count', scope: 'line', fields: INVENTORY_COUNT_LINE_FIELDS },
    { sectionCode: 'customer-movement', scope: 'header', fields: CUSTOMER_HEADER_FIELDS },
    { sectionCode: 'customer-movement', scope: 'line', fields: CUSTOMER_LINE_FIELDS },
    { sectionCode: 'company-order', scope: 'header', fields: COMPANY_ORDER_HEADER_FIELDS },
    { sectionCode: 'company-order', scope: 'header', fields: COMPANY_ORDER_BOOLEAN_FIELDS },
    { sectionCode: 'company-order', scope: 'line', fields: COMPANY_ORDER_LINE_FIELDS },
    { sectionCode: 'warehouse-order', scope: 'header', fields: WAREHOUSE_ORDER_HEADER_FIELDS },
    { sectionCode: 'warehouse-order', scope: 'header', fields: WAREHOUSE_ORDER_BOOLEAN_FIELDS },
    { sectionCode: 'warehouse-order', scope: 'line', fields: WAREHOUSE_ORDER_LINE_FIELDS },
    { sectionCode: 'banknote-track', scope: 'body', fields: BANKNOTE_TRACK_FIELDS }
  ];

  protected stockSearch = {
    searchText: '',
    includePassive: false,
    take: 50
  };
  protected documentSearch = {
    documentSerie: '',
    documentOrderNo: 0
  };
  protected warehouseCardSearch = {
    searchText: '',
    includePassive: false,
    take: 50
  };
  protected customerCardSearch = {
    searchText: '',
    includePassive: false,
    take: 50
  };
  protected warehouseFilterNo: number | null = null;
  protected salesPriceFilterWarehouseNo: number | null = null;
  protected newSalesPrice = {
    warehouseNo: this.authService.currentUser()?.depoNo ?? null,
    priceListNo: 1,
    paymentPlanNo: 0,
    unitPointer: 1,
    price: null as number | null,
    currencyType: 0,
    changeReason: 4
  };
  protected stockLookup: StockMovementDocumentLookupHttpRequest = {
    documentSerie: '',
    documentOrderNo: 0,
    documentType: null,
    movementType: null,
    movementKind: null,
    normalReturn: null,
    warehouseNo: null,
    inputWarehouseNo: null,
    outputWarehouseNo: null
  };
  protected inventoryCountLookup: InventoryCountDocumentLookupHttpRequest = {
    warehouseNo: this.authService.currentUser()?.depoNo ?? 0,
    documentNo: 0,
    documentDate: ''
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
  protected companyOrderLookup: CompanyOrderDocumentLookupHttpRequest = {
    documentSerie: '',
    documentOrderNo: 0,
    orderType: null,
    orderKind: null,
    warehouseNo: this.authService.currentUser()?.depoNo ?? null,
    customerCode: ''
  };
  protected warehouseOrderLookup: WarehouseOrderDocumentLookupHttpRequest = {
    documentSerie: '',
    documentOrderNo: 0,
    warehouseNo: this.authService.currentUser()?.depoNo ?? null,
    inWarehouseNo: null,
    outWarehouseNo: null
  };
  protected banknoteTrackLookup = {
    banknoteTrackId: '',
    warehouseNo: this.authService.currentUser()?.depoNo ?? null
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
  protected readonly canDelete = computed(() =>
    this.hasPermission('duzeltme-islemleri.mikro-evrak-duzenleme.delete')
  );

  constructor() {
    this.loadFieldCatalog();
  }

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
  protected readonly changedInventoryCountCount = computed(() =>
    this.countDocumentChanges(
      this.inventoryCount(),
      this.inventoryCountDraft(),
      INVENTORY_COUNT_HEADER_FIELDS,
      INVENTORY_COUNT_LINE_FIELDS,
      'countGuid'
    )
  );
  protected readonly changedWarehouseFieldCount = computed(() =>
    this.countChanges(
      this.selectedWarehouseSetting(),
      this.warehouseSettingDraft(),
      STOCK_CARD_WAREHOUSE_FIELDS
    )
  );
  protected readonly changedSalesPriceFieldCount = computed(() =>
    this.countChanges(this.selectedSalesPrice(), this.salesPriceDraft(), STOCK_SALES_PRICE_FIELDS)
  );
  protected readonly changedWarehouseCardFieldCount = computed(() =>
    this.countChanges(this.selectedWarehouseCard(), this.warehouseCardDraft(), [
      ...WAREHOUSE_CARD_TEXT_FIELDS,
      ...WAREHOUSE_CARD_NUMBER_FIELDS,
      ...WAREHOUSE_CARD_DATE_FIELDS,
      ...WAREHOUSE_CARD_BOOLEAN_FIELDS
    ])
  );
  protected readonly changedCustomerCardFieldCount = computed(() =>
    this.countChanges(this.selectedCustomerCard(), this.customerCardDraft(), [
      ...CUSTOMER_CARD_TEXT_FIELDS,
      ...CUSTOMER_CARD_NUMBER_FIELDS,
      ...CUSTOMER_CARD_BOOLEAN_FIELDS
    ])
  );
  protected readonly changedCustomerMovementCount = computed(() =>
    this.countDocumentChanges(
      this.customerMovement(),
      this.customerMovementDraft(),
      CUSTOMER_HEADER_FIELDS,
      CUSTOMER_LINE_FIELDS
    )
  );
  protected readonly changedBanknoteTrackFieldCount = computed(() =>
    this.countChanges(this.banknoteTrack(), this.banknoteTrackDraft(), BANKNOTE_TRACK_FIELDS)
  );
  protected readonly changedCompanyOrderCount = computed(() =>
    this.countDocumentChanges(
      this.companyOrder(),
      this.companyOrderDraft(),
      [...COMPANY_ORDER_HEADER_FIELDS, ...COMPANY_ORDER_BOOLEAN_FIELDS],
      COMPANY_ORDER_LINE_FIELDS,
      'orderGuid'
    )
  );
  protected readonly changedWarehouseOrderCount = computed(() =>
    this.countDocumentChanges(
      this.warehouseOrder(),
      this.warehouseOrderDraft(),
      [...WAREHOUSE_ORDER_HEADER_FIELDS, ...WAREHOUSE_ORDER_BOOLEAN_FIELDS],
      WAREHOUSE_ORDER_LINE_FIELDS,
      'orderGuid'
    )
  );

  protected selectTab(tab: EditorTab): void {
    this.activeTab.set(tab);
    this.feedback.set(null);
    this.lineSearchText.set('');
    this.expandAllLines.set(false);
  }

  protected searchDocuments(): void {
    const documentSerie = this.documentSearch.documentSerie.trim();
    const documentOrderNo = Number(this.documentSearch.documentOrderNo);
    if (!this.canDetail() || !documentSerie || !Number.isInteger(documentOrderNo) || documentOrderNo < 0) {
      this.setInfo('Seri ve sira gerekli', 'Mikro evrak serisini ve sira numarasini girin.');
      return;
    }

    const requestRevision = ++this.documentSearchRevision;
    this.busyAction.set('document-search');
    this.feedback.set(null);
    this.documentCandidates.set([]);
    this.selectedDocumentCandidate.set(null);
    this.service
      .findDocuments({ documentSerie, documentOrderNo })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestRevision === this.documentSearchRevision) {
            this.busyAction.set(null);
          }
        })
      )
      .subscribe({
        next: (documents: MikroDocumentCandidateDto[]) => {
          if (requestRevision !== this.documentSearchRevision) {
            return;
          }
          this.documentCandidates.set(documents);
          if (documents.length === 0) {
            this.feedback.set({
              tone: 'error',
              title: 'Evrak bulunamadi',
              message: `${documentSerie}/${documentOrderNo} STOK_HAREKETLERI, CARI_HESAP_HAREKETLERI, SIPARISLER ve DEPOLAR_ARASI_SIPARISLER tablolarinda bulunamadi.`
            });
            return;
          }

          if (documents.length === 1) {
            this.selectDocumentCandidate(documents[0]);
            return;
          }

          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla Mikro evraki bulundu',
            message: `${documents.length} fiziksel evraktan duzenlemek istediginizi secin.`
          });
        },
        error: (error: unknown) => {
          if (requestRevision === this.documentSearchRevision) {
            this.handleError(error, 'Mikro evraklari aranirken hata olustu.');
          }
        }
      });
  }

  protected selectDocumentCandidate(candidate: MikroDocumentCandidateDto): void {
    this.selectedDocumentCandidate.set(candidate);
    this.documentCandidates.set([]);

    if (candidate.documentFamily === 'stock-movement') {
      this.activeTab.set('stock-movement');
      this.stockLookup = {
        documentSerie: candidate.documentSerie,
        documentOrderNo: candidate.documentOrderNo,
        documentType: candidate.documentType,
        movementType: candidate.movementTypes.length === 1 ? candidate.movementTypes[0] ?? null : null,
        movementKind: candidate.movementKind,
        normalReturn: candidate.normalReturn,
        warehouseNo: null,
        inputWarehouseNo: candidate.inputWarehouseNo,
        outputWarehouseNo: candidate.outputWarehouseNo
      };
      this.openSelectedStockMovement();
      return;
    }

    if (candidate.documentFamily === 'customer-movement') {
      this.activeTab.set('customer-movement');
      this.customerLookup = {
        documentSerie: candidate.documentSerie,
        documentOrderNo: candidate.documentOrderNo,
        documentType: candidate.documentType,
        movementType: candidate.movementTypes.length === 1 ? candidate.movementTypes[0] ?? null : null,
        movementKind: candidate.movementKind,
        normalReturn: candidate.normalReturn,
        customerCode: candidate.referenceCode
      };
      this.loadCustomerMovement();
      return;
    }

    if (candidate.documentFamily === 'company-order') {
      this.activeTab.set('company-order');
      this.companyOrderLookup = {
        documentSerie: candidate.documentSerie,
        documentOrderNo: candidate.documentOrderNo,
        orderType: candidate.orderType,
        orderKind: candidate.orderKind,
        warehouseNo: candidate.warehouseNo,
        customerCode: candidate.referenceCode
      };
      this.loadCompanyOrder();
      return;
    }

    this.activeTab.set('warehouse-order');
    this.warehouseOrderLookup = {
      documentSerie: candidate.documentSerie,
      documentOrderNo: candidate.documentOrderNo,
      warehouseNo: null,
      inWarehouseNo: candidate.inputWarehouseNo,
      outWarehouseNo: candidate.outputWarehouseNo
    };
    this.loadWarehouseOrder();
  }

  protected candidateIdentityParts(candidate: MikroDocumentCandidateDto): string[] {
    if (candidate.documentFamily === 'stock-movement') {
      return [
        `sth_evraktip: ${candidate.documentType} - ${candidate.documentTypeName}`,
        `sth_tip: ${candidate.movementTypes.join(', ')} - ${candidate.movementTypeNames.join(' / ')}`,
        `sth_cins: ${candidate.movementKind} - ${candidate.movementKindName}`,
        `sth_normal_iade: ${candidate.normalReturn} - ${candidate.normalReturnName}`,
        `sth_cikis_depo_no: ${candidate.outputWarehouseNo ?? '-'}`,
        `sth_giris_depo_no: ${candidate.inputWarehouseNo ?? '-'}`
      ];
    }

    if (candidate.documentFamily === 'customer-movement') {
      return [
        `cha_evrak_tip: ${candidate.documentType} - ${candidate.documentTypeName}`,
        `cha_tip: ${candidate.movementTypes.join(', ')} - ${candidate.movementTypeNames.join(' / ')}`,
        `cha_cinsi: ${candidate.movementKind} - ${candidate.movementKindName}`,
        `cha_normal_Iade: ${candidate.normalReturn} - ${candidate.normalReturnName}`,
        `cha_kod: ${candidate.referenceCode || '-'}`
      ];
    }

    if (candidate.documentFamily === 'company-order') {
      return [
        `sip_tip: ${candidate.orderType} - ${candidate.orderTypeName}`,
        `sip_cins: ${candidate.orderKind} - ${candidate.orderKindName}`,
        `sip_depono: ${candidate.warehouseNo ?? '-'}`,
        `sip_musteri_kod: ${candidate.referenceCode || '-'}`
      ];
    }

    return [
      `ssip_cikdepo: ${candidate.outputWarehouseNo ?? '-'}`,
      `ssip_girdepo: ${candidate.inputWarehouseNo ?? '-'}`
    ];
  }

  protected candidateWarehouseLabel(candidate: MikroDocumentCandidateDto): string {
    if (candidate.inputWarehouseNo || candidate.outputWarehouseNo) {
      const output = candidate.outputWarehouseNo
        ? `${candidate.outputWarehouseNo} ${candidate.outputWarehouseName}`.trim()
        : '-';
      const input = candidate.inputWarehouseNo
        ? `${candidate.inputWarehouseNo} ${candidate.inputWarehouseName}`.trim()
        : '-';
      return `${output} -> ${input}`;
    }

    return candidate.warehouseNo
      ? `${candidate.warehouseNo} ${candidate.warehouseName}`.trim()
      : 'Depo bilgisi yok';
  }

  protected trackByDocumentCandidate = (_index: number, candidate: MikroDocumentCandidateDto): string =>
    [
      candidate.documentFamily,
      candidate.documentSerie,
      candidate.documentOrderNo,
      candidate.documentType,
      candidate.movementKind,
      candidate.normalReturn,
      candidate.orderType,
      candidate.orderKind,
      candidate.inputWarehouseNo,
      candidate.outputWarehouseNo
    ].join('|');

  protected isBusy(action: BusyAction): boolean {
    return this.busyAction() === action;
  }

  private loadFieldCatalog(): void {
    this.fieldCatalogLoading.set(true);

    this.service
      .getFieldCatalog()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.fieldCatalogLoading.set(false))
      )
      .subscribe({
        next: (catalog: MikroDocumentFieldCatalogDto) => {
          this.fieldCatalog.set(catalog);
          this.applyFieldCatalogLabels();
        },
        error: () => {
          this.fieldCatalog.set(null);
        }
      });
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
    this.stockCardWarehouseSettings.set([]);
    this.selectWarehouseSetting(null);
    this.stockSalesPrices.set([]);
    this.selectSalesPrice(null);
    this.service
      .getStockCard(stockCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (card: StockCardDetailDto) => {
          this.applyStockCard(card);
          this.loadStockCardWarehouseSettings();
          this.loadStockSalesPrices();
        },
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
          this.loadStockCardWarehouseSettings();
          this.feedback.set({
            tone: 'success',
            title: 'Stok kartı güncellendi',
            message: `${response.summary.updatedRowCount} kayıt güncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Stok kartı güncellenemedi.')
      });
  }

  protected searchWarehouseCards(): void {
    if (!this.canList()) {
      return;
    }

    this.busyAction.set('warehouse-card-search');
    this.feedback.set(null);
    this.service
      .searchWarehouseCards(this.warehouseCardSearch)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (rows: WarehouseCardListItemDto[]) => {
          this.warehouseCards.set(rows ?? []);
          if (!rows?.length) {
            this.setInfo('Kayit bulunamadi', 'Arama olcutlerine uygun depo karti bulunamadi.');
          }
        },
        error: (error: unknown) => this.handleError(error, 'Depo kartlari getirilemedi.')
      });
  }

  protected loadWarehouseCard(warehouseNo: number): void {
    if (!this.canDetail()) {
      return;
    }

    this.busyAction.set('warehouse-card-detail');
    this.feedback.set(null);
    this.service
      .getWarehouseCard(warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (card: WarehouseCardDetailDto) => this.applyWarehouseCard(card),
        error: (error: unknown) => this.handleError(error, 'Depo karti detayi getirilemedi.')
      });
  }

  protected saveWarehouseCard(): void {
    const original = this.selectedWarehouseCard();
    const draft = this.warehouseCardDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    if (!this.validateWarehouseCard(draft)) {
      return;
    }

    const request = this.buildPatch(
      original,
      draft,
      [
        ...WAREHOUSE_CARD_TEXT_FIELDS,
        ...WAREHOUSE_CARD_NUMBER_FIELDS,
        ...WAREHOUSE_CARD_DATE_FIELDS,
        ...WAREHOUSE_CARD_BOOLEAN_FIELDS
      ]
    ) as WarehouseCardPatchHttpRequest;

    if (!Object.keys(request).length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek bir depo karti degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('warehouse-card-save');
    this.feedback.set(null);
    this.service
      .updateWarehouseCard(original.warehouseNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: WarehouseCardUpdateResponse) => {
          this.applyWarehouseCard({
            ...draft,
            ...response.warehouseCard
          });
          this.feedback.set({
            tone: 'success',
            title: 'Depo karti guncellendi',
            message: `${response.summary.updatedRowCount} kayit guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Depo karti guncellenemedi.')
      });
  }

  protected loadBanknoteTrack(): void {
    const banknoteTrackId = this.banknoteTrackLookup.banknoteTrackId.trim();

    if (!banknoteTrackId || !this.canDetail()) {
      this.setInfo('Banknot takip ID gerekli', 'Duzenlenecek banknot takip kaydinin ID bilgisini girin.');
      return;
    }

    this.busyAction.set('banknote-track-load');
    this.feedback.set(null);
    this.service
      .getBanknoteTrack(banknoteTrackId, this.banknoteTrackLookup.warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (track: BanknoteTrackDetailDto) => this.applyBanknoteTrack(track),
        error: (error: unknown) => this.handleError(error, 'Banknot takip kaydi getirilemedi.')
      });
  }

  protected saveBanknoteTrack(): void {
    const original = this.banknoteTrack();
    const draft = this.banknoteTrackDraft();

    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    if (!this.validateBanknoteTrack(draft)) {
      return;
    }

    const request = this.buildPatch(original, draft, BANKNOTE_TRACK_FIELDS) as BanknoteTrackPatchHttpRequest;

    if (!Object.keys(request).length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek banknot takip degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('banknote-track-save');
    this.feedback.set(null);
    this.service
      .updateBanknoteTrack(original.banknoteTrackId, request, this.banknoteTrackLookup.warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: BanknoteTrackUpdateResponse) => {
          this.applyBanknoteTrack({
            ...draft,
            ...response.banknoteTrack
          });
          this.feedback.set({
            tone: 'success',
            title: 'Banknot takip guncellendi',
            message: `${response.summary.updatedRowCount} kayit guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Banknot takip kaydi guncellenemedi.')
      });
  }

  protected async deleteBanknoteTrack(): Promise<void> {
    const original = this.banknoteTrack();

    if (!original || !this.canDelete()) {
      return;
    }

    const confirmed = await this.confirmDialog.prompt({
      title: 'Banknot takip kaydi silinsin mi?',
      message: `${original.banknoteTrackId} numarali kayit kalici olarak silinecek. Devam etmek icin ID bilgisini yazin.`,
      confirmText: 'Sil',
      cancelText: 'Vazgec',
      tone: 'danger',
      input: {
        label: 'Banknot takip ID',
        placeholder: original.banknoteTrackId,
        expectedValue: original.banknoteTrackId,
        required: true
      }
    });

    if (confirmed?.trim() !== original.banknoteTrackId) {
      return;
    }

    this.busyAction.set('banknote-track-delete');
    this.feedback.set(null);
    this.service
      .deleteBanknoteTrack(original.banknoteTrackId, this.banknoteTrackLookup.warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.banknoteTrack.set(null);
          this.banknoteTrackDraft.set(null);
          this.feedback.set({
            tone: 'success',
            title: 'Banknot takip silindi',
            message: `${response.deletedRowCount} kayit silindi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Banknot takip kaydi silinemedi.')
      });
  }

  protected resetBanknoteTrack(): void {
    const original = this.banknoteTrack();
    this.banknoteTrackDraft.set(original ? this.clone(original) : null);
  }

  protected searchCustomerCards(): void {
    if (!this.canList()) {
      return;
    }

    this.busyAction.set('customer-card-search');
    this.feedback.set(null);
    this.service
      .searchCustomerCards(this.customerCardSearch)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (rows: CustomerCardListItemDto[]) => {
          this.customerCards.set(rows ?? []);
          if (!rows?.length) {
            this.setInfo('Kayit bulunamadi', 'Arama olcutlerine uygun cari karti bulunamadi.');
          }
        },
        error: (error: unknown) => this.handleError(error, 'Cari kartlari getirilemedi.')
      });
  }

  protected loadCustomerCard(customerCode: string): void {
    if (!this.canDetail()) {
      return;
    }

    this.busyAction.set('customer-card-detail');
    this.feedback.set(null);
    this.service
      .getCustomerCard(customerCode)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (card: CustomerCardDetailDto) => this.applyCustomerCard(card),
        error: (error: unknown) => this.handleError(error, 'Cari karti detayi getirilemedi.')
      });
  }

  protected saveCustomerCard(): void {
    const original = this.selectedCustomerCard();
    const draft = this.customerCardDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildPatch(
      original,
      draft,
      [
        ...CUSTOMER_CARD_TEXT_FIELDS,
        ...CUSTOMER_CARD_NUMBER_FIELDS,
        ...CUSTOMER_CARD_BOOLEAN_FIELDS
      ]
    ) as CustomerCardPatchHttpRequest;

    if (!Object.keys(request).length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek bir cari karti degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('customer-card-save');
    this.feedback.set(null);
    this.service
      .updateCustomerCard(original.customerCode, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: CustomerCardUpdateResponse) => {
          this.applyCustomerCard({
            ...draft,
            ...response.customerCard
          });
          this.feedback.set({
            tone: 'success',
            title: 'Cari karti guncellendi',
            message: `${response.summary.updatedRowCount} kayit guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Cari karti guncellenemedi.')
      });
  }

  protected loadStockMovement(): void {
    if (!this.canDetail() || !this.validateLookup(this.stockLookup)) {
      return;
    }

    const lookup: StockMovementDocumentLookupHttpRequest = {
      documentSerie: this.stockLookup.documentSerie,
      documentOrderNo: this.stockLookup.documentOrderNo,
      documentType: null,
      movementType: null,
      movementKind: null,
      normalReturn: null,
      warehouseNo: this.stockLookup.warehouseNo,
      inputWarehouseNo: null,
      outputWarehouseNo: null
    };

    this.busyAction.set('movement-load');
    this.feedback.set(null);
    this.stockMovementMatches.set([]);
    this.service
      .findStockMovementDocuments(this.cleanLookup(lookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (documents: StockMovementDocumentDto[]) => {
          if (documents.length === 0) {
            this.stockMovement.set(null);
            this.stockMovementDraft.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Evrak bulunamadı',
              message: 'Bu seri ve sıra numarasıyla eşleşen stok hareketi bulunamadı.'
            });
            return;
          }

          if (documents.length === 1) {
            this.applyStockMovement(documents[0]);
            return;
          }

          this.stockMovement.set(null);
          this.stockMovementDraft.set(null);
          this.stockMovementMatches.set(documents);
          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla evrak bulundu',
            message: `${documents.length} eşleşmeden düzenlemek istediğiniz evrakı seçin.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Stok hareket evrakı getirilemedi.')
      });
  }

  private openSelectedStockMovement(): void {
    this.busyAction.set('movement-load');
    this.feedback.set(null);
    this.stockMovementMatches.set([]);
    this.service
      .getStockMovementDocument(this.cleanLookup(this.stockLookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (document: StockMovementDocumentDto) => this.applyStockMovement(document),
        error: (error: unknown) => this.handleError(error, 'Secilen stok hareket evraki getirilemedi.')
      });
  }

  protected selectStockMovementMatch(document: StockMovementDocumentDto): void {
    this.stockMovementMatches.set([]);
    this.applyStockMovement(document);
    this.feedback.set({
      tone: 'info',
      title: 'Evrak açıldı',
      message: `${document.header.documentSerie}-${document.header.documentOrderNo} düzenlemeye hazır.`
    });
  }

  protected stockMovementTypeLabel(document: StockMovementDocumentDto): string {
    const header = document.header;

    if (header.documentType === 13) {
      return 'Firma Mal Kabul';
    }

    if (header.documentType === 17) {
      return header.normalReturn === 1 ? 'Depo İadesi' : 'Depolar Arası Sevk';
    }

    if (header.documentType === 1) {
      return header.normalReturn === 1 ? 'Firma İadesi' : 'Firma Sevki';
    }

    if (header.documentType === 6) {
      return 'Virman';
    }

    if (header.documentType === 0) {
      if (header.movementKind === 4) {
        return 'Fire Fişi';
      }

      if (header.movementKind === 5) {
        return 'Sarf Fişi';
      }

      return 'Stok Fişi';
    }

    return header.documentTypeName || `Stok Evrakı (Tip ${header.documentType}, Cins ${header.movementKind})`;
  }

  protected customerMovementTypeLabel(document: CustomerMovementDocumentDto): string {
    const header = document.header;
    return header.documentTypeName || `Cari Evrakı (Tip ${header.documentType}, Cins ${header.movementKind})`;
  }

  protected companyOrderTypeLabel(document: CompanyOrderDocumentDto): string {
    const header = document.header;
    return header.orderTypeName || (header.orderType === 0 ? 'Alınan Firma Siparişi' : 'Verilen Firma Siparişi');
  }

  protected warehouseOrderTypeLabel(document: WarehouseOrderDocumentDto): string {
    const header = document.header;
    const outWh = header.outWarehouseName ? `${header.outWarehouseNo} - ${header.outWarehouseName}` : `Depo ${header.outWarehouseNo}`;
    const inWh = header.inWarehouseName ? `${header.inWarehouseNo} - ${header.inWarehouseName}` : `Depo ${header.inWarehouseNo}`;
    return `${outWh} → ${inWh}`;
  }

  protected inventoryCountTypeLabel(document: InventoryCountDocumentDto): string {
    const header = document.header;
    return `${header.warehouseNo} - ${header.warehouseName || 'Depo'}`;
  }

  protected selectCustomerMovementMatch(document: CustomerMovementDocumentDto): void {
    this.customerMovementMatches.set([]);
    this.applyCustomerMovement(document);
    this.feedback.set({
      tone: 'info',
      title: 'Evrak açıldı',
      message: `${document.header.documentSerie}-${document.header.documentOrderNo} düzenlemeye hazır.`
    });
  }

  protected selectCompanyOrderMatch(document: CompanyOrderDocumentDto): void {
    this.companyOrderMatches.set([]);
    this.applyCompanyOrder(document);
    this.feedback.set({
      tone: 'info',
      title: 'Sipariş açıldı',
      message: `${document.header.documentSerie}-${document.header.documentOrderNo} düzenlemeye hazır.`
    });
  }

  protected selectWarehouseOrderMatch(document: WarehouseOrderDocumentDto): void {
    this.warehouseOrderMatches.set([]);
    this.applyWarehouseOrder(document);
    this.feedback.set({
      tone: 'info',
      title: 'Sipariş açıldı',
      message: `${document.header.documentSerie}-${document.header.documentOrderNo} düzenlemeye hazır.`
    });
  }

  protected selectInventoryCountMatch(document: InventoryCountDocumentDto): void {
    this.inventoryCountMatches.set([]);
    this.applyInventoryCount(document);
    this.feedback.set({
      tone: 'info',
      title: 'Sayım fişi açıldı',
      message: `Depo: ${document.header.warehouseNo} · Evrak No: ${document.header.documentNo} düzenlemeye hazır.`
    });
  }

  protected trackByCustomerMovementMatch = (_: number, item: CustomerMovementDocumentDto): string =>
    `${item.header.documentSerie}-${item.header.documentOrderNo}-${item.header.documentType}`;

  protected trackByCompanyOrderMatch = (_: number, item: CompanyOrderDocumentDto): string =>
    `${item.header.documentSerie}-${item.header.documentOrderNo}-${item.header.orderType}-${item.header.warehouseNo}`;

  protected trackByWarehouseOrderMatch = (_: number, item: WarehouseOrderDocumentDto): string =>
    `${item.header.documentSerie}-${item.header.documentOrderNo}-${item.header.outWarehouseNo}-${item.header.inWarehouseNo}`;

  protected trackByInventoryCountMatch = (_: number, item: InventoryCountDocumentDto): string =>
    `${item.header.warehouseNo}-${item.header.documentNo}-${item.header.documentDate}`;

  protected matchesLineFilter(stockCode?: string | null, stockName?: string | null, description?: string | null): boolean {
    const query = this.lineSearchText().trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      (stockCode?.toLowerCase().includes(query) ?? false) ||
      (stockName?.toLowerCase().includes(query) ?? false) ||
      (description?.toLowerCase().includes(query) ?? false)
    );
  }

  protected toggleExpandAllLines(): void {
    this.expandAllLines.update(v => !v);
  }

  protected stockMovementWarehouseLabel(document: StockMovementDocumentDto): string {
    const header = document.header;
    const input = header.inputWarehouseNo > 0
      ? `${header.inputWarehouseNo}${header.inputWarehouseName ? ` - ${header.inputWarehouseName}` : ''}`
      : '';
    const output = header.outputWarehouseNo > 0
      ? `${header.outputWarehouseNo}${header.outputWarehouseName ? ` - ${header.outputWarehouseName}` : ''}`
      : '';

    if (output && input && output !== input) {
      return `${output} → ${input}`;
    }

    return output || input || 'Depo belirtilmemiş';
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

  protected async deleteStockMovement(hardDelete = false): Promise<void> {
    const document = this.stockMovement();
    if (!document || !this.canDelete() || !this.validateLookup(this.stockLookup)) {
      return;
    }

    const label = `${document.header.documentSerie}-${document.header.documentOrderNo}`;
    if (!(await this.confirmMovementDelete('stok hareket evraki', label, hardDelete))) {
      return;
    }

    this.busyAction.set('movement-delete');
    this.feedback.set(null);
    this.service
      .deleteStockMovementDocument({
        ...this.cleanLookup(this.stockLookup),
        hardDelete: hardDelete || null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.stockMovement.set(null);
          this.stockMovementDraft.set(null);
          this.stockMovementMatches.set([]);
          this.setDeleteFeedback('Stok hareket evraki silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Stok hareket evraki silinemedi.')
      });
  }

  protected loadInventoryCount(): void {
    if (!this.canDetail() || !this.validateInventoryCountSearch()) {
      return;
    }

    const searchRequest: InventoryCountDocumentSearchHttpRequest = {
      documentNo: this.inventoryCountLookup.documentNo,
      warehouseNo: this.inventoryCountLookup.warehouseNo > 0 ? this.inventoryCountLookup.warehouseNo : null,
      documentDate: this.inventoryCountLookup.documentDate?.trim() || null
    };

    this.busyAction.set('inventory-count-load');
    this.feedback.set(null);
    this.inventoryCountMatches.set([]);
    this.service
      .findInventoryCountDocuments(searchRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (documents: InventoryCountDocumentDto[]) => {
          if (documents.length === 0) {
            this.inventoryCount.set(null);
            this.inventoryCountDraft.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Evrak bulunamadı',
              message: 'Bu evrak numarasıyla eşleşen sayım sonucu fişi bulunamadı.'
            });
            return;
          }

          if (documents.length === 1) {
            this.applyInventoryCount(documents[0]);
            return;
          }

          this.inventoryCount.set(null);
          this.inventoryCountDraft.set(null);
          this.inventoryCountMatches.set(documents);
          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla evrak bulundu',
            message: `${documents.length} sayım fişinden düzenlemek istediğinizi seçin.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Sayım sonucu fişi getirilemedi.')
      });
  }

  protected saveInventoryCount(): void {
    const original = this.inventoryCount();
    const draft = this.inventoryCountDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildDocumentRequest(
      original,
      draft,
      this.cleanLookup(this.inventoryCountLookup),
      INVENTORY_COUNT_HEADER_FIELDS,
      INVENTORY_COUNT_LINE_FIELDS,
      'countGuid'
    ) as UpdateInventoryCountDocumentHttpRequest;

    if (!request.header && !request.lines?.length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek sayim sonucu degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('inventory-count-save');
    this.feedback.set(null);
    this.service
      .updateInventoryCountDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: InventoryCountDocumentUpdateResponse) => {
          this.applyInventoryCount(response.document);
          this.feedback.set({
            tone: 'success',
            title: 'Sayim sonucu guncellendi',
            message: `${response.summary.updatedRowCount} satir guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Sayim sonucu guncellenemedi.')
      });
  }

  protected loadCustomerMovement(): void {
    if (!this.canDetail() || !this.validateLookup(this.customerLookup)) {
      return;
    }

    const lookup: CustomerMovementDocumentLookupHttpRequest = {
      documentSerie: this.customerLookup.documentSerie,
      documentOrderNo: this.customerLookup.documentOrderNo,
      documentType: this.customerLookup.documentType ?? null,
      movementType: this.customerLookup.movementType ?? null,
      movementKind: this.customerLookup.movementKind ?? null,
      normalReturn: this.customerLookup.normalReturn ?? null,
      customerCode: this.customerLookup.customerCode?.trim() || null
    };

    this.busyAction.set('customer-load');
    this.feedback.set(null);
    this.customerMovementMatches.set([]);
    this.service
      .findCustomerMovementDocuments(this.cleanLookup(lookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (documents: CustomerMovementDocumentDto[]) => {
          if (documents.length === 0) {
            this.customerMovement.set(null);
            this.customerMovementDraft.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Evrak bulunamadı',
              message: 'Bu seri ve sıra numarasıyla eşleşen cari hareket evrakı bulunamadı.'
            });
            return;
          }

          if (documents.length === 1) {
            this.applyCustomerMovement(documents[0]);
            return;
          }

          this.customerMovement.set(null);
          this.customerMovementDraft.set(null);
          this.customerMovementMatches.set(documents);
          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla evrak bulundu',
            message: `${documents.length} eşleşmeden düzenlemek istediğiniz evrakı seçin.`
          });
        },
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

  protected async deleteCustomerMovement(hardDelete = false): Promise<void> {
    const document = this.customerMovement();
    if (!document || !this.canDelete() || !this.validateLookup(this.customerLookup)) {
      return;
    }

    const label = `${document.header.documentSerie}-${document.header.documentOrderNo}`;
    if (!(await this.confirmMovementDelete('cari hareket evraki', label, hardDelete))) {
      return;
    }

    this.busyAction.set('customer-delete');
    this.feedback.set(null);
    this.service
      .deleteCustomerMovementDocument({
        ...this.cleanLookup(this.customerLookup),
        hardDelete: hardDelete || null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.customerMovement.set(null);
          this.customerMovementDraft.set(null);
          this.setDeleteFeedback('Cari hareket evraki silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Cari hareket evraki silinemedi.')
      });
  }

  protected loadCompanyOrder(): void {
    if (!this.canDetail() || !this.validateLookup(this.companyOrderLookup)) {
      return;
    }

    const lookup: CompanyOrderDocumentLookupHttpRequest = {
      documentSerie: this.companyOrderLookup.documentSerie,
      documentOrderNo: this.companyOrderLookup.documentOrderNo,
      orderType: this.companyOrderLookup.orderType ?? null,
      orderKind: this.companyOrderLookup.orderKind ?? null,
      warehouseNo: (this.companyOrderLookup.warehouseNo ?? 0) > 0 ? this.companyOrderLookup.warehouseNo : null,
      customerCode: this.companyOrderLookup.customerCode?.trim() || null
    };

    this.busyAction.set('company-order-load');
    this.feedback.set(null);
    this.companyOrderMatches.set([]);
    this.service
      .findCompanyOrderDocuments(this.cleanLookup(lookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (documents: CompanyOrderDocumentDto[]) => {
          if (documents.length === 0) {
            this.companyOrder.set(null);
            this.companyOrderDraft.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Sipariş bulunamadı',
              message: 'Bu seri ve sıra numarasıyla eşleşen firma siparişi bulunamadı.'
            });
            return;
          }

          if (documents.length === 1) {
            this.applyCompanyOrder(documents[0]);
            return;
          }

          this.companyOrder.set(null);
          this.companyOrderDraft.set(null);
          this.companyOrderMatches.set(documents);
          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla sipariş bulundu',
            message: `${documents.length} eşleşmeden düzenlemek istediğiniz siparişi seçin.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Firma sipariş evrakı getirilemedi.')
      });
  }

  protected saveCompanyOrder(): void {
    const original = this.companyOrder();
    const draft = this.companyOrderDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildDocumentRequest(
      original,
      draft,
      this.cleanLookup(this.companyOrderLookup),
      [...COMPANY_ORDER_HEADER_FIELDS, ...COMPANY_ORDER_BOOLEAN_FIELDS],
      COMPANY_ORDER_LINE_FIELDS,
      'orderGuid'
    ) as UpdateCompanyOrderDocumentHttpRequest;

    if (!request.header && !request.lines?.length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek firma siparisi degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('company-order-save');
    this.feedback.set(null);
    this.service
      .updateCompanyOrderDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: CompanyOrderDocumentUpdateResponse) => {
          this.applyCompanyOrder(response.document);
          this.feedback.set({
            tone: 'success',
            title: 'Firma siparisi guncellendi',
            message: `${response.summary.updatedRowCount} satir guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Firma siparisi guncellenemedi.')
      });
  }

  protected async deleteCompanyOrder(hardDelete = false): Promise<void> {
    const document = this.companyOrder();
    if (!document || !this.canDelete() || !this.validateLookup(this.companyOrderLookup)) {
      return;
    }

    const label = `${document.header.documentSerie}-${document.header.documentOrderNo}`;
    if (!(await this.confirmMovementDelete('firma siparis evraki', label, hardDelete))) {
      return;
    }

    this.busyAction.set('company-order-delete');
    this.feedback.set(null);
    this.service
      .deleteCompanyOrderDocument({
        ...this.cleanLookup(this.companyOrderLookup),
        hardDelete: hardDelete || null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.companyOrder.set(null);
          this.companyOrderDraft.set(null);
          this.setDeleteFeedback('Firma siparis evraki silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Firma siparis evraki silinemedi.')
      });
  }

  protected loadWarehouseOrder(): void {
    if (!this.canDetail() || !this.validateLookup(this.warehouseOrderLookup)) {
      return;
    }

    const lookup: WarehouseOrderDocumentLookupHttpRequest = {
      documentSerie: this.warehouseOrderLookup.documentSerie,
      documentOrderNo: this.warehouseOrderLookup.documentOrderNo,
      warehouseNo: (this.warehouseOrderLookup.warehouseNo ?? 0) > 0 ? this.warehouseOrderLookup.warehouseNo : null,
      inWarehouseNo: (this.warehouseOrderLookup.inWarehouseNo ?? 0) > 0 ? this.warehouseOrderLookup.inWarehouseNo : null,
      outWarehouseNo: (this.warehouseOrderLookup.outWarehouseNo ?? 0) > 0 ? this.warehouseOrderLookup.outWarehouseNo : null
    };

    this.busyAction.set('warehouse-order-load');
    this.feedback.set(null);
    this.warehouseOrderMatches.set([]);
    this.service
      .findWarehouseOrderDocuments(this.cleanLookup(lookup))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (documents: WarehouseOrderDocumentDto[]) => {
          if (documents.length === 0) {
            this.warehouseOrder.set(null);
            this.warehouseOrderDraft.set(null);
            this.feedback.set({
              tone: 'error',
              title: 'Sipariş bulunamadı',
              message: 'Bu seri ve sıra numarasıyla eşleşen depo siparişi bulunamadı.'
            });
            return;
          }

          if (documents.length === 1) {
            this.applyWarehouseOrder(documents[0]);
            return;
          }

          this.warehouseOrder.set(null);
          this.warehouseOrderDraft.set(null);
          this.warehouseOrderMatches.set(documents);
          this.feedback.set({
            tone: 'info',
            title: 'Birden fazla sipariş bulundu',
            message: `${documents.length} eşleşmeden düzenlemek istediğiniz siparişi seçin.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Depo sipariş evrakı getirilemedi.')
      });
  }

  protected saveWarehouseOrder(): void {
    const original = this.warehouseOrder();
    const draft = this.warehouseOrderDraft();
    if (!original || !draft || !this.canUpdate()) {
      return;
    }

    const request = this.buildDocumentRequest(
      original,
      draft,
      this.cleanLookup(this.warehouseOrderLookup),
      [...WAREHOUSE_ORDER_HEADER_FIELDS, ...WAREHOUSE_ORDER_BOOLEAN_FIELDS],
      WAREHOUSE_ORDER_LINE_FIELDS,
      'orderGuid'
    ) as UpdateWarehouseOrderDocumentHttpRequest;

    if (!request.header && !request.lines?.length) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek depo siparisi degisikligi bulunmuyor.');
      return;
    }

    this.busyAction.set('warehouse-order-save');
    this.feedback.set(null);
    this.service
      .updateWarehouseOrderDocument(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: WarehouseOrderDocumentUpdateResponse) => {
          this.applyWarehouseOrder(response.document);
          this.feedback.set({
            tone: 'success',
            title: 'Depo siparisi guncellendi',
            message: `${response.summary.updatedRowCount} satir guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Depo siparisi guncellenemedi.')
      });
  }

  protected async deleteWarehouseOrder(hardDelete = false): Promise<void> {
    const document = this.warehouseOrder();
    if (!document || !this.canDelete() || !this.validateLookup(this.warehouseOrderLookup)) {
      return;
    }

    const label = `${document.header.documentSerie}-${document.header.documentOrderNo}`;
    if (!(await this.confirmMovementDelete('depo siparis evraki', label, hardDelete))) {
      return;
    }

    this.busyAction.set('warehouse-order-delete');
    this.feedback.set(null);
    this.service
      .deleteWarehouseOrderDocument({
        ...this.cleanLookup(this.warehouseOrderLookup),
        hardDelete: hardDelete || null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.warehouseOrder.set(null);
          this.warehouseOrderDraft.set(null);
          this.setDeleteFeedback('Depo siparis evraki silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Depo siparis evraki silinemedi.')
      });
  }

  protected resetStockCard(): void {
    const original = this.selectedStockCard();
    this.stockCardDraft.set(original ? this.clone(original) : null);
  }

  protected resetWarehouseCard(): void {
    const original = this.selectedWarehouseCard();
    this.warehouseCardDraft.set(original ? this.prepareWarehouseCard(original) : null);
  }

  protected resetCustomerCard(): void {
    const original = this.selectedCustomerCard();
    this.customerCardDraft.set(original ? this.clone(original) : null);
  }

  protected loadStockCardWarehouseSettings(): void {
    const stockCode = this.selectedStockCard()?.stockCode;
    if (!stockCode || !this.canDetail()) {
      return;
    }

    const warehouseNo =
      typeof this.warehouseFilterNo === 'number' &&
      Number.isFinite(this.warehouseFilterNo) &&
      this.warehouseFilterNo > 0
        ? this.warehouseFilterNo
        : undefined;

    this.warehouseBusyAction.set('load');
    this.service
      .getStockCardWarehouseSettings(stockCode, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.warehouseBusyAction.set(null))
      )
      .subscribe({
        next: (rows: StockCardWarehouseSettingsDto[]) => {
          this.stockCardWarehouseSettings.set(rows ?? []);
          const selectedWarehouseNo = this.selectedWarehouseSetting()?.warehouseNo;
          const selected =
            rows?.find((row) => row.warehouseNo === selectedWarehouseNo) ?? rows?.[0] ?? null;
          this.selectWarehouseSetting(selected);
        },
        error: (error: unknown) => {
          this.stockCardWarehouseSettings.set([]);
          this.selectWarehouseSetting(null);
          this.handleError(error, 'Stok kartının depo bazlı ayarları getirilemedi.');
        }
      });
  }

  protected selectWarehouseSetting(setting: StockCardWarehouseSettingsDto | null): void {
    this.selectedWarehouseSetting.set(setting ? this.clone(setting) : null);
    this.warehouseSettingDraft.set(setting ? this.clone(setting) : null);
  }

  protected setWarehouseField(
    draft: StockCardWarehouseSettingsDto,
    key: string,
    value: boolean
  ): void {
    (draft as unknown as EditableRecord)[key] = this.normalizeFieldInputValue(key, value);
    this.warehouseSettingDraft.set(this.clone(draft));
  }

  protected resetWarehouseDraft(): void {
    const original = this.selectedWarehouseSetting();
    this.warehouseSettingDraft.set(original ? this.clone(original) : null);
  }

  protected saveWarehouseSetting(resetToGlobal = false): void {
    const stockCode = this.selectedStockCard()?.stockCode;
    const original = this.selectedWarehouseSetting();
    const draft = this.warehouseSettingDraft();

    if (!stockCode || !original || !draft || !this.canUpdate()) {
      return;
    }

    const request = (
      resetToGlobal
        ? { resetToGlobal: true }
        : this.buildPatch(original, draft, STOCK_CARD_WAREHOUSE_FIELDS)
    ) as StockCardWarehousePatchHttpRequest;

    if (!resetToGlobal && !Object.keys(request).length) {
      this.setInfo('Değişiklik yok', 'Seçili depo için kaydedilecek bir değişiklik bulunmuyor.');
      return;
    }

    this.warehouseBusyAction.set('save');
    this.feedback.set(null);
    this.service
      .updateStockCardWarehouseSettings(stockCode, original.warehouseNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.warehouseBusyAction.set(null))
      )
      .subscribe({
        next: (response: StockCardWarehouseUpdateResponse) => {
          const updated = response.warehouseSettings;
          this.stockCardWarehouseSettings.update((rows) =>
            rows.map((row) => (row.warehouseNo === updated.warehouseNo ? updated : row))
          );
          this.selectWarehouseSetting(updated);
          this.feedback.set({
            tone: 'success',
            title: resetToGlobal ? 'Global ayarlara dönüldü' : 'Depo ayarı güncellendi',
            message: `${updated.warehouseNo} - ${updated.warehouseName} için ayarlar kaydedildi.`
          });
        },
        error: (error: unknown) =>
          this.handleError(error, 'Stok kartının depo bazlı ayarı güncellenemedi.')
      });
  }

  protected async deleteWarehouseSetting(): Promise<void> {
    const stockCode = this.selectedStockCard()?.stockCode;
    const setting = this.selectedWarehouseSetting();

    if (!stockCode || !setting || !setting.hasWarehouseDetail || !this.canDelete()) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Depo ozel stok ayari silinsin mi?',
      message: `${setting.warehouseNo} - ${setting.warehouseName} depo ozel stok ayari silinecek.`,
      confirmText: 'Sil',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.warehouseBusyAction.set('delete');
    this.feedback.set(null);
    this.service
      .deleteStockCardWarehouseSettings(stockCode, setting.warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.warehouseBusyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.selectWarehouseSetting(null);
          this.loadStockCardWarehouseSettings();
          this.setDeleteFeedback('Depo ozel stok ayari silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Depo ozel stok ayari silinemedi.')
      });
  }

  protected loadStockSalesPrices(): void {
    const stockCode = this.selectedStockCard()?.stockCode;
    if (!stockCode || !this.canDetail()) {
      return;
    }

    const warehouseNo = this.toPositiveNumber(this.salesPriceFilterWarehouseNo);

    this.busyAction.set('sales-price-load');
    this.service
      .getStockSalesPrices(stockCode, warehouseNo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (rows: StockSalesPriceDto[]) => {
          this.stockSalesPrices.set(rows ?? []);
          const selectedGuid = this.selectedSalesPrice()?.priceGuid;
          const selected =
            rows?.find((row) => row.priceGuid === selectedGuid) ?? rows?.[0] ?? null;
          this.selectSalesPrice(selected);
        },
        error: (error: unknown) => {
          this.stockSalesPrices.set([]);
          this.selectSalesPrice(null);
          this.handleError(error, 'Stok satis fiyatlari getirilemedi.');
        }
      });
  }

  protected selectSalesPrice(price: StockSalesPriceDto | null): void {
    this.selectedSalesPrice.set(price ? this.clone(price) : null);
    this.salesPriceDraft.set(price ? this.clone(price) : null);
  }

  protected resetSalesPriceDraft(): void {
    const original = this.selectedSalesPrice();
    this.salesPriceDraft.set(original ? this.clone(original) : null);
  }

  protected saveSalesPrice(): void {
    const stockCode = this.selectedStockCard()?.stockCode;
    const original = this.selectedSalesPrice();
    const draft = this.salesPriceDraft();

    if (!stockCode || !original || !draft || !this.canUpdate()) {
      return;
    }

    if (!this.changedSalesPriceFieldCount()) {
      this.setInfo('Degisiklik yok', 'Kaydedilecek satis fiyati degisikligi bulunmuyor.');
      return;
    }

    const request = this.buildSalesPriceRequest(draft);
    if (!this.validateSalesPriceRequest(original.warehouseNo, request)) {
      return;
    }

    this.upsertSalesPrice(stockCode, original.warehouseNo, request);
  }

  protected async deleteSalesPrice(): Promise<void> {
    const stockCode = this.selectedStockCard()?.stockCode;
    const price = this.selectedSalesPrice();

    if (!stockCode || !price || !this.canDelete()) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Satis fiyati silinsin mi?',
      message: `${price.warehouseNo} deposundaki ${price.priceListNo}/${price.unitPointer} satis fiyati silinecek.`,
      confirmText: 'Sil',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    const request: StockSalesPriceDeleteHttpRequest = {
      priceListNo: price.priceListNo,
      paymentPlanNo: price.paymentPlanNo,
      unitPointer: price.unitPointer
    };

    this.busyAction.set('sales-price-delete');
    this.feedback.set(null);
    this.service
      .deleteStockSalesPrice(stockCode, price.warehouseNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: MikroDocumentDeleteResponse) => {
          this.stockSalesPrices.update((rows) =>
            rows.filter((row) => !this.sameSalesPrice(row, price))
          );
          this.selectSalesPrice(null);
          this.setDeleteFeedback('Stok satis fiyati silindi', response);
        },
        error: (error: unknown) => this.handleError(error, 'Stok satis fiyati silinemedi.')
      });
  }

  protected saveNewSalesPrice(): void {
    const stockCode = this.selectedStockCard()?.stockCode;
    const warehouseNo = this.toPositiveNumber(this.newSalesPrice.warehouseNo);

    if (!stockCode || !warehouseNo || !this.canUpdate()) {
      this.setInfo('Depo no gerekli', 'Fiyat olusturmak veya guncellemek icin depo no girin.');
      return;
    }

    const request: StockSalesPriceUpsertHttpRequest = {
      priceListNo: this.toPositiveNumber(this.newSalesPrice.priceListNo) ?? 1,
      paymentPlanNo: this.toNonNegativeNumber(this.newSalesPrice.paymentPlanNo) ?? 0,
      unitPointer: this.toPositiveNumber(this.newSalesPrice.unitPointer) ?? 1,
      price: Number(this.newSalesPrice.price),
      currencyType: this.toNonNegativeNumber(this.newSalesPrice.currencyType) ?? 0,
      changeReason: this.toNonNegativeNumber(this.newSalesPrice.changeReason) ?? 4
    };

    if (!this.validateSalesPriceRequest(warehouseNo, request)) {
      return;
    }

    this.upsertSalesPrice(stockCode, warehouseNo, request);
  }

  protected resetStockMovement(): void {
    const original = this.stockMovement();
    this.stockMovementDraft.set(original ? this.prepareStockMovement(original) : null);
  }

  protected resetInventoryCount(): void {
    const original = this.inventoryCount();
    this.inventoryCountDraft.set(original ? this.prepareInventoryCount(original) : null);
  }

  protected resetCustomerMovement(): void {
    const original = this.customerMovement();
    this.customerMovementDraft.set(original ? this.prepareCustomerMovement(original) : null);
  }

  protected resetCompanyOrder(): void {
    const original = this.companyOrder();
    this.companyOrderDraft.set(original ? this.prepareCompanyOrder(original) : null);
  }

  protected resetWarehouseOrder(): void {
    const original = this.warehouseOrder();
    this.warehouseOrderDraft.set(original ? this.prepareWarehouseOrder(original) : null);
  }

  protected fieldValue(target: object, key: string): unknown {
    return (target as EditableRecord)[key];
  }

  protected setField(target: object, key: string, value: unknown): void {
    (target as EditableRecord)[key] = this.normalizeFieldInputValue(key, value);
    this.stockCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.salesPriceDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.warehouseCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.customerCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.stockMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.inventoryCountDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.customerMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.companyOrderDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.warehouseOrderDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.banknoteTrackDraft.update((draft) => (draft ? this.clone(draft) : null));
  }

  protected isFieldEditable(field: FieldDefinition): boolean {
    return this.getFieldMetadata(field)?.editable ?? true;
  }

  protected getFieldMaxLength(field: FieldDefinition): number | null {
    return this.getFieldMaxLengthByKey(field.key);
  }

  protected getFieldHint(field: FieldDefinition): string | null {
    const metadata = this.getFieldMetadata(field);

    if (!metadata) {
      return null;
    }

    const mikroColumn =
      metadata.mikroTable && metadata.mikroColumn && metadata.mikroColumn !== '-'
        ? `${metadata.mikroTable}.${metadata.mikroColumn}`
        : '';
    const parts = [mikroColumn, metadata.description?.trim()].filter(Boolean);

    return parts.length ? parts.join(' - ') : null;
  }

  protected sameSalesPriceForTemplate(
    left: StockSalesPriceDto | null,
    right: StockSalesPriceDto | null
  ): boolean {
    return !!left && !!right && this.sameSalesPrice(left, right);
  }

  protected trackByStockCode = (_index: number, row: StockCardListItemDto): string =>
    row.stockCode;
  protected trackByWarehouseCardNo = (_index: number, row: WarehouseCardListItemDto): number =>
    row.warehouseNo;
  protected trackByCustomerCode = (_index: number, row: CustomerCardListItemDto): string =>
    row.customerCode;
  protected trackByWarehouseNo = (
    _index: number,
    row: StockCardWarehouseSettingsDto
  ): number => row.warehouseNo;
  protected trackBySalesPrice = (_index: number, row: StockSalesPriceDto): string =>
    row.priceGuid ?? `${row.stockCode}-${row.priceListNo}-${row.warehouseNo}-${row.unitPointer}-${row.paymentPlanNo}`;
  protected trackByGuid = (
    _index: number,
    row:
      | StockMovementDocumentLineDto
      | InventoryCountDocumentLineDto
      | CustomerMovementDocumentLineDto
      | CompanyOrderDocumentLineDto
      | WarehouseOrderDocumentLineDto
  ): string => 'movementGuid' in row ? row.movementGuid : 'countGuid' in row ? row.countGuid : row.orderGuid;
  protected trackByStockMovementMatch = (
    _index: number,
    document: StockMovementDocumentDto
  ): string => {
    const header = document.header;
    return `${header.documentSerie}|${header.documentOrderNo}|${header.documentType}|${header.movementKind}|${header.normalReturn}|${header.inputWarehouseNo}|${header.outputWarehouseNo}`;
  };
  protected trackByField = (_index: number, field: FieldDefinition): string => field.key;

  private applyFieldCatalogLabels(): void {
    for (const context of this.fieldContexts) {
      for (const field of context.fields) {
        const metadata = this.getFieldMetadata(field);

        if (metadata?.displayName?.trim()) {
          const columnName = metadata.mikroColumn?.trim();
          field.label = columnName && columnName !== '-'
            ? `${metadata.displayName.trim()} (${columnName})`
            : metadata.displayName.trim();
        }
      }
    }
  }

  private getFieldMetadata(field: FieldDefinition): MikroDocumentFieldCatalogFieldDto | null {
    const context = this.getFieldContext(field);

    if (!context) {
      return null;
    }

    const fieldMap = this.fieldCatalogFieldMap();

    for (const apiField of this.getFieldApiCandidates(context, field.key)) {
      const metadata = fieldMap.get(`${context.sectionCode}|${apiField}`);

      if (metadata) {
        return metadata;
      }
    }

    const section = this.fieldCatalog()?.sections?.find(
      (item) => item.code === context.sectionCode
    );

    return (
      section?.fields?.find((metadata) =>
        this.getFieldApiCandidates(context, field.key).includes(metadata.apiField)
      ) ?? null
    );
  }

  private getFieldContext(field: FieldDefinition): FieldContext | null {
    return this.fieldContexts.find((context) => context.fields.includes(field)) ?? null;
  }

  private getFieldApiCandidates(context: FieldContext, key: string): string[] {
    if (context.scope === 'line') {
      return [`lines[].${key}`, key];
    }

    if (context.scope === 'header') {
      return [`header.${key}`, key];
    }

    return [key];
  }

  private normalizeFieldInputValue(key: string, value: unknown): unknown {
    const maxLength = this.getFieldMaxLengthByKey(key);

    if (typeof value === 'string' && maxLength !== null) {
      return value.slice(0, maxLength);
    }

    return value;
  }

  private getFieldMaxLengthByKey(key: string): number | null {
    if (key === 'postalCode') {
      return 10;
    }

    return /^special[123]$/i.test(key) ? 4 : null;
  }

  private upsertSalesPrice(
    stockCode: string,
    warehouseNo: number,
    request: StockSalesPriceUpsertHttpRequest
  ): void {
    this.busyAction.set('sales-price-save');
    this.feedback.set(null);
    this.service
      .upsertStockSalesPrice(stockCode, warehouseNo, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyAction.set(null))
      )
      .subscribe({
        next: (response: StockSalesPriceUpsertResponse) => {
          const updated = response.salesPrice;
          this.stockSalesPrices.update((rows) => {
            const index = rows.findIndex((row) => this.sameSalesPrice(row, updated));
            if (index < 0) {
              return [updated, ...rows];
            }

            return rows.map((row, rowIndex) => (rowIndex === index ? updated : row));
          });
          this.selectSalesPrice(updated);
          this.feedback.set({
            tone: 'success',
            title: response.created ? 'Satis fiyati olusturuldu' : 'Satis fiyati guncellendi',
            message:
              response.previousPrice == null
                ? `${updated.warehouseNo} deposunda fiyat ${updated.price} olarak kaydedildi.`
                : `${updated.warehouseNo} deposunda fiyat ${response.previousPrice} -> ${updated.price} olarak guncellendi.`
          });
        },
        error: (error: unknown) => this.handleError(error, 'Stok satis fiyati kaydedilemedi.')
      });
  }

  private buildSalesPriceRequest(price: StockSalesPriceDto): StockSalesPriceUpsertHttpRequest {
    return {
      priceListNo: this.toPositiveNumber(price.priceListNo) ?? 1,
      paymentPlanNo: this.toNonNegativeNumber(price.paymentPlanNo) ?? 0,
      unitPointer: this.toPositiveNumber(price.unitPointer) ?? 1,
      price: Number(price.price),
      currencyType: this.toNonNegativeNumber(price.currencyType) ?? 0,
      changeReason: this.toNonNegativeNumber(price.changeReason) ?? 4
    };
  }

  private validateSalesPriceRequest(
    warehouseNo: number,
    request: StockSalesPriceUpsertHttpRequest
  ): boolean {
    if (!Number.isFinite(warehouseNo) || warehouseNo <= 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Depo no gecersiz',
        message: 'Satis fiyati icin sifirdan buyuk bir depo no girin.'
      });
      return false;
    }

    if (!Number.isFinite(request.price) || request.price <= 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Fiyat gecersiz',
        message: 'Satis fiyati sifirdan buyuk olmalidir.'
      });
      return false;
    }

    return true;
  }

  private sameSalesPrice(left: StockSalesPriceDto, right: StockSalesPriceDto): boolean {
    if (left.priceGuid && right.priceGuid) {
      return left.priceGuid === right.priceGuid;
    }

    return (
      left.stockCode === right.stockCode &&
      left.priceListNo === right.priceListNo &&
      left.warehouseNo === right.warehouseNo &&
      left.unitPointer === right.unitPointer &&
      left.paymentPlanNo === right.paymentPlanNo
    );
  }

  private applyStockCard(card: StockCardDetailDto): void {
    this.selectedStockCard.set(this.clone(card));
    this.stockCardDraft.set(this.clone(card));
  }

  private applyWarehouseCard(card: WarehouseCardDetailDto): void {
    const prepared = this.prepareWarehouseCard(card);
    this.selectedWarehouseCard.set(this.clone(prepared));
    this.warehouseCardDraft.set(this.clone(prepared));
  }

  private applyCustomerCard(card: CustomerCardDetailDto): void {
    this.selectedCustomerCard.set(this.clone(card));
    this.customerCardDraft.set(this.clone(card));
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
          : null,
      movementKind: prepared.header.movementKind,
      normalReturn: prepared.header.normalReturn,
      inputWarehouseNo: prepared.header.inputWarehouseNo,
      outputWarehouseNo: prepared.header.outputWarehouseNo
    };
    this.stockMovement.set(this.clone(prepared));
    this.stockMovementDraft.set(this.clone(prepared));
  }

  private applyInventoryCount(document: InventoryCountDocumentDto): void {
    const prepared = this.prepareInventoryCount(document);
    this.inventoryCountLookup = {
      ...this.inventoryCountLookup,
      warehouseNo: prepared.header.warehouseNo,
      documentNo: prepared.header.documentNo,
      documentDate: prepared.header.documentDate
    };
    this.inventoryCount.set(this.clone(prepared));
    this.inventoryCountDraft.set(this.clone(prepared));
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

  private applyCompanyOrder(document: CompanyOrderDocumentDto): void {
    const prepared = this.prepareCompanyOrder(document);
    this.companyOrderLookup = {
      ...this.companyOrderLookup,
      documentSerie: prepared.header.documentSerie,
      documentOrderNo: prepared.header.documentOrderNo,
      orderType: prepared.header.orderType,
      orderKind: prepared.header.orderKind,
      warehouseNo: prepared.header.warehouseNo,
      customerCode: prepared.header.customerCode
    };
    this.companyOrder.set(this.clone(prepared));
    this.companyOrderDraft.set(this.clone(prepared));
  }

  private applyWarehouseOrder(document: WarehouseOrderDocumentDto): void {
    const prepared = this.prepareWarehouseOrder(document);
    this.warehouseOrderLookup = {
      ...this.warehouseOrderLookup,
      documentSerie: prepared.header.documentSerie,
      documentOrderNo: prepared.header.documentOrderNo,
      warehouseNo: this.warehouseOrderLookup.warehouseNo,
      inWarehouseNo: prepared.header.inWarehouseNo,
      outWarehouseNo: prepared.header.outWarehouseNo
    };
    this.warehouseOrder.set(this.clone(prepared));
    this.warehouseOrderDraft.set(this.clone(prepared));
  }

  private applyBanknoteTrack(track: BanknoteTrackDetailDto): void {
    const prepared = this.clone(track);
    prepared.banknoteTrackDate = this.toDateInput(prepared.banknoteTrackDate);
    this.banknoteTrackLookup = {
      ...this.banknoteTrackLookup,
      banknoteTrackId: prepared.banknoteTrackId,
      warehouseNo: prepared.warehouseNo
    };
    this.banknoteTrack.set(this.clone(prepared));
    this.banknoteTrackDraft.set(this.clone(prepared));
  }

  private prepareStockMovement(document: StockMovementDocumentDto): StockMovementDocumentDto {
    const clone = this.clone(document);
    clone.header.movementDate = this.toDateInput(clone.header.movementDate);
    clone.header.documentDate = this.toDateInput(clone.header.documentDate);
    clone.header.goodsAcceptanceDate = this.toDateInput(clone.header.goodsAcceptanceDate);
    clone.lines.forEach((line) => {
      line.goodsAcceptanceDate = this.toDateInput(line.goodsAcceptanceDate);
    });
    return clone;
  }

  private prepareInventoryCount(document: InventoryCountDocumentDto): InventoryCountDocumentDto {
    const clone = this.clone(document);
    clone.header.documentDate = this.toDateInput(clone.header.documentDate);
    return clone;
  }

  private prepareWarehouseCard(card: WarehouseCardDetailDto): WarehouseCardDetailDto {
    const clone = this.clone(card);
    clone.lockDate = clone.lockDate ? this.toDateInput(clone.lockDate) : null;
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

  private prepareCompanyOrder(document: CompanyOrderDocumentDto): CompanyOrderDocumentDto {
    const clone = this.clone(document);
    clone.header.orderDate = this.toDateInput(clone.header.orderDate);
    clone.header.deliveryDate = clone.header.deliveryDate ? this.toDateInput(clone.header.deliveryDate) : null;
    clone.header.documentDate = clone.header.documentDate ? this.toDateInput(clone.header.documentDate) : null;
    clone.lines.forEach((line) => {
      line.deliveryDate = line.deliveryDate ? this.toDateInput(line.deliveryDate) : null;
      line.validUntil = line.validUntil ? this.toDateInput(line.validUntil) : null;
    });
    return clone;
  }

  private prepareWarehouseOrder(
    document: WarehouseOrderDocumentDto
  ): WarehouseOrderDocumentDto {
    const clone = this.clone(document);
    clone.header.orderDate = this.toDateInput(clone.header.orderDate);
    clone.header.deliveryDate = clone.header.deliveryDate ? this.toDateInput(clone.header.deliveryDate) : null;
    clone.header.documentDate = clone.header.documentDate ? this.toDateInput(clone.header.documentDate) : null;
    clone.lines.forEach((line) => {
      line.deliveryDate = line.deliveryDate ? this.toDateInput(line.deliveryDate) : null;
      line.validUntil = line.validUntil ? this.toDateInput(line.validUntil) : null;
    });
    return clone;
  }

  private buildDocumentRequest<TLookup extends object>(
    original: { header: object; lines: object[] },
    draft: { header: object; lines: object[] },
    lookup: TLookup,
    headerFields: readonly FieldDefinition[],
    lineFields: readonly FieldDefinition[],
    lineKey = 'movementGuid'
  ): { lookup: TLookup; header?: EditableRecord; lines?: EditableRecord[] } {
    const header = this.buildPatch(original.header, draft.header, headerFields);
    const originalLines = new Map(
      original.lines.map((line) => {
        const record = line as EditableRecord;
        return [String(record[lineKey] ?? ''), record] as const;
      })
    );
    const lines = draft.lines.flatMap((line) => {
      const record = line as EditableRecord;
      const lineKeyValue = String(record[lineKey] ?? '');
      const originalLine = originalLines.get(lineKeyValue);
      if (!originalLine) {
        return [];
      }

      const patch = this.buildPatch(originalLine, record, lineFields);
      return Object.keys(patch).length ? [{ [lineKey]: lineKeyValue, ...patch }] : [];
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
        !this.isFieldEditable(field) ||
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
    original: { header: object; lines: object[] } | null,
    draft: { header: object; lines: object[] } | null,
    headerFields: readonly FieldDefinition[],
    lineFields: readonly FieldDefinition[],
    lineKey = 'movementGuid'
  ): number {
    if (!original || !draft) {
      return 0;
    }

    const headerCount = Object.keys(
      this.buildPatch(original.header, draft.header, headerFields)
    ).length;
    const originalLines = new Map(
      original.lines.map((line) => {
        const record = line as EditableRecord;
        return [String(record[lineKey] ?? ''), record] as const;
      })
    );
    const lineCount = draft.lines.reduce((count, line) => {
      const record = line as EditableRecord;
      const originalLine = originalLines.get(String(record[lineKey] ?? ''));
      return (
        count +
        (originalLine ? Object.keys(this.buildPatch(originalLine, record, lineFields)).length : 0)
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

  private validateInventoryCountSearch(): boolean {
    const lookup = this.inventoryCountLookup;
    if (!Number.isFinite(lookup.documentNo) || lookup.documentNo <= 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Evrak no zorunlu',
        message: 'Sayım sonucunu aramak için sıfırdan büyük evrak numarası girin.'
      });
      return false;
    }

    return true;
  }

  private validateInventoryCountLookup(): boolean {
    const lookup = this.inventoryCountLookup;
    if (
      !Number.isFinite(lookup.warehouseNo) ||
      lookup.warehouseNo <= 0 ||
      !Number.isFinite(lookup.documentNo) ||
      lookup.documentNo <= 0 ||
      !lookup.documentDate?.trim()
    ) {
      this.feedback.set({
        tone: 'error',
        title: 'Sayim bilgileri zorunlu',
        message: 'Sayim sonucunu getirmek icin depo no, evrak no ve sayim tarihini girin.'
      });
      return false;
    }

    return true;
  }

  private validateWarehouseCard(card: WarehouseCardDetailDto): boolean {
    const latitude = this.toNullableNumber((card as unknown as EditableRecord)['latitude']);
    const longitude = this.toNullableNumber((card as unknown as EditableRecord)['longitude']);

    if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      this.feedback.set({
        tone: 'error',
        title: 'Enlem gecersiz',
        message: 'Depo kartinda latitude -90 ile 90 arasinda olmalidir.'
      });
      return false;
    }

    if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      this.feedback.set({
        tone: 'error',
        title: 'Boylam gecersiz',
        message: 'Depo kartinda longitude -180 ile 180 arasinda olmalidir.'
      });
      return false;
    }

    card.latitude = latitude;
    card.longitude = longitude;
    return true;
  }

  private validateBanknoteTrack(track: BanknoteTrackDetailDto): boolean {
    if (!track.banknoteTrackDate) {
      this.feedback.set({
        tone: 'error',
        title: 'Tarih gerekli',
        message: 'Banknot takip tarihi bos olamaz.'
      });
      return false;
    }

    if (!Number.isFinite(Number(track.warehouseNo)) || Number(track.warehouseNo) <= 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Depo no gecersiz',
        message: 'Banknot takip kaydi icin sifirdan buyuk depo no girin.'
      });
      return false;
    }

    if (Number(track.totalAmount) < 0 || Number(track.deliveryTotalAmount) < 0) {
      this.feedback.set({
        tone: 'error',
        title: 'Toplam gecersiz',
        message: 'Sayim ve teslim toplam tutarlari negatif olamaz.'
      });
      return false;
    }

    if ((track.deliverer ?? '').length > 100 || (track.receiver ?? '').length > 100) {
      this.feedback.set({
        tone: 'error',
        title: 'Isim cok uzun',
        message: 'Teslim eden ve teslim alan alanlari en fazla 100 karakter olmalidir.'
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
      (user?.permissions ?? []).includes(code) ||
      this.authService.getTaskPermissionCodes('mikro-evrak-duzenleme').includes(code)
    );
  }

  private handleError(error: unknown, fallback: string): void {
    const httpError = error as HttpErrorResponse;
    const conflictMessage =
      httpError?.status === 409
        ? 'Ayni seri-sira birden fazla evrakla eslesti. Evrak/hareket filtreleri, siparis tipi/cinsi veya depo/cari filtreleriyle aramayi daraltin.'
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

  private setDeleteFeedback(title: string, response: MikroDocumentDeleteResponse): void {
    this.feedback.set({
      tone: 'success',
      title,
      message: `${response.deletedRowCount} satir silindi (${response.deletionMode}).`
    });
  }

  private async confirmMovementDelete(
    kind: string,
    label: string,
    hardDelete: boolean
  ): Promise<boolean> {
    if (!hardDelete) {
      return this.confirmDialog.confirm({
        title: 'Evrak soft-delete yapilsin mi?',
        message: `${label} ${kind} soft-delete yapilacak.`,
        confirmText: 'Soft Delete',
        tone: 'danger'
      });
    }

    const confirmation = await this.confirmDialog.prompt({
      title: 'Fiziksel silme onayi',
      message: `${label} ${kind} FIZIKSEL olarak silinecek.`,
      details: 'Bu islem geri alinamaz.',
      confirmText: 'Fiziksel Sil',
      tone: 'danger',
      input: {
        label: 'Evrak anahtari',
        placeholder: label,
        expectedValue: label,
        required: true
      }
    });

    return confirmation?.trim() === label;
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    return left === right || (left == null && right == null);
  }

  private toDateInput(value: string): string {
    return value?.slice(0, 10) ?? '';
  }

  private toPositiveNumber(value: unknown): number | undefined {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
  }

  private toNonNegativeNumber(value: unknown): number | undefined {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
  }

  private toNullableNumber(value: unknown): number | null {
    return value === null || value === undefined || value === '' ? null : Number(value);
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
