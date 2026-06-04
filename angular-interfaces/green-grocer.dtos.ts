export interface GreenGrocerReportDateHttpRequest {
  date: string;
  dateToGet?: string;
}

export interface IFurpaGreenGrocerSummaryReportItemApiDto {
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
}

export interface IFurpaGreenGrocerBranchReportItemApiDto {
  orderDate: string;
  branchNo: number;
  branchName: string;
  documentSerie: string;
  documentOrderNo: number;
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
}

export interface IFurpaGreenGrocerLazyBranchApiDto {
  branchNo: number;
  branchName: string;
  regionCode: string;
}

export interface IFurpaGreenGrocerBranchReportResponseApiDto {
  items: IFurpaGreenGrocerBranchReportItemApiDto[];
  lazyBranches: IFurpaGreenGrocerLazyBranchApiDto[];
}

export interface IFurpaGreenGrocerProductReportItemApiDto {
  typeCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalQuantity?: number | null;
  items?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branchItems?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branches?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  branchBreakdowns?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  documents?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  details?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
  lines?: IFurpaGreenGrocerBranchReportItemApiDto[] | null;
}

export interface IFurpaGreenGrocerProductReportResponseApiDto {
  items: IFurpaGreenGrocerProductReportItemApiDto[];
}

export type IFurpaGreenGrocerProductReportApiResponse =
  | IFurpaGreenGrocerProductReportItemApiDto[]
  | IFurpaGreenGrocerProductReportResponseApiDto;

export interface IFurpaGreenGrocerDeleteOrderResponseApiDto {
  documentSerie: string;
  documentOrderNo: number;
  warehouseNo: number;
  deletedLineCount: number;
  latestCreateDate: string;
  deletedAt: string;
}
