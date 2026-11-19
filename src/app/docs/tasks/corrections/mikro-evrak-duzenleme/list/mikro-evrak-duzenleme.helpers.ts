export type EditorTab =
  | 'stock-card'
  | 'warehouse-card'
  | 'customer-card'
  | 'stock-movement'
  | 'inventory-count'
  | 'customer-movement'
  | 'company-order'
  | 'warehouse-order'
  | 'banknote-track';

export type BusyAction =
  | 'document-search'
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
  | 'sales-price-delete'
  | 'movement-load'
  | 'movement-save'
  | 'movement-delete'
  | 'inventory-count-load'
  | 'inventory-count-save'
  | 'customer-load'
  | 'customer-save'
  | 'customer-delete'
  | 'company-order-load'
  | 'company-order-save'
  | 'company-order-delete'
  | 'warehouse-order-load'
  | 'warehouse-order-save'
  | 'warehouse-order-delete'
  | 'banknote-track-load'
  | 'banknote-track-save'
  | 'banknote-track-delete';

export type EditableRecord = Record<string, unknown>;

export interface Feedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'checkbox';
  wide?: boolean;
}

export interface FieldContext {
  sectionCode: EditorTab | 'stock-sales-price' | 'stock-card-warehouse';
  scope: 'body' | 'header' | 'line';
  fields: readonly FieldDefinition[];
}

export const MIKRO_EDITOR_TABS = [
  { id: 'stock-card' as const, label: 'Stok Kartı', icon: 'fa-box' },
  { id: 'warehouse-card' as const, label: 'Depo Karti', icon: 'fa-warehouse' },
  { id: 'customer-card' as const, label: 'Cari Karti', icon: 'fa-address-card' },
  { id: 'stock-movement' as const, label: 'Stok Hareketi', icon: 'fa-right-left' },
  { id: 'inventory-count' as const, label: 'Sayim Sonucu', icon: 'fa-clipboard-list' },
  { id: 'customer-movement' as const, label: 'Cari Hareketi', icon: 'fa-receipt' },
  { id: 'company-order' as const, label: 'Firma Siparisi', icon: 'fa-file-invoice' },
  { id: 'warehouse-order' as const, label: 'Depo Siparisi', icon: 'fa-truck-ramp-box' },
  { id: 'banknote-track' as const, label: 'Banknot Takibi', icon: 'fa-money-bill-wave' }
] as const;

export const STOCK_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
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
  { key: 'shelfCode', label: 'Raf Kodu' },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' }
];

export const STOCK_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
  { key: 'stockType', label: 'Stok Tipi', type: 'number' },
  { key: 'currencyType', label: 'Döviz Tipi', type: 'number' },
  { key: 'trackingType', label: 'Takip Tipi', type: 'number' },
  { key: 'retailTaxPointer', label: 'Perakende Vergi', type: 'number' },
  { key: 'wholesaleTaxPointer', label: 'Toptan Vergi', type: 'number' }
];

export const STOCK_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'salesStopped', label: 'Satış Durduruldu' },
  { key: 'orderStopped', label: 'Sipariş Durduruldu' },
  { key: 'receivingStopped', label: 'Kabul Durduruldu' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'discountDisabled', label: 'İskonto Kapalı' }
];

export const STOCK_CARD_WAREHOUSE_FIELDS: readonly FieldDefinition[] = [
  { key: 'salesStopped', label: 'Satış Durduruldu' },
  { key: 'orderStopped', label: 'Sipariş Durduruldu' },
  { key: 'receivingStopped', label: 'Mal Kabul Durduruldu' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'discountDisabled', label: 'İskonto Kapalı' }
];

export const STOCK_SALES_PRICE_FIELDS: readonly FieldDefinition[] = [
  { key: 'priceListNo', label: 'Fiyat Liste No', type: 'number' },
  { key: 'paymentPlanNo', label: 'Odeme Plani', type: 'number' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'price', label: 'Fiyat', type: 'number' },
  { key: 'currencyType', label: 'Doviz Tipi', type: 'number' },
  { key: 'changeReason', label: 'Degisim Nedeni', type: 'number' }
];

