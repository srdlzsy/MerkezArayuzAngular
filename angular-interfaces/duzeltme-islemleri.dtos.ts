export interface StockCardSearchHttpRequest {
  searchText?: string | null;
  includePassive?: boolean | null;
  take?: number | null;
}

export interface StockCardListItemDto {
  stockCode: string;
  name: string;
  shortName: string;
  supplierCode: string;
  unit1Name: string;
  mainGroupCode: string;
  subGroupCode: string;
  categoryCode: string;
  isPassive: boolean;
  lastUpdatedAt: string | null;
}

export interface StockCardDetailDto extends StockCardListItemDto {
  foreignName: string;
  stockType: number;
  currencyType: number;
  trackingType: number;
  unit2Name: string;
  unit3Name: string;
  unit4Name: string;
  retailTaxPointer: number;
  wholesaleTaxPointer: number;
  brandCode: string;
  sectorCode: string;
  rayonCode: string;
  manufacturerCode: string;
  responsibilityCode: string;
  shelfCode: string;
  special1: string;
  special2: string;
  special3: string;
  salesStopped: boolean;
  orderStopped: boolean;
  receivingStopped: boolean;
  discountDisabled: boolean;
  createdAt: string | null;
}

export type StockCardPatchHttpRequest = Partial<
  Pick<
    StockCardDetailDto,
    | 'name'
    | 'shortName'
    | 'foreignName'
    | 'supplierCode'
    | 'stockType'
    | 'currencyType'
    | 'trackingType'
    | 'unit1Name'
    | 'unit2Name'
    | 'unit3Name'
    | 'unit4Name'
    | 'retailTaxPointer'
    | 'wholesaleTaxPointer'
    | 'categoryCode'
    | 'mainGroupCode'
    | 'subGroupCode'
    | 'brandCode'
    | 'sectorCode'
    | 'rayonCode'
    | 'manufacturerCode'
    | 'responsibilityCode'
    | 'shelfCode'
    | 'special1'
    | 'special2'
    | 'special3'
    | 'salesStopped'
    | 'orderStopped'
    | 'receivingStopped'
    | 'isPassive'
    | 'discountDisabled'
  >
>;

export interface MikroUpdateSummaryDto {
  target: string;
  updatedRowCount: number;
  updatedAt: string;
  updateUser: number;
}

export interface MikroDocumentFieldCatalogDto {
  sections: MikroDocumentFieldCatalogSectionDto[];
}

export interface MikroDocumentFieldCatalogSectionDto {
  code: string;
  title: string;
  endpoint: string;
  requestModel: string;
  fields: MikroDocumentFieldCatalogFieldDto[];
}

export interface MikroDocumentFieldCatalogFieldDto {
  apiField: string;
  displayName: string;
  scope: string;
  valueType: string;
  mikroTable: string;
  mikroColumn: string;
  editable: boolean;
  description: string;
}

export interface StockCardUpdateResponse {
  summary: MikroUpdateSummaryDto;
  stockCard: Partial<StockCardDetailDto> & Pick<StockCardDetailDto, 'stockCode'>;
}

export interface WarehouseCardSearchHttpRequest {
  searchText?: string | null;
  includePassive?: boolean | null;
  take?: number | null;
}

export interface WarehouseCardListItemDto {
  warehouseNo: number;
  name: string;
  groupCode: string;
  warehouseType: number;
  city: string;
  district: string;
  isPassive: boolean;
  isHidden: boolean;
  lastUpdatedAt: string | null;
}

export interface WarehouseCardDetailDto extends WarehouseCardListItemDto {
  warehouseGuid: string;
  shipmentAutoPriceType: number;
  movementType: number;
  accountingCode: string;
  responsibilityCenter: string;
  projectCode: string;
  special1: string;
  special2: string;
  special3: string;
  shipmentAppliedPriceNo: number;
  lockDate: string | null;
  street: string;
  neighborhood: string;
  avenue: string;
  quarter: string;
  apartmentNo: string;
  apartmentUnitNo: string;
  postalCode: string;
  country: string;
  addressCode: string;
  latitude: number | null;
  longitude: number | null;
  authorizedEmail: string;
  phoneCountryCode: string;
  phoneAreaCode: string;
  phoneNo1: string;
  phoneNo2: string;
  faxNo: string;
  excludedFromInventory: boolean;
  detailTrackingType: number;
  regionCode: string;
  outgoingEDespatchEnabled: boolean;
  incomingEDespatchEnabled: boolean;
  isLocked: boolean;
  createdAt: string | null;
}

