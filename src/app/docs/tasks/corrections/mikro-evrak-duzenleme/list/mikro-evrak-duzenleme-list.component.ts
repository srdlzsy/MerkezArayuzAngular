import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import type {
  CustomerCardDetailDto,
  CustomerCardListItemDto,
  CustomerCardPatchHttpRequest,
  CustomerCardUpdateResponse,
  CustomerMovementDocumentDto,
  CustomerMovementDocumentLineDto,
  CustomerMovementDocumentLookupHttpRequest,
  CustomerMovementDocumentUpdateResponse,
  StockCardDetailDto,
  StockCardListItemDto,
  StockCardPatchHttpRequest,
  StockCardUpdateResponse,
  StockCardWarehousePatchHttpRequest,
  StockCardWarehouseSettingsDto,
  StockCardWarehouseUpdateResponse,
  StockSalesPriceDto,
  StockSalesPriceUpsertHttpRequest,
  StockSalesPriceUpsertResponse,
  StockMovementDocumentDto,
  StockMovementDocumentLineDto,
  StockMovementDocumentLookupHttpRequest,
  StockMovementDocumentUpdateResponse,
  UpdateCustomerMovementDocumentHttpRequest,
  UpdateStockMovementDocumentHttpRequest,
  WarehouseCardDetailDto,
  WarehouseCardListItemDto,
  WarehouseCardPatchHttpRequest,
  WarehouseCardUpdateResponse
} from '@interfaces';

import { DuzeltmeIslemleriService } from '../../../../../core/api/module-services/duzeltme-islemleri.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { DOCS_PAGES } from '../../../../config/docs-pages.config';
import { DocsContentPage } from '../../../../models/docs.models';
import { getErrorMessage } from '../../../settings/settings-task.helpers';

type EditorTab =
  | 'stock-card'
  | 'warehouse-card'
  | 'customer-card'
  | 'stock-movement'
  | 'customer-movement';
type BusyAction =
  | 'stock-search'
  | 'stock-detail'
  | 'stock-save'
  | 'warehouse-card-search'
  | 'warehouse-card-detail'
  | 'warehouse-card-save'
  | 'customer-card-search'
  | 'customer-card-detail'
  | 'customer-card-save'
  | 'sales-price-load'
  | 'sales-price-save'
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

const STOCK_CARD_WAREHOUSE_FIELDS: readonly FieldDefinition[] = [
  { key: 'salesStopped', label: 'Satış Durduruldu' },
  { key: 'orderStopped', label: 'Sipariş Durduruldu' },
  { key: 'receivingStopped', label: 'Mal Kabul Durduruldu' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'discountDisabled', label: 'İskonto Kapalı' }
];

const STOCK_SALES_PRICE_FIELDS: readonly FieldDefinition[] = [
  { key: 'priceListNo', label: 'Fiyat Liste No', type: 'number' },
  { key: 'paymentPlanNo', label: 'Odeme Plani', type: 'number' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'price', label: 'Fiyat', type: 'number' },
  { key: 'currencyType', label: 'Doviz Tipi', type: 'number' },
  { key: 'changeReason', label: 'Degisim Nedeni', type: 'number' }
];

const WAREHOUSE_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
  { key: 'name', label: 'Depo Adi', wide: true },
  { key: 'groupCode', label: 'Grup Kodu' },
  { key: 'accountingCode', label: 'Muhasebe Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'regionCode', label: 'Bolge Kodu' },
  { key: 'street', label: 'Cadde/Sokak', wide: true },
  { key: 'neighborhood', label: 'Mahalle' },
  { key: 'avenue', label: 'Bulvar' },
  { key: 'quarter', label: 'Semt' },
  { key: 'apartmentNo', label: 'Bina No' },
  { key: 'apartmentUnitNo', label: 'Daire No' },
  { key: 'postalCode', label: 'Posta Kodu' },
  { key: 'district', label: 'Ilce' },
  { key: 'city', label: 'Il' },
  { key: 'country', label: 'Ulke' },
  { key: 'addressCode', label: 'Adres Kodu' },
  { key: 'authorizedEmail', label: 'Yetkili E-posta', wide: true },
  { key: 'phoneCountryCode', label: 'Tel Ulke' },
  { key: 'phoneAreaCode', label: 'Tel Alan' },
  { key: 'phoneNo1', label: 'Telefon 1' },
  { key: 'phoneNo2', label: 'Telefon 2' },
  { key: 'faxNo', label: 'Faks' }
];