export const WAREHOUSE_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
  { key: 'name', label: 'Depo Adi', wide: true },
  { key: 'groupCode', label: 'Grup Kodu' },
  { key: 'accountingCode', label: 'Muhasebe Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
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

export const WAREHOUSE_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
  { key: 'warehouseType', label: 'Depo Tipi', type: 'number' },
  { key: 'movementType', label: 'Hareket Tipi', type: 'number' },
  { key: 'shipmentAutoPriceType', label: 'Sevk Oto Fiyat', type: 'number' },
  { key: 'shipmentAppliedPriceNo', label: 'Sevk Fiyat No', type: 'number' },
  { key: 'latitude', label: 'Enlem', type: 'number' },
  { key: 'longitude', label: 'Boylam', type: 'number' },
  { key: 'detailTrackingType', label: 'Detay Takip', type: 'number' }
];

export const WAREHOUSE_CARD_DATE_FIELDS: readonly FieldDefinition[] = [
  { key: 'lockDate', label: 'Kilit Tarihi', type: 'date' }
];

export const WAREHOUSE_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'excludedFromInventory', label: 'Envanter Disi' },
  { key: 'outgoingEDespatchEnabled', label: 'Giden E-Irsaliye' },
  { key: 'incomingEDespatchEnabled', label: 'Gelen E-Irsaliye' },
  { key: 'isPassive', label: 'Pasif' },
  { key: 'isHidden', label: 'Gizli' },
  { key: 'isLocked', label: 'Kilitli' }
];

export const CUSTOMER_CARD_TEXT_FIELDS: readonly FieldDefinition[] = [
  { key: 'title1', label: 'Unvan 1', wide: true },
  { key: 'title2', label: 'Unvan 2', wide: true },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
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

export const CUSTOMER_CARD_NUMBER_FIELDS: readonly FieldDefinition[] = [
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

export const CUSTOMER_CARD_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'isClosed', label: 'Kapali' },
  { key: 'isLocked', label: 'Kilitli' },
  { key: 'eInvoiceEnabled', label: 'E-Fatura' },
  { key: 'eDespatchEnabled', label: 'E-Irsaliye' },
  { key: 'retailCustomer', label: 'Perakende Cari' }
];

export const STOCK_HEADER_FIELDS: readonly FieldDefinition[] = [
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

export const STOCK_LINE_FIELDS: readonly FieldDefinition[] = [
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
  { key: 'expenseTaxPointer', label: 'Masraf Vergi Ptr', type: 'number' },
  { key: 'expenseTaxAmount', label: 'Masraf Vergi Tutari', type: 'number' },
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
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
  { key: 'inputWarehouseNo', label: 'Giriş Depo', type: 'number' },
  { key: 'outputWarehouseNo', label: 'Çıkış Depo', type: 'number' }
];

export const INVENTORY_COUNT_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'documentDate', label: 'Sayim Tarihi', type: 'date' },
  { key: 'warehouseNo', label: 'Depo No', type: 'number' },
  { key: 'name', label: 'Sayim Adi', wide: true }
];

export const INVENTORY_COUNT_LINE_FIELDS: readonly FieldDefinition[] = [
  { key: 'rowNo', label: 'Satir', type: 'number' },
  { key: 'stockCode', label: 'Stok Kodu' },
  { key: 'barcode', label: 'Barkod' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'quantity1', label: 'Miktar 1', type: 'number' },
  { key: 'quantity2', label: 'Miktar 2', type: 'number' },
  { key: 'quantity3', label: 'Miktar 3', type: 'number' },
  { key: 'quantity4', label: 'Miktar 4', type: 'number' },
  { key: 'quantity5', label: 'Miktar 5', type: 'number' },
  { key: 'rayonCode', label: 'Reyon' },
  { key: 'corridorCode', label: 'Koridor' },
  { key: 'shelfCode', label: 'Raf' },
  { key: 'partyCode', label: 'Parti Kodu' },
  { key: 'lotNo', label: 'Lot No', type: 'number' },
  { key: 'serialNo', label: 'Seri No' },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' }
];