export type WarehouseCardPatchHttpRequest = Partial<
  Pick<
    WarehouseCardDetailDto,
    | 'name'
    | 'groupCode'
    | 'warehouseType'
    | 'movementType'
    | 'shipmentAutoPriceType'
    | 'shipmentAppliedPriceNo'
    | 'accountingCode'
    | 'responsibilityCenter'
    | 'projectCode'
    | 'special1'
    | 'special2'
    | 'special3'
    | 'regionCode'
    | 'street'
    | 'neighborhood'
    | 'avenue'
    | 'quarter'
    | 'apartmentNo'
    | 'apartmentUnitNo'
    | 'postalCode'
    | 'district'
    | 'city'
    | 'country'
    | 'addressCode'
    | 'latitude'
    | 'longitude'
    | 'authorizedEmail'
    | 'phoneCountryCode'
    | 'phoneAreaCode'
    | 'phoneNo1'
    | 'phoneNo2'
    | 'faxNo'
    | 'excludedFromInventory'
    | 'detailTrackingType'
    | 'outgoingEDespatchEnabled'
    | 'incomingEDespatchEnabled'
    | 'isPassive'
    | 'isHidden'
    | 'isLocked'
    | 'lockDate'
  >
>;

export interface WarehouseCardUpdateResponse {
  summary: MikroUpdateSummaryDto;
  warehouseCard: Partial<WarehouseCardDetailDto> & Pick<WarehouseCardDetailDto, 'warehouseNo'>;
}

export interface CustomerCardSearchHttpRequest {
  searchText?: string | null;
  includePassive?: boolean | null;
  take?: number | null;
}

export interface CustomerCardListItemDto {
  customerCode: string;
  title1: string;
  title2: string;
  taxOffice: string;
  taxNo: string;
  groupCode: string;
  regionCode: string;
  representativeCode: string;
  isClosed: boolean;
  isLocked: boolean;
  lastUpdatedAt: string | null;
}

export interface CustomerCardDetailDto extends CustomerCardListItemDto {
  customerGuid: string;
  special1: string;
  special2: string;
  special3: string;
  movementType: number;
  connectionType: number;
  purchaseStockType: number;
  salesStockType: number;
  accountingCode: string;
  accountingCode1: string;
  accountingCode2: string;
  currencyType: number;
  currencyType1: number;
  currencyType2: number;
  taxOfficeNo: string;
  registryNo: string;
  salesPriceListNo: number;
  paymentType: number;
  paymentDay: number;
  paymentPlanNo: number;
  optionDay: number;
  invoiceAddressNo: number;
  shippingAddressNo: number;
  parentCustomerCode: string;
  sectorCode: string;
  eInvoiceEnabled: boolean;
  defaultEInvoiceType: number;
  eDespatchEnabled: boolean;
  defaultEDespatchType: number;
  website: string;
  email: string;
  mobilePhone: string;
  defaultInputWarehouseNo: number | null;
  defaultOutputWarehouseNo: number | null;
  kepAddress: string;
  reconciliationEmail: string;
  mersisNo: string;
  taxOfficeCode: string;
  retailCustomer: boolean;
  createdAt: string | null;
}

export type CustomerCardPatchHttpRequest = Partial<
  Pick<
    CustomerCardDetailDto,
    | 'title1'
    | 'title2'
    | 'special1'
    | 'special2'
    | 'special3'
    | 'movementType'
    | 'connectionType'
    | 'purchaseStockType'
    | 'salesStockType'
    | 'accountingCode'
    | 'accountingCode1'
    | 'accountingCode2'
    | 'currencyType'
    | 'currencyType1'
    | 'currencyType2'
    | 'taxOffice'
    | 'taxOfficeNo'
    | 'registryNo'
    | 'taxNo'
    | 'taxOfficeCode'
    | 'salesPriceListNo'
    | 'paymentType'
    | 'paymentDay'
    | 'paymentPlanNo'
    | 'optionDay'
    | 'invoiceAddressNo'
    | 'shippingAddressNo'
    | 'parentCustomerCode'
    | 'sectorCode'
    | 'regionCode'
    | 'groupCode'
    | 'representativeCode'
    | 'eInvoiceEnabled'
    | 'defaultEInvoiceType'
    | 'eDespatchEnabled'
    | 'defaultEDespatchType'
    | 'website'
    | 'email'
    | 'mobilePhone'
    | 'kepAddress'
    | 'reconciliationEmail'
    | 'defaultInputWarehouseNo'
    | 'defaultOutputWarehouseNo'
    | 'mersisNo'
    | 'retailCustomer'
    | 'isClosed'
    | 'isLocked'
  >