const WAREHOUSE_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
  { key: 'warehouseType', label: 'Depo Tipi', type: 'number' },
  { key: 'movementType', label: 'Hareket Tipi', type: 'number' },
  { key: 'shipmentAutoPriceType', label: 'Sevk Oto Fiyat', type: 'number' },
  { key: 'shipmentAppliedPriceNo', label: 'Sevk Fiyat No', type: 'number' },
  { key: 'latitude', label: 'Enlem', type: 'number' },
  { key: 'longitude', label: 'Boylam', type: 'number' },
  { key: 'detailTrackingType', label: 'Detay Takip', type: 'number' }
];

const WAREHOUSE_CARD_DATE_FIELDS: readonly FieldDefinition[] = [
  { key: 'lockDate', label: 'Kilit Tarihi', type: 'date' }
];

const WAREHOUSE_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'excludedFromInventory', label: 'Envanter Disi' },
  { key: 'outgoingEDespatchEnabled', label: 'Giden E-Irsaliye' },
  { key: 'incomingEDespatchEnabled', label: 'Gelen E-Irsaliye' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'isHidden', label: 'Gizli' },
  { key: 'isLocked', label: 'Kilitli' }
];

const CUSTOMER_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
  { key: 'title1', label: 'Unvan 1', wide: true },
  { key: 'title2', label: 'Unvan 2', wide: true },
  { key: 'accountingCode', label: 'Muhasebe Kodu' },
  { key: 'accountingCode1', label: 'Muhasebe Kodu 1' },
  { key: 'accountingCode2', label: 'Muhasebe Kodu 2' },
  { key: 'taxOffice', label: 'Vergi Dairesi' },
  { key: 'taxOfficeNo', label: 'Vergi Daire No' },
  { key: 'registryNo', label: 'Sicil No' },
  { key: 'taxNo', label: 'Vergi No' },
  { key: 'taxOfficeCode', label: 'Vergi Daire Kodu' },
  { key: 'parentCustomerCode', label: 'Ana Cari Kodu' },
  { key: 'sectorCode', label: 'Sektor' },
  { key: 'regionCode', label: 'Bolge' },
  { key: 'groupCode', label: 'Grup' },
  { key: 'representativeCode', label: 'Temsilci' },
  { key: 'website', label: 'Web Sitesi' },
  { key: 'email', label: 'E-posta', wide: true },
  { key: 'mobilePhone', label: 'Cep Telefonu' },
  { key: 'kepAddress', label: 'KEP Adresi', wide: true },
  { key: 'reconciliationEmail', label: 'Mutabakat E-posta', wide: true },
  { key: 'mersisNo', label: 'Mersis No' }
];

const CUSTOMER_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
  { key: 'movementType', label: 'Hareket Tipi', type: 'number' },
  { key: 'connectionType', label: 'Baglanti Tipi', type: 'number' },
  { key: 'purchaseStockType', label: 'Alis Stok Tipi', type: 'number' },
  { key: 'salesStockType', label: 'Satis Stok Tipi', type: 'number' },
  { key: 'currencyType', label: 'Doviz Tipi', type: 'number' },
  { key: 'currencyType1', label: 'Doviz Tipi 1', type: 'number' },
  { key: 'currencyType2', label: 'Doviz Tipi 2', type: 'number' },
  { key: 'salesPriceListNo', label: 'Satis Fiyat Listesi', type: 'number' },
  { key: 'paymentType', label: 'Odeme Tipi', type: 'number' },
  { key: 'paymentDay', label: 'Odeme Gunu', type: 'number' },
  { key: 'paymentPlanNo', label: 'Odeme Plani', type: 'number' },
  { key: 'optionDay', label: 'Opsiyon Gunu', type: 'number' },
  { key: 'invoiceAddressNo', label: 'Fatura Adres No', type: 'number' },
  { key: 'shippingAddressNo', label: 'Sevk Adres No', type: 'number' },
  { key: 'defaultEInvoiceType', label: 'Vars. E-Fatura Tipi', type: 'number' },
  { key: 'defaultEDespatchType', label: 'Vars. E-Irsaliye Tipi', type: 'number' },
  { key: 'defaultInputWarehouseNo', label: 'Vars. Giris Depo', type: 'number' },
  { key: 'defaultOutputWarehouseNo', label: 'Vars. Cikis Depo', type: 'number' }
];