export const CUSTOMER_HEADER_FIELDS: readonly FieldDefinition[] = [
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

export const CUSTOMER_LINE_FIELDS: readonly FieldDefinition[] = [
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
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
  { key: 'sellerCode', label: 'Satıcı Kodu' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' }
];

export const COMPANY_ORDER_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'orderDate', label: 'Siparis Tarihi', type: 'date' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' },
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentNo', label: 'Belge No' },
  { key: 'customerCode', label: 'Cari Kodu' },
  { key: 'warehouseNo', label: 'Depo No', type: 'number' },
  { key: 'sellerCode', label: 'Satici Kodu' },
  { key: 'description1', label: 'Aciklama 1', wide: true },
  { key: 'description2', label: 'Aciklama 2', wide: true },
  { key: 'deliveryType', label: 'Teslim Tipi' },
  { key: 'addressNo', label: 'Adres No', type: 'number' },
  { key: 'currencyType', label: 'Doviz Tipi', type: 'number' },
  { key: 'currencyRate', label: 'Doviz Kuru', type: 'number' },
  { key: 'alternativeCurrencyRate', label: 'Alternatif Kur', type: 'number' },
  { key: 'closeReasonCode', label: 'Kapanma Nedeni' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'customerResponsibilityCenter', label: 'Cari Sorumluluk' },
  { key: 'stockResponsibilityCenter', label: 'Stok Sorumluluk' }
];

export const COMPANY_ORDER_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'canBeCalled', label: 'Cagrilabilir' },
  { key: 'isClosed', label: 'Kapali' }
];