>;

export interface CustomerCardUpdateResponse {
  summary: MikroUpdateSummaryDto;
  customerCard: Partial<CustomerCardDetailDto> & Pick<CustomerCardDetailDto, 'customerCode'>;
}

export interface MikroDocumentDeleteResponse {
  target: string;
  deletedRowCount: number;
  deletedAt: string;
  deleteUser: number | null;
  deletionMode: string;
}

export interface StockCardWarehouseSettingsDto {
  stockCode: string;
  warehouseNo: number;
  warehouseName: string;
  hasWarehouseDetail: boolean;
  hasAnyOverride: boolean;
  globalSalesStopped: boolean;
  globalOrderStopped: boolean;
  globalReceivingStopped: boolean;
  globalIsPassive: boolean;
  globalDiscountDisabled: boolean;
  salesStopped: boolean;
  orderStopped: boolean;
  receivingStopped: boolean;
  isPassive: boolean;
  discountDisabled: boolean;
  lastUpdatedAt: string | null;
}

export interface StockCardWarehousePatchHttpRequest {
  salesStopped?: boolean | null;
  orderStopped?: boolean | null;
  receivingStopped?: boolean | null;
  isPassive?: boolean | null;
  discountDisabled?: boolean | null;
  resetToGlobal?: boolean | null;
}

export interface StockCardWarehouseUpdateResponse {
  summary: MikroUpdateSummaryDto;
  warehouseSettings: StockCardWarehouseSettingsDto;
}

export interface StockSalesPriceDto {
  priceGuid: string | null;
  stockCode: string;
  priceListNo: number;
  priceListName: string;
  warehouseNo: number;
  warehouseName: string;
  paymentPlanNo: number;
  unitPointer: number;
  unitName: string;
  price: number;
  currencyType: number;
  changeReason: number;
  createdAt: string | null;
  lastUpdatedAt: string | null;
}

export interface StockSalesPriceUpsertHttpRequest {
  priceListNo?: number | null;
  paymentPlanNo?: number | null;
  unitPointer?: number | null;
  price: number;
  currencyType?: number | null;
  changeReason?: number | null;
}

export interface StockSalesPriceUpsertResponse {
  summary: MikroUpdateSummaryDto;
  created: boolean;
  previousPrice: number | null;
  salesPrice: StockSalesPriceDto;
}

export interface StockSalesPriceDeleteHttpRequest {
  priceListNo?: number | null;
  paymentPlanNo?: number | null;
  unitPointer?: number | null;
}

export interface StockMovementDocumentLookupHttpRequest {
  documentSerie: string;
  documentOrderNo: number;
  documentType?: number | null;
  movementType?: number | null;
  movementKind?: number | null;
  normalReturn?: number | null;
  warehouseNo?: number | null;
}

export interface StockMovementDocumentDeleteHttpRequest
  extends StockMovementDocumentLookupHttpRequest {
  hardDelete?: boolean | null;
}