const CUSTOMER_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'isClosed', label: 'Kapali' },
  { key: 'isLocked', label: 'Kilitli' },
  { key: 'eInvoiceEnabled', label: 'E-Fatura' },
  { key: 'eDespatchEnabled', label: 'E-Irsaliye' },
  { key: 'retailCustomer', label: 'Perakende Cari' }
];

const STOCK_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'movementDate', label: 'Hareket Tarihi', type: 'date' },
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'goodsAcceptanceDate', label: 'Mal Kabul Tarihi', type: 'date' },
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
  { key: 'goodsAcceptanceDate', label: 'Mal Kabul Tarihi', type: 'date' },
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
    { id: 'warehouse-card' as const, label: 'Depo Karti', icon: 'fa-warehouse' },
    { id: 'customer-card' as const, label: 'Cari Karti', icon: 'fa-address-card' },
    { id: 'stock-movement' as const, label: 'Stok Hareketi', icon: 'fa-right-left' },
    { id: 'customer-movement' as const, label: 'Cari Hareketi', icon: 'fa-receipt' }
  ];
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
  protected readonly stockCardWarehouseSettings = signal<StockCardWarehouseSettingsDto[]>([]);
  protected readonly selectedWarehouseSetting = signal<StockCardWarehouseSettingsDto | null>(null);
  protected readonly warehouseSettingDraft = signal<StockCardWarehouseSettingsDto | null>(null);
  protected readonly warehouseBusyAction = signal<'load' | 'save' | null>(null);
  protected readonly stockSalesPrices = signal<StockSalesPriceDto[]>([]);
  protected readonly selectedSalesPrice = signal<StockSalesPriceDto | null>(null);
  protected readonly salesPriceDraft = signal<StockSalesPriceDto | null>(null);
  protected readonly warehouseCards = signal<WarehouseCardListItemDto[]>([]);
  protected readonly selectedWarehouseCard = signal<WarehouseCardDetailDto | null>(null);
  protected readonly warehouseCardDraft = signal<WarehouseCardDetailDto | null>(null);
  protected readonly customerCards = signal<CustomerCardListItemDto[]>([]);
  protected readonly selectedCustomerCard = signal<CustomerCardDetailDto | null>(null);
  protected readonly customerCardDraft = signal<CustomerCardDetailDto | null>(null);
  protected readonly stockMovement = signal<StockMovementDocumentDto | null>(null);
  protected readonly stockMovementDraft = signal<StockMovementDocumentDto | null>(null);
  protected readonly customerMovement = signal<CustomerMovementDocumentDto | null>(null);
  protected readonly customerMovementDraft = signal<CustomerMovementDocumentDto | null>(null);

  protected stockSearch = {
    searchText: '',
    includePassive: false,
    take: 50
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
    (draft as unknown as EditableRecord)[key] = value;
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
    this.salesPriceDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.warehouseCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.customerCardDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.stockMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
    this.customerMovementDraft.update((draft) => (draft ? this.clone(draft) : null));
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
    row: StockMovementDocumentLineDto | CustomerMovementDocumentLineDto
  ): string => row.movementGuid;
  protected trackByField = (_index: number, field: FieldDefinition): string => field.key;

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
    clone.header.goodsAcceptanceDate = this.toDateInput(clone.header.goodsAcceptanceDate);
    clone.lines.forEach((line) => {
      line.goodsAcceptanceDate = this.toDateInput(line.goodsAcceptanceDate);
    });
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