export const COMPANY_ORDER_LINE_FIELDS: readonly FieldDefinition[] = [
  { key: 'rowNo', label: 'Satir', type: 'number' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' },
  { key: 'stockCode', label: 'Stok Kodu' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'quantity', label: 'Miktar', type: 'number' },
  { key: 'deliveredQuantity', label: 'Teslim Miktari', type: 'number' },
  { key: 'unitPrice', label: 'Birim Fiyat', type: 'number' },
  { key: 'amount', label: 'Tutar', type: 'number' },
  { key: 'priceListNo', label: 'Fiyat Liste No', type: 'number' },
  { key: 'validUntil', label: 'Gecerlilik Tarihi', type: 'date' },
  { key: 'reservedQuantity', label: 'Rezervasyon Miktari', type: 'number' },
  { key: 'deliveredFromReservation', label: 'Rezerveden Teslim', type: 'number' },
  { key: 'discount1', label: 'Iskonto 1', type: 'number' },
  { key: 'discount2', label: 'Iskonto 2', type: 'number' },
  { key: 'discount3', label: 'Iskonto 3', type: 'number' },
  { key: 'discount4', label: 'Iskonto 4', type: 'number' },
  { key: 'discount5', label: 'Iskonto 5', type: 'number' },
  { key: 'discount6', label: 'Iskonto 6', type: 'number' },
  { key: 'expense1', label: 'Masraf 1', type: 'number' },
  { key: 'expense2', label: 'Masraf 2', type: 'number' },
  { key: 'expense3', label: 'Masraf 3', type: 'number' },
  { key: 'expense4', label: 'Masraf 4', type: 'number' },
  { key: 'taxPointer', label: 'Vergi Ptr', type: 'number' },
  { key: 'taxAmount', label: 'Vergi Tutari', type: 'number' },
  { key: 'description1', label: 'Aciklama 1', wide: true },
  { key: 'description2', label: 'Aciklama 2', wide: true },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
  { key: 'packageCode', label: 'Paket Kodu' },
  { key: 'partyCode', label: 'Parti Kodu' },
  { key: 'lotNo', label: 'Lot No', type: 'number' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'customerResponsibilityCenter', label: 'Cari Sorumluluk' },
  { key: 'stockResponsibilityCenter', label: 'Stok Sorumluluk' },
  { key: 'canBeCalled', label: 'Cagrilabilir', type: 'checkbox' },
  { key: 'isClosed', label: 'Kapali', type: 'checkbox' },
  { key: 'closeReasonCode', label: 'Kapanma Nedeni' }
];

export const WAREHOUSE_ORDER_HEADER_FIELDS: readonly FieldDefinition[] = [
  { key: 'orderDate', label: 'Siparis Tarihi', type: 'date' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' },
  { key: 'documentDate', label: 'Belge Tarihi', type: 'date' },
  { key: 'documentNo', label: 'Belge No' },
  { key: 'inWarehouseNo', label: 'Giris Depo', type: 'number' },
  { key: 'outWarehouseNo', label: 'Cikis Depo', type: 'number' },
  { key: 'description', label: 'Aciklama', wide: true },
  { key: 'closeReasonCode', label: 'Kapanma Nedeni' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' }
];

export const WAREHOUSE_ORDER_BOOLEAN_FIELDS: readonly FieldDefinition[] = [
  { key: 'isClosed', label: 'Kapali' }
];

export const WAREHOUSE_ORDER_LINE_FIELDS: readonly FieldDefinition[] = [
  { key: 'rowNo', label: 'Satir', type: 'number' },
  { key: 'deliveryDate', label: 'Teslim Tarihi', type: 'date' },
  { key: 'stockCode', label: 'Stok Kodu' },
  { key: 'unitPointer', label: 'Birim Ptr', type: 'number' },
  { key: 'quantity', label: 'Miktar', type: 'number' },
  { key: 'deliveredQuantity', label: 'Teslim Miktari', type: 'number' },
  { key: 'unitPrice', label: 'Birim Fiyat', type: 'number' },
  { key: 'amount', label: 'Tutar', type: 'number' },
  { key: 'priceListNo', label: 'Fiyat Liste No', type: 'number' },
  { key: 'validUntil', label: 'Gecerlilik Tarihi', type: 'date' },
  { key: 'reservedQuantity', label: 'Rezervasyon Miktari', type: 'number' },
  { key: 'deliveredFromReservation', label: 'Rezerveden Teslim', type: 'number' },
  { key: 'description', label: 'Aciklama', wide: true },
  { key: 'special1', label: 'Ozel Kod 1' },
  { key: 'special2', label: 'Ozel Kod 2' },
  { key: 'special3', label: 'Ozel Kod 3' },
  { key: 'inWarehouseNo', label: 'Giris Depo', type: 'number' },
  { key: 'outWarehouseNo', label: 'Cikis Depo', type: 'number' },
  { key: 'isClosed', label: 'Kapali', type: 'checkbox' },
  { key: 'closeReasonCode', label: 'Kapanma Nedeni' },
  { key: 'packageCode', label: 'Paket Kodu' },
  { key: 'projectCode', label: 'Proje Kodu' },
  { key: 'responsibilityCenter', label: 'Sorumluluk Merkezi' }
];

export const BANKNOTE_TRACK_FIELDS: readonly FieldDefinition[] = [
  { key: 'banknoteTrackDate', label: 'Takip Tarihi', type: 'date' },
  { key: 'warehouseNo', label: 'Depo No', type: 'number' },
  { key: 'totalAmount', label: 'Sayim Toplami', type: 'number' },
  { key: 'deliveryTotalAmount', label: 'Teslim Toplami', type: 'number' },
  { key: 'deliverer', label: 'Teslim Eden' },
  { key: 'receiver', label: 'Teslim Alan' }
];