export interface StockMovementDocumentHeaderDto {
  documentSerie: string;
  documentOrderNo: number;
  documentType: number;
  movementTypes: number[];
  movementKind: number;
  normalReturn: number;
  movementDate: string;
  documentDate: string;
  goodsAcceptanceDate: string;
  documentNo: string;
  customerCode: string;
  customerTitle: string;
  inputWarehouseNo: number;
  inputWarehouseName: string;
  outputWarehouseNo: number;
  outputWarehouseName: string;
  shippingWarehouseNo: number;
  shippingWarehouseName: string;
  description: string;
  movementGroupCode1: string;
  movementGroupCode2: string;
  movementGroupCode3: string;
  customerResponsibilityCenter: string;
  stockResponsibilityCenter: string;
  projectCode: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface StockMovementDocumentLineDto {
  movementGuid: string;
  rowNo: number;
  goodsAcceptanceDate: string;
  stockCode: string;
  stockName: string;
  unitPointer: number;
  unitName: string;
  quantity: number;
  secondaryQuantity: number;
  unitPrice: number;
  amount: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
  discount4?: number;
  discount5?: number;
  discount6?: number;
  expense1?: number;
  expense2?: number;
  expense3?: number;
  expense4?: number;
  expenseTaxPointer?: number;
  expenseTaxAmount?: number;
  taxPointer?: number;
  taxAmount?: number;
  netWeight?: number;
  grossWeight?: number;
  description: string;
  special1?: string;
  special2?: string;
  special3?: string;
  partyCode: string;
  lotNo: number;
  projectCode: string;
  customerResponsibilityCenter?: string;
  stockResponsibilityCenter?: string;
  inputWarehouseNo: number;
  outputWarehouseNo: number;
}

export interface StockMovementDocumentDto {
  header: StockMovementDocumentHeaderDto;
  lines: StockMovementDocumentLineDto[];
}

export type StockMovementHeaderPatchHttpRequest = Partial<
  Pick<
    StockMovementDocumentHeaderDto,
    | 'movementDate'
    | 'documentDate'
    | 'goodsAcceptanceDate'
    | 'documentNo'
    | 'customerCode'
    | 'inputWarehouseNo'
    | 'outputWarehouseNo'
    | 'shippingWarehouseNo'
    | 'description'
    | 'movementGroupCode1'
    | 'movementGroupCode2'
    | 'movementGroupCode3'
    | 'customerResponsibilityCenter'
    | 'stockResponsibilityCenter'
    | 'projectCode'
  >
>;

export type StockMovementLinePatchHttpRequest = Partial<
  Omit<StockMovementDocumentLineDto, 'movementGuid' | 'stockName' | 'unitName' | 'unitPrice'>
> & { movementGuid: string };

export interface UpdateStockMovementDocumentHttpRequest {
  lookup: StockMovementDocumentLookupHttpRequest;
  header?: StockMovementHeaderPatchHttpRequest;
  lines?: StockMovementLinePatchHttpRequest[];
}

export interface StockMovementDocumentUpdateResponse {
  summary: MikroUpdateSummaryDto;
  document: StockMovementDocumentDto;
}

export interface CustomerMovementDocumentLookupHttpRequest {
  documentSerie: string;
  documentOrderNo: number;
  documentType?: number | null;
  movementType?: number | null;
  movementKind?: number | null;
  normalReturn?: number | null;
  customerCode?: string | null;
}

export interface CustomerMovementDocumentDeleteHttpRequest
  extends CustomerMovementDocumentLookupHttpRequest {
  hardDelete?: boolean | null;
}

export interface CustomerMovementDocumentHeaderDto {
  documentSerie: string;
  documentOrderNo: number;
  documentType: number;
  movementTypes: number[];
  movementKind: number;
  normalReturn: number;
  movementDate: string;
  documentDate: string;
  documentNo: string;
  customerCode: string;
  turnoverCustomerCode: string;
  customerTitle: string;
  description: string;
  sellerCode: string;
  projectCode: string;
  responsibilityCenter: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalSubAmount: number;
}

export interface CustomerMovementDocumentLineDto {
  movementGuid: string;
  rowNo: number;
  customerCode: string;
  turnoverCustomerCode: string;
  customerTitle: string;
  movementType: number;
  movementKind: number;
  normalReturn: number;
  quantity: number;
  amount: number;
  subAmount: number;
  dueDay: number;
  discount1?: number;
  discount2?: number;
  discount3?: number;
  discount4?: number;
  discount5?: number;
  discount6?: number;
  expense1?: number;
  expense2?: number;
  expense3?: number;
  expense4?: number;
  tax1?: number;
  tax2?: number;
  tax3?: number;
  tax4?: number;
  tax5?: number;
  description: string;
  special1?: string;
  special2?: string;
  special3?: string;
  sellerCode: string;
  projectCode: string;
  responsibilityCenter: string;
}

export interface CustomerMovementDocumentDto {
  header: CustomerMovementDocumentHeaderDto;
  lines: CustomerMovementDocumentLineDto[];
}

export type CustomerMovementHeaderPatchHttpRequest = Partial<
  Pick<
    CustomerMovementDocumentHeaderDto,
    | 'movementDate'
    | 'documentDate'
    | 'documentNo'
    | 'customerCode'
    | 'turnoverCustomerCode'
    | 'description'
    | 'sellerCode'
    | 'projectCode'
    | 'responsibilityCenter'
  >
>;

export type CustomerMovementLinePatchHttpRequest = Partial<
  Omit<
    CustomerMovementDocumentLineDto,
    'movementGuid' | 'customerTitle' | 'movementType' | 'movementKind' | 'normalReturn'
  >
> & { movementGuid: string };

export interface UpdateCustomerMovementDocumentHttpRequest {
  lookup: CustomerMovementDocumentLookupHttpRequest;
  header?: CustomerMovementHeaderPatchHttpRequest;
  lines?: CustomerMovementLinePatchHttpRequest[];
}

export interface CustomerMovementDocumentUpdateResponse {
  summary: MikroUpdateSummaryDto;
  document: CustomerMovementDocumentDto;
}

export interface CompanyOrderDocumentLookupHttpRequest {
  documentSerie: string;
  documentOrderNo: number;
  orderType?: number | null;
  orderKind?: number | null;
  warehouseNo?: number | null;
  customerCode?: string | null;
}

export interface CompanyOrderDocumentDeleteHttpRequest
  extends CompanyOrderDocumentLookupHttpRequest {
  hardDelete?: boolean | null;
}

export interface CompanyOrderDocumentHeaderDto {
  documentSerie: string;
  documentOrderNo: number;
  orderType: number;
  orderKind: number;
  orderDate: string;
  deliveryDate: string | null;
  documentDate: string | null;
  documentNo: string;
  warehouseNo: number;
  warehouseName: string;
  customerCode: string;
  customerName?: string | null;
  customerTitle: string;
  sellerCode?: string | null;
  description1: string;
  description2: string;
  deliveryType?: string | null;
  addressNo?: number | null;
  currencyType?: number | null;
  currencyRate?: number | null;
  alternativeCurrencyRate?: number | null;
  canBeCalled?: boolean | null;
  isClosed: boolean;
  closeReasonCode?: string | null;
  projectCode?: string | null;
  customerResponsibilityCenter?: string | null;
  stockResponsibilityCenter?: string | null;
  lineCount: number;
  totalQuantity: number;
  totalDeliveredQuantity?: number | null;
  totalRemainingQuantity?: number | null;
  totalAmount: number;
}

export interface CompanyOrderDocumentLineDto {
  orderGuid: string;
  rowNo: number;
  deliveryDate?: string | null;
  stockCode: string;
  stockName: string;
  unitPointer: number;
  unitName?: string | null;
  quantity: number;
  deliveredQuantity?: number | null;
  remainingQuantity?: number | null;
  unitPrice: number;
  amount: number;
  priceListNo?: number | null;
  validUntil?: string | null;
  reservedQuantity?: number | null;
  deliveredFromReservation?: number | null;
  discount1?: number | null;
  discount2?: number | null;
  discount3?: number | null;
  discount4?: number | null;
  discount5?: number | null;
  discount6?: number | null;
  expense1?: number | null;
  expense2?: number | null;
  expense3?: number | null;
  expense4?: number | null;
  taxPointer?: number | null;
  taxAmount?: number | null;
  description1?: string | null;
  description2?: string | null;
  special1?: string | null;
  special2?: string | null;
  special3?: string | null;
  packageCode?: string | null;
  partyCode?: string | null;
  lotNo?: number | null;
  projectCode?: string | null;
  customerResponsibilityCenter?: string | null;
  stockResponsibilityCenter?: string | null;
  canBeCalled?: boolean | null;
  isClosed?: boolean | null;
  closeReasonCode?: string | null;
}

export interface CompanyOrderDocumentDto {
  header: CompanyOrderDocumentHeaderDto;
  lines: CompanyOrderDocumentLineDto[];
}

export type CompanyOrderHeaderPatchHttpRequest = Partial<
  Pick<
    CompanyOrderDocumentHeaderDto,
    | 'orderDate'
    | 'deliveryDate'
    | 'documentDate'
    | 'documentNo'
    | 'customerCode'
    | 'warehouseNo'
    | 'sellerCode'
    | 'description1'
    | 'description2'
    | 'deliveryType'
    | 'addressNo'
    | 'currencyType'
    | 'currencyRate'
    | 'alternativeCurrencyRate'
    | 'canBeCalled'
    | 'isClosed'
    | 'closeReasonCode'
    | 'projectCode'
    | 'customerResponsibilityCenter'
    | 'stockResponsibilityCenter'
  >
>;

export type CompanyOrderLinePatchHttpRequest = Partial<
  Omit<
    CompanyOrderDocumentLineDto,
    'orderGuid' | 'stockName' | 'unitName' | 'remainingQuantity'
  >
> & { orderGuid: string };

export interface UpdateCompanyOrderDocumentHttpRequest {
  lookup: CompanyOrderDocumentLookupHttpRequest;
  header?: CompanyOrderHeaderPatchHttpRequest;
  lines?: CompanyOrderLinePatchHttpRequest[];
}

export interface CompanyOrderDocumentUpdateResponse {
  summary: MikroUpdateSummaryDto;
  document: CompanyOrderDocumentDto;
}

export interface WarehouseOrderDocumentLookupHttpRequest {
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo?: number | null;
  inWarehouseNo?: number | null;
  outWarehouseNo?: number | null;
}

export interface WarehouseOrderDocumentDeleteHttpRequest
  extends WarehouseOrderDocumentLookupHttpRequest {
  hardDelete?: boolean | null;
}

export interface WarehouseOrderDocumentHeaderDto {
  documentSerie: string;
  documentOrderNo: number;
  orderDate: string;
  deliveryDate: string | null;
  documentDate: string | null;
  documentNo: string;
  inWarehouseNo: number;
  inWarehouseName?: string | null;
  outWarehouseNo: number;
  outWarehouseName?: string | null;
  description: string;
  isClosed: boolean;
  closeReasonCode?: string | null;
  projectCode?: string | null;
  responsibilityCenter?: string | null;
  lineCount: number;
  totalQuantity: number;
  totalDeliveredQuantity?: number | null;
  totalRemainingQuantity?: number | null;
  totalAmount: number;
}

export interface WarehouseOrderDocumentLineDto {
  orderGuid: string;
  rowNo: number;
  deliveryDate?: string | null;
  stockCode: string;
  stockName: string;
  unitPointer: number;
  unitName?: string | null;
  quantity: number;
  deliveredQuantity?: number | null;
  remainingQuantity?: number | null;
  unitPrice: number;
  amount: number;
  description?: string | null;
  priceListNo?: number | null;
  validUntil?: string | null;
  reservedQuantity?: number | null;
  deliveredFromReservation?: number | null;
  special1?: string | null;
  special2?: string | null;
  special3?: string | null;
  inWarehouseNo?: number | null;
  outWarehouseNo?: number | null;
  isClosed?: boolean | null;
  closeReasonCode?: string | null;
  packageCode?: string | null;
  projectCode?: string | null;
  responsibilityCenter?: string | null;
}

export interface WarehouseOrderDocumentDto {
  header: WarehouseOrderDocumentHeaderDto;
  lines: WarehouseOrderDocumentLineDto[];
}

export type WarehouseOrderHeaderPatchHttpRequest = Partial<
  Pick<
    WarehouseOrderDocumentHeaderDto,
    | 'orderDate'
    | 'deliveryDate'
    | 'documentDate'
    | 'documentNo'
    | 'inWarehouseNo'
    | 'outWarehouseNo'
    | 'description'
    | 'isClosed'
    | 'closeReasonCode'
    | 'projectCode'
    | 'responsibilityCenter'
  >
>;

export type WarehouseOrderLinePatchHttpRequest = Partial<
  Omit<WarehouseOrderDocumentLineDto, 'orderGuid' | 'stockName' | 'unitName' | 'remainingQuantity'>
> & { orderGuid: string };

export interface UpdateWarehouseOrderDocumentHttpRequest {
  lookup: WarehouseOrderDocumentLookupHttpRequest;
  header?: WarehouseOrderHeaderPatchHttpRequest;
  lines?: WarehouseOrderLinePatchHttpRequest[];
}

export interface WarehouseOrderDocumentUpdateResponse {
  summary: MikroUpdateSummaryDto;
  document: WarehouseOrderDocumentDto;
}
