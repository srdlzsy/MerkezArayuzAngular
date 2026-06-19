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

export interface StockCardUpdateResponse {
  summary: MikroUpdateSummaryDto;
  stockCard: Partial<StockCardDetailDto> & Pick<StockCardDetailDto, 'stockCode'>;
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

export interface StockMovementDocumentHeaderDto {
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
  taxPointer?: number;
  taxAmount?: number;
  netWeight?: number;
  grossWeight?: number;
  description: string;
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
